"use client";

import { useState, useTransition } from "react";
import { setNextAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export function NextActionCard({
  projectId,
  nextAction,
  nextActionDue,
}: {
  projectId: string;
  nextAction: string | null;
  nextActionDue: string | null;
}) {
  const [action, setAction] = useState(nextAction ?? "");
  const [due, setDue] = useState(nextActionDue ?? "");
  const [pending, startTransition] = useTransition();

  const dirty = action !== (nextAction ?? "") || due !== (nextActionDue ?? "");

  return (
    <Card className="border-primary/50">
      <CardHeader>
        <CardTitle>Next Action</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <Input
          placeholder="e.g. Call customer about estimate"
          value={action}
          onChange={(e) => setAction(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="w-40"
          />
          {dirty ? (
            <Button
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await setNextAction(projectId, action, due || null);
                  if (res.ok) toast.success("Next action saved");
                  else toast.error(res.error);
                })
              }
            >
              {pending ? "Saving…" : "Save"}
            </Button>
          ) : null}
        </div>
        {!action && !nextAction ? (
          <p className="text-xs text-muted-foreground">
            Every open project should have a next action — it powers the Today
            view.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
