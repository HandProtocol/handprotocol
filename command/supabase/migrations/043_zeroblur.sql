-- ZeroBlur — owner-editable portfolio site (clients/zeroblur/).
--
-- Written exclusively through the ZeroBlur Netlify functions using the
-- service role. RLS is enabled with no policies so anon/authenticated roles
-- cannot touch these rows; the service role bypasses RLS. Same posture as the
-- HAND Learn tables (042).
--
-- Tables (all in the `command` schema, zeroblur_ prefix, per repo convention):
--   zeroblur_editors       who may log in to /admin/ (owner | editor)
--   zeroblur_login_tokens  single-use magic-link tokens (sha256 hashes)
--   zeroblur_content       one jsonb document per key ('site')
--   zeroblur_media         gallery images, ordered; placeholders seeded here
--   zeroblur_revisions     snapshot on every publish (owner-side undo/history)
-- Storage: public bucket `zeroblur` for owner uploads.

create table if not exists command.zeroblur_editors (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null default 'editor' check (role in ('owner', 'editor')),
  created_at timestamptz not null default now(),
  last_login_at timestamptz,
  invited_by uuid references command.zeroblur_editors(id) on delete set null
);

create unique index if not exists zeroblur_editors_email_key
  on command.zeroblur_editors (lower(email));

create table if not exists command.zeroblur_login_tokens (
  id uuid primary key default gen_random_uuid(),
  editor_id uuid not null references command.zeroblur_editors(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  request_ip text
);

create index if not exists zeroblur_login_tokens_editor_idx
  on command.zeroblur_login_tokens (editor_id, created_at desc);

create table if not exists command.zeroblur_content (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references command.zeroblur_editors(id) on delete set null
);

create table if not exists command.zeroblur_media (
  id uuid primary key default gen_random_uuid(),
  sort integer not null default 0,
  -- storage object path inside the `zeroblur` bucket, or a site-relative
  -- path (/img/placeholder/ph-01.svg) for the seeded placeholders
  path text not null,
  is_placeholder boolean not null default false,
  alt text not null default '',
  caption text not null default '',
  category text not null default '',
  featured boolean not null default false,
  width integer,
  height integer,
  bytes integer,
  mime text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists zeroblur_media_sort_idx
  on command.zeroblur_media (sort, created_at);

create table if not exists command.zeroblur_revisions (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  editor_id uuid references command.zeroblur_editors(id) on delete set null,
  kind text not null check (kind in ('content', 'media')),
  snapshot jsonb not null
);

create index if not exists zeroblur_revisions_created_idx
  on command.zeroblur_revisions (created_at desc);

alter table command.zeroblur_editors enable row level security;
alter table command.zeroblur_login_tokens enable row level security;
alter table command.zeroblur_content enable row level security;
alter table command.zeroblur_media enable row level security;
alter table command.zeroblur_revisions enable row level security;

-- Belt and braces: even if a client-side key reaches the API, anon and
-- authenticated get nothing. The service role bypasses RLS.
revoke all on command.zeroblur_editors from anon, authenticated;
revoke all on command.zeroblur_login_tokens from anon, authenticated;
revoke all on command.zeroblur_content from anon, authenticated;
revoke all on command.zeroblur_media from anon, authenticated;
revoke all on command.zeroblur_revisions from anon, authenticated;

-- Public bucket for owner uploads. Objects are read at
-- /storage/v1/object/public/zeroblur/<path>; uploads go through signed upload
-- URLs minted by the service role, so no storage policies are needed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'zeroblur', 'zeroblur', true, 15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
)
on conflict (id) do nothing;

-- Seed: 15 placeholder images so the admin grid mirrors the live gallery
-- from day one. The owner deletes them as real photos arrive.
insert into command.zeroblur_media (id, sort, path, is_placeholder, alt, category, featured, width, height, mime)
values
  ('00000000-0000-4000-8000-000000000001', 10,  '/img/placeholder/ph-01.svg', true, 'Placeholder image 1',  'Portraits', true,  1200, 1500, 'image/svg+xml'),
  ('00000000-0000-4000-8000-000000000002', 20,  '/img/placeholder/ph-02.svg', true, 'Placeholder image 2',  'Events',    false, 1600, 1000, 'image/svg+xml'),
  ('00000000-0000-4000-8000-000000000003', 30,  '/img/placeholder/ph-03.svg', true, 'Placeholder image 3',  'Portraits', false, 1200, 1200, 'image/svg+xml'),
  ('00000000-0000-4000-8000-000000000004', 40,  '/img/placeholder/ph-04.svg', true, 'Placeholder image 4',  'Brand',     false, 1200, 1600, 'image/svg+xml'),
  ('00000000-0000-4000-8000-000000000005', 50,  '/img/placeholder/ph-05.svg', true, 'Placeholder image 5',  'Events',    false, 1600, 1200, 'image/svg+xml'),
  ('00000000-0000-4000-8000-000000000006', 60,  '/img/placeholder/ph-06.svg', true, 'Placeholder image 6',  'Portraits', false, 1200, 1500, 'image/svg+xml'),
  ('00000000-0000-4000-8000-000000000007', 70,  '/img/placeholder/ph-07.svg', true, 'Placeholder image 7',  'Brand',     false, 1600, 900,  'image/svg+xml'),
  ('00000000-0000-4000-8000-000000000008', 80,  '/img/placeholder/ph-08.svg', true, 'Placeholder image 8',  'Portraits', false, 1200, 1200, 'image/svg+xml'),
  ('00000000-0000-4000-8000-000000000009', 90,  '/img/placeholder/ph-09.svg', true, 'Placeholder image 9',  'Events',    false, 1200, 1600, 'image/svg+xml'),
  ('00000000-0000-4000-8000-000000000010', 100, '/img/placeholder/ph-10.svg', true, 'Placeholder image 10', 'Brand',     false, 1600, 1200, 'image/svg+xml'),
  ('00000000-0000-4000-8000-000000000011', 110, '/img/placeholder/ph-11.svg', true, 'Placeholder image 11', 'Portraits', false, 1200, 1500, 'image/svg+xml'),
  ('00000000-0000-4000-8000-000000000012', 120, '/img/placeholder/ph-12.svg', true, 'Placeholder image 12', 'Events',    false, 1200, 1200, 'image/svg+xml'),
  ('00000000-0000-4000-8000-000000000013', 130, '/img/placeholder/ph-13.svg', true, 'Placeholder image 13', 'Brand',     false, 1600, 1000, 'image/svg+xml'),
  ('00000000-0000-4000-8000-000000000014', 140, '/img/placeholder/ph-14.svg', true, 'Placeholder image 14', 'Portraits', false, 1200, 1600, 'image/svg+xml'),
  ('00000000-0000-4000-8000-000000000015', 150, '/img/placeholder/ph-15.svg', true, 'Placeholder image 15', 'Events',    false, 1600, 1200, 'image/svg+xml')
on conflict (id) do nothing;

-- First editor: the HAND operator inbox, so the site can be tested before the
-- client's own email is added (via the admin Editors tab or ZEROBLUR_OWNER_EMAILS).
insert into command.zeroblur_editors (email, role)
values ('hand@handprotocol.org', 'owner')
on conflict do nothing;
