"use client";

import { useState, useTransition } from "react";
import { declineEstimate, reopenEstimate } from "./actions";
import { DECLINE_REASONS, formatMoney } from "@/lib/stages";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ThumbsDown, RotateCcw } from "lucide-react";

export function DeclineCard({
  projectId,
  declinedAt,
  declinedReason,
  declinedNote,
  projectValue,
}: {
  projectId: string;
  declinedAt: string | null;
  declinedReason: string | null;
  declinedNote: string | null;
  projectValue: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  if (declinedAt) {
    return (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-destructive">
                <ThumbsDown className="size-3.5" /> Estimate declined
              </p>
              <p className="mt-1.5 font-medium">{declinedReason}</p>
              {declinedNote ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {declinedNote}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">
                {new Date(declinedAt).toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
                {projectValue ? ` · ${formatMoney(projectValue)} quoted` : ""}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 gap-1.5"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await reopenEstimate(projectId);
                  if (res.ok) toast.success("Back in the pipeline");
                  else toast.error(res.error);
                })
              }
            >
              <RotateCcw className="size-3.5" /> Reopen
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="w-fit gap-2 text-muted-foreground hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <ThumbsDown className="size-4" /> Customer declined this estimate
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark estimate declined</DialogTitle>
            <DialogDescription>
              Nothing is deleted. The job leaves your active board but the
              history stays, so this customer gets flagged if they come back.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Why?</Label>
              <div className="flex flex-wrap gap-2">
                {DECLINE_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      reason === r
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-card hover:bg-accent"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>
                Notes <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                rows={2}
                placeholder="Anything worth remembering if they call again…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending || !reason}
              onClick={() =>
                startTransition(async () => {
                  const res = await declineEstimate(projectId, reason, note);
                  if (res.ok) {
                    setOpen(false);
                    toast.success("Marked declined");
                  } else {
                    toast.error(res.error);
                  }
                })
              }
            >
              {pending ? "Saving…" : "Mark declined"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
