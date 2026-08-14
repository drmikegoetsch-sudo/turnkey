---
name: turnkey-supabase
description: >
  Query and update the Turnkey Solutions Network Command Center database
  (Supabase). Use this skill whenever the user asks about their projects,
  leads, pipeline, revenue, estimates, tasks, subcontractors, schedule, or
  customers — e.g. "what's blocked?", "how much is ready to invoice?",
  "which estimates are going stale?", "set a follow-up on the Bell kitchen".
  Also the data layer for the daily brief and alert skills.
---

# Turnkey Command Center — Database Access

The business runs on one Supabase project. You have a dedicated secret API
key with full read/write access to the `public` schema via PostgREST.

## Connection

```
BASE URL : https://gjvbdwhlithfowyuxldz.supabase.co/rest/v1
API KEY  : <PASTE_CLAUDE_SKILL_SECRET_KEY_HERE>
```

Every request needs BOTH headers:

```
apikey: <key>
Authorization: Bearer <key>
```

For writes add `Content-Type: application/json` and
`Prefer: return=representation` (so you can confirm what changed).

Example — all blocked projects with customer names:

```
GET {BASE}/projects?select=title,project_value,blocked_reason,customers(name)&is_blocked=eq.true&archived_at=is.null
```

## The mental model

**Everything hangs off `projects`.** A project belongs to a `customer`, sits
in exactly one `board_columns` row (the kanban column), and owns its tasks,
notes, photos, appointments, sub assignments, and share links.

**Columns are user-editable; `kind` is the truth.** Daniel and Taylor can
rename/reorder/recolor columns at will, so NEVER match on a column's label.
Every column carries a semantic `kind` that never lies:

| kind | Meaning |
|---|---|
| `lead` | New request, not yet qualified |
| `qualifying` | Sorting out budget/scope/fit |
| `estimating` | Estimate being prepared, sent, or chased |
| `approved` | Customer said yes; job being prepped/scheduled |
| `active` | Crews working |
| `review` | Final walkthrough / internal review |
| `invoice` | **Operationally complete — ready to bill** |
| `closed` | Done and archived (exclude from "open" queries) |
| `other` | No special behavior |

"Ready to bill" = project's column has `kind = 'invoice'`. "Open" =
`archived_at is null` AND column kind != `closed`.

**Blocked is a flag, not a column**: `projects.is_blocked` with
`projects.blocked_reason`. A job can be blocked in any phase.

## Tables

- **projects** — `id, project_number (int, display as TSN-<n>), title,
  customer_id, column_id, column_changed_at, property_address, project_type,
  scope, project_value (numeric — the money number), budget_range (customer's
  words), timeline, next_action, next_action_due (date), is_blocked,
  blocked_reason, quickbooks_url, source ('intake' = came from the website
  form, 'manual' = entered by staff), archived_at, created_at, updated_at`
- **board_columns** — `id, label, description, kind, color, position,
  archived_at`. Active columns: `archived_at=is.null`, order by `position`.
- **customers** — `id, name, phone, alt_phone, email`
- **tasks** — `id, project_id, title, due_date, completed_at (null = open),
  assigned_to → profiles.id, created_at`
- **notes** — `id, project_id, kind ('note'|'update'|'issue'), visibility
  ('internal'|'owner' — owner-visible shows on the customer status page),
  body, author_kind ('internal'|'sub'|'customer'), created_at`. Sub-reported
  problems are `kind='issue'`.
- **appointments** — `id, project_id, kind, starts_at (timestamptz), location,
  notes`
- **subcontractors** — `id, name, company, trade, phone, email`
- **project_subcontractors** — `id, project_id, subcontractor_id,
  scheduled_start, scheduled_end (dates), schedule_notes, scope_notes,
  status ('assigned'|'in_progress'|'complete')`. "On site today" =
  `scheduled_start <= today <= scheduled_end` and status != complete.
- **stage_events** — the audit trail: `project_id, from_column_id,
  to_column_id, to_label (snapshot), changed_by, changed_at`. Use for "when
  did this move / who moved it / how long in stage".
- **intake_submissions** — the customer's full website Work Inquiry, verbatim
  (availability, design-services interest, budget, referral source, up to 3
  project descriptions). Linked by `project_id`. Never edit these.
- **photos**, **share_links**, **profiles** (staff: Daniel, Taylor, Mike),
  **project_types**.

## Conventions

- **Timezone**: the business runs on **America/Chicago**. "Today" and all
  due-date comparisons use the Chicago calendar date, not UTC.
- **Money**: `project_value` is authoritative. Sum it for pipeline/column
  totals. `budget_range` is free text from the customer — display only.
- **Joins**: use PostgREST embedding — `select=title,customers(name),
  board_columns(label,kind)`.
- Fetch `board_columns` once per session and map kinds → ids; filter projects
  with `column_id=in.(<ids>)`.

## Recipes

Pipeline total (open projects):
```
GET {BASE}/projects?select=project_value,board_columns(kind)&archived_at=is.null
→ sum project_value where kind != 'closed'
```

Overdue actions:
```
GET {BASE}/projects?select=id,title,next_action,next_action_due,project_value,customers(name)&next_action_due=lte.<today>&archived_at=is.null
GET {BASE}/tasks?select=title,due_date,projects(id,title)&due_date=lte.<today>&completed_at=is.null
```

Estimates going stale (in an `estimating` column ≥ N days):
```
GET {BASE}/projects?select=id,title,column_changed_at,project_value,customers(name,phone)&column_id=in.(<estimating ids>)&column_changed_at=lt.<now - N days>&archived_at=is.null
```

New website leads since a timestamp:
```
GET {BASE}/projects?select=id,title,created_at,customers(name,phone,email),intake_submissions(*)&source=eq.intake&created_at=gt.<iso>&order=created_at.desc
```

Move a project / set a follow-up (PATCH):
```
PATCH {BASE}/projects?id=eq.<uuid>
{"next_action": "Call about estimate", "next_action_due": "2026-08-10"}
```
When changing `column_id`, also set `column_changed_at` to now AND insert a
`stage_events` row (`project_id, from_column_id, to_column_id, to_label,
changed_by: null`) so history stays intact.

## Guardrails

- Confirm with the user before any DELETE, and never bulk-delete.
- Never modify `share_links` (tokens are hashed; editing breaks live links),
  `intake_submissions`, or anything outside the `public` schema.
- This key sees customer PII (names, addresses, phones). Don't paste bulk
  customer data anywhere outside this workspace.
- The staff app link for any project is
  `https://turnkey-wine.vercel.app/projects/<id>` — include it when
  referencing a project so the user can tap through.
