import { formatInTimeZone } from "date-fns-tz";
import { createClient } from "@/lib/supabase/server";
import type { BoardColumn, ColumnColor, ColumnKind } from "@/lib/stages";
import { BoardClient, type BoardProject } from "./board-client";

export const metadata = { title: "Board" };
export const dynamic = "force-dynamic";

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; closed?: string }>;
}) {
  const { q, closed } = await searchParams;
  const supabase = await createClient();
  const tz = process.env.APP_TIMEZONE ?? "America/Chicago";
  const today = formatInTimeZone(new Date(), tz, "yyyy-MM-dd");

  const { data: columnRows } = await supabase
    .from("board_columns")
    .select("id, label, description, kind, color, position")
    .is("archived_at", null)
    .order("position");

  const columns: BoardColumn[] = (columnRows ?? []).map((c) => ({
    id: c.id,
    label: c.label,
    description: c.description,
    kind: c.kind as ColumnKind,
    color: c.color as ColumnColor,
    position: c.position,
  }));

  let query = supabase
    .from("projects")
    .select(
      `id, title, column_id, board_position, next_action, next_action_due,
       column_changed_at, project_type, project_value, is_blocked,
       customers(name),
       photos(count), project_subcontractors(count)`
    )
    .is("archived_at", null)
    .order("board_position");

  if (q?.trim()) {
    const term = `%${q.trim()}%`;
    query = query.or(
      `title.ilike.${term},property_address.ilike.${term},scope.ilike.${term}`
    );
  }

  const { data } = await query;

  // Newest photo per project for the card thumbnail.
  const projectIds = (data ?? []).map((p) => p.id);
  const thumbPaths = new Map<string, string>();
  if (projectIds.length > 0) {
    const { data: photos } = await supabase
      .from("photos")
      .select("project_id, storage_path, created_at")
      .in("project_id", projectIds)
      .order("created_at", { ascending: false });
    photos?.forEach((p) => {
      if (!thumbPaths.has(p.project_id)) {
        thumbPaths.set(p.project_id, p.storage_path);
      }
    });
  }

  const thumbUrls = new Map<string, string>();
  if (thumbPaths.size > 0) {
    const entries = [...thumbPaths.entries()];
    const { data: signed } = await supabase.storage
      .from("project-photos")
      .createSignedUrls(
        entries.map(([, path]) => path),
        3600
      );
    signed?.forEach((s, i) => {
      if (s.signedUrl) thumbUrls.set(entries[i][0], s.signedUrl);
    });
  }

  const countOf = (rel: unknown) =>
    (rel as { count: number }[] | null)?.[0]?.count ?? 0;

  const projects: BoardProject[] = (data ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    columnId: p.column_id,
    boardPosition: p.board_position,
    nextAction: p.next_action,
    nextActionDue: p.next_action_due,
    projectType: p.project_type,
    projectValue: p.project_value === null ? null : Number(p.project_value),
    isBlocked: p.is_blocked,
    customerName:
      (p.customers as unknown as { name: string } | null)?.name ?? "",
    photoCount: countOf(p.photos),
    subCount: countOf(p.project_subcontractors),
    thumbUrl: thumbUrls.get(p.id) ?? null,
  }));

  return (
    <BoardClient
      columns={columns}
      initialProjects={projects}
      today={today}
      searchTerm={q ?? ""}
      showClosed={closed === "1"}
    />
  );
}
