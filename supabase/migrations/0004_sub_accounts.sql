-- Subcontractor accounts. Until now every authenticated user was staff with
-- full access. Subs can now be invited to log in, so access splits by role:
--   staff — full access (unchanged)
--   sub   — no direct table access at all; their portal pages are rendered
--           server-side with the service role, scoped to their assignments.

-- ---------------------------------------------------------------- roles

alter table profiles
  add column role text not null default 'staff'
  check (role in ('staff', 'sub'));

-- Link a subcontractor directory entry to its login (set at invite time).
alter table subcontractors
  add column user_id uuid unique references auth.users(id) on delete set null,
  add column invited_at timestamptz;

-- The signup trigger now carries role + subcontractor linkage from the
-- invite metadata.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  meta_role text := coalesce(new.raw_user_meta_data ->> 'role', 'staff');
  meta_sub uuid := nullif(new.raw_user_meta_data ->> 'subcontractor_id', '')::uuid;
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, ''),
    case when meta_role in ('staff', 'sub') then meta_role else 'staff' end
  )
  on conflict (id) do nothing;

  if meta_sub is not null then
    update public.subcontractors
      set user_id = new.id, invited_at = now()
      where id = meta_sub and user_id is null;
  end if;

  return new;
end $$;

-- ---------------------------------------------------------------- RLS

-- Security definer so policies can check the caller's role without the
-- profiles policy recursing into itself.
create or replace function is_staff()
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'staff'
  );
$$;

-- Tighten every table policy from "any authenticated user" to staff-only.
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','customers','projects','stage_events','tasks','subcontractors',
    'project_subcontractors','appointments','share_links','notes','photos',
    'intake_submissions','project_types','board_columns'
  ] loop
    execute format('drop policy if exists internal_all on %I', t);
    execute format(
      'create policy staff_all on %I for all to authenticated
         using (is_staff()) with check (is_staff())', t);
  end loop;
end $$;

-- Storage: same tightening.
drop policy if exists "internal read project photos" on storage.objects;
drop policy if exists "internal insert project photos" on storage.objects;
drop policy if exists "internal delete project photos" on storage.objects;
create policy "staff read project photos" on storage.objects
  for select to authenticated using (bucket_id = 'project-photos' and is_staff());
create policy "staff insert project photos" on storage.objects
  for insert to authenticated with check (bucket_id = 'project-photos' and is_staff());
create policy "staff delete project photos" on storage.objects
  for delete to authenticated using (bucket_id = 'project-photos' and is_staff());
