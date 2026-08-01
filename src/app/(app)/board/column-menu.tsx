"use client";

import { useState, useTransition } from "react";
import { updateColumn, reorderColumn, archiveColumn } from "./actions";
import type { BoardColumn } from "@/lib/stages";
import {
  ColumnFormFields,
  type ColumnFormState,
} from "@/components/column-form-fields";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MoreHorizontal, ArrowLeft, ArrowRight, Pencil, Trash2 } from "lucide-react";

export function ColumnMenu({
  column,
  columns,
  projectCount,
  isFirst,
  isLast,
}: {
  column: BoardColumn;
  columns: BoardColumn[];
  projectCount: number;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [moveTo, setMoveTo] = useState("");
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<ColumnFormState>({
    label: column.label,
    description: column.description ?? "",
    kind: column.kind,
    color: column.color,
  });

  const others = columns.filter((c) => c.id !== column.id);
  const isOnlyColumn = others.length === 0;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="size-7 text-muted-foreground"
            aria-label={`${column.label} column options`}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditing(true)}>
            <Pencil className="size-4" /> Edit column
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isFirst}
            onSelect={() =>
              startTransition(async () => {
                await reorderColumn(column.id, "left");
              })
            }
          >
            <ArrowLeft className="size-4" /> Move left
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isLast}
            onSelect={() =>
              startTransition(async () => {
                await reorderColumn(column.id, "right");
              })
            }
          >
            <ArrowRight className="size-4" /> Move right
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={isOnlyColumn}
            onSelect={() => {
              setMoveTo(others[0]?.id ?? "");
              setRemoving(true);
            }}
          >
            <Trash2 className="size-4" /> Remove column
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[90svh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Column</DialogTitle>
          </DialogHeader>
          <ColumnFormFields value={form} onChange={setForm} />
          <DialogFooter>
            <Button
              disabled={pending || !form.label.trim()}
              onClick={() =>
                startTransition(async () => {
                  const res = await updateColumn(column.id, form);
                  if (res.ok) {
                    setEditing(false);
                    toast.success("Column updated");
                  } else {
                    toast.error(res.error);
                  }
                })
              }
            >
              {pending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={removing} onOpenChange={setRemoving}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove “{column.label}”?</DialogTitle>
            <DialogDescription>
              {projectCount > 0
                ? `${projectCount} project${projectCount === 1 ? "" : "s"} sitting here will move to the column you pick. Nothing is deleted.`
                : "This column is empty. Its history stays intact."}
            </DialogDescription>
          </DialogHeader>
          {projectCount > 0 ? (
            <div className="grid gap-1.5">
              <Label>Move those projects to</Label>
              <Select value={moveTo} onValueChange={setMoveTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a column…" />
                </SelectTrigger>
                <SelectContent>
                  {others.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRemoving(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending || !moveTo}
              onClick={() =>
                startTransition(async () => {
                  const res = await archiveColumn(column.id, moveTo);
                  if (res.ok) {
                    setRemoving(false);
                    toast.success(
                      res.moved
                        ? `Column removed — ${res.moved} project${res.moved === 1 ? "" : "s"} moved`
                        : "Column removed"
                    );
                  } else {
                    toast.error(res.error);
                  }
                })
              }
            >
              {pending ? "Removing…" : "Remove Column"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
