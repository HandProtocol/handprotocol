-- 019_pillar_roles.sql
-- HAND Command Center — extend the role model from 3 coarse roles to the
-- pillar model, and add an access `status` gate for the Apply flow.
--
-- Roles (was: admin / contributor / viewer):
--   admin         full access, manages users + invites + settings, all pillars
--   funding_lead  manages Grants + Funders + Deadlines + Boilerplate; reads
--                 Develop; triages feedback. ("fund roles")
--   develop_rep   manages the Develop/biz pipeline (leads, reviews, touchpoints,
--                 demos); reads Grants/Funders; no settings/invites
--   contributor   reads everything + comment/suggest; no status changes
--   viewer        read, scoped to a reciprocate_group
--
-- Access status (new):
--   active        normal access at the row's role
--   pending       signed up but not yet approved/invited — NO access anywhere
--   suspended     access revoked, account retained
--
-- Hand-off model: invites pre-assign role(+group) and land the redeemer at
-- status='active'. Un-invited signups land at status='pending' (locked out)
-- until an admin approves an application and issues an invite. Promote/revoke
-- is an admin-only UPDATE on command.profiles.
--
-- NOTE: server actions run with the service_role client, which BYPASSES RLS.
-- These policies are defense-in-depth for the anon (logged-in) read path; the
-- primary write gate is requireRole()/requireCapability() in app code
-- (see src/lib/supabase/profile.ts).

-- ─── 1. profiles: widen role enum, add status ──────────────────────────
alter table command.profiles drop constraint if exists profiles_role_check;
alter table command.profiles
  add constraint profiles_role_check
  check (role in ('admin','funding_lead','develop_rep','contributor','viewer'));

-- Existing rows (incl. the founder admin) default to 'active' so nobody is
-- locked out by this migration. New signups are set to 'pending' by the
-- handle_new_user() trigger below.
alter table command.profiles
  add column if not exists status text not null default 'active'
  check (status in ('active','pending','suspended'));

create index if not exists profiles_status_idx on command.profiles(status);

-- ─── 2. invites: widen role enum to match ──────────────────────────────
alter table command.invites drop constraint if exists invites_role_check;
alter table command.invites
  add constraint invites_role_check
  check (role in ('admin','funding_lead','develop_rep','contributor','viewer'));

-- ─── 3. current_role(): gate on status ─────────────────────────────────
-- Returns the role ONLY when the account is active. pending/suspended (and
-- missing profiles) resolve to 'pending', which matches no grant policy, so
-- every existing "current_role() in (...)" policy denies them automatically —
-- no need to touch each policy to enforce the status gate.
create or replace function command.current_role()
returns text
language sql
stable
security definer
set search_path = command, public
as $$
  select case when status = 'active' then role else 'pending' end
  from command.profiles
  where id = auth.uid();
$$;

create or replace function command.current_status()
returns text
language sql
stable
security definer
set search_path = command, public
as $$
  select status from command.profiles where id = auth.uid();
$$;

