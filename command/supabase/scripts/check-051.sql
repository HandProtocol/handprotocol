-- check-051.sql: run after migrations 001..051 on a LOCAL database only.
-- psql -v ON_ERROR_STOP=1 -f check-051.sql  (as a superuser, e.g. postgres)
-- Everything runs in a transaction that is rolled back.
begin;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1','pending@example.test'),
  ('00000000-0000-0000-0000-0000000000a2','admin@example.test')
  on conflict do nothing;
insert into command.profiles (id,email,display_name,role,status,reciprocate_group) values
  ('00000000-0000-0000-0000-0000000000a1','pending@example.test','P','viewer','pending','g1'),
  ('00000000-0000-0000-0000-0000000000a2','admin@example.test','A','admin','active',null)
  on conflict (id) do update set role=excluded.role, status=excluded.status,
    reciprocate_group=excluded.reciprocate_group, display_name=excluded.display_name;

create temp table results(test text, outcome text);
grant all on results to authenticated;

create or replace function pg_temp.attempt(who uuid, label text, stmt text, expect_ok boolean)
returns void language plpgsql as $$
declare ok boolean := true; msg text := '';
begin
  perform set_config('request.jwt.claims', json_build_object('sub',who,'role','authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', who::text, true);
  set local role authenticated;
  begin
    execute stmt;
    -- an RLS-filtered update affects 0 rows without error; treat that as refused
    get diagnostics msg = row_count;
    if msg = '0' then ok := false; msg := '0 rows'; else msg := ''; end if;
  exception when others then ok := false; msg := sqlerrm;
  end;
  reset role;
  insert into results values (label,
    case when ok = expect_ok then 'PASS' else 'FAIL' end
    || ' (' || case when ok then 'allowed' else 'refused: ' || msg end || ')');
end $$;

select pg_temp.attempt('00000000-0000-0000-0000-0000000000a1','pending sets status=active (expect refused)',
  $$update command.profiles set status='active' where id='00000000-0000-0000-0000-0000000000a1'$$, false);
select pg_temp.attempt('00000000-0000-0000-0000-0000000000a1','pending clears reciprocate_group (expect refused)',
  $$update command.profiles set reciprocate_group=null where id='00000000-0000-0000-0000-0000000000a1'$$, false);
select pg_temp.attempt('00000000-0000-0000-0000-0000000000a1','pending sets role=admin (expect refused)',
  $$update command.profiles set role='admin' where id='00000000-0000-0000-0000-0000000000a1'$$, false);
select pg_temp.attempt('00000000-0000-0000-0000-0000000000a1','pending sets role=develop_rep (expect refused)',
  $$update command.profiles set role='develop_rep' where id='00000000-0000-0000-0000-0000000000a1'$$, false);
select pg_temp.attempt('00000000-0000-0000-0000-0000000000a1','pending changes display_name (expect allowed)',
  $$update command.profiles set display_name='New Name' where id='00000000-0000-0000-0000-0000000000a1'$$, true);
select pg_temp.attempt('00000000-0000-0000-0000-0000000000a1','pending edits someone else (expect refused)',
  $$update command.profiles set display_name='x' where id='00000000-0000-0000-0000-0000000000a2'$$, false);
select pg_temp.attempt('00000000-0000-0000-0000-0000000000a2','admin activates the pending user (expect allowed)',
  $$update command.profiles set status='active' where id='00000000-0000-0000-0000-0000000000a1'$$, true);

select * from results;
do $$ begin
  if exists (select 1 from results where outcome like 'FAIL%') then
    raise exception 'check-051 FAILED'; end if;
  raise notice 'check-051: all % checks passed', (select count(*) from results);
end $$;
rollback;
