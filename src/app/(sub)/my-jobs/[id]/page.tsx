import Link from "next/link";
import { notFound } from "next/navigation";
import { getSubIdentity, getSubAssignment } from "@/lib/sub-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PHOTO_TYPE_LABELS, type PhotoType } from "@/lib/stages";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { JobActions } from "./job-actions";
import { ArrowLeft, CalendarDays, Film, MapPin, Play } from "lucide-react";

export const metadata = { title: "Job Details" };
export const dynamic = "force-dynamic";

export default async function SubJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const identity = (await getSubIdentity())!;
  const assignment = await getSubAssignment(identity.subcontractorId, id);
  if (!assignment) notFound();

  const admin = createAdminClient();
  const [{ data: project }, { data: myPhotos }] = await Promise.all([
    admin
      .from("projects")
      .select("id, title, property_address, scope")
      .eq("id", id)
      .maybeSingle(),
    admin
      .from("photos")
      .select(
        "id, storage_path, thumbnail_path, media_kind, photo_type, created_at"
      )
      .eq("project_id", id)
      .eq("uploaded_by_kind", "sub")
      .order("created_at", { ascending: false }),
  ]);
  if (!project) notFound();

  // Videos show their poster frame; photos show themselves.
  const photoUrls = new Map<string, string>();
  if (myPhotos && myPhotos.length > 0) {
    const tilePaths = myPhotos.map((p) =>
      p.media_kind === "video" ? p.thumbnail_path : p.storage_path
    );
    const withTiles = myPhotos.filter((_, i) => !!tilePaths[i]);
    const paths = tilePaths.filter((p): p is string => !!p);
    if (paths.length > 0) {
      const { data: signed } = await admin.storage
        .from("project-photos")
        .createSignedUrls(paths, 3600);
      signed?.forEach((s, i) => {
        if (s.signedUrl) photoUrls.set(withTiles[i].id, s.signedUrl);
      });
    }
  }

  return (
    <div>
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-2 mb-3 gap-2 text-muted-foreground"
      >
        <Link href="/my-jobs">
          <ArrowLeft className="size-4" /> All jobs
        </Link>
      </Button>

      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        {project.title}
      </h1>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
        <MapPin className="size-4 shrink-0" />
        {project.property_address}
      </p>

      <div className="mt-5 grid gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Your work</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {assignment.scope_notes ? (
              <p className="whitespace-pre-wrap">{assignment.scope_notes}</p>
            ) : (
              <p className="text-muted-foreground">
                No specific scope noted — check with Turnkey.
              </p>
            )}
            {assignment.scheduled_start ? (
              <p className="flex items-center gap-1.5 text-muted-foreground">
                <CalendarDays className="size-4 shrink-0" />
                {assignment.scheduled_start}
                {assignment.scheduled_end &&
                assignment.scheduled_end !== assignment.scheduled_start
                  ? ` → ${assignment.scheduled_end}`
                  : ""}
              </p>
            ) : null}
            {assignment.schedule_notes ? (
              <p className="text-muted-foreground">
                {assignment.schedule_notes}
              </p>
            ) : null}
            {assignment.status === "complete" ? (
              <Badge className="w-fit">Marked complete — thank you!</Badge>
            ) : null}
          </CardContent>
        </Card>

        {project.scope ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">About the job</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{project.scope}</p>
            </CardContent>
          </Card>
        ) : null}

        <JobActions
          projectId={project.id}
          workComplete={assignment.status === "complete"}
        />

        {myPhotos && myPhotos.length > 0 ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Uploaded from the crew
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {myPhotos.map((p) => {
                  const tile = photoUrls.get(p.id);
                  return (
                    <div
                      key={p.id}
                      className="relative aspect-square overflow-hidden rounded-md border bg-muted"
                    >
                      {tile ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={tile}
                          alt={PHOTO_TYPE_LABELS[p.photo_type as PhotoType]}
                          className="size-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="flex size-full items-center justify-center">
                          <Film className="size-5 text-muted-foreground" />
                        </span>
                      )}
                      {p.media_kind === "video" ? (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="rounded-full bg-black/55 p-1.5">
                            <Play className="size-3.5 fill-white text-white" />
                          </span>
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
