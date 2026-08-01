"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { COLUMN_KINDS, COLUMN_COLORS } from "@/lib/stages";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return { supabase, user };
}

export async function moveProject(input: {
  projectId: string;
  toColumnId: string;
  position: number;
}) {
  const { projectId, toColumnId, position } = input;
  if (!Number.isFinite(position)) {
    return { ok: false as const, error: "Invalid move" };
  }

  const { supabase, user } = await requireUser();

  const [{ data: current }, { data: column }] = await Promise.all([
    supabase.from("projects").select("column_id").eq("id", projectId).single(),
    supabase
      .from("board_columns")
      .select("id, label")
      .eq("id", toColumnId)
      .is("archived_at", null)
      .maybeSingle(),
  ]);
  if (!current) return { ok: false as const, error: "Project not found" };
  if (!column) return { ok: false as const, error: "Column not found" };

  const columnChanged = current.column_id !== toColumnId;

  const { error } = await supabase
    .from("projects")
    .update({
      column_id: toColumnId,
      board_position: position,
      ...(columnChanged
        ? { column_changed_at: new Date().toISOString() }
        : {}),
    })
    .eq("id", projectId);
  if (error) return { ok: false as const, error: "Could not move project" };

  if (columnChanged) {
    await supabase.from("stage_events").insert({
      project_id: projectId,
      from_column_id: current.column_id,
      to_column_id: toColumnId,
      to_label: column.label,
      changed_by: user.id,
    });
  }

  revalidatePath("/board");
  revalidatePath("/today");
  revalidatePath(`/projects/${projectId}`);
  return { ok: true as const };
}

// ---------- column management ----------

function refreshBoard() {
  revalidatePath("/board");
  revalidatePath("/today");
  revalidatePath("/settings");
}

export async function createColumn(input: {
  label: string;
  description?: string;
  kind: string;
  color: string;
  afterPosition?: number;
}) {
  const { supabase } = await requireUser();
  const label = input.label.slice(0, 60).trim();
  if (!label) return { ok: false as const, error: "Give the column a name" };
  if (!COLUMN_KINDS.includes(input.kind as never)) {
    return { ok: false as const, error: "Unknown column type" };
  }
  const color = COLUMN_COLORS.includes(input.color as never)
    ? input.color
    : "slate";

  // Drop it after the given column, or at the end of the board.
  let position: number;
  if (input.afterPosition !== undefined) {
    const { data: next } = await supabase
      .from("board_columns")
      .select("position")
      .is("archived_at", null)
      .gt("position", input.afterPosition)
      .order("position")
      .limit(1)
      .maybeSingle();
    position = next
      ? (input.afterPosition + next.position) / 2
      : input.afterPosition + 1;
  } else {
    const { data: last } = await supabase
      .from("board_columns")
      .select("position")
      .is("archived_at", null)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    position = (last?.position ?? 0) + 1;
  }

  const { error } = await supabase.from("board_columns").insert({
    label,
    description: input.description?.slice(0, 500).trim() || null,
    kind: input.kind,
    color,
    position,
  });
  if (error) return { ok: false as const, error: "Could not add column" };
  refreshBoard();
  return { ok: true as const };
}

export async function updateColumn(
  id: string,
  fields: { label?: string; description?: string; kind?: string; color?: string }
) {
  const { supabase } = await requireUser();
  const update: Record<string, string | null> = {};
  if (fields.label !== undefined) {
    const label = fields.label.slice(0, 60).trim();
    if (!label) return { ok: false as const, error: "Name can't be empty" };
    update.label = label;
  }
  if (fields.description !== undefined) {
    update.description = fields.description.slice(0, 500).trim() || null;
  }
  if (fields.kind !== undefined) {
    if (!COLUMN_KINDS.includes(fields.kind as never)) {
      return { ok: false as const, error: "Unknown column type" };
    }
    update.kind = fields.kind;
  }
  if (fields.color !== undefined && COLUMN_COLORS.includes(fields.color as never)) {
    update.color = fields.color;
  }

  const { error } = await supabase
    .from("board_columns")
    .update(update)
    .eq("id", id);
  if (error) return { ok: false as const, error: "Could not save column" };
  refreshBoard();
  return { ok: true as const };
}

export async function reorderColumn(id: string, direction: "left" | "right") {
  const { supabase } = await requireUser();
  const { data: columns } = await supabase
    .from("board_columns")
    .select("id, position")
    .is("archived_at", null)
    .order("position");
  if (!columns) return { ok: false as const, error: "Could not reorder" };

  const i = columns.findIndex((c) => c.id === id);
  const j = direction === "left" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= columns.length) return { ok: true as const };

  await Promise.all([
    supabase
      .from("board_columns")
      .update({ position: columns[j].position })
      .eq("id", columns[i].id),
    supabase
      .from("board_columns")
      .update({ position: columns[i].position })
      .eq("id", columns[j].id),
  ]);
  refreshBoard();
  return { ok: true as const };
}

// Archiving keeps history intact. Any projects still sitting in the column are
// moved to the destination the user picks, so nothing is ever orphaned.
export async function archiveColumn(id: string, moveToColumnId: string) {
  const { supabase, user } = await requireUser();
  if (id === moveToColumnId) {
    return { ok: false as const, error: "Pick a different destination column" };
  }

  const { data: destination } = await supabase
    .from("board_columns")
    .select("id, label")
    .eq("id", moveToColumnId)
    .is("archived_at", null)
    .maybeSingle();
  if (!destination) {
    return { ok: false as const, error: "Destination column not found" };
  }

  const { data: stranded } = await supabase
    .from("projects")
    .select("id")
    .eq("column_id", id);

  if (stranded && stranded.length > 0) {
    await supabase
      .from("projects")
      .update({
        column_id: moveToColumnId,
        column_changed_at: new Date().toISOString(),
      })
      .eq("column_id", id);
    await supabase.from("stage_events").insert(
      stranded.map((p) => ({
        project_id: p.id,
        from_column_id: id,
        to_column_id: moveToColumnId,
        to_label: destination.label,
        changed_by: user.id,
      }))
    );
  }

  const { error } = await supabase
    .from("board_columns")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false as const, error: "Could not remove column" };

  refreshBoard();
  return { ok: true as const, moved: stranded?.length ?? 0 };
}
