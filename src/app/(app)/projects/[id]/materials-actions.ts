"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// The project's running materials list — added to and checked off for the
// life of the job. Staff only (RLS is staff-only on this table).

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return { supabase, user };
}

type Result = { ok: true } | { ok: false; error: string };

function clean(value: string | undefined, max: number) {
  return value === undefined ? undefined : value.slice(0, max).trim() || null;
}

export async function addMaterial(
  projectId: string,
  fields: { name: string; quantity?: string }
): Promise<Result> {
  const { supabase, user } = await requireUser();
  const name = fields.name.slice(0, 200).trim();
  if (!name) return { ok: false, error: "Material needs a name" };

  const { data: last } = await supabase
    .from("materials")
    .select("position")
    .eq("project_id", projectId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("materials").insert({
    project_id: projectId,
    name,
    quantity: clean(fields.quantity, 60) ?? null,
    position: (last?.position ?? 0) + 1,
    created_by: user.id,
  });
  if (error) return { ok: false, error: "Could not add material" };
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

export async function updateMaterial(
  projectId: string,
  materialId: string,
  fields: { name?: string; quantity?: string }
): Promise<Result> {
  const { supabase } = await requireUser();
  const update: { name?: string; quantity?: string | null } = {};
  if (fields.name !== undefined) {
    const name = fields.name.slice(0, 200).trim();
    if (!name) return { ok: false, error: "Material needs a name" };
    update.name = name;
  }
  if (fields.quantity !== undefined) update.quantity = clean(fields.quantity, 60);

  const { error } = await supabase
    .from("materials")
    .update(update)
    .eq("id", materialId)
    .eq("project_id", projectId);
  if (error) return { ok: false, error: "Could not save material" };
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

export async function toggleMaterial(
  projectId: string,
  materialId: string,
  checked: boolean
): Promise<Result> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("materials")
    .update({
      checked_at: checked ? new Date().toISOString() : null,
      checked_by: checked ? user.id : null,
    })
    .eq("id", materialId)
    .eq("project_id", projectId);
  if (error) return { ok: false, error: "Could not update material" };
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

export async function reorderMaterial(
  projectId: string,
  materialId: string,
  position: number
): Promise<Result> {
  if (!Number.isFinite(position)) return { ok: false, error: "Invalid position" };
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("materials")
    .update({ position })
    .eq("id", materialId)
    .eq("project_id", projectId);
  if (error) return { ok: false, error: "Could not reorder" };
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

export async function deleteMaterial(
  projectId: string,
  materialId: string
): Promise<Result> {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("materials")
    .delete()
    .eq("id", materialId)
    .eq("project_id", projectId);
  if (error) return { ok: false, error: "Could not delete material" };
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}
