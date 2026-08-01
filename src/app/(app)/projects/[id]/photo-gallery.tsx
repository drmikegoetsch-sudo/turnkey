"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadPhoto } from "@/lib/upload-client";
import { updatePhoto, deletePhoto } from "./actions";
import {
  PHOTO_TYPES,
  PHOTO_TYPE_LABELS,
  type PhotoType,
} from "@/lib/stages";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ImagePlus, Loader2, Eye, EyeOff, Trash2 } from "lucide-react";

export type Photo = {
  id: string;
  url: string;
  photoType: PhotoType;
  visibility: "internal" | "owner";
  caption: string | null;
  uploadedByKind: "internal" | "sub" | "customer";
  createdAt: string;
};

export function PhotoGallery({
  projectId,
  photos,
}: {
  projectId: string;
  photos: Photo[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<PhotoType>("progress");
  const [uploading, setUploading] = useState(0);
  const [filter, setFilter] = useState<PhotoType | "all">("all");
  const [selected, setSelected] = useState<Photo | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleFiles(list: FileList | null) {
    if (!list?.length) return;
    const files = Array.from(list).filter((f) => f.type.startsWith("image/"));
    setUploading(files.length);
    let failed = 0;
    for (const file of files) {
      try {
        await uploadPhoto(file, {
          projectId,
          photoType: uploadType,
          auth: { context: "staff" },
        });
      } catch {
        failed += 1;
      }
      setUploading((n) => n - 1);
    }
    if (failed > 0) toast.error(`${failed} upload(s) failed`);
    router.refresh();
  }

  const visible =
    filter === "all" ? photos : photos.filter((p) => p.photoType === filter);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Photos{" "}
          {photos.length > 0 ? (
            <span className="text-sm font-normal text-muted-foreground">
              ({photos.length})
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={uploadType}
            onValueChange={(v) => setUploadType(v as PhotoType)}
          >
            <SelectTrigger className="w-52">
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
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <Button
            variant="outline"
            className="gap-2"
            disabled={uploading > 0}
            onClick={() => inputRef.current?.click()}
          >
            {uploading > 0 ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Uploading (
                {uploading})…
              </>
            ) : (
              <>
                <ImagePlus className="size-4" /> Upload
              </>
            )}
          </Button>
        </div>

        {photos.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`rounded-full border px-3 py-1 text-xs ${
                filter === "all" ? "bg-foreground text-background" : ""
              }`}
            >
              All
            </button>
            {PHOTO_TYPES.filter((t) =>
              photos.some((p) => p.photoType === t)
            ).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilter(t)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  filter === t ? "bg-foreground text-background" : ""
                }`}
              >
                {PHOTO_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        ) : null}

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {visible.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p)}
              className="group relative aspect-square overflow-hidden rounded-md border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={p.caption ?? PHOTO_TYPE_LABELS[p.photoType]}
                className="size-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
              {p.visibility === "owner" ? (
                <span className="absolute right-1 top-1 rounded-full bg-primary p-1 text-primary-foreground">
                  <Eye className="size-3" />
                </span>
              ) : null}
            </button>
          ))}
        </div>
        {photos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No photos yet. Upload before/progress/after shots so the whole job
            history lives here.
          </p>
        ) : null}
      </CardContent>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-2xl">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2 text-base">
                  {PHOTO_TYPE_LABELS[selected.photoType]}
                  <Badge variant="secondary">
                    {selected.uploadedByKind === "internal"
                      ? "Staff"
                      : selected.uploadedByKind === "sub"
                        ? "Subcontractor"
                        : "Customer"}
                  </Badge>
                  <Badge
                    variant={
                      selected.visibility === "owner" ? "default" : "outline"
                    }
                  >
                    {selected.visibility === "owner"
                      ? "Owner-visible"
                      : "Internal only"}
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selected.url}
                alt={selected.caption ?? ""}
                className="max-h-[60svh] w-full rounded-md object-contain"
              />
              {selected.caption ? (
                <p className="text-sm text-muted-foreground">
                  {selected.caption}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  <Select
                    value={selected.photoType}
                    onValueChange={(v) =>
                      startTransition(async () => {
                        const res = await updatePhoto(projectId, selected.id, {
                          photo_type: v,
                        });
                        if (res.ok) {
                          setSelected({ ...selected, photoType: v as PhotoType });
                        } else toast.error(res.error);
                      })
                    }
                  >
                    <SelectTrigger className="w-48">
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
                  <Button
                    variant="outline"
                    disabled={pending}
                    className="gap-2"
                    onClick={() =>
                      startTransition(async () => {
                        const next =
                          selected.visibility === "owner" ? "internal" : "owner";
                        const res = await updatePhoto(projectId, selected.id, {
                          visibility: next,
                        });
                        if (res.ok) {
                          setSelected({ ...selected, visibility: next });
                        } else toast.error(res.error);
                      })
                    }
                  >
                    {selected.visibility === "owner" ? (
                      <>
                        <EyeOff className="size-4" /> Make internal
                      </>
                    ) : (
                      <>
                        <Eye className="size-4" /> Show to owner
                      </>
                    )}
                  </Button>
                </div>
                <Button
                  variant="destructive"
                  disabled={pending}
                  className="gap-2"
                  onClick={() => {
                    if (!confirm("Delete this photo permanently?")) return;
                    startTransition(async () => {
                      const res = await deletePhoto(projectId, selected.id);
                      if (res.ok) setSelected(null);
                      else toast.error(res.error);
                    });
                  }}
                >
                  <Trash2 className="size-4" /> Delete
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
