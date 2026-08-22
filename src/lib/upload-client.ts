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

export function isVideo(file: File) {
  return file.type.startsWith("video/");
}

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

type VideoMeta = { duration: number; poster: Blob | null };

// Pulls the duration and a single frame out of a video entirely in the
// browser. The frame becomes the gallery thumbnail so tiles don't have to
// download multi-megabyte clips — which matters on a job site.
async function readVideoMeta(file: File): Promise<VideoMeta> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let settled = false;

    const done = (meta: VideoMeta) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve(meta);
    };

    // Never let a codec the browser can't decode block the upload.
    const timeout = setTimeout(() => done({ duration: 0, poster: null }), 8000);

    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      // Seek slightly in — frame zero is often black.
      video.currentTime = Math.min(0.1, duration / 2 || 0.1);

      video.onseeked = () => {
        try {
          const scale = Math.min(1, 640 / (video.videoWidth || 640));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round((video.videoWidth || 640) * scale));
          canvas.height = Math.max(1, Math.round((video.videoHeight || 360) * scale));
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            clearTimeout(timeout);
            done({ duration, poster: null });
            return;
          }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => {
              clearTimeout(timeout);
              done({ duration, poster: blob });
            },
            "image/jpeg",
            0.8
          );
        } catch {
          clearTimeout(timeout);
          done({ duration, poster: null });
        }
      };
    };

    video.onerror = () => {
      clearTimeout(timeout);
      done({ duration: 0, poster: null });
    };
  });
}

export async function uploadPhoto(file: File, opts: UploadOptions) {
  const video = isVideo(file);

  // Images shrink before they leave the device; videos go up as-is.
  const payload = video ? file : await compress(file);
  const contentType =
    payload.type || (video ? "video/mp4" : "image/jpeg");

  const meta = video
    ? await readVideoMeta(file)
    : { duration: 0, poster: null };

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
      size: payload.size,
      wantsPoster: video && !!meta.poster,
    }),
  });
  if (!signRes.ok) {
    const err = await signRes.json().catch(() => ({}));
    throw new Error(err.error ?? "Could not prepare upload");
  }
  const { photoId, path, uploadToken, thumbnailPath, thumbnailToken } =
    await signRes.json();

  const supabase = createClient();
  const { error: uploadError } = await supabase.storage
    .from("project-photos")
    .uploadToSignedUrl(path, uploadToken, payload, { contentType });
  if (uploadError) {
    throw new Error(
      video
        ? "Video upload failed — check your signal and try again"
        : "Upload failed — please try again"
    );
  }

  // A failed poster is cosmetic: the video still works, the tile just falls
  // back to a generic thumbnail.
  let confirmedThumbnail: string | null = null;
  if (video && meta.poster && thumbnailPath && thumbnailToken) {
    const { error: posterError } = await supabase.storage
      .from("project-photos")
      .uploadToSignedUrl(thumbnailPath, thumbnailToken, meta.poster, {
        contentType: "image/jpeg",
      });
    if (!posterError) confirmedThumbnail = thumbnailPath;
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
      mediaKind: video ? "video" : "photo",
      mimeType: contentType,
      sizeBytes: payload.size,
      durationSeconds: video ? meta.duration : undefined,
      thumbnailPath: confirmedThumbnail,
    }),
  });
  if (!confirmRes.ok) {
    const err = await confirmRes.json().catch(() => ({}));
    throw new Error(err.error ?? "Could not save upload");
  }

  return { photoId, path };
}
