import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/(auth)/login/actions";
import { TopBar } from "@/components/top-bar";

function initialsFor(name: string, email: string) {
  const source = name.trim() || email.split("@")[0].replace(/[._-]/g, " ");
  const parts = source.split(/\s+/).filter(Boolean);
  const letters = parts.length >= 2 ? [parts[0][0], parts[1][0]] : [source[0]];
  return letters.join("").toUpperCase();
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="app-ambient flex min-h-svh flex-col">
      <Suspense fallback={<div className="h-14 border-b bg-card" />}>
        <TopBar
          email={user.email ?? ""}
          initials={initialsFor(profile?.full_name ?? "", user.email ?? "")}
          onSignOut={logout}
        />
      </Suspense>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
