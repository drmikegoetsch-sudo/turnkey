"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSubIdentity, getSubAssignment } from "@/lib/sub-session";

// Every action re-checks the assignment server-side — a sub can never act on
// a project they aren't assigned to, even by guessing an id.
async function requireAssignment(projectId: string) {
  const identity = await getSubIdentity();
  if (!identity) return null;
  const assignment = await getSubAssignment(identity.subcontractorId, projectId);
  if (!assignment) return null;
  return { identity, assignment };
}

export async function markWorkComplete(projectId: string) {
  const ctx = await requireAssignment(projectId);
  if (!ctx) return { ok: false as const, error: "You're not on this job." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("project_subcontractors")
    .update({ status: "complete", completed_at: new Date().toISOString() })
    .eq("id", ctx.assignment.id);
  if (error) return { ok: false as const, error: "Something went wrong" };

  await admin.from("notes").insert({
    project_id: projectId,
    kind: "note",
    visibility: "internal",
    body: `${ctx.identity.name} marked their work complete.`,
    author_kind: "sub",
  });

  revalidatePath(`/my-jobs/${projectId}`);
  revalidatePath("/my-jobs");
  revalidatePath(`/projects/${projectId}`);
  return { ok: true as const };
}

export async function reportIssue(projectId: string, message: string) {
  const ctx = await requireAssignment(projectId);
  if (!ctx) return { ok: false as const, error: "You're not on this job." };

  const clean = message.slice(0, 5000).trim();
  if (!clean) return { ok: false as const, error: "Describe the issue first" };

  const admin = createAdminClient();
  const { error } = await admin.from("notes").insert({
    project_id: projectId,
    kind: "issue",
    visibility: "internal",
    body: `${ctx.identity.name} reported an issue:\n${clean}`,
    author_kind: "sub",
  });
  if (error) return { ok: false as const, error: "Something went wrong" };

  revalidatePath(`/my-jobs/${projectId}`);
  revalidatePath(`/projects/${projectId}`);
  return { ok: true as const };
}
