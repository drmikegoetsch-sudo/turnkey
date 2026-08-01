import { notFound } from "next/navigation";
import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { createClient } from "@/lib/supabase/server";
import {
  type BoardColumn,
  type ColumnColor,
  type ColumnKind,
  type PhotoType,
  BILLABLE_KINDS,
  formatMoney,
  projectNumber,
} from "@/lib/stages";
import { LifecycleCard } from "./lifecycle-card";
import { DoThisNext } from "./do-this-next";
import { ProjectTabs } from "./project-tabs";
import { EditProjectDialog } from "./edit-project-dialog";
import { SubAssignments } from "./sub-assignments";
import { AppointmentsPanel } from "./appointments-panel";
import { ShareLinksPanel } from "./share-links-panel";
import { IntakeDetails } from "./intake-details";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  MapPin,
  Phone,
  Mail,
  OctagonAlert,
} from "lucide-react";

export const dynamic = "force-dynamic";

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  );
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const tz = process.env.APP_TIMEZONE ?? "America/Chicago";
  const today = formatInTimeZone(new Date(), tz, "yyyy-MM-dd");

  const { data: project } = await supabase
    .from("projects")
    .select("*, customers(*), board_columns(id, label, description, kind, color, position)")
    .eq("id", id)
    .maybeSingle();
  if (!project) notFound();

  const [
    { data: columnRows },
    { data: tasks },
    { data: notes },
    { data: assignments },
    { data: subs },
    { data: appointments },
    { data: photos },
    { data: links },
    { data: intake },
    { data: types },
    { data: team },
  ] = await Promise.all([
    supabase
      .from("board_columns")
      .select("id, label, description, kind, color, position")
      .is("archived_at", null)
      .order("position"),
    supabase
      .from("tasks")
      .select("*, assignee:profiles!tasks_assigned_to_fkey(full_name)")
      .eq("project_id", id)
      .order("created_at"),
    supabase
      .from("notes")
      .select("*, profiles(full_name)")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("project_subcontractors")
      .select("*, subcontractors(name, company, trade, phone)")
      .eq("project_id", id)
      .order("created_at"),
    supabase.from("subcontractors").select("id, name, trade").order("name"),
    supabase
      .from("appointments")
      .select("*")
      .eq("project_id", id)
      .order("starts_at"),
    supabase
      .from("photos")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("share_links")
      .select("*, subcontractors(name)")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("intake_submissions")
      .select("*")
      .eq("project_id", id)
      .maybeSingle(),
    supabase
      .from("project_types")
      .select("label")
      .eq("active", true)
      .order("position"),
    supabase.from("profiles").select("id, full_name, email").order("full_name"),
  ]);

  const photoUrls = new Map<string, string>();
  if (photos && photos.length > 0) {
    const { data: signed } = await supabase.storage
      .from("project-photos")
      .createSignedUrls(
        photos.map((p) => p.storage_path),
        3600
      );
    signed?.forEach((s, i) => {
      if (s.signedUrl) photoUrls.set(photos[i].id, s.signedUrl);
    });
  }

  const columns: BoardColumn[] = (columnRows ?? []).map((c) => ({
    id: c.id,
    label: c.label,
    description: c.description,
    kind: c.kind as ColumnKind,
    color: c.color as ColumnColor,
    position: c.position,
  }));

  const currentColumn = project.board_columns as unknown as {
    id: string;
    label: string;
    description: string | null;
    kind: ColumnKind;
    color: ColumnColor;
  };

  const customer = project.customers as unknown as {
    name: string;
    phone: string | null;
    alt_phone: string | null;
    email: string | null;
  };

  const billable = BILLABLE_KINDS.includes(currentColumn.kind);
  const teamMembers = (team ?? []).map((t) => ({
    id: t.id,
    name: t.full_name || t.email.split("@")[0],
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 md:px-6 md:py-6">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-2 mb-3 gap-2 text-muted-foreground"
      >
        <Link href="/board">
          <ArrowLeft className="size-4" /> Back to board
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1.5 font-normal">
              <span
                className={`size-1.5 rounded-full ${
                  project.is_blocked ? "bg-destructive" : "bg-foreground"
                }`}
              />
              {currentColumn.label}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {project.project_type}
            </span>
            {project.is_blocked ? (
              <Badge variant="destructive" className="gap-1">
                <OctagonAlert className="size-3" /> Blocked
              </Badge>
            ) : null}
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {project.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {projectNumber(project.project_number)} · {customer?.name}
          </p>
        </div>
        <EditProjectDialog
          project={{
            id: project.id,
            title: project.title,
            property_address: project.property_address,
            project_type: project.project_type,
            scope: project.scope,
            budget_range: project.budget_range,
            project_value:
              project.project_value === null ? null : Number(project.project_value),
            timeline: project.timeline,
            quickbooks_url: project.quickbooks_url,
            is_blocked: project.is_blocked,
            blocked_reason: project.blocked_reason,
          }}
          projectTypes={types?.map((t) => t.label) ?? []}
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Main column */}
        <div className="grid content-start gap-5">
          <LifecycleCard
            projectId={project.id}
            columns={columns}
            currentColumnId={currentColumn.id}
            isBlocked={project.is_blocked}
            blockedReason={project.blocked_reason}
          />

          <DoThisNext
            projectId={project.id}
            nextAction={project.next_action}
            nextActionDue={project.next_action_due}
            columns={columns}
            currentColumnId={currentColumn.id}
            today={today}
          />

          <ProjectTabs
            projectId={project.id}
            today={today}
            team={teamMembers}
            tasks={(tasks ?? []).map((t) => ({
              id: t.id,
              title: t.title,
              dueDate: t.due_date,
              completedAt: t.completed_at,
              assignedTo: t.assigned_to,
              assigneeName:
                (t.assignee as unknown as { full_name: string } | null)
                  ?.full_name ?? null,
            }))}
            photos={(photos ?? []).map((p) => ({
              id: p.id,
              url: photoUrls.get(p.id) ?? "",
              photoType: p.photo_type as PhotoType,
              visibility: p.visibility as "internal" | "owner",
              caption: p.caption,
              uploadedByKind: p.uploaded_by_kind,
              createdAt: p.created_at,
            }))}
            notes={(notes ?? []).map((n) => ({
              id: n.id,
              body: n.body,
              kind: n.kind,
              visibility: n.visibility,
              authorKind: n.author_kind,
              authorName:
                (n.profiles as unknown as { full_name: string } | null)
                  ?.full_name ?? null,
              createdAt: n.created_at,
            }))}
          />

          {intake ? <IntakeDetails intake={intake} /> : null}
        </div>

        {/* Side rail */}
        <div className="grid content-start gap-5">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base">Billing</CardTitle>
              <Badge variant={billable ? "default" : "secondary"}>
                {billable ? "Ready to Bill" : "Not Yet Billable"}
              </Badge>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Project value</p>
                <p className="text-3xl font-semibold tracking-tight">
                  {formatMoney(
                    project.project_value === null
                      ? null
                      : Number(project.project_value)
                  ) ?? (
                    <span className="text-muted-foreground">Not set</span>
                  )}
                </p>
              </div>
              {project.budget_range ? (
                <>
                  <div className="border-t" />
                  <Detail
                    label="Budget range"
                    value={project.budget_range}
                  />
                </>
              ) : null}
              {project.quickbooks_url ? (
                <Button asChild variant="secondary" className="w-full gap-2">
                  <a
                    href={project.quickbooks_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FileText className="size-4" /> Open in QuickBooks
                    <ExternalLink className="size-3 opacity-60" />
                  </a>
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Add a QuickBooks estimate or invoice link from Edit.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Customer</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2.5 text-sm">
              <p className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                {project.property_address}
              </p>
              {customer?.phone ? (
                <a
                  href={`tel:${customer.phone}`}
                  className="flex items-center gap-2.5 hover:underline"
                >
                  <Phone className="size-4 shrink-0 text-muted-foreground" />
                  {customer.phone}
                </a>
              ) : null}
              {customer?.alt_phone ? (
                <a
                  href={`tel:${customer.alt_phone}`}
                  className="flex items-center gap-2.5 text-muted-foreground hover:underline"
                >
                  <Phone className="size-4 shrink-0" />
                  {customer.alt_phone} (alt)
                </a>
              ) : null}
              {customer?.email ? (
                <a
                  href={`mailto:${customer.email}`}
                  className="flex items-center gap-2.5 break-all hover:underline"
                >
                  <Mail className="size-4 shrink-0 text-muted-foreground" />
                  {customer.email}
                </a>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y">
                <Detail label="Timeline" value={project.timeline} />
                <Detail
                  label="Source"
                  value={project.source === "intake" ? "Website" : "Manual"}
                />
                <Detail
                  label="Created"
                  value={new Date(project.created_at).toLocaleDateString(
                    undefined,
                    { month: "short", day: "numeric" }
                  )}
                />
              </dl>
              {project.scope ? (
                <div className="mt-3 border-t pt-3">
                  <p className="text-sm text-muted-foreground">Scope of work</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">
                    {project.scope}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <SubAssignments
            projectId={project.id}
            assignments={(assignments ?? []).map((a) => ({
              id: a.id,
              subcontractorId: a.subcontractor_id,
              name:
                (a.subcontractors as unknown as { name: string } | null)
                  ?.name ?? "",
              trade:
                (a.subcontractors as unknown as { trade: string | null } | null)
                  ?.trade ?? null,
              scheduledStart: a.scheduled_start,
              scheduledEnd: a.scheduled_end,
              scheduleNotes: a.schedule_notes,
              scopeNotes: a.scope_notes,
              status: a.status,
            }))}
            directory={(subs ?? []).map((s) => ({
              id: s.id,
              name: s.name,
              trade: s.trade,
            }))}
          />

          <AppointmentsPanel
            projectId={project.id}
            appointments={(appointments ?? []).map((a) => ({
              id: a.id,
              kind: a.kind,
              startsAt: a.starts_at,
              location: a.location,
              notes: a.notes,
            }))}
          />

          <ShareLinksPanel
            projectId={project.id}
            links={(links ?? []).map((l) => ({
              id: l.id,
              kind: l.kind,
              label:
                l.label ??
                (l.kind === "sub"
                  ? `Sub link — ${(l.subcontractors as unknown as { name: string } | null)?.name ?? "unknown"}`
                  : "Owner status link"),
              createdAt: l.created_at,
              expiresAt: l.expires_at,
              revokedAt: l.revoked_at,
              lastAccessedAt: l.last_accessed_at,
            }))}
            subs={(subs ?? []).map((s) => ({ id: s.id, name: s.name }))}
          />
        </div>
      </div>
    </div>
  );
}
