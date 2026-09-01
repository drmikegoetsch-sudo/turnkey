import Link from "next/link";
import type { PriorDecline } from "@/lib/declined";
import { formatMoney, projectNumber } from "@/lib/stages";
import { TriangleAlert } from "lucide-react";

const MATCH_LABELS = {
  phone: "same phone",
  email: "same email",
  address: "same address",
} as const;

// The whole point of tracking declines: warn BEFORE anyone drives out again.
export function PriorDeclinesBanner({
  declines,
}: {
  declines: PriorDecline[];
}) {
  if (declines.length === 0) return null;

  const total = declines.reduce((sum, d) => sum + (d.projectValue ?? 0), 0);

  return (
    <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-4">
      <p className="flex items-center gap-2 font-medium text-amber-900">
        <TriangleAlert className="size-4 shrink-0" />
        Heads up — {declines.length === 1 ? "this customer has" : "this customer has"}{" "}
        {declines.length} previously declined estimate
        {declines.length === 1 ? "" : "s"}
        {total > 0 ? ` worth ${formatMoney(total)}` : ""}
      </p>
      <ul className="mt-2.5 grid gap-2">
        {declines.map((d) => (
          <li key={d.projectId} className="text-sm">
            <Link
              href={`/projects/${d.projectId}`}
              className="font-medium underline underline-offset-2"
            >
              {projectNumber(d.projectNumber)} · {d.title}
            </Link>
            <span className="text-amber-900/80">
              {" — "}
              {d.reason ?? "declined"}
              {d.projectValue ? `, ${formatMoney(d.projectValue)}` : ""}
              {", "}
              {new Date(d.declinedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            {d.note ? (
              <p className="text-xs text-amber-900/70">{d.note}</p>
            ) : null}
            <p className="text-xs text-amber-900/60">
              matched on {d.matchedOn.map((m) => MATCH_LABELS[m]).join(", ")}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
