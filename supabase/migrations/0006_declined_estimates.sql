-- Declined estimates. Deleting a lost job would destroy the very record the
-- owners need — the point is to REMEMBER who turned down a quote so nobody
-- drives out to the same address twice for nothing.
--
-- A declined project drops off the active board but keeps its full history,
-- and repeat customers get flagged by phone / email / address.

alter table projects
  add column declined_at timestamptz,
  add column declined_reason text,
  add column declined_note text;

create index projects_declined_idx on projects (declined_at)
  where declined_at is not null;

-- Digits-only phone and lowercased email/address, so "(919) 434-9543",
-- "919-434-9543", and "9194349543" all match the same person.
create or replace function normalize_phone(p text)
returns text language sql immutable as $$
  select nullif(regexp_replace(coalesce(p, ''), '\D', '', 'g'), '');
$$;

create or replace function normalize_text(t text)
returns text language sql immutable as $$
  select nullif(lower(regexp_replace(coalesce(t, ''), '\s+', ' ', 'g')), '');
$$;

create index customers_phone_norm_idx on customers (normalize_phone(phone));
create index customers_email_norm_idx on customers (normalize_text(email));
create index projects_address_norm_idx on projects (normalize_text(property_address));

-- Every previously declined estimate, with the identifiers used to match a
-- new enquiry back to it. Read by the project page and the new-lead warning.
create or replace view declined_history as
select
  p.id                as project_id,
  p.project_number,
  p.title,
  p.project_value,
  p.declined_at,
  p.declined_reason,
  p.declined_note,
  p.property_address,
  normalize_text(p.property_address) as address_key,
  c.id                as customer_id,
  c.name              as customer_name,
  normalize_phone(c.phone)     as phone_key,
  normalize_phone(c.alt_phone) as alt_phone_key,
  normalize_text(c.email)      as email_key
from projects p
join customers c on c.id = p.customer_id
where p.declined_at is not null;
