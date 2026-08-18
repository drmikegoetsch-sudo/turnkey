"use client";

import imageCompression from "browser-image-compression";
import { createClient } from "@/lib/supabase/client";

export type UploadAuth =
  | { context: "staff" }
  | { context: "intake"; grant: string }
  | { context: "share"; token: string }
  | { context: "sub" };

export type UploadOptions = {
  projectId: string;
  photoType: string;
  visibility?: "internal" | "owner";
  caption?: string;
  auth: UploadAuth;
};

async function compress(file: File): Promise<File> {
  try {
    return await imageCompression(file, {
      maxWidthOrHeight: 1800,
      maxSizeMB: 2,
      useWebWorker: true,
      initialQuality: 0.85,
    });
  } catch {
    return file; // fall back to the original if compression fails
  }
}

export async function uploadPhoto(file: File, opts: UploadOptions) {
  const compressed = await compress(file);
  const contentType = compressed.type || "image/jpeg";

  const authFields =
    opts.auth.context === "intake"
      ? { context: "intake", grant: opts.auth.grant }
      : opts.auth.context === "share"
        ? { context: "share", token: opts.auth.token }
        : opts.auth.context === "sub"
          ? { context: "sub" }
          : { context: "staff" };

  const signRes = await fetch("/api/uploads/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...authFields,
      projectId: opts.projectId,
      contentType,
      size: compressed.size,
    }),
  });
  if (!signRes.ok) {
    const err = await signRes.json().catch(() => ({}));
    throw new Error(err.error ?? "Could not prepare upload");
  }
  const { photoId, path, uploadToken } = await signRes.json();

  const supabase = createClient();
  const { error: uploadError } = await supabase.storage
    .from("project-photos")
    .uploadToSignedUrl(path, uploadToken, compressed, { contentType });
  if (uploadError) {
    throw new Error("Upload failed — please try again");
  }

  const confirmRes = await fetch("/api/uploads/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...authFields,
      projectId: opts.projectId,
      photoId,
      path,
      photoType: opts.photoType,
      visibility: opts.visibility ?? "internal",
      caption: opts.caption,
    }),
  });
  if (!confirmRes.ok) {
    const err = await confirmRes.json().catch(() => ({}));
    throw new Error(err.error ?? "Could not save photo");
  }

  return { photoId, path };
}
