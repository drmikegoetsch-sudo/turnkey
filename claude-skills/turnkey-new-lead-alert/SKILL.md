---
name: turnkey-new-lead-alert
description: >
  Watch for new leads arriving through the Turnkey website intake form and
  email daniel@turnkeysolutionsnetwork.com the moment one lands, with the
  customer's details and stated budget. Use when the user asks about new
  leads, or when running as a frequent scheduled check.
---

# Turnkey New-Lead Alert

Uses the **turnkey-supabase** skill for connection and schema. Website
submissions create a project with `source = 'intake'` plus a full
`intake_submissions` row — that pair is the signal.

## Detect

Claude can't receive webhooks, so this runs as a **polling check**. To never
miss a lead across runs, look back **slightly further than the schedule
interval** (e.g. running every 30 min → look back 40 min). A rare duplicate
mention is fine; a missed lead is not.

```
GET {BASE}/projects?select=id,title,created_at,property_address,
  customers(name,phone,email),
  intake_submissions(overall_budget,project1_description,project1_budget,
                     meeting_availability,design_services,referral_source,
                     desired_start)
  &source=eq.intake&created_at=gt.<now − interval − 10min>&order=created_at.asc
```

No rows → do nothing. **Never send an empty alert.**

## Alert

One email per run (batch multiple leads into it), to
**daniel@turnkeysolutionsnetwork.com**:

- **Subject:** `🔔 New lead: <Customer> — <project type>` (or `🔔 <N> new
  leads` when batching)
- **Body** per lead — everything needed to make the first call without
  opening the app:

```
New lead from the website, <time> today:

<Customer Name> — <phone> · <email>
<property address>

Project: <project1_description, trimmed to ~3 sentences>
Budget:  <overall_budget or project1_budget>
Start:   <desired_start> · Design services: <design_services>
Availability: <meeting_availability>
Heard about you via: <referral_source>

Open it: https://turnkey-wine.vercel.app/projects/<id>
```

Close with the reminder that the website promises customers contact
**within 48 hours**.

If no email tool is connected, surface the lead in chat instead.

## Scheduling

*"Every 30 minutes between 7 AM and 8 PM Central, run the
turnkey-new-lead-alert skill; email daniel@turnkeysolutionsnetwork.com only
if there's a new lead."* Overnight leads are caught by the morning Daily
Brief, so daytime polling is enough.
