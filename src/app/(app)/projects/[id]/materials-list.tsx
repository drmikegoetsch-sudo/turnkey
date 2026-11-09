"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import {
  addMaterial,
  deleteMaterial,
  reorderMaterial,
  toggleMaterial,
  updateMaterial,
} from "./materials-actions";
import { SortableList } from "@/components/sortable-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Check, Plus, Square, SquareCheck, Trash2, X } from "lucide-react";

export type Material = {
  id: string;
  name: string;
  quantity: string | null;
  checkedAt: string | null;
  position: number;
};

type MaterialChange =
  | { type: "add"; item: Material }
  | { type: "toggle"; id: string; checked: boolean }
  | { type: "reorder"; id: string; position: number }
  | { type: "edit"; id: string; name: string; quantity: string | null }
  | { type: "delete"; id: string };

function applyChange(items: Material[], c: MaterialChange): Material[] {
  switch (c.type) {
    case "add":
      return [...items, c.item];
    case "delete":
      return items.filter((m) => m.id !== c.id);
    case "toggle":
      return items.map((m) =>
        m.id === c.id
          ? { ...m, checkedAt: c.checked ? new Date().toISOString() : null }
          : m
      );
    case "reorder":
      return items.map((m) => (m.id === c.id ? { ...m, position: c.position } : m));
    case "edit":
      return items.map((m) =>
        m.id === c.id ? { ...m, name: c.name, quantity: c.quantity } : m
      );
  }
}

const byPosition = (a: Material, b: Material) => a.position - b.position;
const isPending = (m: Material) => m.id.startsWith("pending-");

const revealOnHover =
  "pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:focus-visible:opacity-100";

export function MaterialsList({
  projectId,
  materials,
}: {
  projectId: string;
  materials: Material[];
}) {
  const [shown, change] = useOptimistic(materials, applyChange);
  const [, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  function run(
    c: MaterialChange,
    save: () => Promise<{ ok: boolean; error?: string }>
  ) {
    startTransition(async () => {
      change(c);
      const res = await save();
      if (!res.ok) toast.error(res.error ?? "Something went wrong");
    });
  }

  // Built for rattling off a list: the item appears immediately, the fields
  // clear, and the cursor goes straight back to the name box.
  function submit() {
    const n = name.trim();
    if (!n) return;
    const q = quantity.trim();
    const top = Math.max(0, ...shown.map((m) => m.position));
    run(
      {
        type: "add",
        item: {
          id: `pending-${Date.now()}`,
          name: n,
          quantity: q || null,
          checkedAt: null,
          position: top + 1,
        },
      },
      () => addMaterial(projectId, { name: n, quantity: q })
    );
    setName("");
    setQuantity("");
    nameRef.current?.focus();
  }

  const needed = shown
    .filter((m) => !m.checkedAt && !isPending(m))
    .sort(byPosition);
  const pending = shown.filter(isPending);
  const checked = shown.filter((m) => m.checkedAt).sort(byPosition);

  const rowProps = (m: Material) => ({
    item: m,
    onToggle: (now: boolean) =>
      run({ type: "toggle", id: m.id, checked: now }, () =>
        toggleMaterial(projectId, m.id, now)
      ),
    onSave: (nextName: string, nextQty: string | null) =>
      run({ type: "edit", id: m.id, name: nextName, quantity: nextQty }, () =>
        updateMaterial(projectId, m.id, {
          name: nextName,
          quantity: nextQty ?? "",
        })
      ),
    onDelete: () =>
      run({ type: "delete", id: m.id }, () => deleteMaterial(projectId, m.id)),
  });

  return (
    <Card className="overflow-hidden py-0">
      <CardContent className="px-0">
        {shown.length > 0 ? (
          <p className="border-b bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {needed.length + pending.length} still needed
            </span>
            {checked.length > 0 ? ` · ${checked.length} checked off` : ""}
          </p>
        ) : null}

        <div className="divide-y">
          <SortableList
            dndId="materials-dnd"
            items={needed}
            onReorder={(id, position) =>
              run({ type: "reorder", id, position }, () =>
                reorderMaterial(projectId, id, position)
              )
            }
            renderItem={(m, handle) => (
              <MaterialRow {...rowProps(m)} handle={handle} />
            )}
          />

          {pending.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-2.5 px-4 py-3 opacity-60"
            >
              <span className="w-5 shrink-0" />
              <Square className="size-5 shrink-0 text-muted-foreground/50" />
              <span className="min-w-0 flex-1 text-sm">{m.name}</span>
              {m.quantity ? (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {m.quantity}
                </span>
              ) : null}
            </div>
          ))}

          {checked.length > 0 ? (
            <>
              <p className="bg-muted/30 px-4 py-1.5 text-xs font-medium text-muted-foreground">
                Checked off ({checked.length})
              </p>
              {checked.map((m) => (
                <MaterialRow key={m.id} {...rowProps(m)} />
              ))}
            </>
          ) : null}

          {shown.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No materials yet. Add what this job needs and check items off as
              they&apos;re bought or delivered.
            </p>
          ) : null}
        </div>

        <div className="flex gap-2 border-t bg-muted/30 p-3">
          <Input
            ref={nameRef}
            placeholder="Add a material…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            className="min-w-0 flex-1 bg-background"
          />
          <Input
            placeholder="Qty"
            aria-label="Quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            className="w-24 bg-background"
          />
          <Button size="icon" onClick={submit} aria-label="Add material">
            <Plus className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MaterialRow({
  item,
  handle,
  onToggle,
  onSave,
  onDelete,
}: {
  item: Material;
  handle?: React.ReactNode;
  onToggle: (checked: boolean) => void;
  onSave: (name: string, quantity: string | null) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(item.name);
  const [draftQty, setDraftQty] = useState(item.quantity ?? "");
  const checked = !!item.checkedAt;

  function startEdit() {
    setDraftName(item.name);
    setDraftQty(item.quantity ?? "");
    setEditing(true);
  }

  function save() {
    const n = draftName.trim();
    if (!n) return;
    const q = draftQty.trim() || null;
    if (n !== item.name || q !== item.quantity) onSave(n, q);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 bg-accent/30 px-4 py-2.5">
        <Input
          autoFocus
          aria-label="Material name"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          className="h-9 min-w-0 flex-1 bg-background"
        />
        <Input
          aria-label="Quantity"
          placeholder="Qty"
          value={draftQty}
          onChange={(e) => setDraftQty(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          className="h-9 w-24 bg-background"
        />
        <Button size="icon" className="size-9" onClick={save} aria-label="Save material">
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
        aria-label={checked ? "Uncheck" : "Check off"}
        onClick={() => onToggle(!checked)}
        className="shrink-0"
      >
        {checked ? (
          <SquareCheck className="size-5 text-emerald-600" />
        ) : (
          <Square className="size-5 text-muted-foreground/50 hover:text-foreground" />
        )}
      </button>
      <button
        type="button"
        onClick={startEdit}
        aria-label={`Edit material: ${item.name}`}
        className={`min-w-0 flex-1 cursor-text text-left text-sm ${
          checked ? "text-muted-foreground line-through" : ""
        }`}
      >
        {item.name}
      </button>
      {item.quantity ? (
        <button
          type="button"
          onClick={startEdit}
          className="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground"
        >
          {item.quantity}
        </button>
      ) : null}
      <button
        type="button"
        aria-label="Delete material"
        onClick={onDelete}
        className={`shrink-0 transition-opacity ${revealOnHover}`}
      >
        <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
      </button>
    </div>
  );
}
