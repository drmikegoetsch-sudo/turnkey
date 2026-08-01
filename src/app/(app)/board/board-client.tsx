"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  type BoardColumn,
  dotClass,
  formatMoney,
} from "@/lib/stages";
import { describeDue, DUE_TONE_CLASSES } from "@/lib/dates";
import { moveProject } from "./actions";
import { ColumnMenu } from "./column-menu";
import { NewColumnDialog } from "./new-column-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Camera, Users, Plus, ImageOff, OctagonAlert } from "lucide-react";

export type BoardProject = {
  id: string;
  title: string;
  columnId: string;
  boardPosition: number;
  nextAction: string | null;
  nextActionDue: string | null;
  projectType: string;
  projectValue: number | null;
  isBlocked: boolean;
  customerName: string;
  photoCount: number;
  subCount: number;
  thumbUrl: string | null;
};

function ProjectCard({
  project,
  today,
  dragging,
}: {
  project: BoardProject;
  today: string;
  dragging?: boolean;
}) {
  const due = describeDue(project.nextActionDue, today);
  const value = formatMoney(project.projectValue);

  return (
    <article
      className={`overflow-hidden rounded-xl bg-card/70 shadow-sm ring-1 ring-white/60 backdrop-blur-xl backdrop-saturate-150 transition-shadow ${
        dragging ? "opacity-50" : "hover:shadow-lg hover:shadow-black/10"
      }`}
    >
      {project.thumbUrl ? (
        <div className="aspect-[16/10] w-full overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={project.thumbUrl}
            alt=""
            className="size-full object-cover"
            loading="lazy"
            draggable={false}
          />
        </div>
      ) : null}

      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-base font-semibold leading-none">
            {value ?? <span className="text-muted-foreground">TBD</span>}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            {project.isBlocked ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                <OctagonAlert className="size-3" />
                Blocked
              </span>
            ) : null}
            {due ? (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${DUE_TONE_CLASSES[due.tone]}`}
              >
                <span className="size-1.5 rounded-full bg-current opacity-70" />
                {due.label}
              </span>
            ) : null}
          </div>
        </div>

        <h3 className="mt-2 text-sm font-semibold leading-snug">
          {project.title}
        </h3>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {project.customerName}
          {project.projectType ? ` · ${project.projectType}` : ""}
        </p>

        <div className="mt-3 flex items-center justify-between gap-2 border-t pt-2.5">
          <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {project.nextAction ?? (
              <span className="italic">No next action set</span>
            )}
          </p>
          <div className="flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
            {project.photoCount > 0 ? (
              <span className="flex items-center gap-0.5">
                <Camera className="size-3.5" />
                {project.photoCount}
              </span>
            ) : (
              <ImageOff className="size-3.5 opacity-50" />
            )}
            {project.subCount > 0 ? (
              <span className="flex items-center gap-0.5">
                <Users className="size-3.5" />
                {project.subCount}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function SortableCard({
  project,
  today,
}: {
  project: BoardProject;
  today: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: project.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="touch-manipulation"
      {...attributes}
      {...listeners}
    >
      <Link
        href={`/projects/${project.id}`}
        onClick={(e) => {
          if (isDragging) e.preventDefault();
        }}
        draggable={false}
      >
        <ProjectCard project={project} today={today} dragging={isDragging} />
      </Link>
    </div>
  );
}

function Column({
  column,
  columns,
  projects,
  today,
  isFirst,
  isLast,
}: {
  column: BoardColumn;
  columns: BoardColumn[];
  projects: BoardProject[];
  today: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${column.id}` });
  const total = projects.reduce((sum, p) => sum + (p.projectValue ?? 0), 0);

  return (
    <section className="glass-panel flex w-[82vw] max-w-[300px] shrink-0 snap-center flex-col rounded-2xl sm:w-[290px] sm:snap-align-none">
      <header className="flex items-start justify-between gap-2 px-3.5 pb-2 pt-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`size-2 shrink-0 rounded-full ${dotClass(column.color)}`} />
            <h2 className="truncate text-sm font-semibold">{column.label}</h2>
            <span className="text-sm text-muted-foreground">
              {projects.length}
            </span>
          </div>
          <p className="mt-0.5 pl-4 text-sm text-muted-foreground">
            {total > 0 ? formatMoney(total) : "—"}
          </p>
        </div>
        <div className="flex shrink-0 items-center">
          {isFirst ? (
            <Button
              asChild
              size="icon"
              variant="ghost"
              className="size-7 text-muted-foreground"
            >
              <Link href="/projects/new" aria-label="Add a lead">
                <Plus className="size-4" />
              </Link>
            </Button>
          ) : null}
          <ColumnMenu
            column={column}
            columns={columns}
            projectCount={projects.length}
            isFirst={isFirst}
            isLast={isLast}
          />
        </div>
      </header>

      <SortableContext
        items={projects.map((p) => p.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={`flex min-h-32 flex-1 flex-col gap-2.5 overflow-y-auto p-2.5 pt-0.5 ${
            isOver ? "rounded-b-2xl bg-accent/60" : ""
          }`}
        >
          {projects.map((p) => (
            <SortableCard key={p.id} project={p} today={today} />
          ))}
          {projects.length === 0 ? (
            <p className="px-1 py-6 text-center text-xs text-muted-foreground">
              Nothing here yet.
            </p>
          ) : null}
        </div>
      </SortableContext>
    </section>
  );
}

export function BoardClient({
  columns,
  initialProjects,
  today,
  searchTerm,
  showClosed,
}: {
  columns: BoardColumn[];
  initialProjects: BoardProject[];
  today: string;
  searchTerm: string;
  showClosed: boolean;
}) {
  const [projects, setProjects] = useState(initialProjects);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Mouse drags start after a small movement; touch needs a long-press so
  // one-finger swiping between columns still scrolls the board.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    })
  );

  // Closed columns stay out of the way until asked for — unless a search is
  // running, in which case people expect to find old jobs too.
  const visibleColumns = useMemo(
    () =>
      showClosed || searchTerm
        ? columns
        : columns.filter((c) => c.kind !== "closed"),
    [columns, showClosed, searchTerm]
  );

  const byColumn = useMemo(() => {
    const map = new Map<string, BoardProject[]>();
    columns.forEach((c) => map.set(c.id, []));
    [...projects]
      .sort((a, b) => a.boardPosition - b.boardPosition)
      .forEach((p) => map.get(p.columnId)?.push(p));
    return map;
  }, [projects, columns]);

  const activeProject = projects.find((p) => p.id === activeId) ?? null;
  const hiddenClosedCount = columns
    .filter((c) => !visibleColumns.includes(c))
    .reduce((n, c) => n + (byColumn.get(c.id)?.length ?? 0), 0);

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const projectId = String(event.active.id);
    const overId = event.over?.id;
    if (!overId) return;

    const overKey = String(overId);
    const targetColumnId = overKey.startsWith("col-")
      ? overKey.slice(4)
      : projects.find((p) => p.id === overKey)?.columnId;
    if (!targetColumnId) return;

    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    const column = (byColumn.get(targetColumnId) ?? []).filter(
      (p) => p.id !== projectId
    );
    let index = column.length;
    if (!overKey.startsWith("col-")) {
      const overIndex = column.findIndex((p) => p.id === overKey);
      if (overIndex >= 0) index = overIndex;
    }
    const before = column[index - 1]?.boardPosition;
    const after = column[index]?.boardPosition;
    const position =
      before !== undefined && after !== undefined
        ? (before + after) / 2
        : before !== undefined
          ? before + 1
          : after !== undefined
            ? after - 1
            : 0;

    if (project.columnId === targetColumnId && project.boardPosition === position) {
      return;
    }

    const previous = projects;
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, columnId: targetColumnId, boardPosition: position }
          : p
      )
    );

    moveProject({ projectId, toColumnId: targetColumnId, position }).then(
      (res) => {
        if (!res.ok) {
          setProjects(previous);
          toast.error(res.error ?? "Could not move project");
        }
      }
    );
  }

  return (
    <div className="flex h-[calc(100svh-3.5rem)] flex-col overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-3 px-4 pb-4 pt-4 md:px-6 md:pt-5">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {searchTerm ? "Search Results" : "Your Projects"}
          </h1>
          <p className="mt-1 hidden text-muted-foreground sm:block">
            {searchTerm
              ? `${projects.length} project${projects.length === 1 ? "" : "s"} matching “${searchTerm}”`
              : "Every job, start to finish. Drag a card forward as it moves along."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hiddenClosedCount > 0 || showClosed ? (
            <Button asChild variant="ghost" size="sm">
              <Link href={showClosed ? "/board" : "/board?closed=1"}>
                {showClosed
                  ? "Hide closed"
                  : `Show closed (${hiddenClosedCount})`}
              </Link>
            </Button>
          ) : null}
          <Button asChild className="gap-2 rounded-full px-5">
            <Link href="/projects/new">
              <Plus className="size-4" /> New Lead
            </Link>
          </Button>
        </div>
      </div>

      <DndContext
        id="board-dnd"
        sensors={sensors}
        onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="flex flex-1 snap-x snap-mandatory items-stretch gap-3 overflow-x-auto px-4 pb-5 sm:snap-none md:px-6">
          {visibleColumns.map((column, i) => (
            <Column
              key={column.id}
              column={column}
              columns={columns}
              projects={byColumn.get(column.id) ?? []}
              today={today}
              isFirst={i === 0}
              isLast={i === visibleColumns.length - 1}
            />
          ))}
          <NewColumnDialog lastPosition={columns.at(-1)?.position ?? 0} />
        </div>
        <DragOverlay>
          {activeProject ? (
            <div className="w-[270px] rotate-2">
              <ProjectCard project={activeProject} today={today} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
