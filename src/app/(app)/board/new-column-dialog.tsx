"use client";

import { useState, useTransition } from "react";
import { createColumn } from "./actions";
import {
  ColumnFormFields,
  type ColumnFormState,
} from "@/components/column-form-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus } from "lucide-react";

const EMPTY: ColumnFormState = {
  label: "",
  description: "",
  kind: "other",
  color: "slate",
};

export function NewColumnDialog({ lastPosition }: { lastPosition: number }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ColumnFormState>(EMPTY);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-fit w-[210px] shrink-0 items-center justify-center gap-2 rounded-2xl border border-dashed border-foreground/20 bg-white/20 px-4 py-4 text-sm font-medium text-muted-foreground backdrop-blur-md transition-colors hover:border-solid hover:bg-white/40 hover:text-foreground"
      >
        <Plus className="size-4" /> Add column
      </button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setForm(EMPTY);
        }}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add a Column</DialogTitle>
            <DialogDescription>
              Shape the board around how you actually work. Columns can be
              renamed, reordered, or removed at any time.
            </DialogDescription>
          </DialogHeader>
          <ColumnFormFields value={form} onChange={setForm} />
          <DialogFooter>
            <Button
              disabled={pending || !form.label.trim()}
              onClick={() =>
                startTransition(async () => {
                  const res = await createColumn({
                    ...form,
                    afterPosition: lastPosition,
                  });
                  if (res.ok) {
                    setOpen(false);
                    setForm(EMPTY);
                    toast.success("Column added");
                  } else {
                    toast.error(res.error);
                  }
                })
              }
            >
              {pending ? "Adding…" : "Add Column"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
