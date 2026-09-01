import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type PriorDecline = {
  projectId: string;
  projectNumber: number;
  title: string;
  projectValue: number | null;
  declinedAt: string;
  reason: string | null;
  note: string | null;
  address: string;
  matchedOn: ("phone" | "email" | "address")[];
};

function digits(v: string | null | undefined) {
  const d = (v ?? "").replace(/\D/g, "");
  return d || null;
}

function norm(v: string | null | undefined) {
  const t = (v ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  return t || null;
}

// Finds previously declined estimates for the same person or property.
// Matching on any of phone, alt phone, email, or address — people call from
// a different number or use a spouse's email, but the house doesn't move.
export async function findPriorDeclines(input: {
  excludeProjectId?: string;
  phone?: string | null;
  altPhone?: string | null;
  email?: string | null;
  address?: string | null;
}): Promise<PriorDecline[]> {
  const phoneKeys = [digits(input.phone), digits(input.altPhone)].filter(
    (v): v is string => !!v
  );
  const emailKey = norm(input.email);
  const addressKey = norm(input.address);

  if (phoneKeys.length === 0 && !emailKey && !addressKey) return [];

  const admin = createAdminClient();
  const { data } = await admin.from("declined_history").select("*");
  if (!data) return [];

  const matches: PriorDecline[] = [];
  for (const row of data) {
    if (input.excludeProjectId && row.project_id === input.excludeProjectId) {
      continue;
    }
    const matchedOn: PriorDecline["matchedOn"] = [];
    if (
      phoneKeys.length > 0 &&
      (phoneKeys.includes(row.phone_key) || phoneKeys.includes(row.alt_phone_key))
    ) {
      matchedOn.push("phone");
    }
    if (emailKey && row.email_key === emailKey) matchedOn.push("email");
    if (addressKey && row.address_key === addressKey) matchedOn.push("address");
    if (matchedOn.length === 0) continue;

    matches.push({
      projectId: row.project_id,
      projectNumber: row.project_number,
      title: row.title,
      projectValue:
        row.project_value === null ? null : Number(row.project_value),
      declinedAt: row.declined_at,
      reason: row.declined_reason,
      note: row.declined_note,
      address: row.property_address,
      matchedOn,
    });
  }

  return matches.sort(
    (a, b) =>
      new Date(b.declinedAt).getTime() - new Date(a.declinedAt).getTime()
  );
}
