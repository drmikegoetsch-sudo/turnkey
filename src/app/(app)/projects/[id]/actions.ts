"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateToken, hashToken } from "@/lib/share-links";
import { PHOTO_TYPES } from "@/lib/stages";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return { supabase, user };
}

function refresh(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/board");
  revalidatePath("/today");
}

// ---------- project fields ----------

export async function updateProjectFields(
  projectId: string,
  fields: {
    title?: string;
    property_address?: string;
    project_type?: string;
    scope?: string;
    budget_range?: string;
    project_value?: string | number | null;
    timeline?: string;
    quickbooks_url?: string;
    is_blocked?: boolean;
    blocked_reason?: string;
  }
) {
  const { supabase } = await requireUser();
  const update: Record<string, string | number | boolean | null> = {};

  for (const key of [
    "title",
    "property_address",
    "project_type",
    "scope",
    "budget_range",
    "timeline",
    "quickbooks_url",
    "blocked_reason",
  ] as const) {
    const value = fields[key];
    if (value === undefined) continue;
    update[key] = String(value).slice(0, 5000).trim() || null;
  }
  if (update.title === null) delete update.title;

  if (fields.project_value !== undefined) {
    const raw =
      typeof fields.project_value === "string"
        ? fields.project_value.replace(/[$,\s]/g, "")
        : fields.project_value;
    const num = raw === "" || raw === null ? null : Number(raw);
    if (num !== null && (!Number.isFinite(num) || num < 0)) {
      return { ok: false as const, error: "Project value must be a number" };
    }
    update.project_value = num;
  }

  if (fields.is_blocked !== undefined) {
    update.is_blocked = fields.is_blocked;
    if (!fields.is_blocked) update.blocked_reason = null;
  }

  const { error } = await supabase
    .from("projects")
    .update(update)
    .eq("id", projectId);
  if (error) return { ok: false as const, error: "Could not save changes" };
  refresh(projectId);
  return { ok: true as const };
}

export async function setColumn(projectId: string, columnId: string) {
  const { supabase, user } = await requireUser();

  const [{ data: current }, { data: column }] = await Promise.all([
    supabase.from("projects").select("column_id").eq("id", projectId).single(),
    supabase
      .from("board_columns")
      .select("id, label")
      .eq("id", columnId)
      .is("archived_at", null)
      .maybeSingle(),
  ]);
  if (!current) return { ok: false as const, error: "Project not found" };
  if (!column) return { ok: false as const, error: "Column not found" };
  if (current.column_id === columnId) return { ok: true as const };

  const { error } = await supabase
    .from("projects")
    .update({ column_id: columnId, column_changed_at: new Date().toISOString() })
    .eq("id", projectId);
  if (error) return { ok: false as const, error: "Could not change stage" };

  await supabase.from("stage_events").insert({
    project_id: projectId,
    from_column_id: current.column_id,
    to_column_id: columnId,
    to_label: column.label,
    changed_by: user.id,
  });
  refresh(projectId);
  return { ok: true as const };
}

export async function setBlocked(
  projectId: string,
  blocked: boolean,
  reason?: string
) {
  return updateProjectFields(projectId, {
    is_blocked: blocked,
    ...(blocked ? { blocked_reason: reason ?? "" } : {}),
  });
}

export async function setNextAction(
  projectId: string,
  nextAction: string,
  due: string | null
) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("projects")
    .update({
      next_action: nextAction.slice(0, 500).trim() || null,
      next_action_due: due || null,
    })
    .eq("id", projectId);
  if (error) return { ok: false as const, error: "Could not save" };
  refresh(projectId);
  return { ok: true as const };
}

