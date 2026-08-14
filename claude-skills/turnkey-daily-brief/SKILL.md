---
name: turnkey-daily-brief
description: >
  Compose and email the Turnkey morning Daily Brief to
  daniel@turnkeysolutionsnetwork.com — everything the owners need for the
  day: money in play, what's overdue, today's schedule, what's ready to
  bill, blocked jobs, and fresh leads. Use when the user asks for the daily
  brief, or when running as a scheduled morning task.
---

# Turnkey Daily Brief

Uses the **turnkey-supabase** skill for all data access (connection, schema,
and query recipes live there — read it first). All dates in
**America/Chicago**.

## Gather (in order)

1. **Columns** → map `kind` → column ids.
2. **Open projects** (`archived_at is null`, kind != closed) with
   `customers(name)`, `board_columns(kind,label)` — derive:
   - Pipeline total (sum `project_value`)
   - Ready to bill: kind = `invoice` (list + total)
   - Blocked: `is_blocked` (list with `blocked_reason` + value at risk)
3. **Action queue** — merge, overdue first, then biggest value:
   - next actions with `next_action_due <= today`
   - open tasks with `due_date <= today` (join project)
   - projects in `estimating` columns unchanged ≥ 3 days (from
     `column_changed_at`) — flag ≥ 7 days as urgent
4. **Today's schedule** — appointments where `starts_at` is today
   (Chicago), plus subs on site (`scheduled_start <= today <=
   scheduled_end`, status != complete).
5. **New leads** — projects with `source=eq.intake` created since the
   previous business morning; include customer name/phone and their stated
   budget from `intake_submissions`.

## Compose the email

- **To:** daniel@turnkeysolutionsnetwork.com
- **Subject:** `Turnkey Daily Brief — <Weekday, Mon D> · <N> due · <$X> ready to bill`
  (drop clauses that are zero)
- **Body** (HTML if the email tool supports it, otherwise clean plain text).
  Order = priority. Skip any empty section entirely — never write "none".

```
Good morning! Here's <weekday> at a glance.

THE NUMBERS
Pipeline $X across N open jobs · Ready to bill $Y (N) · N actions overdue

DO THESE FIRST            ← the queue from step 3, max ~8 rows
• [OVERDUE] Confirm countertop template — Kitchen Remodel (Marcus Bell, $52,000)
  https://turnkey-wine.vercel.app/projects/<id>
…

TODAY'S SCHEDULE
• 2:00 PM — Site visit, Whole-Home Repaint (Nathan Cole, 88 Fenwick Ave)
• On site — Carlos Mendez (Plumbing), Kitchen Remodel

READY TO BILL — $Y
• Water Heater Swap (Lila Barnes) — $5,300 → invoice in QuickBooks

BLOCKED — $Z waiting
• Deck Rebuild & Rail — waiting on composite delivery ($14,200)

NEW LEADS SINCE YESTERDAY
• Jane Smith — Kitchen, ~$25,000, prefers weekday mornings — call her
```

Every project line links to
`https://turnkey-wine.vercel.app/projects/<id>`.

## Send

Use whatever email tool is connected in this workspace (Gmail, Outlook…).
If the tool can only create drafts, create the draft and say so. If no email
tool is connected, output the full brief in chat and tell the user to
connect email for delivery.

## Scheduling

Set up once with a scheduled task, e.g.: *"Every weekday at 6:30 AM Central,
run the turnkey-daily-brief skill and email the brief to
daniel@turnkeysolutionsnetwork.com."*
