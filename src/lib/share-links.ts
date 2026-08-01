import "server-only";
import { createHash, randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export function generateToken() {
  return randomBytes(24).toString("base64url");
}

export function hashToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

export type ActiveShareLink = {
  id: string;
  project_id: string;
  kind: "sub" | "owner";
  subcontractor_id: string | null;
  label: string | null;
};

// Looks up a raw token and returns the link only if it is live
// (not revoked, not expired). Also stamps last_accessed_at.
export async function findActiveShareLink(
  rawToken: string
): Promise<ActiveShareLink | null> {
  if (!rawToken || rawToken.length > 100) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("share_links")
    .select("id, project_id, kind, subcontractor_id, label, expires_at, revoked_at")
    .eq("token_hash", hashToken(rawToken))
    .maybeSingle();

  if (!data) return null;
  if (data.revoked_at) return null;
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;

  await admin
    .from("share_links")
    .update({ last_accessed_at: new Date().toISOString() })
    .eq("id", data.id);

  return {
    id: data.id,
    project_id: data.project_id,
    kind: data.kind,
    subcontractor_id: data.subcontractor_id,
    label: data.label,
  };
}
