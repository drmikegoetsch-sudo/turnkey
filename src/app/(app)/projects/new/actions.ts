"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type NewProjectInput = {
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  title?: string;
  property_address: string;
  project_type: string;
  scope?: string;
  budget_range?: string;
  project_value?: string;
  timeline?: string;
  column_id?: string;
};

export async function createProject(input: NewProjectInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  const name = input.customer_name?.slice(0, 200).trim();
  const address = input.property_address?.slice(0, 300).trim();
  if (!name) return { ok: false as const, error: "Customer name is required" };
  if (!address) return { ok: false as const, error: "Address is required" };

  // Fall back to the first column if none was chosen.
  const { data: column } = input.column_id
    ? await supabase
        .from("board_columns")
        .select("id, label")
        .eq("id", input.column_id)
        .is("archived_at", null)
        .maybeSingle()
    : await supabase
        .from("board_columns")
        .select("id, label")
        .is("archived_at", null)
        .order("position")
        .limit(1)
        .maybeSingle();
  if (!column) return { ok: false as const, error: "No board column found" };

  const rawValue = input.project_value?.replace(/[$,\s]/g, "") ?? "";
  const projectValue = rawValue === "" ? null : Number(rawValue);
  if (projectValue !== null && (!Number.isFinite(projectValue) || projectValue < 0)) {
    return { ok: false as const, error: "Project value must be a number" };
  }

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .insert({
      name,
      phone: input.customer_phone?.slice(0, 30).trim() || null,
      email: input.customer_email?.slice(0, 200).trim() || null,
    })
    .select("id")
    .single();
  if (customerError || !customer) {
    return { ok: false as const, error: "Could not create customer" };
  }

  const type = input.project_type?.slice(0, 100).trim() || "Other";
  const title =
    input.title?.slice(0, 200).trim() ||
    `${type} — ${address.split(",")[0]?.trim() ?? address}`;

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      customer_id: customer.id,
      title,
      property_address: address,
      project_type: type,
      scope: input.scope?.slice(0, 5000).trim() || null,
      budget_range: input.budget_range?.slice(0, 200).trim() || null,
      project_value: projectValue,
      timeline: input.timeline?.slice(0, 300).trim() || null,
      column_id: column.id,
      source: "manual",
    })
    .select("id")
    .single();
  if (projectError || !project) {
    return { ok: false as const, error: "Could not create project" };
  }

  await supabase.from("stage_events").insert({
    project_id: project.id,
    from_column_id: null,
    to_column_id: column.id,
    to_label: column.label,
    changed_by: user.id,
  });

  revalidatePath("/board");
  revalidatePath("/today");
  redirect(`/projects/${project.id}`);
}
