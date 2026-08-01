"use client";

import { useState, useTransition } from "react";
import {
  assignSub,
  updateAssignment,
  removeAssignment,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

type Assignment = {
  id: string;
  subcontractorId: string;
  name: string;
  trade: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  scheduleNotes: string | null;
  scopeNotes: string | null;
  status: "assigned" | "in_progress" | "complete";
};

const STATUS_LABELS = {
  assigned: "Assigned",
  in_progress: "In Progress",
  complete: "Complete",
} as const;

export function SubAssignments({
  projectId,
  assignments,
  directory,
}: {
  projectId: string;
  assignments: Assignment[];
  directory: { id: string; name: string; trade: string | null }[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    subcontractorId: "",
    scheduled_start: "",
    scheduled_end: "",
    schedule_notes: "",
    scope_notes: "",
  });

  const unassigned = directory.filter(
    (s) => !assignments.some((a) => a.subcontractorId === s.id)
  );

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Subcontractors</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1">
              <Plus className="size-4" /> Assign
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Subcontractor</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <Label>Subcontractor</Label>
                <Select
                  value={form.subcontractorId}
                  onValueChange={(v) => setForm({ ...form, subcontractorId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose…" />
                  </SelectTrigger>
                  <SelectContent>
                    {unassigned.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                        {s.trade ? ` — ${s.trade}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {unassigned.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    All subs in your directory are already assigned. Add subs
                    from the Subcontractors page.
                  </p>
                ) : null}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label>Start</Label>
                  <Input
                    type="date"
                    value={form.scheduled_start}
                    onChange={(e) =>
                      setForm({ ...form, scheduled_start: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>End</Label>
                  <Input
                    type="date"
                    value={form.scheduled_end}
                    onChange={(e) =>
                      setForm({ ...form, scheduled_end: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>Schedule notes</Label>
                <Input
                  placeholder="e.g. Tue–Thu, mornings only"
                  value={form.schedule_notes}
                  onChange={(e) =>
                    setForm({ ...form, schedule_notes: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Scope for this sub</Label>
                <Textarea
                  rows={2}
                  placeholder="What is this sub doing on the job?"
                  value={form.scope_notes}
                  onChange={(e) =>
                    setForm({ ...form, scope_notes: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={pending || !form.subcontractorId}
                onClick={() =>
                  startTransition(async () => {
                    const res = await assignSub(projectId, form.subcontractorId, form);
                    if (res.ok) {
                      setOpen(false);
                      setForm({
                        subcontractorId: "",
                        scheduled_start: "",
                        scheduled_end: "",
                        schedule_notes: "",
                        scope_notes: "",
                      });
                    } else {
                      toast.error(res.error);
                    }
                  })
                }
              >
                {pending ? "Assigning…" : "Assign"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="grid gap-3">
        {assignments.map((a) => (
          <div key={a.id} className="rounded-lg border p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">
                  {a.name}
                  {a.trade ? (
                    <span className="text-muted-foreground"> — {a.trade}</span>
                  ) : null}
                </p>
                {a.scheduledStart ? (
                  <p className="text-xs text-muted-foreground">
                    {a.scheduledStart}
                    {a.scheduledEnd ? ` → ${a.scheduledEnd}` : ""}
                    {a.scheduleNotes ? ` · ${a.scheduleNotes}` : ""}
                  </p>
                ) : a.scheduleNotes ? (
                  <p className="text-xs text-muted-foreground">
                    {a.scheduleNotes}
                  </p>
                ) : null}
                {a.scopeNotes ? (
                  <p className="mt-1 text-xs">{a.scopeNotes}</p>
                ) : null}
              </div>
              <button
                type="button"
                aria-label="Remove assignment"
                onClick={() => {
                  if (!confirm(`Remove ${a.name} from this project?`)) return;
                  startTransition(async () => {
                    const res = await removeAssignment(projectId, a.id);
                    if (!res.ok) toast.error(res.error);
                  });
                }}
              >
                <X className="size-4 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
            <div className="mt-2">
              <Select
                value={a.status}
                onValueChange={(v) =>
                  startTransition(async () => {
                    const res = await updateAssignment(projectId, a.id, {
                      status: v as Assignment["status"],
                    });
                    if (!res.ok) toast.error(res.error);
                  })
                }
              >
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {a.status === "complete" ? (
                <Badge variant="secondary" className="ml-2">
                  Done
                </Badge>
              ) : null}
            </div>
          </div>
        ))}
        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No subs assigned yet.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
