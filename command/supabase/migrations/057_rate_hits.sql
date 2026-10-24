-- Durable rate limits for the public handprotocol.org functions (netlify/functions/_ratelimit.js).
-- Netlify function instances are short-lived, so an in-memory counter resets on every cold start;
-- this table is the shared counter. Two uses:
--   feedback:ip / feedback:all / feedback:dup  — who may post to /.netlify/functions/feedback
--   email:day / email:feedback                 — how many Resend emails the site may send per day
--     (Resend's free plan stops at 100/day for the whole account, so a flood must not eat it)
-- Keys are sha256 hashes, never raw IPs or text. Rows older than two days are pruned on write.
-- Apply BEFORE deploying the code that calls it (the code fails closed on email without it).

create table if not exists command.rate_hits (
  id bigserial primary key,
  bucket text not null,
  key text not null,
  created_at timestamptz not null default now()
);
create index if not exists rate_hits_bucket_key_idx on command.rate_hits (bucket, key, created_at desc);
create index if not exists rate_hits_created_idx on command.rate_hits (created_at);

alter table command.rate_hits enable row level security;
revoke all on command.rate_hits from anon, authenticated;

-- rate_take: record one hit for (bucket, key) and return true, or return false without recording
-- when the window already holds p_limit hits. The advisory lock makes check-then-insert atomic
-- per (bucket, key), so a burst of parallel requests cannot all slip under the limit.
create or replace function command.rate_take(
  p_bucket text,
  p_key text,
  p_window_seconds integer,
  p_limit integer
) returns boolean
language plpgsql
security definer
set search_path = command, pg_temp
as $$
declare
  hits integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_bucket || ':' || p_key, 0));

  select count(*) into hits
  from command.rate_hits
  where bucket = p_bucket
    and key = p_key
    and created_at > now() - make_interval(secs => p_window_seconds);

  if hits >= p_limit then
    return false;
  end if;

  insert into command.rate_hits (bucket, key) values (p_bucket, p_key);
  delete from command.rate_hits where created_at < now() - interval '2 days';
  return true;
end;
$$;

revoke all on function command.rate_take(text, text, integer, integer) from public, anon, authenticated;
grant execute on function command.rate_take(text, text, integer, integer) to service_role;
