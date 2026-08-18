import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { findActiveShareLink } from "@/lib/share-links";
import { verifyIntakeGrant } from "@/lib/uploads";
import { getSubIdentity, getSubAssignment } from "@/lib/sub-session";
import { PHOTO_TYPES } from "@/lib/stages";

// Creates the photos row after the client finishes uploading to storage.
// Same three authorization contexts as /api/uploads/sign.
export async function POST(request: NextRequest) {
  let body: {
    context?: "staff" | "intake" | "share" | "sub";
    grant?: string;
    token?: string;
    projectId?: string;
    photoId?: string;
    path?: string;
    photoType?: string;
    visibility?: "internal" | "owner";
    caption?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const { context, grant, token, projectId, photoId, path } = body;
  if (!projectId || !photoId || !path || !path.startsWith(`${projectId}/`)) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const photoType = PHOTO_TYPES.includes(
    body.photoType as (typeof PHOTO_TYPES)[number]
  )
    ? body.photoType
    : "progress";

  let uploadedByKind: "internal" | "sub" | "customer" = "customer";
  let uploadedBy: string | null = null;
  let shareLinkId: string | null = null;
  let visibility: "internal" | "owner" =
    body.visibility === "owner" ? "owner" : "internal";

  if (context === "staff") {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    uploadedByKind = "internal";
    uploadedBy = user.id;
  } else if (context === "intake") {
    const payload = grant ? verifyIntakeGrant(grant) : null;
    if (!payload || payload.p !== projectId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    uploadedByKind = "customer";
    visibility = "internal";
  } else if (context === "share") {
    const link = token ? await findActiveShareLink(token) : null;
    if (!link || link.project_id !== projectId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    shareLinkId = link.id;
    uploadedByKind = link.kind === "sub" ? "sub" : "customer";
    visibility = "internal";
  } else if (context === "sub") {
    const identity = await getSubIdentity();
    const assignment = identity
      ? await getSubAssignment(identity.subcontractorId, projectId)
      : null;
    if (!assignment) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    uploadedByKind = "sub";
    visibility = "internal";
  } else {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Verify the object actually exists in storage before recording it.
  const dir = projectId;
  const fileName = path.slice(dir.length + 1);
  const { data: objects } = await admin.storage
    .from("project-photos")
    .list(dir, { search: fileName });
  if (!objects?.some((o) => o.name === fileName)) {
    return NextResponse.json({ error: "Upload not found" }, { status: 400 });
  }

  const { error } = await admin.from("photos").insert({
    id: photoId,
    project_id: projectId,
    storage_path: path,
    photo_type: photoType,
    visibility,
    caption: (body.caption ?? "").slice(0, 500) || null,
    uploaded_by_kind: uploadedByKind,
    uploaded_by: uploadedBy,
    share_link_id: shareLinkId,
    confirmed_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: "Could not save photo" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
