-- 020_pitch_response_channel.sql
-- HAND Command Center, pitch follow-up channel.
-- Field mode on /demos/ lets an operator log a walk-up pitch from their phone.
-- Those land in biz_pitch_responses just like call results, but we want to know
-- which channel produced the answer: a phone call (the default, and what every
-- existing row was) or an in-person walk-up.
--
-- The Netlify biz-pitch-response function passes `channel` through; it also
-- tolerates this column not existing yet (retries the insert without it), so
-- function deploys and this migration can land in either order.

alter table command.biz_pitch_responses
  add column if not exists channel text not null default 'call'
    check (channel in ('call','in_person'));

comment on column command.biz_pitch_responses.channel is
  'How the pitch happened: call (phone, the default) or in_person (field-mode walk-up).';
