-- KC Collective star guestbook (kc-collective/stars), on the HAND project until the
-- KC Collective site has its own Supabase. One row per message left for the
-- collective, with the star it became. Schema `command`, like the client sites.
-- Only the service role reads or writes this table (the Netlify functions);
-- RLS is on with no policies, so the anon key sees nothing.

create table if not exists command.kc_stars (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),

  -- what she gave us
  first_name      text not null check (char_length(first_name) between 1 and 40),
  email           text not null check (char_length(email) between 3 and 254),
  message         text not null check (char_length(message) between 2 and 1200),

  -- what she agreed to (consent also keeps the wording version she saw)
  ai_opt_in       boolean not null default false,
  share_requested boolean not null default false,
  consent         jsonb not null default '{}'::jsonb,

  -- what the admin decided
  message_public  boolean not null default false,
  status          text not null default 'visible' check (status in ('visible', 'held', 'hidden')),

  -- the star: { name, line, near, color, hex, points, brightness, ai, x, y }
  star            jsonb not null,
  ai_status       text not null default 'off' check (ai_status in ('off', 'ok', 'failed', 'skipped')),
  ai_model        text,

  -- screening (admin only, never public)
  flag            text not null default 'none' check (flag in ('none', 'spam', 'abuse', 'sexual', 'distress', 'other')),
  flag_note       text,

  -- rate limiting: keyed HMACs, never the raw IP or address
  ip_hash         text,
  email_hash      text not null,

  -- a message can only be public if she asked for it
  constraint kc_stars_public_needs_request check (not message_public or share_requested)
);

create index if not exists kc_stars_sky_idx   on command.kc_stars (created_at desc) where status = 'visible';
create index if not exists kc_stars_ip_idx    on command.kc_stars (ip_hash, created_at);
create index if not exists kc_stars_email_idx on command.kc_stars (email_hash, created_at);
create index if not exists kc_stars_day_idx   on command.kc_stars (created_at);

alter table command.kc_stars enable row level security;
revoke all on command.kc_stars from anon, authenticated;

comment on table command.kc_stars is 'KC Collective star guestbook. Service role only. Public projection = first_name + star (+ message when share_requested and message_public).';
