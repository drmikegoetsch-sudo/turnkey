# Turnkey Claude Skills

Four skills that let Claude work directly with the Command Center database —
answer questions, run routines, and send alerts.

| Skill | What it does |
|---|---|
| `turnkey-supabase` | **The foundation.** Database connection, schema map, query recipes, guardrails. The other three build on it. |
| `turnkey-daily-brief` | Morning email to Daniel: numbers, do-first queue, schedule, ready-to-bill, blocked, new leads. |
| `turnkey-stale-projects` | Emails when any open project has had zero activity for 7+ days. |
| `turnkey-new-lead-alert` | Polls for new website leads and emails the details within the half hour. |

## Setup (one time)

1. **Install the skills** in the Claude workspace that should run them
   (Claude desktop / Cowork): copy each folder into that workspace's skills
   directory, or add them via Settings → Capabilities → Skills.
2. **Paste the key.** In `turnkey-supabase/SKILL.md`, replace
   `<PASTE_CLAUDE_SKILL_SECRET_KEY_HERE>` with the dedicated secret key
   (named `claude_skill` in Supabase → Settings → API Keys). Ask Mike for it.
   - This key is *separate* from the app's key. If it ever leaks, revoke just
     it in the dashboard — the app keeps running.
   - Treat it like a banking password: it reads/writes all business data,
     including customer contact info.
3. **Connect email** (Gmail or Outlook connector) in the same workspace so
   the brief and alerts can actually send.
4. **Create the schedules** — say to Claude:
   - *"Every weekday at 6:30 AM Central, run the turnkey-daily-brief skill."*
   - *"Every weekday at 7:00 AM Central, run the turnkey-stale-projects skill."*
   - *"Every 30 minutes between 7 AM and 8 PM Central, run the
     turnkey-new-lead-alert skill."*

## Try it

- "What's blocked right now, and how much money is waiting on it?"
- "Which estimates have been sitting more than five days?"
- "Send me today's brief."
- "Set a follow-up on the Bell kitchen for Friday: confirm countertops."
