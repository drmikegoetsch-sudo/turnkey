---
name: turnkey-stale-projects
description: >
  Find Turnkey projects that have gone stale — no column change and no
  activity (notes, tasks, photos, appointments) for more than 7 days — and
  alert the owners by email. Use when the user asks "what's gone quiet /
  stale / slipped through the cracks", or when running as a scheduled check.
---

# Turnkey Stale-Project Alert

Uses the **turnkey-supabase** skill for connection and schema. "Stale" means
**nothing has happened on an open project for over 7 days** — nobody moved
it, edited it, wrote a note, touched a task, added a photo, or booked an
appointment.

## Detect

1. Compute `cutoff = now − 7 days` (ISO).
2. Candidates — open projects that haven't been moved or edited:
   ```
   GET {BASE}/projects?select=id,title,project_value,next_action,column_changed_at,updated_at,customers(name,phone),board_columns(label,kind)
     &archived_at=is.null&column_changed_at=lt.<cutoff>&updated_at=lt.<cutoff>
   ```
   Drop any whose column kind is `closed` (and `lead` is usually covered by
   updated_at, but keep leads in — a week-old untouched lead is exactly what
   they want to catch).
3. For the candidate ids, check for recent activity in one query each and
   remove projects that appear:
   ```
   GET {BASE}/notes?select=project_id&project_id=in.(<ids>)&created_at=gt.<cutoff>
   GET {BASE}/tasks?select=project_id&project_id=in.(<ids>)&created_at=gt.<cutoff>
   GET {BASE}/photos?select=project_id&project_id=in.(<ids>)&created_at=gt.<cutoff>
   GET {BASE}/appointments?select=project_id&project_id=in.(<ids>)&starts_at=gt.<cutoff>
   ```
   (Completed tasks bump `completed_at`, not `created_at` — also check
   `tasks?completed_at=gt.<cutoff>`.)
4. Whatever remains is stale. For each, compute **days quiet** from the most
   recent of `column_changed_at` / `updated_at`.

## Alert

Nothing stale → do nothing. Do not send "all clear" emails.

Otherwise email **daniel@turnkeysolutionsnetwork.com**:

- **Subject:** `⚠ <N> project(s) going quiet — Turnkey`
- **Body:** one row per project, longest-quiet first:

```
These jobs haven't been touched in over a week:

• Roof Replacement Estimate — Denise Whitaker · Estimating · 12 days quiet · $16,500
  Last action noted: "Prepare and send estimate"
  https://turnkey-wine.vercel.app/projects/<id>
```

Close with one line: *"Open a project and add a note, move it, or set a next
action to clear it from this list."*

If no email tool is connected, report in chat instead.

## Scheduling

*"Every weekday at 7:00 AM Central, run the turnkey-stale-projects skill and
email any alerts."* Daily is right — the list self-clears the moment someone
touches a project, so repeats are honest nagging, not noise.
