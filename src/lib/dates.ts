// Shared "how soon is this" labelling for due dates. Board cards, the Today
// view, and task rows all speak the same language: Today / Tomorrow / Overdue.

export type DueTone = "overdue" | "today" | "soon" | "later";

export type DueInfo = { label: string; tone: DueTone };

export function describeDue(
  due: string | null | undefined,
  today: string
): DueInfo | null {
  if (!due) return null;
  if (due < today) return { label: "Overdue", tone: "overdue" };
  if (due === today) return { label: "Today", tone: "today" };

  const tomorrow = new Date(`${today}T00:00:00`);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);
  if (due === tomorrowStr) return { label: "Tomorrow", tone: "soon" };

  const date = new Date(`${due}T00:00:00`);
  const withinWeek =
    (date.getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000 <= 6;
  return {
    label: withinWeek
      ? date.toLocaleDateString(undefined, { weekday: "short" })
      : date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    tone: "later",
  };
}

export const DUE_TONE_CLASSES: Record<DueTone, string> = {
  overdue: "bg-destructive/10 text-destructive",
  today: "bg-primary/20 text-primary-foreground/90",
  soon: "bg-muted text-muted-foreground",
  later: "bg-muted text-muted-foreground",
};
