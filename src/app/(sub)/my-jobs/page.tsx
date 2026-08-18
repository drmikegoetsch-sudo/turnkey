import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { getSubIdentity } from "@/lib/sub-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ChevronRight, MapPin, CircleCheckBig } from "lucide-react";

export const metadata = { title: "My Jobs" };
export const dynamic = "force-dynamic";

export default async function MyJobsPage() {
  const identity = (await getSubIdentity())!; // layout guarantees non-null
  const admin = createAdminClient();
  const tz = process.env.APP_TIMEZONE ?? "America/Chicago";
  const today = formatInTimeZone(new Date(), tz, "yyyy-MM-dd");

  // Only this sub's assignments, and only the project fields they need —
  // no customer names, no budgets, no internal notes.
  const { data: assignments } = await admin
    .from("project_subcontractors")
    .select(
      `id, status, scheduled_start, scheduled_end, schedule_notes, scope_notes,
       projects(id, title, property_address)`
    )
    .eq("subcontractor_id", identity.subcontractorId)
    .order("scheduled_start", { nullsFirst: false });

  const rows = (assignments ?? []).map((a) => ({
    id: a.id,
    status: a.status as "assigned" | "in_progress" | "complete",
    start: a.scheduled_start as string | null,
    end: a.scheduled_end as string | null,
    scheduleNotes: a.schedule_notes as string | null,
    scopeNotes: a.scope_notes as string | null,
    project: a.projects as unknown as {
      id: string;
      title: string;
      property_address: string;
    } | null,
  }));

  const openJobs = rows.filter((r) => r.status !== "complete");
  const doneJobs = rows.filter((r) => r.status === "complete");

  const onSiteToday = (r: (typeof rows)[number]) =>
    !!r.start && !!r.end && r.start <= today && today <= r.end;

  function JobCard({ row }: { row: (typeof rows)[number] }) {
    if (!row.project) return null;
    return (
      <Link href={`/my-jobs/${row.project.id}`}>
        <Card className="transition-shadow hover:shadow-md">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate font-medium">{row.project.title}</h2>
                {onSiteToday(row) ? (
                  <Badge className="gap-1">Today</Badge>
                ) : null}
                {row.status === "complete" ? (
                  <Badge variant="secondary" className="gap-1">
                    <CircleCheckBig className="size-3" /> Done
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" />
                {row.project.property_address}
              </p>
              {row.start ? (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarDays className="size-3.5 shrink-0" />
                  {row.start}
                  {row.end && row.end !== row.start ? ` → ${row.end}` : ""}
                  {row.scheduleNotes ? ` · ${row.scheduleNotes}` : ""}
                </p>
              ) : null}
            </div>
            <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        My Jobs
      </h1>
      <p className="mt-1 text-muted-foreground">
        {openJobs.length > 0
          ? `${openJobs.length} active job${openJobs.length === 1 ? "" : "s"}`
          : "Nothing active right now."}
      </p>

      <div className="mt-5 grid gap-3">
        {openJobs.map((row) => (
          <JobCard key={row.id} row={row} />
        ))}
        {openJobs.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Turnkey hasn&apos;t assigned you a job yet. You&apos;ll see it
              here as soon as they do.
            </CardContent>
          </Card>
        ) : null}
      </div>

      {doneJobs.length > 0 ? (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm text-muted-foreground">
            {doneJobs.length} completed job{doneJobs.length === 1 ? "" : "s"}
          </summary>
          <div className="mt-3 grid gap-3 opacity-70">
            {doneJobs.map((row) => (
              <JobCard key={row.id} row={row} />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
