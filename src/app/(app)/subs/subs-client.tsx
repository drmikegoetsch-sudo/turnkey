"use client";

import { useState, useTransition } from "react";
import { addSub, updateSub, deleteSub, type SubInput } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Phone, Mail } from "lucide-react";

type Sub = {
  id: string;
  name: string;
  company: string | null;
  trade: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  activeJobs: number;
};

const EMPTY: SubInput = {
  name: "",
  company: "",
  trade: "",
  phone: "",
  email: "",
  notes: "",
};

export function SubsClient({ subs }: { subs: Sub[] }) {
  const [editing, setEditing] = useState<Sub | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<SubInput>(EMPTY);
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setForm(EMPTY);
    setCreating(true);
  }

  function openEdit(sub: Sub) {
    setForm({
      name: sub.name,
      company: sub.company ?? "",
      trade: sub.trade ?? "",
      phone: sub.phone ?? "",
      email: sub.email ?? "",
      notes: sub.notes ?? "",
    });
    setEditing(sub);
  }

  function save() {
    startTransition(async () => {
      const res = editing
        ? await updateSub(editing.id, form)
        : await addSub(form);
      if (res.ok) {
        setCreating(false);
        setEditing(null);
      } else {
        toast.error(res.error);
      }
    });
  }

  const open = creating || !!editing;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Subcontractors</h1>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="size-4" /> Add Sub
        </Button>
      </div>

      <div className="mt-6 rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Trade</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-center">Active Jobs</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {subs.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <p className="font-medium">{s.name}</p>
                  {s.company ? (
                    <p className="text-xs text-muted-foreground">{s.company}</p>
                  ) : null}
                </TableCell>
                <TableCell>
                  {s.trade ? <Badge variant="secondary">{s.trade}</Badge> : "—"}
                </TableCell>
                <TableCell className="text-sm">
                  {s.phone ? (
                    <a
                      href={`tel:${s.phone}`}
                      className="flex items-center gap-1 hover:underline"
                    >
                      <Phone className="size-3.5" /> {s.phone}
                    </a>
                  ) : null}
                  {s.email ? (
                    <a
                      href={`mailto:${s.email}`}
                      className="flex items-center gap-1 text-muted-foreground hover:underline"
                    >
                      <Mail className="size-3.5" /> {s.email}
                    </a>
                  ) : null}
                </TableCell>
                <TableCell className="text-center">
                  {s.activeJobs > 0 ? (
                    <Badge>{s.activeJobs}</Badge>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEdit(s)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        if (!confirm(`Delete ${s.name} from the directory?`))
                          return;
                        startTransition(async () => {
                          const res = await deleteSub(s.id);
                          if (!res.ok) toast.error(res.error);
                        });
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {subs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-muted-foreground"
                >
                  No subcontractors yet — add your regular crews so you can
                  assign them to projects.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) {
            setCreating(false);
            setEditing(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit ${editing.name}` : "Add Subcontractor"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Company</Label>
                <Input
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Trade</Label>
                <Input
                  placeholder="Plumbing, Electrical…"
                  value={form.trade}
                  onChange={(e) => setForm({ ...form, trade: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Phone</Label>
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Notes</Label>
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={save} disabled={pending || !form.name.trim()}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
