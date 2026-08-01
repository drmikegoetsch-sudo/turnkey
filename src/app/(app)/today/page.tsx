import Link from "next/link";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, dotClass, type ColumnKind } from "@/lib/stages";
import { describeDue } from "@/lib/dates";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlarmClock,
  FileText,
  CalendarDays,
  Hammer,
  OctagonAlert,
  HardHat,
  ListChecks,
  Receipt,
} from "lucide-react";

export const metadata = { title: "Today" };
export const dynamic = "force-dynamic";

type ProjectRef = {
  id: string;
  title: string;
  project_value: number | string | null;
  customers: { name: string } | null;
  board_columns: { label: string; color: string; kind: ColumnKind } | null;
};

function Row({
  project,
  detail,
  urgent,
}: {
  project: ProjectRef;
  detail?: string | null;
  urgent?: boolean;
}) {
  const column = project.board_columns;
  return (
    <Link
      href={`/projects/${project.id}`}
      className="flex items-center justify-between gap-3 rounded-lg bg-white/45 px-3.5 py-3 ring-1 ring-white/50 backdrop-blur-md transition-colors hover:bg-white/70"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{project.title}</p>
        <p
          className={`truncate text-xs ${urgent ? "font-medium text-destructive" : "text-muted-foreground"}`}
        >
          {project.customers?.name}
          {detail ? ` · ${detail}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {project.project_value !== null ? (
          <span className="text-sm font-semibold">
            {formatMoney(Number(project.project_value))}
          </span>
        ) : null}
        {column ? (
          <span className="hidden items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs sm:flex">
            <span className={`size-1.5 rounded-full ${dotClass(column.color)}`} />
            {column.label}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

function Section({
  title,
  icon: Icon,
  count,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4 text-primary" />
          {title}
          <span className="text-sm font-normal text-muted-foreground">
            {count}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">{children}</CardContent>
    </Card>
  );
}

export default async function TodayPage() {
  const supabase = await createClient();
  const tz = process.env.APP_TIMEZONE ?? "America/Chicago";
  const today = formatInTimeZone(new Date(), tz, "yyyy-MM-dd");
  const dayStart = fromZonedTime(`${today}T00:00:00`, tz).toISOString();
  const dayEnd = fromZonedTime(`${today}T23:59:59.999`, tz).toISOString();

  // Column kinds keep these queries working no matter how the board is named.
  const { data: columns } = await supabase
    .from("board_columns")
    .select("id, kind")
    .is("archived_at", null);

  const idsOfKind = (...kinds: ColumnKind[]) =>
    (columns ?? [])
      .filter((c) => kinds.includes(c.kind as ColumnKind))
      .map((c) => c.id);

  const estimatingIds = idsOfKind("estimating");
  const activeIds = idsOfKind("active", "approved");
  const invoiceIds = idsOfKind("invoice");
  const closedIds = idsOfKind("closed");

  const projectSelect =
    "id, title, project_value, customers(name), board_columns(label, color, kind)";
  const empty = ["00000000-0000-0000-0000-000000000000"];

  const [
    { data: followUps },
    { data: estimates },
    { data: appts },
    { data: activeProjects },
    { data: blockedProjects },
    { data: subsToday },
    { data: tasksDue },
    { data: readyToInvoice },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select(`${projectSelect}, next_action, next_action_due`)
      .lte("next_action_due", today)
      .not("column_id", "in", `(${(closedIds.length ? closedIds : empty).join(",")})`)
      .is("archived_at", null)
      .order("next_action_due"),
    supabase
      .from("projects")
      .select(`${projectSelect}, column_changed_at`)
      .in("column_id", estimatingIds.length ? estimatingIds : empty)
      .is("archived_at", null)
      .order("column_changed_at"),
    supabase
      .from("appointments")
      .select(`id, starts_at, location, projects(${projectSelect})`)
      .gte("starts_at", dayStart)
      .lte("starts_at", dayEnd)
      .order("starts_at"),
    supabase
      .from("projects")
      .select(projectSelect)
      .in("column_id", activeIds.length ? activeIds : empty)
      .eq("is_blocked", false)
      .is("archived_at", null),
    supabase
      .from("projects")
      .select(`${projectSelect}, blocked_reason`)
      .eq("is_blocked", true)
      .is("archived_at", null),
    supabase
      .from("project_subcontractors")
      .select(
        `id, schedule_notes, subcontractors(name, trade), projects(${projectSelect})`
      )
      .lte("scheduled_start", today)
      .gte("scheduled_end", today)
      .neq("status", "complete"),
    supabase
      .from("tasks")
      .select(`id, title, due_date, projects(${projectSelect})`)
      .lte("due_date", today)
      .is("completed_at", null)
      .order("due_date"),
    supabase
      .from("projects")
      .select(projectSelect)
      .in("column_id", invoiceIds.length ? invoiceIds : empty)
      .is("archived_at", null),
  ]);

  const asRef = (p: unknown) => p as ProjectRef;
  const total =
    (followUps?.length ?? 0) +
    (estimates?.length ?? 0) +
    (appts?.length ?? 0) +
    (activeProjects?.length ?? 0) +
    (blockedProjects?.length ?? 0) +
    (subsToday?.length ?? 0) +
    (tasksDue?.length ?? 0) +
    (readyToInvoice?.length ?? 0);

  const invoiceTotal = (readyToInvoice ?? []).reduce(
    (sum, p) => sum + Number(p.project_value ?? 0),
    0
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Today</h1>
      <p className="mt-1 text-muted-foreground">
        {formatInTimeZone(new Date(), tz, "EEEE, MMMM d")}
        {total > 0 ? ` · ${total} thing${total === 1 ? "" : "s"} needing you` : ""}
      </p>

      <div className="mt-6 grid gap-4">
        <Section
          title="Follow-ups due"
          icon={AlarmClock}
          count={followUps?.length ?? 0}
        >
          {followUps?.map((p) => {
            const due = describeDue(p.next_action_due, today);
            return (
              <Row
                key={p.id}
                project={asRef(p)}
                detail={`${p.next_action ?? "Follow up"}${
                  due?.tone === "overdue" ? ` (due ${p.next_action_due})` : ""
                }`}
                urgent={due?.tone === "overdue"}
              />
            );
          })}
        </Section>

        <Section
          title="Appointments today"
          icon={CalendarDays}
          count={appts?.length ?? 0}
        >
          {appts?.map((a) => (
            <Row
              key={a.id}
              project={asRef(a.projects)}
              detail={`${formatInTimeZone(new Date(a.starts_at), tz, "h:mm a")}${
                a.location ? ` · ${a.location}` : ""
              }`}
            />
          ))}
        </Section>

        <Section
          title="Estimates needing attention"
          icon={FileText}
          count={estimates?.length ?? 0}
        >
          {estimates?.map((p) => {
            const days = Math.floor(
              (new Date(dayEnd).getTime() -
                new Date(p.column_changed_at).getTime()) /
                86400000
            );
            return (
              <Row
                key={p.id}
                project={asRef(p)}
                detail={days > 0 ? `${days} days in this stage` : "moved today"}
                urgent={days >= 5}
              />
            );
          })}
        </Section>

        <Section
          title="Blocked"
          icon={OctagonAlert}
          count={blockedProjects?.length ?? 0}
        >
          {blockedProjects?.map((p) => (
            <Row
              key={p.id}
              project={asRef(p)}
              detail={p.blocked_reason ?? "Waiting on something"}
              urgent
            />
          ))}
        </Section>

        <Section
          title="Subcontractors on site today"
          icon={HardHat}
          count={subsToday?.length ?? 0}
        >
          {subsToday?.map((a) => {
            const sub = a.subcontractors as unknown as {
              name: string;
              trade: string | null;
            } | null;
            return (
              <Row
                key={a.id}
                project={asRef(a.projects)}
                detail={`${sub?.name ?? "Sub"}${sub?.trade ? ` (${sub.trade})` : ""}${
                  a.schedule_notes ? ` · ${a.schedule_notes}` : ""
                }`}
              />
            );
          })}
        </Section>

        <Section title="Tasks due" icon={ListChecks} count={tasksDue?.length ?? 0}>
          {tasksDue?.map((t) => (
            <Row
              key={t.id}
              project={asRef(t.projects)}
              detail={t.title}
              urgent={!!t.due_date && t.due_date < today}
            />
          ))}
        </Section>

        <Section
          title="Active jobs"
          icon={Hammer}
          count={activeProjects?.length ?? 0}
        >
          {activeProjects?.map((p) => (
            <Row key={p.id} project={asRef(p)} />
          ))}
        </Section>

        <Section
          title={`Ready to invoice${invoiceTotal > 0 ? ` — ${formatMoney(invoiceTotal)}` : ""}`}
          icon={Receipt}
          count={readyToInvoice?.length ?? 0}
        >
          {readyToInvoice?.map((p) => (
            <Row key={p.id} project={asRef(p)} />
          ))}
        </Section>

        {total === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nothing needs attention today. Set a next action on your open
              projects and it&apos;ll show up here.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
