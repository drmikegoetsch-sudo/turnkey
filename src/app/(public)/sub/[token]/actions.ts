"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { findActiveShareLink } from "@/lib/share-links";

export async function markWorkComplete(token: string) {
  const link = await findActiveShareLink(token);
  if (!link || link.kind !== "sub" || !link.subcontractor_id) {
    return { ok: false as const, error: "This link is no longer active" };
  }
  const admin = createAdminClient();

  const { error } = await admin
    .from("project_subcontractors")
    .update({ status: "complete", completed_at: new Date().toISOString() })
    .eq("project_id", link.project_id)
    .eq("subcontractor_id", link.subcontractor_id);
  if (error) return { ok: false as const, error: "Something went wrong" };

  const { data: sub } = await admin
    .from("subcontractors")
    .select("name")
    .eq("id", link.subcontractor_id)
    .single();

  await admin.from("notes").insert({
    project_id: link.project_id,
    kind: "note",
    visibility: "internal",
    body: `${sub?.name ?? "Subcontractor"} marked their work complete.`,
    author_kind: "sub",
    share_link_id: link.id,
  });

  revalidatePath(`/sub/${token}`);
  revalidatePath(`/projects/${link.project_id}`);
  return { ok: true as const };
}

export async function reportIssue(token: string, message: string) {
  const link = await findActiveShareLink(token);
  if (!link || link.kind !== "sub") {
    return { ok: false as const, error: "This link is no longer active" };
  }
  const clean = message.slice(0, 5000).trim();
  if (!clean) return { ok: false as const, error: "Describe the issue first" };

  const admin = createAdminClient();
  const { data: sub } = link.subcontractor_id
    ? await admin
        .from("subcontractors")
        .select("name")
        .eq("id", link.subcontractor_id)
        .single()
    : { data: null };

  const { error } = await admin.from("notes").insert({
    project_id: link.project_id,
    kind: "issue",
    visibility: "internal",
    body: `${sub?.name ?? "Subcontractor"} reported an issue:\n${clean}`,
    author_kind: "sub",
    share_link_id: link.id,
  });
  if (error) return { ok: false as const, error: "Something went wrong" };

  revalidatePath(`/projects/${link.project_id}`);
  return { ok: true as const };
}
