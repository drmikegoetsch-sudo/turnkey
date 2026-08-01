"use client";

import { useState, useTransition } from "react";
import { addNote } from "./actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AlertTriangle, Eye } from "lucide-react";

export type Note = {
  id: string;
  body: string;
  kind: "note" | "update" | "issue";
  visibility: "internal" | "owner";
  authorKind: "internal" | "sub" | "customer";
  authorName: string | null;
  createdAt: string;
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function NotesFeed({
  projectId,
  notes,
}: {
  projectId: string;
  notes: Note[];
}) {
  const [body, setBody] = useState("");
  const [ownerVisible, setOwnerVisible] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notes &amp; Updates</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Textarea
            placeholder="Add a note… (flip the switch to make it visible to the owner)"
            rows={2}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                id="owner-visible"
                checked={ownerVisible}
                onCheckedChange={setOwnerVisible}
              />
              <Label
                htmlFor="owner-visible"
                className="text-sm text-muted-foreground"
              >
                Visible to owner
              </Label>
            </div>
            <Button
              size="sm"
              disabled={pending || !body.trim()}
              onClick={() =>
                startTransition(async () => {
                  const res = await addNote(
                    projectId,
                    body,
                    ownerVisible ? "owner" : "internal"
                  );
                  if (res.ok) {
                    setBody("");
                    setOwnerVisible(false);
                  } else {
                    toast.error(res.error);
                  }
                })
              }
            >
              {pending ? "Posting…" : "Post"}
            </Button>
          </div>
        </div>

        <div className="grid gap-3">
          {notes.map((n) => (
            <div
              key={n.id}
              className={`rounded-lg border p-3 ${
                n.kind === "issue" ? "border-destructive/50 bg-destructive/5" : ""
              }`}
            >
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {n.kind === "issue" ? (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="size-3" /> Issue
                  </Badge>
                ) : null}
                {n.visibility === "owner" ? (
                  <Badge variant="secondary" className="gap-1">
                    <Eye className="size-3" /> Owner-visible
                  </Badge>
                ) : null}
                <span>
                  {n.authorKind === "internal"
                    ? (n.authorName ?? "Staff")
                    : n.authorKind === "sub"
                      ? "Subcontractor"
                      : "Customer"}
                </span>
                <span>·</span>
                <span>{formatWhen(n.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm">{n.body}</p>
            </div>
          ))}
          {notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notes yet.</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
