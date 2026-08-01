import Image from "next/image";
import { findActiveShareLink } from "@/lib/share-links";
import { createAdminClient } from "@/lib/supabase/admin";
import { PHOTO_TYPE_LABELS, type PhotoType } from "@/lib/stages";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SubActions } from "./sub-actions";
import { MapPin } from "lucide-react";

export const metadata = {
  title: "Job Details",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

function LinkDead() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-sidebar px-4 text-center">
      <Image src="/logo.png" alt="Turnkey Solutions Network" width={220} height={73} />
      <div className="mt-8 max-w-sm rounded-xl bg-card p-6">
        <h1 className="text-lg font-semibold">This link is no longer active</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          It may have expired or been replaced. Contact Turnkey for a new link.
        </p>
      </div>
    </div>
  );
}

export default async function SubTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const link = await findActiveShareLink(token);
  if (!link || link.kind !== "sub") return <LinkDead />;

  const admin = createAdminClient();
  const [{ data: project }, { data: assignment }, { data: myPhotos }] =
    await Promise.all([
      admin
        .from("projects")
        .select("id, title, property_address, scope")
        .eq("id", link.project_id)
        .single(),
      admin
        .from("project_subcontractors")
        .select("id, scheduled_start, scheduled_end, schedule_notes, scope_notes, status")
        .eq("project_id", link.project_id)
        .eq("subcontractor_id", link.subcontractor_id!)
        .maybeSingle(),
      admin
        .from("photos")
        .select("id, storage_path, photo_type, created_at")
        .eq("project_id", link.project_id)
        .eq("share_link_id", link.id)
        .order("created_at", { ascending: false }),
    ]);

  if (!project) return <LinkDead />;

  const photoUrls = new Map<string, string>();
  if (myPhotos && myPhotos.length > 0) {
    const { data: signed } = await admin.storage
      .from("project-photos")
      .createSignedUrls(myPhotos.map((p) => p.storage_path), 3600);
    signed?.forEach((s, i) => {
      if (s.signedUrl) photoUrls.set(myPhotos[i].id, s.signedUrl);
    });
  }

  return (
    <div className="min-h-svh bg-background">
      <header className="bg-sidebar py-4">
        <div className="mx-auto flex max-w-xl justify-center px-4">
          <Image src="/logo.png" alt="Turnkey Solutions Network" width={190} height={63} />
        </div>
      </header>
      <main className="mx-auto grid max-w-xl gap-4 p-4">
        <div>
          <h1 className="text-xl font-semibold">{project.title}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-4" /> {project.property_address}
          </p>
        </div>

        {assignment ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your Assignment</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              {assignment.scope_notes ? (
                <p className="whitespace-pre-wrap">{assignment.scope_notes}</p>
              ) : null}
              {assignment.scheduled_start ? (
                <p className="text-muted-foreground">
                  Scheduled: {assignment.scheduled_start}
                  {assignment.scheduled_end ? ` → ${assignment.scheduled_end}` : ""}
                </p>
              ) : null}
              {assignment.schedule_notes ? (
                <p className="text-muted-foreground">{assignment.schedule_notes}</p>
              ) : null}
              {assignment.status === "complete" ? (
                <Badge className="w-fit">Marked complete — thank you!</Badge>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {project.scope ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Job Scope</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{project.scope}</p>
            </CardContent>
          </Card>
        ) : null}

        <SubActions
          token={token}
          projectId={project.id}
          workComplete={assignment?.status === "complete"}
        />

        {myPhotos && myPhotos.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Photos You&apos;ve Uploaded
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {myPhotos.map((p) => (
                  <div key={p.id} className="relative aspect-square overflow-hidden rounded-md border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoUrls.get(p.id) ?? ""}
                      alt={PHOTO_TYPE_LABELS[p.photo_type as PhotoType]}
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </main>
    </div>
  );
}
