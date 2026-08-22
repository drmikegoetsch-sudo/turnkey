import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

// Short-lived HMAC grant that lets the intake form (no session, no share
// token) upload photos to the project it just created.
const SECRET = () => process.env.SUPABASE_SERVICE_ROLE_KEY!;

type GrantPayload = {
  p: string; // project id
  exp: number; // unix seconds
};

function b64url(buf: Buffer) {
  return buf.toString("base64url");
}

export function signIntakeGrant(projectId: string, ttlSeconds = 60 * 30) {
  const payload: GrantPayload = {
    p: projectId,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const sig = b64url(createHmac("sha256", SECRET()).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyIntakeGrant(grant: string): GrantPayload | null {
  const [body, sig] = grant.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", SECRET()).update(body).digest();
  const given = Buffer.from(sig, "base64url");
  if (
    given.length !== expected.length ||
    !timingSafeEqual(given, expected)
  ) {
    return null;
  }
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString()
    ) as GrantPayload;
    if (typeof payload.p !== "string" || typeof payload.exp !== "number") {
      return null;
    }
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function photoStoragePath(projectId: string, photoId: string, ext: string) {
  const safeExt = ext.replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
  return `${projectId}/${photoId}.${safeExt}`;
}

export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

// quicktime = .mov, what iPhones record by default.
export const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

// Images are compressed in the browser before upload, so they stay small.
// Videos are uploaded as-is; 50 MB matches the storage bucket's own limit
// and is roughly 60–90 seconds of phone video.
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export function mediaKindFor(contentType: string): "photo" | "video" | null {
  if (ALLOWED_IMAGE_TYPES.has(contentType)) return "photo";
  if (ALLOWED_VIDEO_TYPES.has(contentType)) return "video";
  return null;
}

export function maxBytesFor(kind: "photo" | "video") {
  return kind === "video" ? MAX_VIDEO_BYTES : MAX_UPLOAD_BYTES;
}

export function extensionFor(contentType: string) {
  switch (contentType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "video/mp4":
      return "mp4";
    case "video/quicktime":
      return "mov";
    case "video/webm":
      return "webm";
    default:
      return "jpg";
  }
}
