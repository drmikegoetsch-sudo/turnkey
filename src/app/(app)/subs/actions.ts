"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SubInput = {
  name: string;
  company?: string;
  trade?: string;
  phone?: string;
  email?: string;
  notes?: string;
};

function cleanSub(input: SubInput) {
  return {
    name: input.name.slice(0, 200).trim(),
    company: input.company?.slice(0, 200).trim() || null,
    trade: input.trade?.slice(0, 100).trim() || null,
    phone: input.phone?.slice(0, 30).trim() || null,
    email: input.email?.slice(0, 200).trim() || null,
    notes: input.notes?.slice(0, 2000).trim() || null,
  };
}

export async function addSub(input: SubInput) {
  const supabase = await createClient();
  const clean = cleanSub(input);
  if (!clean.name) return { ok: false as const, error: "Name is required" };
  const { error } = await supabase.from("subcontractors").insert(clean);
  if (error) return { ok: false as const, error: "Could not add subcontractor" };
  revalidatePath("/subs");
  return { ok: true as const };
}

export async function updateSub(id: string, input: SubInput) {
  const supabase = await createClient();
  const clean = cleanSub(input);
  if (!clean.name) return { ok: false as const, error: "Name is required" };
  const { error } = await supabase
    .from("subcontractors")
    .update(clean)
    .eq("id", id);
  if (error) return { ok: false as const, error: "Could not update" };
  revalidatePath("/subs");
  return { ok: true as const };
}

export async function deleteSub(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("subcontractors").delete().eq("id", id);
  if (error) {
    return {
      ok: false as const,
      error:
        "Could not delete — this sub is assigned to projects. Remove those assignments first.",
    };
  }
  revalidatePath("/subs");
  return { ok: true as const };
}
