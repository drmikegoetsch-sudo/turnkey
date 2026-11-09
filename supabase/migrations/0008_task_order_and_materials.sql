-- Client request: a running materials list per project that can be added to
-- and checked off for the life of the job, plus tasks that can be edited and
-- put in the order the crew actually works them.

-- ---------------------------------------------------------------- tasks

-- Manual order. Fractional positions (same scheme as the board) so a drag
-- rewrites one row, not the whole list.
alter table tasks add column position double precision;

-- Existing tasks keep the order they were created in.
update tasks t
set position = ranked.rn
from (
  select id, row_number() over (partition by project_id order by created_at) as rn
  from tasks
) ranked
where ranked.id = t.id;

alter table tasks alter column position set not null;
alter table tasks alter column position set default 0;
create index tasks_project_position_idx on tasks (project_id, position);

-- ---------------------------------------------------------------- materials

create table materials (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  -- Free text on purpose: "12", "3 boxes", "40 sq ft", "1 gal".
  quantity text,
  notes text,
  position double precision not null default 0,
  checked_at timestamptz,
  checked_by uuid references profiles(id),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index materials_project_position_idx on materials (project_id, position);

alter table materials enable row level security;
create policy staff_all on materials for all to authenticated
  using (is_staff()) with check (is_staff());
