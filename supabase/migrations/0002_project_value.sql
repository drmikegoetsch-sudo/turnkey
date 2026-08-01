-- Design pass: dollar values on the board, human-readable project numbers,
-- and task assignment to Daniel or Taylor.

-- Numeric project value drives the per-column totals on the board.
-- budget_range stays as the customer's own words from the intake form.
alter table projects add column project_value numeric(12, 2);

-- Human-readable identifier shown on the project page (TSN-1042).
create sequence project_number_seq start with 1001;
alter table projects
  add column project_number int not null default nextval('project_number_seq');
alter sequence project_number_seq owned by projects.project_number;
create unique index projects_number_idx on projects (project_number);

alter table tasks add column assigned_to uuid references profiles(id);
create index tasks_assigned_idx on tasks (assigned_to) where completed_at is null;
