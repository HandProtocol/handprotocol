-- 007_attachments.sql
-- HAND Command Center attachment vault.
-- File references (PDFs, supporting documents, screenshots, award letters).
-- Files live in Supabase Storage bucket `command-attachments`. This table
-- holds the metadata and the foreign keys.

create table if not exists command.attachments (
  id            uuid primary key default gen_random_uuid(),
  grant_id      uuid references command.grants(id) on delete cascade,
  funder_id     uuid references command.funders(id) on delete set null,
  storage_path  text not null,
  filename      text not null,
  mime_type     text,
  byte_size     bigint,
  uploaded_by   uuid references command.profiles(id) on delete set null,
  uploaded_at   timestamptz not null default now()
);

comment on table command.attachments is
  'Attachment vault. Files in Supabase Storage at command-attachments/, metadata here.';

create index if not exists attachments_grant_idx on command.attachments(grant_id);
create index if not exists attachments_funder_idx on command.attachments(funder_id);
create index if not exists attachments_uploaded_at_idx on command.attachments(uploaded_at desc);

-- Storage bucket. Private by default. Access policies for the bucket are
-- managed in the Supabase Storage policies UI (or in a follow-up migration
-- that uses storage.create_policy()). Phase 2 feature H6, schema in place
-- from Phase 1.
insert into storage.buckets (id, name, public)
  values ('command-attachments', 'command-attachments', false)
  on conflict (id) do nothing;
