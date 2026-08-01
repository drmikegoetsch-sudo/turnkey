"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/today");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Genuine bad credentials get a deliberately vague message so we don't
    // confirm which emails exist. Anything else (misconfigured keys, rate
    // limits, unconfirmed email) is a problem the operator needs to see.
    const badCredentials =
      error.code === "invalid_credentials" || error.status === 400;
    const message = badCredentials
      ? "Invalid email or password."
      : `Sign-in failed: ${error.message}`;
    console.error("[login] sign-in error", {
      status: error.status,
      code: error.code,
      message: error.message,
    });
    redirect(`/login?error=${encodeURIComponent(message)}`);
  }

  // Only allow internal redirects.
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/today");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
