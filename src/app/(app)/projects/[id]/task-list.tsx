"use client";

import { useOptimistic, useState, useTransition } from "react";
import {
  addTask,
  assignTask,
  deleteTask,
  reorderTask,
  toggleTask,
  updateTask,
} from "./actions";
import { describeDue } from "@/lib/dates";
import { SortableList } from "@/components/sortable-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Check,
  Circle,
  CircleCheck,
  Plus,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";

export type Task = {
  id: string;
  title: string;
  dueDate: string | null;
  completedAt: string | null;
  assignedTo: string | null;
  assigneeName: string | null;
  position: number;
};

type Team = { id: string; name: string }[];

type TaskChange =
  | { type: "toggle"; id: string; done: boolean }
  | { type: "reorder"; id: string; position: number }
  | { type: "edit"; id: string; title: string; dueDate: string | null }
  | { type: "assign"; id: string; assignedTo: string | null; assigneeName: string | null }
  | { type: "delete"; id: string };

function applyChange(tasks: Task[], c: TaskChange): Task[] {
  if (c.type === "delete") return tasks.filter((t) => t.id !== c.id);
  return tasks.map((t) => {
    if (t.id !== c.id) return t;
    switch (c.type) {
      case "toggle":
        return { ...t, completedAt: c.done ? new Date().toISOString() : null };
      case "reorder":
        return { ...t, position: c.position };
      case "edit":
        return { ...t, title: c.title, dueDate: c.dueDate };
      case "assign":
        return { ...t, assignedTo: c.assignedTo, assigneeName: c.assigneeName };
    }
  });
}

const byPosition = (a: Task, b: Task) => a.position - b.position;

// Controls that sit behind hover on a mouse stay visible on a touchscreen,
// where there is no hover to reveal them.
const revealOnHover =
  "pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:focus-visible:opacity-100";

