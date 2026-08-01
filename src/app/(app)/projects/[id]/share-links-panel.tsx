"use client";

import { useState, useTransition } from "react";
import { createShareLink, revokeShareLink } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Link2, Copy, Ban } from "lucide-react";

type ShareLink = {
  id: string;
  kind: "sub" | "owner";
  label: string;
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  lastAccessedAt: string | null;
};

export function ShareLinksPanel({
  projectId,
  links,
  subs,
}: {
  projectId: string;
  links: ShareLink[];
  subs: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"sub" | "owner">("owner");
  const [subId, setSubId] = useState("");
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const active = links.filter((l) => !l.revokedAt);

  function copy(url: string) {
    navigator.clipboard.writeText(url).then(
      () => toast.success("Link copied"),
      () => toast.error("Could not copy — select it manually")
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Share Links</CardTitle>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) setCreatedUrl(null);
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1">
              <Link2 className="size-4" /> New
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Share Link</DialogTitle>
              <DialogDescription>
                No accounts needed — anyone with the link can use it. Sub links
                expire after 60 days; owner links stay live until revoked.
              </DialogDescription>
            </DialogHeader>
            {createdUrl ? (
              <div className="grid gap-3">
                <p className="text-sm font-medium">
                  Copy this link now — it&apos;s only shown once:
                </p>
                <div className="flex gap-2">
                  <Input readOnly value={createdUrl} className="font-mono text-xs" />
                  <Button size="icon" onClick={() => copy(createdUrl)}>
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                <div className="grid gap-1.5">
                  <Label>Link type</Label>
                  <Select
                    value={kind}
                    onValueChange={(v) => setKind(v as "sub" | "owner")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">
                        Owner / customer status link
                      </SelectItem>
                      <SelectItem value="sub">Subcontractor job link</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {kind === "sub" ? (
                  <div className="grid gap-1.5">
                    <Label>Subcontractor</Label>
                    <Select value={subId} onValueChange={setSubId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose…" />
                      </SelectTrigger>
                      <SelectContent>
                        {subs.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
            )}
            <DialogFooter>
              {createdUrl ? (
                <Button onClick={() => setOpen(false)}>Done</Button>
              ) : (
                <Button
                  disabled={pending || (kind === "sub" && !subId)}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await createShareLink(
                        projectId,
                        kind,
                        kind === "sub" ? subId : undefined
                      );
                      if (res.ok) setCreatedUrl(res.url);
                      else toast.error(res.error);
                    })
                  }
                >
                  {pending ? "Creating…" : "Create Link"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="grid gap-2">
        {active.map((l) => (
          <div
            key={l.id}
            className="flex items-center justify-between gap-2 rounded-md border p-2.5 text-sm"
          >
            <div>
              <p className="font-medium">{l.label}</p>
              <p className="text-xs text-muted-foreground">
                <Badge variant="secondary" className="mr-1">
                  {l.kind === "sub" ? "Sub" : "Owner"}
                </Badge>
                {l.lastAccessedAt
                  ? `Last opened ${new Date(l.lastAccessedAt).toLocaleDateString()}`
                  : "Never opened"}
                {l.expiresAt
                  ? ` · expires ${new Date(l.expiresAt).toLocaleDateString()}`
                  : ""}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1 text-muted-foreground hover:text-destructive"
              onClick={() => {
                if (!confirm("Revoke this link? Anyone using it loses access."))
                  return;
                startTransition(async () => {
                  const res = await revokeShareLink(projectId, l.id);
                  if (!res.ok) toast.error(res.error);
                });
              }}
            >
              <Ban className="size-4" /> Revoke
            </Button>
          </div>
        ))}
        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No live links. Create one to text to a sub or the homeowner.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
