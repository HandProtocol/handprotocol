import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrationSql } from '../scripts/gen-migration.mjs';
import { config, seedMedia } from '../netlify/functions/lib/config.mjs';
import { netlifyToml } from '../scripts/gen-netlify-toml.mjs';

test('migration creates the five prefixed tables, RLS, bucket, seeds, first owner', () => {
  const sql = migrationSql();
  for (const t of Object.values(config.tables)) {
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
  assert.match(toml, /publish = "public"/);
  assert.match(toml, /X-Robots-Tag = "noindex, nofollow"/);
});
