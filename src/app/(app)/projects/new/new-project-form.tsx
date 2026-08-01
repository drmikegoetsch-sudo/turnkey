"use client";

import { useState, useTransition } from "react";
import { createProject } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export function NewProjectForm({
  projectTypes,
  columns,
}: {
  projectTypes: string[];
  columns: { id: string; label: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    title: "",
    property_address: "",
    project_type: projectTypes[0] ?? "Other",
    scope: "",
    budget_range: "",
    project_value: "",
    timeline: "",
    column_id: columns[0]?.id ?? "",
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Customer</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Name *</Label>
            <Input
              value={form.customer_name}
              onChange={(e) => set("customer_name", e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Phone</Label>
              <Input
                type="tel"
                value={form.customer_phone}
                onChange={(e) => set("customer_phone", e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.customer_email}
                onChange={(e) => set("customer_email", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Project</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Property address *</Label>
            <Input
              value={form.property_address}
              onChange={(e) => set("property_address", e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Type of work</Label>
              <Select
                value={form.project_type}
                onValueChange={(v) => set("project_type", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {projectTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Starts in column</Label>
              <Select
                value={form.column_id}
                onValueChange={(v) => set("column_id", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Title (optional — auto-generated if blank)</Label>
            <Input
              placeholder="e.g. Kitchen Remodel — Full Gut"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Scope</Label>
            <Textarea
              rows={3}
              value={form.scope}
              onChange={(e) => set("scope", e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label>Project value</Label>
              <Input
                inputMode="decimal"
                placeholder="52000"
                value={form.project_value}
                onChange={(e) => set("project_value", e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Budget range</Label>
              <Input
                placeholder="$45k – $60k"
                value={form.budget_range}
                onChange={(e) => set("budget_range", e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Timeline</Label>
              <Input
                placeholder="Start in 4 weeks"
                value={form.timeline}
                onChange={(e) => set("timeline", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button
        size="lg"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await createProject(form);
            if (res && !res.ok) toast.error(res.error);
          })
        }
      >
        {pending ? "Creating…" : "Create Project"}
      </Button>
    </div>
  );
}
