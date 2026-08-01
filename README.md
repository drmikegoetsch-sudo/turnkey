# Turnkey Solutions Network Command Center

One pipeline from website lead to completed project: intake form →
configurable kanban → project records with tasks, notes, photos, subs → ready
to invoice in QuickBooks. Built for Turnkey Solutions Network by Prototype
Health PLLC.

**Stack:** Next.js 15 (App Router, TypeScript, Tailwind, shadcn/ui) ·
Supabase (Postgres, Auth, Storage) · Vercel

## Routes

| Route | Who | What |
|---|---|---|
| `/start` | Public | Work Inquiry form (replaces Airtable). Creates a New Lead project. |
| `/sub/<token>` | Subcontractors | Job details, photo upload, mark complete, report issue. No account. |
| `/status/<token>` | Homeowners | Friendly status milestones + owner-visible updates/photos. No account. |
| `/login` | Staff | Email + password (signups disabled). |
| `/today` | Staff | Daily operating screen: follow-ups, appointments, estimates, subs on site, tasks, ready to invoice. |
| `/board` | Staff | Drag-and-drop kanban. Columns are user-editable rows in `board_columns`; each carries a semantic `kind` so Today, billing state, and the owner status page work under any names. |
| `/projects/<id>` | Staff | Full project record. |
| `/projects/new` | Staff | Manual project entry (phone leads). |
| `/subs` | Staff | Subcontractor directory. |
| `/settings` | Staff | Project types, team list. |

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

`.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase
  project settings → API
- `SUPABASE_SERVICE_ROLE_KEY` — service role (server-only; used for intake,
  token links, upload signing)
- `NEXT_PUBLIC_APP_URL` — the site origin (used to build share-link URLs)
- `APP_TIMEZONE` — IANA zone for "today" logic (default `America/Chicago`)

## Database

Migrations in `supabase/migrations/` are the source of truth — apply in order
with the Supabase CLI (`supabase link` + `supabase db push`) or the SQL editor:

1. `0001_init.sql` — core schema, RLS, triggers, storage bucket, seed types
2. `0002_project_value.sql` — project value, TSN-#### numbers, task assignees
3. `0003_configurable_columns.sql` — user-configurable board columns; "blocked"
   becomes a flag on the project

**Access model:** RLS is enabled everywhere with internal-only policies — any
authenticated staff user has full access, the anon key has none. All public
surfaces (intake form, `/sub/`, `/status/`, upload signing) run server-side
with the service-role key after validating a token/grant. Share-link tokens
are stored as SHA-256 hashes; the raw URL is shown once at creation. Photos
live in the private `project-photos` bucket; "owner-visible" is a DB flag and
all display URLs are short-lived signed URLs.

## One-time manual configuration (Supabase dashboard)

1. Auth → disable public sign-ups.
2. Auth → create staff users (Daniel, Taylor) with passwords.
3. Auth → set Site URL + redirect URLs to the production domain.

## Deploy (Vercel)

1. Import the repo, framework = Next.js.
2. Set the five env vars above (change `NEXT_PUBLIC_APP_URL` to the prod URL).
3. Point the website and Facebook "request a quote" links at `https://<domain>/start`.
