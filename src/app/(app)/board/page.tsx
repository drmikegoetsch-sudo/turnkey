import { formatInTimeZone } from "date-fns-tz";
import { createClient } from "@/lib/supabase/server";
import type { BoardColumn, ColumnColor, ColumnKind } from "@/lib/stages";
import { BoardClient, type BoardProject } from "./board-client";

export const metadata = { title: "Board" };
export const dynamic = "force-dynamic";

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; closed?: string; declined?: string }>;
}) {
  const { q, closed, declined } = await searchParams;
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
       column_changed_at, project_type, project_value, is_blocked, declined_at,
       declined_reason,
       customers(name),
       photos(count), project_subcontractors(count)`
    )
    .is("archived_at", null)
    .order("board_position");

  // Declined estimates are always fetched — the board hides them from the
  // working columns and shows them in their own Declined column on request,
  // the same way Closed works. Filtering them out here is what made the
  // Declined toggle and search come back empty.

  if (q?.trim()) {
    const raw = q.trim();
    // Characters that would break PostgREST's or() syntax or act as
    // wildcards are dropped from the user's text.
    const safe = raw.replace(/[,()*%\\]/g, " ").replace(/\s+/g, " ").trim();
    const term = `%${safe}%`;

    // People search by who the job is for far more than by the job title.
    const digits = raw.replace(/\D/g, "");
    const customerFilters = [`name.ilike.${term}`, `email.ilike.${term}`];
    if (digits.length >= 4) customerFilters.push(`phone.ilike.%${digits}%`);
    const { data: matchedCustomers } = await supabase
      .from("customers")
      .select("id")
      .or(customerFilters.join(","));

    const clauses = [
      `title.ilike.${term}`,
      `property_address.ilike.${term}`,
      `scope.ilike.${term}`,
    ];
    const customerIds = (matchedCustomers ?? []).map((c) => c.id);
    if (customerIds.length > 0) {
      clauses.push(`customer_id.in.(${customerIds.join(",")})`);
    }
    // "1023" or "TSN-1023" jumps straight to that project.
    const num = raw.match(/^(?:tsn[-\s]?)?(\d{3,7})$/i);
    if (num) clauses.push(`project_number.eq.${num[1]}`);

    query = query.or(clauses.join(","));
  }

  const { data } = await query;

  // Newest photo per project for the card thumbnail.
  const projectIds = (data ?? []).map((p) => p.id);
  const thumbPaths = new Map<string, string>();
  if (projectIds.length > 0) {
    const { data: photos } = await supabase
      .from("photos")
      .select("project_id, storage_path, thumbnail_path, media_kind, created_at")
      .in("project_id", projectIds)
      .order("created_at", { ascending: false });
    photos?.forEach((p) => {
      if (thumbPaths.has(p.project_id)) return;
      // A video's storage object isn't an image — use its poster frame, and
      // skip the card thumbnail entirely if the poster is missing.
      const path =
        p.media_kind === "video" ? p.thumbnail_path : p.storage_path;
      if (path) thumbPaths.set(p.project_id, path);
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
    isDeclined: !!p.declined_at,
    declinedReason: p.declined_reason ?? null,
    customerName:
      (p.customers as unknown as { name: string } | null)?.name ?? "",
    photoCount: countOf(p.photos),
    subCount: countOf(p.project_subcontractors),
    thumbUrl: thumbUrls.get(p.id) ?? null,
  }));

  return (
    <BoardClient
      // The board keeps its own copy of the project list for optimistic
      // drags. A new search or toggle must start from fresh server data
      // rather than the list it had before, so remount on any change.
      key={`${q ?? ""}|${closed ?? ""}|${declined ?? ""}`}
      columns={columns}
      initialProjects={projects}
      today={today}
      searchTerm={q ?? ""}
      showClosed={closed === "1"}
      showDeclined={declined === "1"}
    />
  );
}
