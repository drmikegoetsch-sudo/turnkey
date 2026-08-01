-- Board columns become data instead of a hardcoded enum, so Daniel and Taylor
-- can shape the pipeline themselves. Each column carries a semantic `kind`
-- that keeps the Today view, owner status page, and billing state working no
-- matter what they name or reorder.
--
-- "Blocked" moves from a stage to a flag: a job can stall in any phase.

create type column_kind as enum (
  'lead', 'qualifying', 'estimating', 'approved',
  'active', 'review', 'invoice', 'closed', 'other'
);

create table board_columns (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  description text,
  kind column_kind not null default 'other',
  color text not null default 'slate',
  position double precision not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);
create index board_columns_position_idx on board_columns (position)
  where archived_at is null;

alter table board_columns enable row level security;
create policy internal_all on board_columns for all to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

-- Default pipeline: the PRD lifecycle, compressed to what fits on one screen.
-- Everything here is editable in Settings.
insert into board_columns (label, description, kind, color, position) values
  ('New Leads', 'A new request has arrived and needs review before an appointment is scheduled.', 'lead', 'gold', 1),
  ('Estimating', 'Appointment has happened; estimate needs to be prepared, sent, and followed up.', 'estimating', 'sky', 2),
  ('In Progress', 'Approved and scheduled. Work is happening — photos, tasks, and updates tracked here.', 'active', 'amber', 3),
  ('Wrapping Up', 'Work is complete or nearly complete and needs internal review.', 'review', 'emerald', 4),
  ('Ready to Invoice', 'Operationally complete and ready to be invoiced in QuickBooks.', 'invoice', 'emerald', 5),
  ('Closed', 'Complete and archived for future reference.', 'closed', 'slate', 6);

-- ---------------------------------------------------------------- projects

alter table projects
  add column column_id uuid references board_columns(id),
  add column is_blocked boolean not null default false,
  add column blocked_reason text;

-- Carry existing projects over from the old enum.
update projects p set column_id = c.id
from board_columns c
where c.label = case p.stage
  when 'new_lead' then 'New Leads'
  when 'needs_qualification' then 'New Leads'
  when 'appointment_scheduled' then 'New Leads'
  when 'estimate_needed' then 'Estimating'
  when 'estimate_sent' then 'Estimating'
  when 'follow_up_needed' then 'Estimating'
  when 'approved' then 'In Progress'
  when 'scheduled' then 'In Progress'
  when 'active' then 'In Progress'
  when 'blocked' then 'In Progress'
  when 'final_review' then 'Wrapping Up'
  when 'ready_to_invoice' then 'Ready to Invoice'
  when 'closed' then 'Closed'
end;

update projects set is_blocked = true where stage = 'blocked';

alter table projects alter column column_id set not null;
alter table projects rename column stage_changed_at to column_changed_at;
alter table projects drop column stage;

create index projects_column_position_idx on projects (column_id, board_position);
create index projects_blocked_idx on projects (is_blocked) where is_blocked;

-- ------------------------------------------------------------ stage_events
-- Keeps the audit trail (and the raw material for V2 AI summaries). Labels are
-- snapshotted so history stays readable if a column is renamed or deleted.

alter table stage_events
  add column from_column_id uuid references board_columns(id),
  add column to_column_id uuid references board_columns(id),
  add column to_label text;

update stage_events e set to_column_id = p.column_id, to_label = c.label
from projects p join board_columns c on c.id = p.column_id
where p.id = e.project_id;

alter table stage_events drop column from_stage;
alter table stage_events drop column to_stage;
alter table stage_events alter column to_label set not null;

drop type project_stage;
