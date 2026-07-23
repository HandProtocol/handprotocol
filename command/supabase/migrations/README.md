# Command Center migrations

Numbered SQL files apply in order. They are idempotent (every `create
table` uses `if not exists`, every policy is dropped and recreated, every
function uses `create or replace`) so they survive re-runs.

Production migration history was baselined from 001 through 036 on
2026-07-18. The public-visits migration uses version 023 so every migration
has a unique version. Migrations 037 through 039 add the compost-return leg to
WXL delivery routes, require a later compost destination before assignment,
and restrict the trigger function from direct client execution.

## Apply

Three options. Pick whichever the operator's environment supports.

### Option A: Supabase CLI (recommended)

From a host with IPv6 outbound (or with the IPv4 pooler add-on enabled
on the Supabase project):

```bash
cd /home/koh/Documents/handprotocol/command
supabase link --project-ref vconmgerblqbworcqkvr --password "$SUPABASE_DB_PASSWORD"
supabase db push
```

The CLI reads the files in `supabase/migrations/` in numerical order and
applies them via the project's pooler. WXL:FOOD requires migrations 024
through 039. Migrations 024 and 025 were restored from repository history and
must be present before applying 026 or later.

### Option B: Supabase Dashboard SQL editor

If `db push` cannot connect, paste each numbered file into the dashboard SQL
editor in order. `_combined.sql` predates the current WXL:FOOD protocol and
must not be used as a substitute for migrations 024 through 036.

Project URL: https://supabase.com/dashboard/project/vconmgerblqbworcqkvr/sql

### Option C: psql

From a host with IPv6 outbound:

```bash
psql "postgresql://postgres:$SUPABASE_DB_PASSWORD@db.vconmgerblqbworcqkvr.supabase.co:5432/postgres" \
  -f supabase/migrations/001_command_schema.sql \
  -f supabase/migrations/002_profiles.sql \
  -f supabase/migrations/003_funders.sql \
  -f supabase/migrations/004_grants.sql \
  -f supabase/migrations/005_touchpoints.sql \
  -f supabase/migrations/006_boilerplate.sql \
  -f supabase/migrations/007_attachments.sql \
  -f supabase/migrations/008_comments.sql \
  -f supabase/migrations/009_activity_log.sql \
  -f supabase/migrations/010_notifications.sql \
  -f supabase/migrations/011_assistant_runs.sql \
  -f supabase/migrations/012_invites.sql \
  -f supabase/migrations/013_rls_policies.sql \
  -f supabase/migrations/014_inbox_items.sql \
  -f supabase/migrations/015_feedback_pins.sql \
  -f supabase/migrations/016_biz_leads.sql \
  -f supabase/migrations/017_biz_pitch_responses.sql \
  -f supabase/migrations/018_biz_visits.sql
```

## After applying

Three things happen outside the SQL files.

1. Expose the `command` schema to PostgREST so the app can query it via
   the Supabase JS client. In the dashboard:
   `Project Settings → API → Exposed schemas` → add `command`.

2. Promote the founder to admin. After the first sign-in at
   `/auth/login`, the `command.profiles` row is created with role
   `viewer`. Promote:

   ```sql
   update command.profiles set role = 'admin' where email = 'cshearer210@gmail.com';
   ```

3. Run the markdown ingest to populate `command.grants` from the
   existing files at `funding/grants/*.md`:

   ```bash
   cd /home/koh/Documents/handprotocol/command
   npm run ingest:grants
   ```

## Verify

```sql
select schema_name from information_schema.schemata where schema_name = 'command';
select count(*) from command.grants;
select count(*) from command.funders;
select tablename from pg_tables where schemaname = 'command' order by tablename;
```

After applying through migration 036 on a nonproduction branch, run:

```bash
psql "$DATABASE_URL" -f supabase/tests/food_protocol_acceptance.sql
```

This verifies direct-write boundaries, private-table boundaries, worker-only
functions, and core lifecycle restrictions. Complete the live multi-role and
retry matrix in `wxl/docs/DELIVERY-READINESS.md` before any lane advances.