-- ─── 4. handle_new_user(): un-invited signups start pending ─────────────
create or replace function command.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = command, public
as $$
begin
  insert into command.profiles (id, email, display_name, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    'viewer',
    'pending'   -- locked out until an admin approves or an invite is redeemed
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ─── 5. additive RLS policies for the two new roles ────────────────────
-- Policies are OR'd, so we ADD grants for funding_lead / develop_rep without
-- rewriting the existing admin/contributor/viewer policies.

-- grants: funding_lead manages, develop_rep reads
drop policy if exists grants_funding_lead_all on command.grants;
create policy grants_funding_lead_all on command.grants
  for all using (command.current_role() = 'funding_lead')
  with check (command.current_role() = 'funding_lead');
drop policy if exists grants_develop_rep_read on command.grants;
create policy grants_develop_rep_read on command.grants
  for select using (command.current_role() = 'develop_rep');

-- funders: funding_lead manages, develop_rep reads
drop policy if exists funders_funding_lead_all on command.funders;
create policy funders_funding_lead_all on command.funders
  for all using (command.current_role() = 'funding_lead')
  with check (command.current_role() = 'funding_lead');
drop policy if exists funders_develop_rep_read on command.funders;
create policy funders_develop_rep_read on command.funders
  for select using (command.current_role() = 'develop_rep');

-- touchpoints (grant outreach log): funding_lead manages
drop policy if exists touchpoints_funding_lead_all on command.touchpoints;
create policy touchpoints_funding_lead_all on command.touchpoints
  for all using (command.current_role() = 'funding_lead')
  with check (command.current_role() = 'funding_lead');

-- boilerplate: funding_lead manages, both new roles read
drop policy if exists boilerplate_funding_lead_all on command.boilerplate;
create policy boilerplate_funding_lead_all on command.boilerplate
  for all using (command.current_role() = 'funding_lead')
  with check (command.current_role() = 'funding_lead');
drop policy if exists boilerplate_newroles_read on command.boilerplate;
create policy boilerplate_newroles_read on command.boilerplate
  for select using (command.current_role() in ('funding_lead','develop_rep'));

-- attachments: funding_lead manages
drop policy if exists attachments_funding_lead_all on command.attachments;
create policy attachments_funding_lead_all on command.attachments
  for all using (command.current_role() = 'funding_lead')
  with check (command.current_role() = 'funding_lead');

-- comments: funding_lead full participation
drop policy if exists comments_funding_lead_all on command.comments;
create policy comments_funding_lead_all on command.comments
  for all using (command.current_role() = 'funding_lead')
  with check (command.current_role() = 'funding_lead');

-- biz_leads / biz_reviews / biz_touchpoints (Develop): develop_rep manages,
-- funding_lead reads. (admin/contributor/viewer read policies already exist.)
drop policy if exists biz_leads_develop_rep_all on command.biz_leads;
create policy biz_leads_develop_rep_all on command.biz_leads
  for all using (command.current_role() = 'develop_rep')
  with check (command.current_role() = 'develop_rep');
drop policy if exists biz_leads_funding_lead_read on command.biz_leads;
create policy biz_leads_funding_lead_read on command.biz_leads
  for select using (command.current_role() = 'funding_lead');

drop policy if exists biz_reviews_develop_rep_all on command.biz_reviews;
create policy biz_reviews_develop_rep_all on command.biz_reviews
  for all using (command.current_role() = 'develop_rep')
  with check (command.current_role() = 'develop_rep');
drop policy if exists biz_reviews_funding_lead_read on command.biz_reviews;
create policy biz_reviews_funding_lead_read on command.biz_reviews
  for select using (command.current_role() = 'funding_lead');

drop policy if exists biz_touchpoints_develop_rep_all on command.biz_touchpoints;
create policy biz_touchpoints_develop_rep_all on command.biz_touchpoints
  for all using (command.current_role() = 'develop_rep')
  with check (command.current_role() = 'develop_rep');
drop policy if exists biz_touchpoints_funding_lead_read on command.biz_touchpoints;
create policy biz_touchpoints_funding_lead_read on command.biz_touchpoints
  for select using (command.current_role() = 'funding_lead');

-- biz_visits: both new roles read
drop policy if exists biz_visits_newroles_read on command.biz_visits;
create policy biz_visits_newroles_read on command.biz_visits
  for select using (command.current_role() in ('develop_rep','funding_lead'));

-- feedback_pins: funding_lead triages (read+write), develop_rep reads
drop policy if exists feedback_pins_funding_lead_all on command.feedback_pins;
create policy feedback_pins_funding_lead_all on command.feedback_pins
  for all using (command.current_role() = 'funding_lead')
  with check (command.current_role() = 'funding_lead');
drop policy if exists feedback_pins_develop_rep_read on command.feedback_pins;
create policy feedback_pins_develop_rep_read on command.feedback_pins
  for select using (command.current_role() = 'develop_rep');

-- ─── 6. follow-ups (not in this migration) ─────────────────────────────
-- - inbox_items: add a funding_lead policy once its 014 policy set is reviewed.
-- - biz_leads has no uuid owner column, so develop_rep "manage own" is not yet
--   enforceable; reps share the full pipeline. Add biz_leads.owner_id (uuid →
--   profiles.id) later to scope per-rep.
-- - _combined.sql is a manual paste convenience and is NOT updated here; regen
--   or paste 019/020 separately when applying to a fresh project.
