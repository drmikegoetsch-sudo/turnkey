"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addProjectType(label: string) {
  const supabase = await createClient();
  const clean = label.slice(0, 100).trim();
  if (!clean) return { ok: false as const, error: "Label required" };
  const { data: max } = await supabase
    .from("project_types")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("project_types").insert({
    label: clean,
    position: (max?.position ?? 0) + 1,
  });
  if (error) {
    return {
      ok: false as const,
      error: error.code === "23505" ? "That type already exists" : "Could not add",
    };
  }
  revalidatePath("/settings");
  return { ok: true as const };
}

export async function toggleProjectType(id: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("project_types")
    .update({ active })
    .eq("id", id);
  if (error) return { ok: false as const, error: "Could not update" };
  revalidatePath("/settings");
  return { ok: true as const };
}
