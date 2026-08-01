"use client";

import { useState, useTransition } from "react";
import { addProjectType, toggleProjectType } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export function SettingsClient({
  types,
  team,
}: {
  types: { id: string; label: string; active: boolean }[];
  team: { name: string; email: string }[];
}) {
  const [label, setLabel] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-6 grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Project Types</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="text-sm text-muted-foreground">
            These appear on the public Work Inquiry form and when creating
            projects. Toggle off to hide without losing history.
          </p>
          <div className="grid gap-2">
            {types.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <span
                  className={`text-sm ${!t.active ? "text-muted-foreground line-through" : ""}`}
                >
                  {t.label}
                </span>
                <Switch
                  checked={t.active}
                  onCheckedChange={(v) =>
                    startTransition(async () => {
                      const res = await toggleProjectType(t.id, v);
                      if (!res.ok) toast.error(res.error);
                    })
                  }
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="New project type…"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && label.trim()) {
                  startTransition(async () => {
                    const res = await addProjectType(label);
                    if (res.ok) setLabel("");
                    else toast.error(res.error);
                  });
                }
              }}
            />
            <Button
              size="icon"
              disabled={pending || !label.trim()}
              onClick={() =>
                startTransition(async () => {
                  const res = await addProjectType(label);
                  if (res.ok) setLabel("");
                  else toast.error(res.error);
                })
              }
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {team.map((m) => (
            <div key={m.email} className="text-sm">
              <span className="font-medium">{m.name || m.email}</span>{" "}
              <span className="text-muted-foreground">{m.email}</span>
            </div>
          ))}
          <p className="mt-2 text-xs text-muted-foreground">
            Accounts are created by your administrator — public sign-up is
            disabled.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
