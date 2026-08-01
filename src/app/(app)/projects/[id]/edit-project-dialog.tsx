"use client";

import { useState, useTransition } from "react";
import { updateProjectFields } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

type ProjectFields = {
  id: string;
  title: string;
  property_address: string;
  project_type: string;
  scope: string | null;
  budget_range: string | null;
  project_value: number | null;
  timeline: string | null;
  quickbooks_url: string | null;
  is_blocked: boolean;
  blocked_reason: string | null;
};

export function EditProjectDialog({
  project,
  projectTypes,
}: {
  project: ProjectFields;
  projectTypes: string[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    title: project.title,
    property_address: project.property_address,
    project_type: project.project_type,
    scope: project.scope ?? "",
    budget_range: project.budget_range ?? "",
    project_value:
      project.project_value === null ? "" : String(project.project_value),
    timeline: project.timeline ?? "",
    quickbooks_url: project.quickbooks_url ?? "",
    is_blocked: project.is_blocked,
    blocked_reason: project.blocked_reason ?? "",
  });

  const typeOptions = projectTypes.includes(form.project_type)
    ? projectTypes
    : [form.project_type, ...projectTypes];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Pencil className="size-4" /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Property address</Label>
            <Input
              value={form.property_address}
              onChange={(e) =>
                setForm({ ...form, property_address: e.target.value })
              }
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Type of work</Label>
            <Select
              value={form.project_type}
              onValueChange={(v) => setForm({ ...form, project_type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Scope</Label>
            <Textarea
              rows={4}
              value={form.scope}
              onChange={(e) => setForm({ ...form, scope: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Project value</Label>
              <Input
                inputMode="decimal"
                placeholder="52000"
                value={form.project_value}
                onChange={(e) =>
                  setForm({ ...form, project_value: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Drives the totals on the board.
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label>Budget range</Label>
              <Input
                placeholder="$45,000 – $60,000"
                value={form.budget_range}
                onChange={(e) =>
                  setForm({ ...form, budget_range: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                What the customer told you.
              </p>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Timeline</Label>
            <Input
              placeholder="Start within 4 weeks"
              value={form.timeline}
              onChange={(e) => setForm({ ...form, timeline: e.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>QuickBooks estimate / invoice URL</Label>
            <Input
              type="url"
              placeholder="https://…"
              value={form.quickbooks_url}
              onChange={(e) =>
                setForm({ ...form, quickbooks_url: e.target.value })
              }
            />
          </div>

          <div className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="blocked-switch">Blocked</Label>
                <p className="text-xs text-muted-foreground">
                  Waiting on a customer, material, sub, inspection, or payment.
                </p>
              </div>
              <Switch
                id="blocked-switch"
                checked={form.is_blocked}
                onCheckedChange={(v) => setForm({ ...form, is_blocked: v })}
              />
            </div>
            {form.is_blocked ? (
              <Input
                className="mt-3"
                placeholder="What's it waiting on?"
                value={form.blocked_reason}
                onChange={(e) =>
                  setForm({ ...form, blocked_reason: e.target.value })
                }
              />
            ) : null}
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await updateProjectFields(project.id, form);
                if (res.ok) {
                  toast.success("Project updated");
                  setOpen(false);
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
  );
}
