// Board columns are user-configurable rows in `board_columns`. Each one carries
// a semantic `kind` so the Today view, the customer status page, and billing
// state keep working no matter how Daniel and Taylor rename or reorder things.

export const COLUMN_KINDS = [
  "lead",
  "qualifying",
  "estimating",
  "approved",
  "active",
  "review",
  "invoice",
  "closed",
  "other",
] as const;

export type ColumnKind = (typeof COLUMN_KINDS)[number];

export type BoardColumn = {
  id: string;
  label: string;
  description: string | null;
  kind: ColumnKind;
  color: ColumnColor;
  position: number;
};

// What each kind means — shown when picking a kind in Settings, so the choice
// isn't mysterious.
export const KIND_LABELS: Record<ColumnKind, string> = {
  lead: "New lead",
  qualifying: "Qualifying",
  estimating: "Estimating",
  approved: "Approved / scheduled",
  active: "Work in progress",
  review: "Final review",
  invoice: "Ready to invoice",
  closed: "Closed",
  other: "Other",
};

export const KIND_HINTS: Record<ColumnKind, string> = {
  lead: "New requests land here. Customers see “Request Received”.",
  qualifying: "Sorting out budget, scope, and fit before an appointment.",
  estimating:
    "Estimates get prepared, sent, and chased. Shows in Today’s “Estimates needing attention”.",
  approved: "Customer said yes. Customers see “Approved — Getting Ready”.",
  active:
    "Crews are working. Shows in Today’s “Active jobs”; customers see “Work In Progress”.",
  review: "Nearly done, needs your walkthrough. Customers see “Finishing Up”.",
  invoice:
    "Operationally complete. Shows in Today’s “Ready to invoice”; billing unlocks.",
  closed: "Done and archived. Hidden from the default board view.",
  other: "No special behavior — a column that’s just yours.",
};

export const COLUMN_COLORS = [
  "gold",
  "sky",
  "amber",
  "emerald",
  "rose",
  "violet",
  "slate",
] as const;

export type ColumnColor = (typeof COLUMN_COLORS)[number];

export const COLOR_DOT_CLASSES: Record<ColumnColor, string> = {
  gold: "bg-primary",
  sky: "bg-sky-500",
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  rose: "bg-rose-500",
  violet: "bg-violet-500",
  slate: "bg-slate-400",
};

export function dotClass(color: string) {
  return COLOR_DOT_CLASSES[color as ColumnColor] ?? COLOR_DOT_CLASSES.slate;
}

// Friendly milestones for the customer-facing status page, derived from kind.
export const OWNER_KIND_LABELS: Record<ColumnKind, string> = {
  lead: "Request Received",
  qualifying: "Request Received",
  estimating: "Preparing Your Estimate",
  approved: "Approved — Getting Ready",
  active: "Work In Progress",
  review: "Finishing Up",
  invoice: "Complete",
  closed: "Complete",
  other: "In Progress",
};

// Order used for the lifecycle stepper and the customer milestone list.
export const KIND_ORDER: ColumnKind[] = [
  "lead",
  "qualifying",
  "estimating",
  "approved",
  "active",
  "review",
  "invoice",
  "closed",
];

export function kindRank(kind: ColumnKind) {
  const i = KIND_ORDER.indexOf(kind);
  return i === -1 ? KIND_ORDER.indexOf("active") : i;
}

export const BILLABLE_KINDS: ColumnKind[] = ["invoice", "closed"];

export const PHOTO_TYPES = [
  "before",
  "progress",
  "issue_damage",
  "materials",
  "completed_after",
] as const;

export type PhotoType = (typeof PHOTO_TYPES)[number];

export const PHOTO_TYPE_LABELS: Record<PhotoType, string> = {
  before: "Before",
  progress: "Progress",
  issue_damage: "Issue / Damage",
  materials: "Materials",
  completed_after: "Completed Work / After",
};

export function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function projectNumber(n: number) {
  return `TSN-${n}`;
}
