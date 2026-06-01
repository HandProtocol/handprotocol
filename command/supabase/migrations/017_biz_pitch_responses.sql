-- 017_biz_pitch_responses.sql
-- HAND Command Center, pitch follow-up answers.
-- The pitch page lives on the public site at /demos/<slug>/pitch/ (gated by a
-- Netlify edge function, password "handme") so it can be handed to any
-- volunteer making calls. When the caller submits the follow-up form, a Netlify
-- function writes the answers here via the service role, landing them in the
-- same DB the Command Center reads. The lead's pipeline view shows them.
--
-- Writes are service-role only (the Netlify function). No anon insert policy.

create table if not exists command.biz_pitch_responses (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid references command.biz_leads(id) on delete cascade,
  lead_slug     text not null,
  outcome       text check (outcome in (
                  'reached','no_answer','voicemail','callback','other'
                )),
  interest      text check (interest in (
                  'interested','not_now','not_interested','unknown'
                )),
  budget_band   text,
  timeline      text,
  objections    text,
  best_contact  text,
  callback_at   text,
  other_info    text,
  caller        text,
  created_at    timestamptz not null default now()
);

comment on table command.biz_pitch_responses is
  'Follow-up answers captured on the public pitch page. Written by the Netlify biz-pitch-response function via service role.';

create index if not exists biz_pitch_responses_lead_idx
  on command.biz_pitch_responses(lead_id, created_at desc);
create index if not exists biz_pitch_responses_slug_idx
  on command.biz_pitch_responses(lead_slug, created_at desc);

-- ─── RLS: read for the team, writes only via service role ───────────────────
alter table command.biz_pitch_responses enable row level security;

drop policy if exists biz_pitch_responses_read on command.biz_pitch_responses;
create policy biz_pitch_responses_read on command.biz_pitch_responses
  for select using (command.current_role() in ('admin','contributor','viewer'));
