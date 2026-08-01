"use client";

// Photo picker used by the intake form (and anywhere files are queued
// before the project exists). Collects File objects and previews them;
// the parent decides when to upload.

import { useCallback, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ImagePlus, X } from "lucide-react";

export function PhotoPicker({
  files,
  onChange,
  max = 10,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  max?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Object URLs live exactly as long as the file list that produced them.
  const previews = useMemo(
    () => files.map((f) => URL.createObjectURL(f)),
    [files]
  );
  useEffect(
    () => () => previews.forEach((u) => URL.revokeObjectURL(u)),
    [previews]
  );

  const addFiles = useCallback(
    (incoming: FileList | null) => {
      if (!incoming) return;
      const images = Array.from(incoming).filter((f) =>
        f.type.startsWith("image/")
      );
      onChange([...files, ...images].slice(0, max));
    },
    [files, max, onChange]
  );

  return (
    <div className="grid gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        className="w-fit gap-2"
      >
        <ImagePlus className="size-4" />
        Add Photos
      </Button>
      {files.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {files.map((file, i) => (
            <div key={`${file.name}-${i}`} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previews[i]}
                alt={file.name}
                className="size-20 rounded-md border object-cover"
              />
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                className="absolute -right-2 -top-2 rounded-full bg-foreground p-0.5 text-background shadow"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
