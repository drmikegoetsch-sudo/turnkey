"use client";

import { useState, useTransition } from "react";
import { setNextAction, completeNextAction } from "./actions";
import type { BoardColumn } from "@/lib/stages";
import { describeDue, DUE_TONE_CLASSES } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Pencil, X } from "lucide-react";

// The single most important thing on the page: what to do next, and one
// button that finishes it and pushes the job forward.
export function DoThisNext({
  projectId,
  nextAction,
  nextActionDue,
  columns,
  currentColumnId,
  today,
}: {
  projectId: string;
  nextAction: string | null;
  nextActionDue: string | null;
  columns: BoardColumn[];
  currentColumnId: string;
  today: string;
}) {
  const [editing, setEditing] = useState(!nextAction);
  const [action, setAction] = useState(nextAction ?? "");
  const [due, setDue] = useState(nextActionDue ?? "");
  const [pending, startTransition] = useTransition();

  const currentIndex = columns.findIndex((c) => c.id === currentColumnId);
  const nextColumn = columns[currentIndex + 1] ?? null;
  const dueInfo = describeDue(nextActionDue, today);

  function save() {
    startTransition(async () => {
      const res = await setNextAction(projectId, action, due || null);
      if (res.ok) {
        setEditing(false);
        toast.success("Next action saved");
      } else {
        toast.error(res.error);
      }
    });
  }

  if (editing) {
    return (
      <Card className="border-primary/40 bg-primary/5">
        <CardContent className="grid gap-3 pt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Do This Next
          </p>
          <Input
            autoFocus
            placeholder="e.g. Confirm countertop template appointment"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && action.trim()) save();
            }}
            className="bg-background text-base"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="w-44 bg-background"
            />
            <Button disabled={pending || !action.trim()} onClick={save}>
              {pending ? "Saving…" : "Save"}
            </Button>
            {nextAction ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setAction(nextAction);
                  setDue(nextActionDue ?? "");
                  setEditing(false);
                }}
                aria-label="Cancel"
              >
                <X className="size-4" />
              </Button>
            ) : null}
          </div>
          {!nextAction ? (
            <p className="text-xs text-muted-foreground">
              Every open job should have one. This is what drives the Today
              view.
            </p>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Do This Next
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="-mr-2 -mt-2 size-7 text-muted-foreground"
            onClick={() => setEditing(true)}
            aria-label="Edit next action"
          >
            <Pencil className="size-3.5" />
          </Button>
        </div>

        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight">{nextAction}</h2>
          {dueInfo ? (
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                dueInfo.tone === "overdue"
                  ? "bg-destructive text-white"
                  : dueInfo.tone === "today"
                    ? "bg-foreground text-background"
                    : DUE_TONE_CLASSES[dueInfo.tone]
              }`}
            >
              {dueInfo.tone === "today"
                ? "Due Today"
                : dueInfo.tone === "overdue"
                  ? "Overdue"
                  : `Due ${dueInfo.label}`}
            </span>
          ) : null}
        </div>

        <Button
          size="lg"
          className="mt-4 w-full"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await completeNextAction(projectId);
              if (res.ok) {
                setAction("");
                setDue("");
                setEditing(true);
                toast.success(
                  res.advancedTo
                    ? `Done — moved to ${res.advancedTo}`
                    : "Marked done"
                );
              } else {
                toast.error(res.error);
              }
            })
          }
        >
          {pending
            ? "Working…"
            : nextColumn
              ? "Mark done & advance stage"
              : "Mark done"}
        </Button>
        {nextColumn ? (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Advances to {nextColumn.label}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
