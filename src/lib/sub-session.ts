import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type SubIdentity = {
  userId: string;
  subcontractorId: string;
  name: string;
};

// Resolves the signed-in user to a subcontractor record. Returns null for
// staff, for signed-out visitors, and for any account not linked to a sub —
// callers treat null as "no access".
export async function getSubIdentity(): Promise<SubIdentity | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "sub") return null;

  const { data: sub } = await admin
    .from("subcontractors")
    .select("id, name")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!sub) return null;

  return { userId: user.id, subcontractorId: sub.id, name: sub.name };
}

// Confirms this sub is actually assigned to the project before any read or
// write. Every sub-facing data path goes through here.
export async function getSubAssignment(
  subcontractorId: string,
  projectId: string
) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("project_subcontractors")
    .select(
      "id, status, scheduled_start, scheduled_end, schedule_notes, scope_notes, completed_at"
    )
    .eq("subcontractor_id", subcontractorId)
    .eq("project_id", projectId)
    .maybeSingle();
  return data ?? null;
}