export function TaskList({
  projectId,
  tasks,
  team,
  today,
}: {
  projectId: string;
  tasks: Task[];
  team: Team;
  today: string;
}) {
  // Optimistic copy: drags, checks, and edits show instantly, then settle to
  // the server's version once it comes back (or snap back if the save fails).
  const [shown, change] = useOptimistic(tasks, applyChange);
  const [, startTransition] = useTransition();
  const [adding, startAdding] = useTransition();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");

  function run(
    c: TaskChange,
    save: () => Promise<{ ok: boolean; error?: string }>
  ) {
    startTransition(async () => {
      change(c);
      const res = await save();
      if (!res.ok) toast.error(res.error ?? "Something went wrong");
    });
  }

  function submit() {
    if (!title.trim()) return;
    startAdding(async () => {
      const res = await addTask(projectId, title, due || null);
      if (res.ok) {
        setTitle("");
        setDue("");
      } else {
        toast.error(res.error);
      }
    });
  }

  const open = shown.filter((t) => !t.completedAt).sort(byPosition);
  const done = shown.filter((t) => t.completedAt).sort(byPosition);

  const rowProps = (task: Task) => ({
    task,
    today,
    team,
    onToggle: (doneNow: boolean) =>
      run({ type: "toggle", id: task.id, done: doneNow }, () =>
        toggleTask(projectId, task.id, doneNow)
      ),
    onSave: (nextTitle: string, nextDue: string | null) =>
      run({ type: "edit", id: task.id, title: nextTitle, dueDate: nextDue }, () =>
        updateTask(projectId, task.id, { title: nextTitle, dueDate: nextDue })
      ),
    onAssign: (memberId: string | null) =>
      run(
        {
          type: "assign",
          id: task.id,
          assignedTo: memberId,
          assigneeName: team.find((m) => m.id === memberId)?.name ?? null,
        },
        () => assignTask(projectId, task.id, memberId)
      ),
    onDelete: () =>
      run({ type: "delete", id: task.id }, () => deleteTask(projectId, task.id)),
  });

  return (
    <Card className="overflow-hidden py-0">
      <CardContent className="px-0">
        <div className="divide-y">
          <SortableList
            dndId="tasks-dnd"
            items={open}
            onReorder={(id, position) =>
              run({ type: "reorder", id, position }, () =>
                reorderTask(projectId, id, position)
              )
            }
            renderItem={(task, handle) => (
              <TaskRow {...rowProps(task)} handle={handle} />
            )}
          />

          {done.length > 0 ? (
            <>
              <p className="bg-muted/30 px-4 py-1.5 text-xs font-medium text-muted-foreground">
                Completed ({done.length})
              </p>
              {done.map((t) => (
                <TaskRow key={t.id} {...rowProps(t)} />
              ))}
            </>
          ) : null}

          {shown.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No tasks yet.
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 border-t bg-muted/30 p-3 sm:flex-nowrap">
          <Input
            placeholder="Add a task…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            className="min-w-0 flex-1 basis-full bg-background sm:basis-auto"
          />
          <Input
            type="date"
            aria-label="Due date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="w-40 flex-1 bg-background sm:flex-none"
          />
          <Button size="icon" onClick={submit} disabled={adding} aria-label="Add task">
            <Plus className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Defined at module level so a row keeps its identity between renders —
// otherwise typing in the edit box would remount the row and drop focus.
function TaskRow({
  task,
  today,
  team,
  handle,
  onToggle,
  onSave,
  onAssign,
  onDelete,
}: {
  task: Task;
  today: string;
  team: Team;
  handle?: React.ReactNode;
  onToggle: (done: boolean) => void;
  onSave: (title: string, dueDate: string | null) => void;
  onAssign: (memberId: string | null) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(task.title);
  const [draftDue, setDraftDue] = useState(task.dueDate ?? "");
  const completed = !!task.completedAt;
  const dueInfo = describeDue(task.dueDate, today);

  function startEdit() {
    setDraftTitle(task.title);
    setDraftDue(task.dueDate ?? "");
    setEditing(true);
  }

  function save() {
    const t = draftTitle.trim();
    if (!t) return;
    if (t !== task.title || (draftDue || null) !== task.dueDate) {
      onSave(t, draftDue || null);
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex flex-wrap items-center gap-2 bg-accent/30 px-4 py-2.5 sm:flex-nowrap">
        <Input
          autoFocus
          aria-label="Task title"
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          className="h-9 min-w-0 flex-1 basis-full bg-background sm:basis-auto"
        />
        <Input
          type="date"
          aria-label="Due date"
          value={draftDue}
          onChange={(e) => setDraftDue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          className="h-9 w-40 flex-1 bg-background sm:flex-none"
        />
        <Button size="icon" className="size-9" onClick={save} aria-label="Save task">
          <Check className="size-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-9"
          onClick={() => setEditing(false)}
          aria-label="Cancel editing"
        >
          <X className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-2.5 px-4 py-3">
      {handle ?? <span className="w-5 shrink-0" />}
      <button
        type="button"
        aria-label={completed ? "Mark not done" : "Mark done"}
        onClick={() => onToggle(!completed)}
        className="shrink-0"
      >
        {completed ? (
          <CircleCheck className="size-5 text-emerald-600" />
        ) : (
          <Circle className="size-5 text-muted-foreground/50 hover:text-foreground" />
        )}
      </button>

      <button
        type="button"
        onClick={startEdit}
        aria-label={`Edit task: ${task.title}`}
        className={`min-w-0 flex-1 cursor-text text-left text-sm ${
          completed ? "text-muted-foreground line-through" : ""
        }`}
      >
        {task.title}
      </button>

      {!completed ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                task.assigneeName
                  ? "bg-secondary text-secondary-foreground"
                  : `text-muted-foreground hover:bg-secondary ${revealOnHover}`
              }`}
              aria-label="Assign task"
            >
              {task.assigneeName ?? <UserPlus className="size-3.5" />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {team.map((m) => (
              <DropdownMenuItem key={m.id} onSelect={() => onAssign(m.id)}>
                {m.name}
              </DropdownMenuItem>
            ))}
            {task.assignedTo ? (
              <DropdownMenuItem onSelect={() => onAssign(null)}>
                Unassign
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      {dueInfo && !completed ? (
        <button
          type="button"
          onClick={startEdit}
          className={`shrink-0 text-xs ${
            dueInfo.tone === "overdue"
              ? "font-medium text-destructive"
              : "text-muted-foreground"
          }`}
        >
          {dueInfo.label}
        </button>
      ) : null}

      <button
        type="button"
        aria-label="Delete task"
        onClick={onDelete}
        className={`shrink-0 transition-opacity ${revealOnHover}`}
      >
        <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
      </button>
    </div>
  );
}
