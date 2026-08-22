"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadPhoto } from "@/lib/upload-client";
import { markWorkComplete, reportIssue } from "./actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PHOTO_TYPES, PHOTO_TYPE_LABELS, type PhotoType } from "@/lib/stages";
import { toast } from "sonner";
import { Camera, CheckCircle2, Loader2, TriangleAlert } from "lucide-react";

export function JobActions({
  projectId,
  workComplete,
}: {
  projectId: string;
  workComplete: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [photoType, setPhotoType] = useState<PhotoType>("progress");
  const [uploading, setUploading] = useState(0);
  const [issue, setIssue] = useState("");
  const [showIssue, setShowIssue] = useState(false);
  const [pending, startTransition] = useTransition();

  async function handleFiles(list: FileList | null) {
    if (!list?.length) return;
    const files = Array.from(list).filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
    );
    if (files.length === 0) return;
    setUploading(files.length);
    let failed = 0;
    let lastError = "";
    for (const file of files) {
      try {
        await uploadPhoto(file, {
          projectId,
          photoType,
          auth: { context: "sub" },
        });
      } catch (e) {
        failed += 1;
        lastError = e instanceof Error ? e.message : "";
      }
      setUploading((n) => n - 1);
    }
    if (failed > 0) {
      toast.error(lastError || `${failed} upload(s) failed — try again`);
    } else {
      toast.success("Uploaded");
    }
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="flex flex-wrap gap-2">
          <Select
            value={photoType}
            onValueChange={(v) => setPhotoType(v as PhotoType)}
          >
            <SelectTrigger className="h-11 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PHOTO_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {PHOTO_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <Button
            size="lg"
            className="glass-cta flex-1 gap-2 rounded-full font-semibold shadow-none hover:bg-transparent"
            disabled={uploading > 0}
            onClick={() => inputRef.current?.click()}
          >
            {uploading > 0 ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Uploading ({uploading})…
              </>
            ) : (
              <>
                <Camera className="size-4" /> Upload photos or video
              </>
            )}
          </Button>
        </div>

        {!workComplete ? (
          <Button
            variant="outline"
            size="lg"
            className="gap-2"
            disabled={pending}
            onClick={() => {
              if (!confirm("Mark your work on this job as complete?")) return;
              startTransition(async () => {
                const res = await markWorkComplete(projectId);
                if (res.ok) toast.success("Thanks — Turnkey has been notified.");
                else toast.error(res.error);
                router.refresh();
              });
            }}
          >
            <CheckCircle2 className="size-4" /> Mark my work complete
          </Button>
        ) : null}

        {showIssue ? (
          <div className="grid gap-2">
            <Textarea
              autoFocus
              rows={3}
              placeholder="Describe the problem (site conditions, materials, access…)"
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              className="bg-white/70"
            />
            <div className="flex gap-2">
              <Button
                variant="destructive"
                disabled={pending || !issue.trim()}
                onClick={() =>
                  startTransition(async () => {
                    const res = await reportIssue(projectId, issue);
                    if (res.ok) {
                      toast.success("Issue reported — Turnkey has been notified.");
                      setIssue("");
                      setShowIssue(false);
                    } else {
                      toast.error(res.error);
                    }
                  })
                }
              >
                {pending ? "Sending…" : "Send report"}
              </Button>
              <Button variant="ghost" onClick={() => setShowIssue(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            size="lg"
            className="gap-2 text-destructive"
            onClick={() => setShowIssue(true)}
          >
            <TriangleAlert className="size-4" /> Report an issue
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
