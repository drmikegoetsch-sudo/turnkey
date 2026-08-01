import { createClient } from "@/lib/supabase/server";
import { NewProjectForm } from "./new-project-form";

export const metadata = { title: "New Project" };
export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const supabase = await createClient();
  const [{ data: types }, { data: columns }] = await Promise.all([
    supabase
      .from("project_types")
      .select("label")
      .eq("active", true)
      .order("position"),
    supabase
      .from("board_columns")
      .select("id, label")
      .is("archived_at", null)
      .order("position"),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">New Project</h1>
      <p className="mt-1 text-muted-foreground">
        For leads that come in by phone, text, or in person.
      </p>
      <div className="mt-6">
        <NewProjectForm
          projectTypes={types?.map((t) => t.label) ?? []}
          columns={(columns ?? []).map((c) => ({ id: c.id, label: c.label }))}
        />
      </div>
    </div>
  );
}
