-- 001_command_schema.sql
-- HAND Command Center, Phase 1.
-- Creates the `command` schema and the extensions the operational tables
-- depend on. Idempotent. Pattern lifted from noredFarms/reps/supabase/migrations/.
--
-- Run order: this file first, then 002 through 013.
-- Apply via Supabase SQL editor, `supabase db push`, or `psql`.

create schema if not exists command;

-- gen_random_uuid() for primary keys
create extension if not exists pgcrypto with schema extensions;
-- pg_trgm for fuzzy text search across grants, funders, boilerplate, comments
create extension if not exists pg_trgm with schema extensions;

-- Expose the `command` schema to PostgREST so the Next.js app can reach
-- the tables via @supabase/ssr with `db: { schema: "command" }`.
-- The Supabase REST gateway reads `pgrst.db_schemas` from the database
-- settings. This grant statement is what makes the schema reachable
-- once the API config is told to look here. Setting the config is a
-- one-time dashboard step (Project Settings > API > Exposed schemas).
grant usage on schema command to anon, authenticated, service_role;
alter default privileges in schema command
  grant select, insert, update, delete on tables to authenticated, service_role;
alter default privileges in schema command
  grant usage, select on sequences to authenticated, service_role;
alter default privileges in schema command
  grant execute on functions to authenticated, service_role;

comment on schema command is
  'HAND Command Center operational schema. Markdown is canonical, this schema is the read replica and the relationship CRM.';
