"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { intakeSchema, type IntakeInput } from "@/lib/schemas/intake";
import { signIntakeGrant } from "@/lib/uploads";

// Best-effort per-IP rate limit (resets on serverless cold start, which is
// fine — this is spam friction, not a security boundary).
const submissions = new Map<string, number[]>();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (submissions.get(ip) ?? []).filter(
    (t) => now - t < WINDOW_MS
  );
  if (recent.length >= MAX_PER_WINDOW) return true;
  recent.push(now);
  submissions.set(ip, recent);
  return false;
}

export type IntakeResult =
  | { ok: true; projectId: string; grant: string }
  | { ok: false; error: string };

export async function submitIntake(input: IntakeInput): Promise<IntakeResult> {
  const parsed = intakeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the highlighted fields." };
  }
  const data = parsed.data;

  // Honeypot: pretend success so bots move on.
  if (data.website) {
    return { ok: true, projectId: "ok", grant: "" };
  }

  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) {
    return {
      ok: false,
      error: "Too many submissions — please try again later or give us a call.",
    };
  }

  const admin = createAdminClient();

  // New leads land in the column whose kind is 'lead', wherever it sits and
  // whatever it's been renamed to. Fall back to the leftmost column if the
  // owners ever remove their lead column entirely.
  const { data: columns } = await admin
    .from("board_columns")
    .select("id, label, kind")
    .is("archived_at", null)
    .order("position");
  const firstColumn = columns?.find((c) => c.kind === "lead") ?? columns?.[0];
  if (!firstColumn) {
    return { ok: false, error: "Something went wrong — please try again." };
  }

  const { data: customer, error: customerError } = await admin
    .from("customers")
    .insert({
      name: data.name,
      phone: data.phone,
      alt_phone: data.alt_phone || null,
      email: data.email,
    })
    .select("id")
    .single();
  if (customerError || !customer) {
    return { ok: false, error: "Something went wrong — please try again." };
  }

  const typeLabel = data.project_type || "Project";
  const streetPart = data.address.split(",")[0]?.trim() ?? data.address;
  const title = `${typeLabel} — ${streetPart}`;

  const { data: project, error: projectError } = await admin
    .from("projects")
    .insert({
      customer_id: customer.id,
      title,
      property_address: data.address,
      project_type: data.project_type || "Other",
      scope: data.project1_description,
      budget_range: data.overall_budget,
      timeline: [data.desired_start, data.completion_date]
        .filter(Boolean)
        .join(" → ") || null,
      column_id: firstColumn.id,
      source: "intake",
    })
    .select("id")
    .single();
  if (projectError || !project) {
    return { ok: false, error: "Something went wrong — please try again." };
  }

  await admin.from("intake_submissions").insert({
    project_id: project.id,
    customer_id: customer.id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    alt_phone: data.alt_phone || null,
    address: data.address,
    meeting_availability: data.meeting_availability,
    design_services: data.design_services,
    overall_budget: data.overall_budget,
    referral_source: data.referral_source,
    project1_description: data.project1_description,
    project1_budget: data.project1_budget,
    project1_has_plans: data.project1_has_plans ?? null,
    project2_description: data.project2_description || null,
    project2_budget: data.project2_budget || null,
    project2_has_plans: data.project2_has_plans ?? null,
    project3_description: data.project3_description || null,
    project3_budget: data.project3_budget || null,
    project3_has_plans: data.project3_has_plans ?? null,
    desired_start: data.desired_start || null,
    completion_date: data.completion_date || null,
    additional_projects: data.additional_projects || null,
  });

  await admin.from("stage_events").insert({
    project_id: project.id,
    from_column_id: null,
    to_column_id: firstColumn.id,
    to_label: firstColumn.label,
    changed_by: null,
  });

  return {
    ok: true,
    projectId: project.id,
    grant: signIntakeGrant(project.id),
  };
}
