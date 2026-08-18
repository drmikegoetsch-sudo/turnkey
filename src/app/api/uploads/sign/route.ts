import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { findActiveShareLink } from "@/lib/share-links";
import { getSubIdentity, getSubAssignment } from "@/lib/sub-session";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
  photoStoragePath,
  verifyIntakeGrant,
} from "@/lib/uploads";

// Mints a signed upload URL for the project-photos bucket.
// Three authorization contexts:
//   staff  — logged-in internal user (session cookie)
//   intake — HMAC grant returned by the intake submission
//   share  — raw share-link token (sub or owner link)
export async function POST(request: NextRequest) {
  let body: {
    context?: "staff" | "intake" | "share" | "sub";
    grant?: string;
    token?: string;
    projectId?: string;
    contentType?: string;
    size?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const { context, grant, token, projectId, contentType, size } = body;
  if (!projectId || !contentType) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    return NextResponse.json(
      { error: "Only photo uploads are allowed" },
      { status: 415 }
    );
  }
  if (size && size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "Photo is too large (10 MB max)" },
      { status: 413 }
    );
  }

  let shareLinkId: string | null = null;

  if (context === "staff") {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (context === "intake") {
    const payload = grant ? verifyIntakeGrant(grant) : null;
    if (!payload || payload.p !== projectId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (context === "share") {
    const link = token ? await findActiveShareLink(token) : null;
    if (!link || link.project_id !== projectId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    shareLinkId = link.id;
  } else if (context === "sub") {
    // Logged-in subcontractor — must be assigned to this project.
    const identity = await getSubIdentity();
    const assignment = identity
      ? await getSubAssignment(identity.subcontractorId, projectId)
      : null;
    if (!assignment) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const photoId = randomUUID();
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const path = photoStoragePath(projectId, photoId, ext);

  const { data, error } = await admin.storage
    .from("project-photos")
    .createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json(
      { error: "Could not prepare upload" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    photoId,
    path,
    uploadToken: data.token,
    shareLinkId,
  });
}
