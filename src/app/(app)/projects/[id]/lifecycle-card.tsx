"use client";

import { useTransition } from "react";
import { setColumn } from "./actions";
import { type BoardColumn, dotClass } from "@/lib/stages";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Check, OctagonAlert } from "lucide-react";

// Horizontal stepper over the user's own columns. Each step is clickable —
// it's the fastest way to move a job without going back to the board.
export function LifecycleCard({
  projectId,
  columns,
  currentColumnId,
  isBlocked,
  blockedReason,
}: {
  projectId: string;
  columns: BoardColumn[];
  currentColumnId: string;
  isBlocked: boolean;
  blockedReason: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const currentIndex = columns.findIndex((c) => c.id === currentColumnId);
  const current = columns[currentIndex];

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-semibold">Lifecycle</h2>
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <span className={`size-2 rounded-full ${dotClass(current?.color ?? "slate")}`} />
            {current?.label}
          </span>
        </div>

        <ol className="flex items-start gap-1 overflow-x-auto pb-1">
          {columns.map((column, i) => {
            const done = i < currentIndex;
            const active = i === currentIndex;
            return (
              <li
                key={column.id}
                className="flex min-w-0 flex-1 shrink-0 basis-20 flex-col gap-2"
              >
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={pending || active}
                    aria-current={active ? "step" : undefined}
                    title={column.description ?? column.label}
                    onClick={() =>
                      startTransition(async () => {
                        const res = await setColumn(projectId, column.id);
                        if (!res.ok) toast.error(res.error);
                      })
                    }
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                      done
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : active
                          ? "bg-foreground text-background"
                          : "border bg-background text-muted-foreground hover:border-foreground hover:text-foreground"
                    } ${pending ? "opacity-60" : ""}`}
                  >
                    {done ? <Check className="size-4" /> : i + 1}
                  </button>
                  {i < columns.length - 1 ? (
                    <span
                      className={`h-0.5 min-w-2 flex-1 rounded-full ${
                        done
                          ? "bg-emerald-600"
                          : active
                            ? "bg-foreground"
                            : "bg-border"
                      }`}
                    />
                  ) : null}
                </div>
                <p
                  className={`truncate text-xs ${
                    active ? "font-semibold" : "text-muted-foreground"
                  }`}
                  title={column.label}
                >
                  {column.label}
                </p>
              </li>
            );
          })}
        </ol>

        {current?.description ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {current.description}
          </p>
        ) : null}

        {isBlocked ? (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
            <OctagonAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div className="text-sm">
              <p className="font-medium text-destructive">Blocked</p>
              {blockedReason ? (
                <p className="mt-0.5 text-muted-foreground">{blockedReason}</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