// Finishes the current next action, logs it, and moves the job to the next
// column on the board — the one-click path through the pipeline.
export async function completeNextAction(projectId: string) {
  const { supabase, user } = await requireUser();

  const { data: project } = await supabase
    .from("projects")
    .select("next_action, column_id")
    .eq("id", projectId)
    .single();
  if (!project) return { ok: false as const, error: "Project not found" };

  const { data: columns } = await supabase
    .from("board_columns")
    .select("id, label, position")
    .is("archived_at", null)
    .order("position");

  const i = (columns ?? []).findIndex((c) => c.id === project.column_id);
  const next = i >= 0 ? (columns ?? [])[i + 1] : undefined;

  if (project.next_action) {
    await supabase.from("notes").insert({
      project_id: projectId,
      kind: "note",
      visibility: "internal",
      body: `Completed: ${project.next_action}`,
      author_kind: "internal",
      author_id: user.id,
    });
  }

  const update: Record<string, string | null> = {
    next_action: null,
    next_action_due: null,
  };
  if (next) {
    update.column_id = next.id;
    update.column_changed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("projects")
    .update(update)
    .eq("id", projectId);
  if (error) return { ok: false as const, error: "Could not update project" };

  if (next) {
    await supabase.from("stage_events").insert({
      project_id: projectId,
      from_column_id: project.column_id,
      to_column_id: next.id,
      to_label: next.label,
      changed_by: user.id,
    });
  }

  refresh(projectId);
  return { ok: true as const, advancedTo: next?.label ?? null };
}

// ---------- tasks ----------

export async function addTask(projectId: string, title: string, due: string | null) {
  const { supabase, user } = await requireUser();
  const clean = title.slice(0, 500).trim();
  if (!clean) return { ok: false as const, error: "Task needs a title" };
  const { error } = await supabase.from("tasks").insert({
    project_id: projectId,
    title: clean,
    due_date: due || null,
    created_by: user.id,
  });
  if (error) return { ok: false as const, error: "Could not add task" };
  refresh(projectId);
  return { ok: true as const };
}

export async function toggleTask(projectId: string, taskId: string, done: boolean) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("tasks")
    .update({ completed_at: done ? new Date().toISOString() : null })
    .eq("id", taskId);
  if (error) return { ok: false as const, error: "Could not update task" };
  refresh(projectId);
  return { ok: true as const };
}

export async function assignTask(
  projectId: string,
  taskId: string,
  assigneeId: string | null
) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("tasks")
    .update({ assigned_to: assigneeId })
    .eq("id", taskId);
  if (error) return { ok: false as const, error: "Could not assign task" };
  refresh(projectId);
  return { ok: true as const };
}

export async function deleteTask(projectId: string, taskId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) return { ok: false as const, error: "Could not delete task" };
  refresh(projectId);
  return { ok: true as const };
}

// ---------- notes ----------

export async function addNote(
  projectId: string,
  body: string,
  visibility: "internal" | "owner"
) {
  const { supabase, user } = await requireUser();
  const clean = body.slice(0, 10000).trim();
  if (!clean) return { ok: false as const, error: "Note is empty" };
  const { error } = await supabase.from("notes").insert({
    project_id: projectId,
    kind: visibility === "owner" ? "update" : "note",
    visibility,
    body: clean,
    author_kind: "internal",
    author_id: user.id,
  });
  if (error) return { ok: false as const, error: "Could not add note" };
  refresh(projectId);
  return { ok: true as const };
}

// ---------- subcontractor assignments ----------

export async function assignSub(
  projectId: string,
  subcontractorId: string,
  fields: {
    scheduled_start?: string;
    scheduled_end?: string;
    schedule_notes?: string;
    scope_notes?: string;
  }
) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("project_subcontractors").insert({
    project_id: projectId,
    subcontractor_id: subcontractorId,
    scheduled_start: fields.scheduled_start || null,
    scheduled_end: fields.scheduled_end || null,
    schedule_notes: fields.schedule_notes?.slice(0, 1000) || null,
    scope_notes: fields.scope_notes?.slice(0, 2000) || null,
  });
  if (error) {
    return {
      ok: false as const,
      error:
        error.code === "23505"
          ? "That sub is already assigned to this project"
          : "Could not assign subcontractor",
    };
  }
  refresh(projectId);
  return { ok: true as const };
}

export async function updateAssignment(
  projectId: string,
  assignmentId: string,
  fields: {
    scheduled_start?: string | null;
    scheduled_end?: string | null;
    schedule_notes?: string | null;
    scope_notes?: string | null;
    status?: "assigned" | "in_progress" | "complete";
  }
) {
  const { supabase } = await requireUser();
  const update: Record<string, unknown> = { ...fields };
  if (fields.status === "complete") {
    update.completed_at = new Date().toISOString();
  } else if (fields.status) {
    update.completed_at = null;
  }
  const { error } = await supabase
    .from("project_subcontractors")
    .update(update)
    .eq("id", assignmentId);
  if (error) return { ok: false as const, error: "Could not update assignment" };
  refresh(projectId);
  return { ok: true as const };
}

