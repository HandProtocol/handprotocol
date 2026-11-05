import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrationSql } from '../scripts/gen-migration.mjs';
import { BOOKING, config, seedMedia } from '../netlify/functions/lib/config.mjs';
import { netlifyToml } from '../scripts/gen-netlify-toml.mjs';
import { bookingsMigrationSql, bookingsTableSql } from '../scripts/gen-migration.mjs';

test('migration creates the prefixed tables, RLS, bucket, seeds, first owner', () => {
  const sql = migrationSql();
  const { bookings, ...core } = config.tables;
  for (const t of Object.values(core)) {
    assert.match(sql, new RegExp(`create table if not exists command\\.${t} \\(`));
    assert.match(sql, new RegExp(`alter table command\\.${t} enable row level security`));
    assert.match(sql, new RegExp(`revoke all on command\\.${t} from anon, authenticated`));
  }
  assert.match(sql, new RegExp(`'${config.bucket}', '${config.bucket}', true`));
  assert.equal((sql.match(/00000000-0000-4000-8000-/g) || []).length, seedMedia().length);
  assert.match(sql, /hand@handprotocol\.org/);
  assert.equal(sql.includes('zeroblur'), false);
});

test('netlify.toml allow-lists exactly this bucket on the project host', () => {
  const toml = netlifyToml();
  assert.match(toml, new RegExp(`storage/v1/object/public/${config.bucket}/`));
  assert.match(toml, new RegExp(`publish = "${config.netlify.publish}"`));
  assert.match(toml, /X-Robots-Tag = "noindex, nofollow"/);
});

test('the bookings table ships in the full migration only with a request-mode calendar, and always in the add-on', () => {
  const t = config.tables.bookings;
  const full = migrationSql();
  assert.equal(full.includes(`create table if not exists command.${t} (`), Boolean(BOOKING));
  const block = bookingsTableSql();
  assert.match(block, new RegExp(`create table if not exists command\\.${t} \\(`));
  assert.match(block, /status text not null default 'requested'/);
  assert.match(block, /'requested', 'confirmed', 'declined', 'cancelled', 'completed', 'no_show'/);
  for (const col of ['requested_starts_at', 'requested_ends_at', '"window"', 'intake jsonb', 'manage_token_hash text unique', 'act_token_hash text unique', 'reminder_sent_at', 'updated_by uuid references']) assert.ok(block.includes(col), col);
  assert.match(block, new RegExp(`create index if not exists ${t}_status_starts_idx`));
  assert.match(block, new RegExp(`alter table command\\.${t} enable row level security`));
  assert.match(block, new RegExp(`revoke all on command\\.${t} from anon, authenticated`));
  const addon = bookingsMigrationSql();
  assert.ok(addon.startsWith(`-- ${config.name}: booking calendar`));
  assert.ok(addon.includes(block));
  assert.equal(addon.includes('storage.buckets'), false);
});

test('the 2-hour reminder marker is in a fresh table and is added to a table that predates it; every statement can run twice', () => {
  const t = config.tables.bookings;
  const block = bookingsTableSql();
  assert.match(block, /\n  reminder_sent_at timestamptz,\n  reminder_soon_sent_at timestamptz,\n/);
  // `create table if not exists` is a no-op on a live table, so the column needs its own idempotent statement
  assert.match(block, new RegExp(`alter table command\\.${t}\\s+add column if not exists reminder_soon_sent_at timestamptz;`));
  assert.ok(block.indexOf('add column if not exists') > block.indexOf('create table if not exists'), 'after the create');
  // comments first: one of them contains a `;`
  for (const stmt of block.replace(/^\s*--.*$/gm, '').split(';').map((x) => x.trim()).filter(Boolean)) {
    assert.match(stmt, /^(create table if not exists|create index if not exists|alter table \S+\s+add column if not exists|alter table \S+ enable row level security|revoke all on)/, `not re-runnable: ${stmt.slice(0, 60)}`);
  }
});
