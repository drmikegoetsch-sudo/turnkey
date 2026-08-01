-- Turnkey Solutions Network Command Center — initial schema
-- All access model notes: RLS is internal-only (authenticated staff).
-- Public intake and tokenized share links go through server code with the
-- service-role key; the anon key has no policies and can touch nothing.

-- ============================================================ enums

create type project_stage as enum (
  'new_lead', 'needs_qualification', 'appointment_scheduled', 'estimate_needed',
  'estimate_sent', 'follow_up_needed', 'approved', 'scheduled', 'active',
  'blocked', 'final_review', 'ready_to_invoice', 'closed'
);

create type photo_type as enum ('before', 'progress', 'issue_damage', 'materials', 'completed_after');
create type visibility as enum ('internal', 'owner');
create type note_kind as enum ('note', 'update', 'issue');
create type link_kind as enum ('sub', 'owner');
create type actor_kind as enum ('internal', 'sub', 'customer');
create type assignment_status as enum ('assigned', 'in_progress', 'complete');

-- ============================================================ tables

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  created_at timestamptz not null default now()
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  alt_phone text,
  email text,
  created_at timestamptz not null default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id),
  title text not null,
  property_address text not null default '',
  project_type text not null default 'other',
  scope text,
  budget_range text,
  timeline text,
  stage project_stage not null default 'new_lead',
  stage_changed_at timestamptz not null default now(),
  board_position double precision not null default 0,
  next_action text,
  next_action_due date,
  quickbooks_url text,
  source text not null default 'manual', -- 'intake' | 'manual'
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_stage_position_idx on projects (stage, board_position);
create index projects_next_action_due_idx on projects (next_action_due);

create table stage_events (
  id bigint generated always as identity primary key,
  project_id uuid not null references projects(id) on delete cascade,
  from_stage project_stage,
  to_stage project_stage not null,
  changed_by uuid references profiles(id), -- null = system (intake)
  changed_at timestamptz not null default now()
);
create index stage_events_project_idx on stage_events (project_id, changed_at);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  due_date date,
  completed_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index tasks_due_idx on tasks (due_date) where completed_at is null;

create table subcontractors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  trade text,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now()
);

create table project_subcontractors (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  subcontractor_id uuid not null references subcontractors(id),
  scheduled_start date,
  scheduled_end date,
  schedule_notes text,
  scope_notes text,
  status assignment_status not null default 'assigned',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (project_id, subcontractor_id)
);
create index project_subs_schedule_idx on project_subcontractors (scheduled_start, scheduled_end);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  kind text not null default 'site_visit',
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index appointments_starts_idx on appointments (starts_at);

create table share_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  kind link_kind not null,
  token_hash text not null unique, -- sha256 hex of raw token; raw token never stored
  subcontractor_id uuid references subcontractors(id),
  label text,
  created_by uuid references profiles(id),
  expires_at timestamptz,
  revoked_at timestamptz,
  last_accessed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint sub_links_need_sub check (kind <> 'sub' or subcontractor_id is not null)
);

create table notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  kind note_kind not null default 'note',
  visibility visibility not null default 'internal',
  body text not null,
  author_kind actor_kind not null default 'internal',
  author_id uuid references profiles(id),
  share_link_id uuid references share_links(id),
  created_at timestamptz not null default now()
);
create index notes_project_idx on notes (project_id, created_at);

create table photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  storage_path text not null,
  photo_type photo_type not null default 'progress',
  visibility visibility not null default 'internal',
  caption text,
  uploaded_by_kind actor_kind not null,
  uploaded_by uuid references profiles(id),
  share_link_id uuid references share_links(id),
  confirmed_at timestamptz, -- set once the client confirms the storage upload
  created_at timestamptz not null default now()
);
create index photos_project_idx on photos (project_id, photo_type);

-- Full "Work Inquiry" form submission, preserved verbatim so nothing from the
-- customer's original request is lost when it becomes a project.
create table intake_submissions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete set null,
  customer_id uuid references customers(id),
  name text not null,
  email text not null,
  phone text not null,
  alt_phone text,
  address text not null,
  meeting_availability text,
  design_services text,      -- 'yes' | 'no' | 'not_sure'
  overall_budget text,
  referral_source text,
  project1_description text,
  project1_budget text,
  project1_has_plans text,   -- 'yes' | 'no' | 'in_progress'
  project2_description text,
  project2_budget text,
  project2_has_plans text,
  project3_description text,
  project3_budget text,
  project3_has_plans text,
  desired_start text,
  completion_date text,
  additional_projects text,
  created_at timestamptz not null default now()
);

create table project_types (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  position int not null default 0,
  active boolean not null default true
);

-- ============================================================ triggers

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger projects_updated_at before update on projects
  for each row execute function set_updated_at();

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================ RLS
-- Internal-only: any authenticated staff member (there are two) can do
-- everything. No anon policies anywhere.

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','customers','projects','stage_events','tasks','subcontractors',
    'project_subcontractors','appointments','share_links','notes','photos',
    'intake_submissions','project_types'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy internal_all on %I for all to authenticated
         using ((select auth.uid()) is not null)
         with check ((select auth.uid()) is not null)', t);
  end loop;
end $$;

-- ============================================================ storage

insert into storage.buckets (id, name, public)
values ('project-photos', 'project-photos', false)
on conflict (id) do nothing;

create policy "internal read project photos" on storage.objects
  for select to authenticated using (bucket_id = 'project-photos');
create policy "internal insert project photos" on storage.objects
  for insert to authenticated with check (bucket_id = 'project-photos');
create policy "internal delete project photos" on storage.objects
  for delete to authenticated using (bucket_id = 'project-photos');

-- ============================================================ seed

insert into project_types (label, position) values
  ('Kitchen', 1), ('Bathroom', 2), ('Basement', 3), ('Addition', 4),
  ('Deck / Patio', 5), ('Roofing', 6), ('Siding / Exterior', 7),
  ('Flooring', 8), ('Whole-Home Remodel', 9), ('New Build', 10), ('Other', 99);
