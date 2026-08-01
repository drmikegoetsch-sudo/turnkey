import { createClient } from "@/lib/supabase/server";
import { SubsClient } from "./subs-client";

export const metadata = { title: "Subcontractors" };
export const dynamic = "force-dynamic";

export default async function SubsPage() {
  const supabase = await createClient();
  const { data: subs } = await supabase
    .from("subcontractors")
    .select("*, project_subcontractors(project_id, status)")
    .order("name");

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6">
      <SubsClient
        subs={(subs ?? []).map((s) => ({
          id: s.id,
          name: s.name,
          company: s.company,
          trade: s.trade,
          phone: s.phone,
          email: s.email,
          notes: s.notes,
          activeJobs: (
            s.project_subcontractors as { status: string }[] | null
          )?.filter((a) => a.status !== "complete").length ?? 0,
        }))}
      />
    </div>
  );
}
