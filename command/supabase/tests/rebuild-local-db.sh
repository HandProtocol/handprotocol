#!/usr/bin/env bash
# Builds a throwaway Supabase Postgres in podman with every migration applied,
# for running the SQL acceptance tests and yuhm's database parity test.
#   ./rebuild-local-db.sh            # container "yuhm-runs-pg" on 127.0.0.1:54329
#   podman exec -i yuhm-runs-pg psql -U postgres -h localhost -d postgres -v ON_ERROR_STOP=1 -q < food_runs_acceptance.sql
#   (cd ../../../yuhm && YUHM_RUNS_DB=yuhm-runs-pg VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npx vitest run src/runs/dbParity.test.ts)
# Never point this at production. `podman rm -f yuhm-runs-pg` removes it.
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS="$HERE/../migrations"
NAME="${1:-yuhm-runs-pg}"
podman rm -f "$NAME" >/dev/null 2>&1
podman run -d --name "$NAME" -p 127.0.0.1:54329:5432 -e POSTGRES_PASSWORD=postgres public.ecr.aws/supabase/postgres:17.6.1.121 >/dev/null
for _ in $(seq 1 60); do podman exec "$NAME" pg_isready -U postgres -h localhost >/dev/null 2>&1 && break; sleep 1; done
sleep 2
# The image has no storage.buckets table; a few client-site migrations insert into it.
podman exec -i "$NAME" psql -U supabase_admin -h localhost -d postgres -v ON_ERROR_STOP=1 -q <<'SQL'
create table if not exists storage.buckets (id text primary key, name text not null, public boolean default false, file_size_limit bigint, allowed_mime_types text[], owner uuid, created_at timestamptz default now(), updated_at timestamptz default now());
grant all on storage.buckets to postgres;
SQL
for file in $(ls "$MIGRATIONS"/0*.sql | sort); do
  if ! out=$(podman exec -i "$NAME" psql -U postgres -h localhost -d postgres -v ON_ERROR_STOP=1 -q < "$file" 2>&1); then
    echo "FAIL $(basename "$file")"; echo "$out" | grep -v NOTICE | tail -8; exit 1
  fi
done
echo "chain ok: $(ls "$MIGRATIONS"/0*.sql | wc -l) migrations applied to $NAME"
