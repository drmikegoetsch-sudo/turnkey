import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./settings-client";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const [{ data: types }, { data: profiles }] = await Promise.all([
    supabase.from("project_types").select("*").order("position"),
    supabase.from("profiles").select("full_name, email").order("full_name"),
  ]);

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <SettingsClient
        types={(types ?? []).map((t) => ({
          id: t.id,
          label: t.label,
          active: t.active,
        }))}
        team={(profiles ?? []).map((p) => ({
          name: p.full_name,
          email: p.email,
        }))}
      />
    </div>
  );
}
