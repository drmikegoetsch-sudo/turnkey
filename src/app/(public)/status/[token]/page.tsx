import Image from "next/image";
import { findActiveShareLink } from "@/lib/share-links";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  OWNER_KIND_LABELS,
  kindRank,
  type ColumnKind,
} from "@/lib/stages";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, MapPin } from "lucide-react";

export const metadata = {
  title: "Project Status",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

// Customer-facing milestones, derived from column kind so the homeowner never
// sees internal churn (or whatever Daniel and Taylor renamed their columns to).
const MILESTONES: { label: string; atLeast: ColumnKind }[] = [
  { label: "Request Received", atLeast: "lead" },
  { label: "Visit & Estimate", atLeast: "estimating" },
  { label: "Approved", atLeast: "approved" },
  { label: "Work In Progress", atLeast: "active" },
  { label: "Complete", atLeast: "invoice" },
];

function LinkDead() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-sidebar px-4 text-center">
      <Image src="/logo.png" alt="Turnkey Solutions Network" width={220} height={73} />
      <div className="mt-8 max-w-sm rounded-xl bg-card p-6">
        <h1 className="text-lg font-semibold">This link is no longer active</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Contact Turnkey Solutions Network for an updated status link.
        </p>
      </div>
    </div>
  );
}

export default async function StatusTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const link = await findActiveShareLink(token);
  if (!link || link.kind !== "owner") return <LinkDead />;

  const admin = createAdminClient();
  const [{ data: project }, { data: updates }, { data: photos }] =
    await Promise.all([
      admin
        .from("projects")
        .select(
          "id, title, property_address, customers(name), board_columns(kind)"
        )
        .eq("id", link.project_id)
        .single(),
      admin
        .from("notes")
        .select("id, body, created_at")
        .eq("project_id", link.project_id)
        .eq("visibility", "owner")
        .order("created_at", { ascending: false }),
      admin
        .from("photos")
        .select(
          "id, storage_path, thumbnail_path, media_kind, photo_type, caption, created_at"
        )
        .eq("project_id", link.project_id)
        .eq("visibility", "owner")
        .order("created_at", { ascending: false }),
    ]);

  if (!project) return <LinkDead />;
  const kind =
    ((project.board_columns as unknown as { kind: ColumnKind } | null)?.kind ??
      "other") as ColumnKind;
  const rank = kindRank(kind);

  // Media itself, plus poster frames so video tiles don't autoload.
  const photoUrls = new Map<string, string>();
  const posterUrls = new Map<string, string>();
  if (photos && photos.length > 0) {
    const { data: signed } = await admin.storage
      .from("project-photos")
      .createSignedUrls(photos.map((p) => p.storage_path), 3600);
    signed?.forEach((s, i) => {
      if (s.signedUrl) photoUrls.set(photos[i].id, s.signedUrl);
    });

    const withPosters = photos.filter((p) => p.thumbnail_path);
    if (withPosters.length > 0) {
      const { data: signedPosters } = await admin.storage
        .from("project-photos")
        .createSignedUrls(
          withPosters.map((p) => p.thumbnail_path as string),
          3600
        );
      signedPosters?.forEach((s, i) => {
        if (s.signedUrl) posterUrls.set(withPosters[i].id, s.signedUrl);
      });
    }
  }

  return (
    <div className="min-h-svh bg-background">
      <header className="bg-sidebar py-5">
        <div className="mx-auto flex max-w-xl justify-center px-4">
          <Image src="/logo.png" alt="Turnkey Solutions Network" width={200} height={67} />
        </div>
      </header>
      <main className="mx-auto grid max-w-xl gap-4 p-4">
        <div>
          <h1 className="text-xl font-semibold">{project.title}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-4" /> {project.property_address}
          </p>
        </div>

        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="text-base">
              Current Status:{" "}
              <span className="text-primary">{OWNER_KIND_LABELS[kind]}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-2.5">
              {MILESTONES.map((m) => {
                const reached = rank >= kindRank(m.atLeast);
                return (
                  <li key={m.label} className="flex items-center gap-2.5">
                    {reached ? (
                      <CheckCircle2 className="size-5 text-primary" />
                    ) : (
                      <Circle className="size-5 text-muted-foreground/40" />
                    )}
                    <span
                      className={`text-sm ${
                        reached ? "font-medium" : "text-muted-foreground"
                      }`}
                    >
                      {m.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>

        {updates && updates.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Updates</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {updates.map((u) => (
                <div key={u.id} className="rounded-lg bg-muted/60 p-3">
                  <p className="text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString(undefined, {
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{u.body}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {photos && photos.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Progress Updates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {photos.map((p) => (
                  <figure key={p.id}>
                    <div className="aspect-square overflow-hidden rounded-md border bg-black/5">
                      {p.media_kind === "video" ? (
                        // preload="metadata" keeps the homeowner from pulling
                        // the whole clip until they press play.
                        <video
                          src={photoUrls.get(p.id) ?? ""}
                          poster={posterUrls.get(p.id) ?? undefined}
                          controls
                          playsInline
                          preload="metadata"
                          className="size-full bg-black object-cover"
                        />
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={photoUrls.get(p.id) ?? ""}
                          alt={p.caption ?? "Progress photo"}
                          className="size-full object-cover"
                          loading="lazy"
                        />
                      )}
                    </div>
                    {p.caption ? (
                      <figcaption className="mt-1 text-xs text-muted-foreground">
                        {p.caption}
                      </figcaption>
                    ) : null}
                  </figure>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <p className="pb-6 text-center text-xs text-muted-foreground">
          Questions? Call or text Turnkey Solutions Network.
        </p>
      </main>
    </div>
  );
}
