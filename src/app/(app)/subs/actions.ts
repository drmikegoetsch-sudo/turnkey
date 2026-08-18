"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return { supabase, user };
}

export async function addSub(input: SubInput) {
  const { supabase } = await requireStaff();
  const clean = cleanSub(input);
  if (!clean.name) return { ok: false as const, error: "Name is required" };
  const { error } = await supabase.from("subcontractors").insert(clean);
  if (error) return { ok: false as const, error: "Could not add subcontractor" };
  revalidatePath("/subs");
  return { ok: true as const };
}

export async function updateSub(id: string, input: SubInput) {
  const { supabase } = await requireStaff();
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
  const { supabase } = await requireStaff();
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

// ---------------------------------------------------------------- invites

// Emails the sub a secure one-time link. They tap it, choose their own
// password, and land on their jobs list. No password is ever transmitted.
export async function inviteSub(id: string) {
  await requireStaff();
  const admin = createAdminClient();

  const { data: sub } = await admin
    .from("subcontractors")
    .select("id, name, email, user_id")
    .eq("id", id)
    .maybeSingle();

  if (!sub) return { ok: false as const, error: "Subcontractor not found" };
  if (!sub.email) {
    return {
      ok: false as const,
      error: "Add an email address for this sub first.",
    };
  }
  if (sub.user_id) {
    return { ok: false as const, error: "This sub already has an account." };
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const { error } = await admin.auth.admin.inviteUserByEmail(sub.email, {
    redirectTo: `${base}/accept-invite`,
    data: {
      role: "sub",
      subcontractor_id: sub.id,
      full_name: sub.name,
    },
  });

  if (error) {
    // The most common real-world failures: address already has an account,
    // or the project's email rate limit has been hit.
    const message = /already/i.test(error.message)
      ? "That email address already has an account."
      : `Could not send invite: ${error.message}`;
    return { ok: false as const, error: message };
  }

  await admin
    .from("subcontractors")
    .update({ invited_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/subs");
  return { ok: true as const, email: sub.email };
}

// Removes the sub's ability to sign in. Their directory entry, assignments,
// photos, and notes all stay — only the login goes away.
export async function revokeSubAccess(id: string) {
  await requireStaff();
  const admin = createAdminClient();

  const { data: sub } = await admin
    .from("subcontractors")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle();
  if (!sub?.user_id) {
    return { ok: false as const, error: "This sub doesn't have an account." };
  }

  const { error } = await admin.auth.admin.deleteUser(sub.user_id);
  if (error) return { ok: false as const, error: "Could not revoke access" };

  await admin
    .from("subcontractors")
    .update({ user_id: null, invited_at: null })
    .eq("id", id);

  revalidatePath("/subs");
  return { ok: true as const };
}