export async function removeAssignment(projectId: string, assignmentId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("project_subcontractors")
    .delete()
    .eq("id", assignmentId);
  if (error) return { ok: false as const, error: "Could not remove assignment" };
  refresh(projectId);
  return { ok: true as const };
}

// ---------- appointments ----------

export async function addAppointment(
  projectId: string,
  fields: { starts_at: string; kind?: string; location?: string; notes?: string }
) {
  const { supabase, user } = await requireUser();
  if (!fields.starts_at) return { ok: false as const, error: "Pick a date/time" };
  const { error } = await supabase.from("appointments").insert({
    project_id: projectId,
    kind: fields.kind?.slice(0, 100) || "site_visit",
    starts_at: new Date(fields.starts_at).toISOString(),
    location: fields.location?.slice(0, 300) || null,
    notes: fields.notes?.slice(0, 1000) || null,
    created_by: user.id,
  });
  if (error) return { ok: false as const, error: "Could not add appointment" };
  refresh(projectId);
  return { ok: true as const };
}

export async function deleteAppointment(projectId: string, appointmentId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("appointments")
    .delete()
    .eq("id", appointmentId);
  if (error) return { ok: false as const, error: "Could not delete appointment" };
  refresh(projectId);
  return { ok: true as const };
}

// ---------- photos ----------

export async function updatePhoto(
  projectId: string,
  photoId: string,
  fields: { visibility?: "internal" | "owner"; photo_type?: string; caption?: string }
) {
  const { supabase } = await requireUser();
  const update: Record<string, unknown> = {};
  if (fields.visibility) update.visibility = fields.visibility;
  if (fields.photo_type && PHOTO_TYPES.includes(fields.photo_type as never)) {
    update.photo_type = fields.photo_type;
  }
  if (fields.caption !== undefined) {
    update.caption = fields.caption.slice(0, 500) || null;
  }
  const { error } = await supabase.from("photos").update(update).eq("id", photoId);
  if (error) return { ok: false as const, error: "Could not update photo" };
  refresh(projectId);
  return { ok: true as const };
}

export async function deletePhoto(projectId: string, photoId: string) {
  const { supabase } = await requireUser();
  const { data: photo } = await supabase
    .from("photos")
    .select("storage_path, thumbnail_path")
    .eq("id", photoId)
    .single();
  if (!photo) return { ok: false as const, error: "Photo not found" };

  const { error } = await supabase.from("photos").delete().eq("id", photoId);
  if (error) return { ok: false as const, error: "Could not delete photo" };

  // Remove the video's poster frame alongside the media itself.
  const admin = createAdminClient();
  const paths = [photo.storage_path, photo.thumbnail_path].filter(
    (p): p is string => !!p
  );
  await admin.storage.from("project-photos").remove(paths);
  refresh(projectId);
  return { ok: true as const };
}

// ---------- share links ----------

export async function createShareLink(
  projectId: string,
  kind: "sub" | "owner",
  subcontractorId?: string
) {
  const { supabase, user } = await requireUser();
  if (kind === "sub" && !subcontractorId) {
    return { ok: false as const, error: "Pick a subcontractor for the link" };
  }
  const raw = generateToken();
  const { error } = await supabase.from("share_links").insert({
    project_id: projectId,
    kind,
    token_hash: hashToken(raw),
    subcontractor_id: kind === "sub" ? subcontractorId : null,
    created_by: user.id,
    expires_at:
      kind === "sub"
        ? new Date(Date.now() + 60 * 86400000).toISOString()
        : null,
  });
  if (error) return { ok: false as const, error: "Could not create link" };

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const url = `${base}/${kind === "sub" ? "sub" : "status"}/${raw}`;
  refresh(projectId);
  return { ok: true as const, url };
}

export async function revokeShareLink(projectId: string, linkId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("share_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", linkId);
  if (error) return { ok: false as const, error: "Could not revoke link" };
  refresh(projectId);
  return { ok: true as const };
}
