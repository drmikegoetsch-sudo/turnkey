import Link from "next/link";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, dotClass, type ColumnKind } from "@/lib/stages";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlarmClock,
  ArrowRight,
  CalendarDays,
  CircleCheckBig,
  FileText,
  HardHat,
  ListChecks,
  OctagonAlert,
  Receipt,
  TrendingUp,
} from "lucide-react";

export const metadata = { title: "Today" };
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------- helpers

type ProjectLite = {
  id: string;
  title: string;
  project_value: number | string | null;
  customers: { name: string } | null;
  board_columns: { label: string; color: string; kind: ColumnKind } | null;
};

type QueueItem = {
  key: string;
  projectId: string;
  projectTitle: string;
  customer: string;
  value: number | null;
  action: string;
  kind: "follow_up" | "task" | "estimate";
  due: string | null; // null = no date (estimate aging)
  overdue: boolean;
  ageDays?: number;
};

const KIND_META = {
  follow_up: { label: "Follow-up", icon: AlarmClock },
  task: { label: "Task", icon: ListChecks },
  estimate: { label: "Estimate", icon: FileText },
} as const;

function num(v: number | string | null | undefined) {
  return v === null || v === undefined ? null : Number(v);
}

// ---------------------------------------------------------------- page

export default async function TodayPage() {
  const supabase = await createClient();
  const tz = process.env.APP_TIMEZONE ?? "America/Chicago";
  const now = new Date();
  const today = formatInTimeZone(now, tz, "yyyy-MM-dd");
  const dayStart = fromZonedTime(`${today}T00:00:00`, tz).toISOString();
  const dayEnd = fromZonedTime(`${today}T23:59:59.999`, tz).toISOString();

  const [{ data: openProjects }, { data: appts }, { data: subsToday }, { data: tasksDue }] =
    await Promise.all([
      supabase
        .from("projects")
        .select(
          `id, title, project_value, is_blocked, blocked_reason, next_action,
           next_action_due, column_changed_at,
           customers(name), board_columns(label, color, kind)`
        )
        .is("archived_at", null),
      supabase
        .from("appointments")
        .select(
          "id, starts_at, location, notes, projects(id, title, project_value, customers(name), board_columns(label, color, kind))"
        )
        .gte("starts_at", dayStart)
        .lte("starts_at", dayEnd)
        .order("starts_at"),
      supabase
        .from("project_subcontractors")
        .select(
          `id, schedule_notes, subcontractors(name, trade, phone),
           projects(id, title, project_value, customers(name), board_columns(label, color, kind))`
        )
        .lte("scheduled_start", today)
        .gte("scheduled_end", today)
        .neq("status", "complete"),
      supabase
        .from("tasks")
        .select(
          "id, title, due_date, projects(id, title, project_value, customers(name), board_columns(label, color, kind))"
        )
        .lte("due_date", today)
        .is("completed_at", null)
        .order("due_date"),
    ]);

  const kindOf = (p: { board_columns: unknown }) =>
    (p.board_columns as { kind?: ColumnKind } | null)?.kind ?? "other";

  const open = (openProjects ?? []).filter((p) => kindOf(p) !== "closed");
  const asLite = (p: unknown) => p as ProjectLite;

  // ---- the numbers that matter to the owner ----
  const pipelineTotal = open.reduce((s, p) => s + (num(p.project_value) ?? 0), 0);
  const readyToInvoice = open.filter((p) => kindOf(p) === "invoice");
  const readyTotal = readyToInvoice.reduce(
    (s, p) => s + (num(p.project_value) ?? 0),
    0
  );
  const blocked = open.filter((p) => p.is_blocked);
  const blockedTotal = blocked.reduce(
    (s, p) => s + (num(p.project_value) ?? 0),
    0
  );
  const activeJobs = open.filter(
    (p) => kindOf(p) === "active" || kindOf(p) === "approved"
  );

  // ---- one prioritized queue instead of parallel lists ----
  const queue: QueueItem[] = [];

  for (const p of open) {
    if (p.next_action_due && p.next_action_due <= today) {
      queue.push({
        key: `f-${p.id}`,
        projectId: p.id,
        projectTitle: p.title,
        customer: (p.customers as unknown as { name: string } | null)?.name ?? "",
        value: num(p.project_value),
        action: p.next_action ?? "Follow up",
        kind: "follow_up",
        due: p.next_action_due,
        overdue: p.next_action_due < today,
      });
    }
  }

  for (const t of tasksDue ?? []) {
    const p = asLite(t.projects);
    if (!p || kindOf(p) === "closed") continue;
    queue.push({
      key: `t-${t.id}`,
      projectId: p.id,
      projectTitle: p.title,
      customer: p.customers?.name ?? "",
      value: num(p.project_value),
      action: t.title,
      kind: "task",
      due: t.due_date,
      overdue: !!t.due_date && t.due_date < today,
    });
  }

  // Estimates sitting too long are lost revenue — surface after day 3.
  for (const p of open) {
    if (kindOf(p) !== "estimating") continue;
    const age = Math.floor(
      (new Date(dayEnd).getTime() - new Date(p.column_changed_at).getTime()) /
        86400000
    );
    const hasDatedAction = p.next_action_due && p.next_action_due <= today;
    if (age >= 3 && !hasDatedAction) {
      queue.push({
        key: `e-${p.id}`,
        projectId: p.id,
        projectTitle: p.title,
        customer: (p.customers as unknown as { name: string } | null)?.name ?? "",
        value: num(p.project_value),
        action: `Estimate sitting ${age} days — nudge the customer`,
        kind: "estimate",
        due: null,
        overdue: age >= 7,
      });
    }
  }

  queue.sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    return (b.value ?? 0) - (a.value ?? 0); // biggest money first within a tier
  });

  const overdueCount = queue.filter((q) => q.overdue).length;

  // ---- today's schedule: appointments (timed) + subs on site (all day) ----
  const schedule = [
    ...(appts ?? []).map((a) => ({
      key: `a-${a.id}`,
      time: formatInTimeZone(new Date(a.starts_at), tz, "h:mm a"),
      sort: new Date(a.starts_at).getTime(),
      icon: CalendarDays,
      label: asLite(a.projects)?.title ?? "Appointment",
      detail: [
        asLite(a.projects)?.customers?.name,
        a.location ?? undefined,
      ]
        .filter(Boolean)
        .join(" · "),
      projectId: asLite(a.projects)?.id,
    })),
    ...(subsToday ?? []).map((s) => {
      const sub = s.subcontractors as unknown as {
        name: string;
        trade: string | null;
      } | null;
      return {
        key: `s-${s.id}`,
        time: "On site",
        sort: Number.MAX_SAFE_INTEGER,
        icon: HardHat,
        label: `${sub?.name ?? "Sub"}${sub?.trade ? ` (${sub.trade})` : ""}`,
        detail: [asLite(s.projects)?.title, s.schedule_notes ?? undefined]
          .filter(Boolean)
          .join(" · "),
        projectId: asLite(s.projects)?.id,
      };
    }),
  ].sort((a, b) => a.sort - b.sort);

  const dateLabel = formatInTimeZone(now, tz, "EEEE, MMMM d");

  // ------------------------------------------------------------ render

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Today</h1>
      <p className="mt-1 text-muted-foreground">{dateLabel}</p>

      {/* ---- the four numbers that run the business ---- */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Pipeline"
          value={formatMoney(pipelineTotal) ?? "$0"}
          sub={`${open.length} open project${open.length === 1 ? "" : "s"}`}
          icon={TrendingUp}
        />
        <StatTile
          label="Ready to bill"
          value={formatMoney(readyTotal) ?? "$0"}
          sub={
            readyToInvoice.length > 0
              ? `${readyToInvoice.length} job${readyToInvoice.length === 1 ? "" : "s"} — invoice now`
              : "Nothing waiting"
          }
          icon={Receipt}
          tone={readyToInvoice.length > 0 ? "good" : undefined}
          href="#invoice"
        />
        <StatTile
          label="Overdue"
          value={String(overdueCount)}
          sub={overdueCount > 0 ? "actions past due" : "all caught up"}
          icon={overdueCount > 0 ? OctagonAlert : CircleCheckBig}
          tone={overdueCount > 0 ? "serious" : "good"}
          href="#queue"
        />
        <StatTile
          label="Scheduled today"
          value={String(schedule.length)}
          sub={
            schedule.length > 0
              ? `${(appts ?? []).length} visit${(appts ?? []).length === 1 ? "" : "s"}, ${(subsToday ?? []).length} sub${(subsToday ?? []).length === 1 ? "" : "s"}`
              : "clear calendar"
          }
          icon={CalendarDays}
          href="#schedule"
        />
      </div>

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ---------- left: the action queue ---------- */}
        <div className="grid content-start gap-5">
          <Card id="queue">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Do these first{" "}
                {queue.length > 0 ? (
                  <span className="text-sm font-normal text-muted-foreground">
                    {queue.length}
                  </span>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {queue.map((q) => {
                const Meta = KIND_META[q.kind];
                return (
                  <Link
                    key={q.key}
                    href={`/projects/${q.projectId}`}
                    className="group flex min-w-0 items-center gap-3 rounded-xl bg-white/45 p-3 ring-1 ring-white/50 backdrop-blur-md transition-colors hover:bg-white/70"
                  >
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
                        q.overdue
                          ? "bg-destructive/10 text-destructive"
                          : "bg-primary/15 text-primary-foreground/80"
                      }`}
                    >
                      <Meta.icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {q.action}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {q.projectTitle}
                        {q.customer ? ` · ${q.customer}` : ""}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      {q.value !== null ? (
                        <span className="text-sm font-semibold tabular-nums">
                          {formatMoney(q.value)}
                        </span>
                      ) : null}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          q.overdue
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {q.overdue ? "Overdue" : Meta.label}
                      </span>
                    </span>
                  </Link>
                );
              })}
              {queue.length === 0 ? (
                <div className="flex items-center gap-3 rounded-xl bg-white/45 p-4 ring-1 ring-white/50">
                  <CircleCheckBig className="size-5 shrink-0 text-emerald-600" />
                  <p className="text-sm text-muted-foreground">
                    Nothing due. Set next actions on open projects and
                    they&apos;ll queue up here each morning.
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* ---------- blocked = money at risk ---------- */}
          {blocked.length > 0 ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <OctagonAlert className="size-4 text-destructive" />
                  Blocked
                  <span className="text-sm font-normal text-muted-foreground">
                    {formatMoney(blockedTotal)} waiting
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                {blocked.map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 transition-colors hover:bg-destructive/10"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {p.title}
                      </span>
                      <span className="block truncate text-xs text-destructive">
                        {p.blocked_reason ?? "Waiting on something"}
                      </span>
                    </span>
                    {num(p.project_value) !== null ? (
                      <span className="shrink-0 text-sm font-semibold tabular-nums">
                        {formatMoney(num(p.project_value))}
                      </span>
                    ) : null}
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* ---------- right rail: schedule + money ---------- */}
        <div className="grid content-start gap-5">
          <Card id="schedule">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="size-4 text-primary" />
                Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {schedule.map((s) => (
                <Link
                  key={s.key}
                  href={s.projectId ? `/projects/${s.projectId}` : "#"}
                  className="flex min-w-0 items-center gap-3 rounded-lg bg-white/45 px-3 py-2.5 ring-1 ring-white/50 backdrop-blur-md transition-colors hover:bg-white/70"
                >
                  <span className="w-16 shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                    {s.time}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {s.label}
                    </span>
                    {s.detail ? (
                      <span className="block truncate text-xs text-muted-foreground">
                        {s.detail}
                      </span>
                    ) : null}
                  </span>
                </Link>
              ))}
              {schedule.length === 0 ? (
                <p className="rounded-lg bg-white/45 p-3 text-sm text-muted-foreground ring-1 ring-white/50">
                  Nothing on the calendar today.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card id="invoice">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Receipt className="size-4 text-emerald-600" />
                Ready to bill
                {readyTotal > 0 ? (
                  <span className="text-sm font-normal text-muted-foreground">
                    {formatMoney(readyTotal)}
                  </span>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {readyToInvoice.map((p) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-emerald-500/10 px-3 py-2.5 ring-1 ring-emerald-500/20 transition-colors hover:bg-emerald-500/20"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {p.title}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {(p.customers as unknown as { name: string } | null)?.name}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatMoney(num(p.project_value)) ?? "—"}
                  </span>
                </Link>
              ))}
              {readyToInvoice.length === 0 ? (
                <p className="rounded-lg bg-white/45 p-3 text-sm text-muted-foreground ring-1 ring-white/50">
                  Nothing to invoice yet — finished jobs land here.
                </p>
              ) : null}
            </CardContent>
          </Card>

          {activeJobs.length > 0 ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <HardHat className="size-4 text-amber-600" />
                  In progress
                  <span className="text-sm font-normal text-muted-foreground">
                    {activeJobs.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-1.5">
                {activeJobs.map((p) => {
                  const col = p.board_columns as unknown as {
                    label: string;
                    color: string;
                  } | null;
                  return (
                    <Link
                      key={p.id}
                      href={`/projects/${p.id}`}
                      className="group flex min-w-0 items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-white/60"
                    >
                      <span
                        className={`size-2 shrink-0 rounded-full ${dotClass(col?.color ?? "slate")}`}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {p.title}
                      </span>
                      {num(p.project_value) !== null ? (
                        <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                          {formatMoney(num(p.project_value))}
                        </span>
                      ) : null}
                      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- stat tile

function StatTile({
  label,
  value,
  sub,
  icon: Icon,
  tone,
  href,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "good" | "serious";
  href?: string;
}) {
  const body = (
    <div className="glass flex h-full flex-col rounded-2xl p-4 transition-transform hover:-translate-y-0.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          {label}
        </span>
        <Icon
          className={`size-4 shrink-0 ${
            tone === "serious"
              ? "text-destructive"
              : tone === "good"
                ? "text-emerald-600"
                : "text-muted-foreground"
          }`}
        />
      </div>
      <span className="mt-2 font-heading text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
        {value}
      </span>
      <span
        className={`mt-1 text-xs ${
          tone === "serious" ? "font-medium text-destructive" : "text-muted-foreground"
        }`}
      >
        {sub}
      </span>
    </div>
  );
  return href ? <a href={href}>{body}</a> : body;
}
