import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { findActiveShareLink } from "@/lib/share-links";
import { getSubIdentity, getSubAssignment } from "@/lib/sub-session";
import {
  extensionFor,
  maxBytesFor,
  mediaKindFor,
  photoStoragePath,
  verifyIntakeGrant,
} from "@/lib/uploads";

// Mints a signed upload URL for the project-photos bucket (photos + videos).
// Four authorization contexts:
//   staff  — logged-in internal user (session cookie)
//   intake — HMAC grant returned by the intake submission
//   share  — raw share-link token (sub or owner link)
//   sub    — logged-in subcontractor, assigned to the project
export async function POST(request: NextRequest) {
  let body: {
    context?: "staff" | "intake" | "share" | "sub";
    grant?: string;
    token?: string;
    projectId?: string;
    contentType?: string;
    size?: number;
    // Videos ask for a second signed URL to store their poster frame.
    wantsPoster?: boolean;
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

  const kind = mediaKindFor(contentType);
  if (!kind) {
    return NextResponse.json(
      { error: "Only photos and videos are allowed" },
      { status: 415 }
    );
  }
  if (size && size > maxBytesFor(kind)) {
    return NextResponse.json(
      {
        error:
          kind === "video"
            ? "Video is too large (50 MB max — try a shorter clip)"
            : "Photo is too large (10 MB max)",
      },
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
  const path = photoStoragePath(projectId, photoId, extensionFor(contentType));

  const { data, error } = await admin.storage
    .from("project-photos")
    .createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json(
      { error: "Could not prepare upload" },
      { status: 500 }
    );
  }

  // A video also gets a slot for its poster frame so gallery tiles don't have
  // to download the whole clip.
  let thumbnailPath: string | null = null;
  let thumbnailToken: string | null = null;
  if (kind === "video" && body.wantsPoster) {
    const posterPath = photoStoragePath(projectId, `${photoId}-poster`, "jpg");
    const { data: posterData } = await admin.storage
      .from("project-photos")
      .createSignedUploadUrl(posterPath);
    if (posterData) {
      thumbnailPath = posterPath;
      thumbnailToken = posterData.token;
    }
  }

  return NextResponse.json({
    photoId,
    path,
    uploadToken: data.token,
    mediaKind: kind,
    thumbnailPath,
    thumbnailToken,
    shareLinkId,
  });
}
