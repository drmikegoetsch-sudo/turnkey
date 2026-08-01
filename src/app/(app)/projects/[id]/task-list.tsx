"use client";

import { useState, useTransition } from "react";
import { addTask, toggleTask, deleteTask, assignTask } from "./actions";
import { describeDue } from "@/lib/dates";
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
import { Trash2, Plus, CircleCheck, Circle, UserPlus } from "lucide-react";

export type Task = {
  id: string;
  title: string;
  dueDate: string | null;
  completedAt: string | null;
  assignedTo: string | null;
  assigneeName: string | null;
};

export function TaskList({
  projectId,
  tasks,
  team,
  today,
}: {
  projectId: string;
  tasks: Task[];
  team: { id: string; name: string }[];
  today: string;
}) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [pending, startTransition] = useTransition();

  const open = tasks.filter((t) => !t.completedAt);
  const done = tasks.filter((t) => t.completedAt);

  function submit() {
    if (!title.trim()) return;
    startTransition(async () => {
      const res = await addTask(projectId, title, due || null);
      if (res.ok) {
        setTitle("");
        setDue("");
      } else {
        toast.error(res.error);
      }
    });
  }

  function Row({ task }: { task: Task }) {
    const dueInfo = describeDue(task.dueDate, today);
    const completed = !!task.completedAt;
    return (
      <div className="group flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          aria-label={completed ? "Mark not done" : "Mark done"}
          onClick={() =>
            startTransition(async () => {
              const res = await toggleTask(projectId, task.id, !completed);
              if (!res.ok) toast.error(res.error);
            })
          }
        >
          {completed ? (
            <CircleCheck className="size-5 text-emerald-600" />
          ) : (
            <Circle className="size-5 text-muted-foreground/50 hover:text-foreground" />
          )}
        </button>

        <span
          className={`flex-1 text-sm ${
            completed ? "text-muted-foreground line-through" : ""
          }`}
        >
          {task.title}
        </span>

        {!completed ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                  task.assigneeName
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground opacity-0 hover:bg-secondary group-hover:opacity-100"
                }`}
                aria-label="Assign task"
              >
                {task.assigneeName ?? <UserPlus className="size-3.5" />}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {team.map((m) => (
                <DropdownMenuItem
                  key={m.id}
                  onSelect={() =>
                    startTransition(async () => {
                      const res = await assignTask(projectId, task.id, m.id);
                      if (!res.ok) toast.error(res.error);
                    })
                  }
                >
                  {m.name}
                </DropdownMenuItem>
              ))}
              {task.assignedTo ? (
                <DropdownMenuItem
                  onSelect={() =>
                    startTransition(async () => {
                      const res = await assignTask(projectId, task.id, null);
                      if (!res.ok) toast.error(res.error);
                    })
                  }
                >
                  Unassign
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        {dueInfo && !completed ? (
          <span
            className={`shrink-0 text-xs ${
              dueInfo.tone === "overdue"
                ? "font-medium text-destructive"
                : "text-muted-foreground"
            }`}
          >
            {dueInfo.label}
          </span>
        ) : null}

        <button
          type="button"
          aria-label="Delete task"
          onClick={() =>
            startTransition(async () => {
              const res = await deleteTask(projectId, task.id);
              if (!res.ok) toast.error(res.error);
            })
          }
          className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
        >
          <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
        </button>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden py-0">
      <CardContent className="px-0">
        <div className="divide-y">
          {open.map((t) => (
            <Row key={t.id} task={t} />
          ))}
          {done.map((t) => (
            <Row key={t.id} task={t} />
          ))}
          {tasks.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No tasks yet.
            </p>
          ) : null}
        </div>

        <div className="flex gap-2 border-t bg-muted/30 p-3">
          <Input
            placeholder="Add a task…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            className="bg-background"
          />
          <Input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="w-40 bg-background"
          />
          <Button size="icon" onClick={submit} disabled={pending}>
            <Plus className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
