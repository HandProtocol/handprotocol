/*
  Acceptance test for 050_yuhm_food_runs.sql. Run after migrations 001 through
  050 on a nonproduction database (the Supabase Postgres image), as postgres.
  Everything happens inside one transaction that rolls back.

  Scenario: a runner picks up from Oak Hill Baptist on Saturday 7:30 to 8:00 am
  (an early, tight window, with cold items, done solo) and shares the haul with
  five households: four want a share, one does not need it this week and asked
  not to be kept on file. The expected seeds (91 for the run, 126 with the
  seven first stamps) are mirrored in yuhm/src/runs/scoring.test.ts.
*/
begin;

-- Privileges -----------------------------------------------------------------
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'food_run_households','food_runs','food_run_items','food_run_stops','food_run_portions',
    'food_run_settings','food_run_events','food_run_rules','food_mission_enrollments',
    'food_mission_pauses','food_mission_stamps'
  ] loop
    if has_table_privilege('authenticated', 'command.' || table_name, 'insert')
      or has_table_privilege('authenticated', 'command.' || table_name, 'update')
      or has_table_privilege('authenticated', 'command.' || table_name, 'delete') then
      raise exception 'authenticated can write % directly', table_name;
    end if;
    if table_name <> 'food_run_rules' and has_table_privilege('anon', 'command.' || table_name, 'select') then
      raise exception 'anon can read %', table_name;
    end if;
  end loop;
  if has_function_privilege('authenticated', 'command.food_run_apply_op(uuid,text,jsonb)', 'execute') then raise exception 'authenticated can call the raw op'; end if;
  if has_function_privilege('authenticated', 'command.food_run_award(uuid,uuid)', 'execute') then raise exception 'authenticated can award seeds'; end if;
  if has_function_privilege('authenticated', 'command.food_run_complete(uuid,uuid,timestamptz)', 'execute') then raise exception 'authenticated can finish a run for another owner'; end if;
  if has_function_privilege('authenticated', 'command.food_run_forget_household(uuid,uuid)', 'execute') then raise exception 'authenticated can forget for another owner'; end if;
  if has_function_privilege('authenticated', 'command.prune_food_run_events(interval)', 'execute') then raise exception 'authenticated can prune receipts'; end if;
  if has_function_privilege('anon', 'command.apply_food_run_changes(jsonb,boolean)', 'execute') then raise exception 'anon can save runs'; end if;
  if not has_function_privilege('anon', 'command.get_food_run_circle_week()', 'execute') then raise exception 'anon cannot read the circle week'; end if;
  if not has_function_privilege('authenticated', 'command.apply_food_run_changes(jsonb,boolean)', 'execute') then raise exception 'members cannot save runs'; end if;
end;
$$;

-- People ---------------------------------------------------------------------
insert into auth.users (id, email, aud, role) values
  ('a0000000-0000-4000-8000-00000000000a', 'runner-a@handprotocol.org', 'authenticated', 'authenticated'),
  ('b0000000-0000-4000-8000-00000000000b', 'runner-b@handprotocol.org', 'authenticated', 'authenticated'),
  ('c0000000-0000-4000-8000-00000000000c', 'coordinator@handprotocol.org', 'authenticated', 'authenticated');
update command.profiles set role = 'admin', status = 'active' where id = 'c0000000-0000-4000-8000-00000000000c';

-- Runner A plans the run ------------------------------------------------------
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-00000000000a', true) as runner_a,
       set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-00000000000a","role":"authenticated"}', true) as claims;
set local role authenticated;

do $$
declare result jsonb;
begin
  result := command.apply_food_run_changes($json$[
    {"key":"plan-h1-0001","op":"household.save","household":{"id":"20000000-0000-4000-8000-000000000001","label":"Rosa M.","adults":2,"kids":2,"language":"es","contact_method":"sms","contact_value":"+15125550101","never_needs":["bread"],"wants":["produce","dairy"],"handoff":"door"}},
    {"key":"plan-h2-0001","op":"household.save","household":{"id":"20000000-0000-4000-8000-000000000002","label":"The Nguyens","adults":2,"seniors":1,"contact_method":"call","avoids":["pork"],"wants":["dry_goods"]}},
    {"key":"plan-h3-0001","op":"household.save","household":{"id":"20000000-0000-4000-8000-000000000003","label":"Darnell","adults":1,"contact_method":"whatsapp","kitchen":["microwave_only"],"wants":["prepared"]}},
    {"key":"plan-h4-0001","op":"household.save","household":{"id":"20000000-0000-4000-8000-000000000004","label":"Abuela Carmen","seniors":1,"adults":0,"language":"es","contact_method":"call","avoids":["low_salt"],"keep_info":false}},
    {"key":"plan-h5-0001","op":"household.save","household":{"id":"20000000-0000-4000-8000-000000000005","label":"Kim family","adults":2,"kids":3,"allergies":["peanut"],"never_needs":["canned"]}},
    {"key":"plan-run-0001","op":"run.save","run":{"id":"10000000-0000-4000-8000-000000000001","title":"Oak Hill Baptist pickup","source_name":"Oak Hill Baptist","source_kind":"church","pickup_starts_at":"2026-10-03T12:30:00Z","pickup_ends_at":"2026-10-03T13:00:00Z","conditions":["solo"]}},
    {"key":"plan-i1-0001","op":"item.save","item":{"id":"30000000-0000-4000-8000-000000000001","run_id":"10000000-0000-4000-8000-000000000001","position":1,"name":"Produce box","kind":"produce","unit":"box","expected_qty":5}},
    {"key":"plan-i2-0001","op":"item.save","item":{"id":"30000000-0000-4000-8000-000000000002","run_id":"10000000-0000-4000-8000-000000000001","position":2,"name":"Bread","kind":"bread","unit":"loaf","expected_qty":6,"contains":["gluten"]}},
    {"key":"plan-i3-0001","op":"item.save","item":{"id":"30000000-0000-4000-8000-000000000003","run_id":"10000000-0000-4000-8000-000000000001","position":3,"name":"Milk","kind":"dairy","unit":"gallon","expected_qty":4,"contains":["dairy"],"temp":"chilled"}},
    {"key":"plan-i4-0001","op":"item.save","item":{"id":"30000000-0000-4000-8000-000000000004","run_id":"10000000-0000-4000-8000-000000000001","position":4,"name":"Eggs","kind":"eggs","unit":"dozen","expected_qty":3,"contains":["egg"],"temp":"chilled"}},
    {"key":"plan-i5-0001","op":"item.save","item":{"id":"30000000-0000-4000-8000-000000000005","run_id":"10000000-0000-4000-8000-000000000001","position":5,"name":"Canned beans","kind":"canned","unit":"can","expected_qty":10}},
    {"key":"plan-i6-0001","op":"item.save","item":{"id":"30000000-0000-4000-8000-000000000006","run_id":"10000000-0000-4000-8000-000000000001","position":6,"name":"Rice","kind":"dry_goods","unit":"bag","expected_qty":5}},
    {"key":"plan-i7-0001","op":"item.save","item":{"id":"30000000-0000-4000-8000-000000000007","run_id":"10000000-0000-4000-8000-000000000001","position":7,"name":"Peanut butter","kind":"canned","unit":"jar","expected_qty":4,"contains":["peanut"]}},
    {"key":"plan-i8-0001","op":"item.save","item":{"id":"30000000-0000-4000-8000-000000000008","run_id":"10000000-0000-4000-8000-000000000001","position":8,"name":"Frozen chicken","kind":"poultry","unit":"lb","expected_qty":8,"contains":["meat"],"temp":"frozen"}},
    {"key":"plan-s1-0001","op":"stop.save","stop":{"id":"40000000-0000-4000-8000-000000000001","run_id":"10000000-0000-4000-8000-000000000001","household_id":"20000000-0000-4000-8000-000000000001","position":1,"bag":1}},
    {"key":"plan-s2-0001","op":"stop.save","stop":{"id":"40000000-0000-4000-8000-000000000002","run_id":"10000000-0000-4000-8000-000000000001","household_id":"20000000-0000-4000-8000-000000000002","position":2,"bag":2}},
    {"key":"plan-s3-0001","op":"stop.save","stop":{"id":"40000000-0000-4000-8000-000000000003","run_id":"10000000-0000-4000-8000-000000000001","household_id":"20000000-0000-4000-8000-000000000003","position":3,"bag":3}},
    {"key":"plan-s4-0001","op":"stop.save","stop":{"id":"40000000-0000-4000-8000-000000000004","run_id":"10000000-0000-4000-8000-000000000001","household_id":"20000000-0000-4000-8000-000000000004","position":4,"bag":4}},
    {"key":"plan-s5-0001","op":"stop.save","stop":{"id":"40000000-0000-4000-8000-000000000005","run_id":"10000000-0000-4000-8000-000000000001","household_id":"20000000-0000-4000-8000-000000000005","position":5,"bag":5}}
  ]$json$::jsonb);
  if (result->>'applied')::integer <> 19 or jsonb_array_length(result->'failed') <> 0 then raise exception 'planning batch: %', result; end if;

  -- Replaying the same batch changes nothing.
  result := command.apply_food_run_changes($json$[
    {"key":"plan-h1-0001","op":"household.save","household":{"id":"20000000-0000-4000-8000-000000000001","label":"Changed","adults":9}},
    {"key":"plan-run-0001","op":"run.save","run":{"id":"10000000-0000-4000-8000-000000000001"}}
  ]$json$::jsonb);
  if (result->>'replayed')::integer <> 2 or (result->>'applied')::integer <> 0 then raise exception 'replay was not skipped: %', result; end if;
  if (select label from command.food_run_households where id = '20000000-0000-4000-8000-000000000001') <> 'Rosa M.' then raise exception 'a replay rewrote a household'; end if;

  -- The stop took the household's name, size, and language as its snapshot,
  -- and follows the household while the run is open.
  if (select people from command.food_run_stops where id = '40000000-0000-4000-8000-000000000001') <> 4 then raise exception 'stop did not snapshot the household size'; end if;
  if (select lang from command.food_run_stops where id = '40000000-0000-4000-8000-000000000001') <> 'es' then raise exception 'stop did not snapshot the household language'; end if;
  perform command.apply_food_run_changes($json$[
    {"key":"grow-h3-00001","op":"household.save","household":{"id":"20000000-0000-4000-8000-000000000003","label":"Darnell","adults":2,"contact_method":"whatsapp","kitchen":["microwave_only"],"wants":["prepared"]}}
  ]$json$::jsonb);
  if (select people from command.food_run_stops where id = '40000000-0000-4000-8000-000000000003') <> 2 then raise exception 'open stop did not follow the household'; end if;
  perform command.apply_food_run_changes($json$[
    {"key":"grow-h3-00002","op":"household.save","household":{"id":"20000000-0000-4000-8000-000000000003","label":"Darnell","adults":1,"contact_method":"whatsapp","kitchen":["microwave_only"],"wants":["prepared"]}}
  ]$json$::jsonb);
end;
$$;

-- A refused change is reported and never blocks the rest of the batch ----------
do $$
declare result jsonb;
begin
  result := command.apply_food_run_changes($json$[
    {"key":"bad-window-01","op":"run.save","run":{"id":"10000000-0000-4000-8000-000000000009","title":"Backwards","source_name":"Somewhere","pickup_starts_at":"2026-10-03T13:00:00Z","pickup_ends_at":"2026-10-03T12:00:00Z"}},
    {"key":"bad-house-01","op":"household.save","household":{"id":"20000000-0000-4000-8000-000000000009","label":"Nobody","adults":0}},
    {"key":"bad-item-001","op":"item.save","item":{"id":"30000000-0000-4000-8000-000000000009","run_id":"10000000-0000-4000-8000-000000000001","name":"Mystery","contains":["kryptonite"]}},
    {"key":"bad-op-00001","op":"run.launch"},
    {"key":"bad-pref-0001","op":"settings.save","prefs":{"turbo":true}},
    {"key":"dup-stop-0001","op":"stop.save","stop":{"id":"40000000-0000-4000-8000-000000000009","run_id":"10000000-0000-4000-8000-000000000001","household_id":"20000000-0000-4000-8000-000000000001"}},
    {"key":"too-early-001","op":"run.complete","id":"10000000-0000-4000-8000-000000000001"},
    {"key":"bad-uuid-0001","op":"stop.order","run_id":"10000000-0000-4000-8000-000000000001","ids":["not-an-id"]},
    {"key":"good-note-001","op":"run.check","id":"10000000-0000-4000-8000-000000000001","check":"thanked","on":true}
  ]$json$::jsonb);
  if (result->>'applied')::integer <> 1 or jsonb_array_length(result->'failed') <> 8 then raise exception 'mixed batch: %', result; end if;
  if result->'failed'->0->>'error' <> 'The pickup window has to end after it starts' then raise exception 'wrong window error: %', result->'failed'->0; end if;
  if result->'failed'->1->>'error' <> 'A household counts 1 to 40 people' then raise exception 'wrong household error: %', result->'failed'->1; end if;
  if result->'failed'->2->>'error' <> 'Unknown ingredient tag' then raise exception 'wrong tag error: %', result->'failed'->2; end if;
  if result->'failed'->3->>'error' <> 'Unknown change run.launch' then raise exception 'wrong op error: %', result->'failed'->3; end if;
  if result->'failed'->4->>'error' <> 'Unknown setting turbo' then raise exception 'wrong settings error: %', result->'failed'->4; end if;
  if result->'failed'->5->>'error' <> 'That family is already on this run' then raise exception 'wrong duplicate error: %', result->'failed'->5; end if;
  if result->'failed'->6->>'error' <> 'Mark the pickup done before finishing the run' then raise exception 'wrong completion error: %', result->'failed'->6; end if;
  if result->'failed'->7->>'key' <> 'bad-uuid-0001' then raise exception 'bad id was not reported: %', result->'failed'->7; end if;
  if exists (select 1 from command.food_runs where id = '10000000-0000-4000-8000-000000000009') then raise exception 'a rejected run was saved'; end if;
  if not ((select pickup_checks from command.food_runs where id = '10000000-0000-4000-8000-000000000001') ? 'thanked') then raise exception 'the good change after the bad ones was lost'; end if;
  -- A refused change leaves no receipt, so the phone can send a corrected one.
  if exists (select 1 from command.food_run_events where idempotency_key like 'bad-%') then raise exception 'a refused change left a receipt'; end if;
  perform command.apply_food_run_changes('[{"key":"good-note-002","op":"run.check","id":"10000000-0000-4000-8000-000000000001","check":"thanked","on":false}]'::jsonb);
end;
$$;

-- The phone's own clock is kept when it is believable ---------------------------
do $$
declare result jsonb; stamp timestamptz;
begin
  perform command.apply_food_run_changes(jsonb_build_array(jsonb_build_object(
    'key', 'clock-past-001', 'op', 'stop.contact', 'id', '40000000-0000-4000-8000-000000000001', 'state', 'asked',
    'at', to_char((now() - interval '3 hours') at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))));
  select asked_at into stamp from command.food_run_stops where id = '40000000-0000-4000-8000-000000000001';
  if abs(extract(epoch from (stamp - (now() - interval '3 hours')))) > 2 then raise exception 'phone timestamp was not kept: %', stamp; end if;
  perform command.apply_food_run_changes($json$[{"key":"clock-reset-01","op":"stop.contact","id":"40000000-0000-4000-8000-000000000001","state":"to_ask"}]$json$::jsonb);

  perform command.apply_food_run_changes($json$[{"key":"clock-future-1","op":"stop.contact","id":"40000000-0000-4000-8000-000000000001","state":"asked","at":"2031-01-01T00:00:00Z"}]$json$::jsonb);
  select asked_at into stamp from command.food_run_stops where id = '40000000-0000-4000-8000-000000000001';
  if abs(extract(epoch from (stamp - now()))) > 2 then raise exception 'a future timestamp was trusted: %', stamp; end if;
  perform command.apply_food_run_changes($json$[{"key":"clock-reset-02","op":"stop.contact","id":"40000000-0000-4000-8000-000000000001","state":"to_ask"}]$json$::jsonb);

  perform command.apply_food_run_changes($json$[{"key":"clock-ancient1","op":"stop.contact","id":"40000000-0000-4000-8000-000000000001","state":"asked","at":"2019-01-01T00:00:00Z"}]$json$::jsonb);
  select asked_at into stamp from command.food_run_stops where id = '40000000-0000-4000-8000-000000000001';
  if abs(extract(epoch from (stamp - now()))) > 2 then raise exception 'an ancient timestamp was trusted: %', stamp; end if;
  perform command.apply_food_run_changes($json$[{"key":"clock-reset-03","op":"stop.contact","id":"40000000-0000-4000-8000-000000000001","state":"to_ask"}]$json$::jsonb);
end;
$$;

-- Asking, intake, pickup, portions, delivery ----------------------------------
do $$
declare result jsonb;
begin
  result := command.apply_food_run_changes($json$[
    {"key":"ask-s1-asked","op":"stop.contact","id":"40000000-0000-4000-8000-000000000001","state":"asked"},
    {"key":"ask-s2-asked","op":"stop.contact","id":"40000000-0000-4000-8000-000000000002","state":"asked"},
    {"key":"ask-s3-asked","op":"stop.contact","id":"40000000-0000-4000-8000-000000000003","state":"asked"},
    {"key":"ask-s4-asked","op":"stop.contact","id":"40000000-0000-4000-8000-000000000004","state":"asked"},
    {"key":"ask-s5-asked","op":"stop.contact","id":"40000000-0000-4000-8000-000000000005","state":"asked"},
    {"key":"ask-s1-yes00","op":"stop.contact","id":"40000000-0000-4000-8000-000000000001","state":"confirmed"},
    {"key":"ask-s2-yes00","op":"stop.contact","id":"40000000-0000-4000-8000-000000000002","state":"confirmed"},
    {"key":"ask-s3-yes00","op":"stop.contact","id":"40000000-0000-4000-8000-000000000003","state":"confirmed"},
    {"key":"ask-s4-no000","op":"stop.contact","id":"40000000-0000-4000-8000-000000000004","state":"declined"},
    {"key":"ask-s5-yes00","op":"stop.contact","id":"40000000-0000-4000-8000-000000000005","state":"confirmed"},
    {"key":"intake-s1-06","op":"stop.intake","id":"40000000-0000-4000-8000-000000000001","keys":["size","allergies","avoids","skip","wants","handoff"]},
    {"key":"intake-s5-04","op":"stop.intake","id":"40000000-0000-4000-8000-000000000005","keys":["size","allergies","skip","keep"]},
    {"key":"intake-s2-02","op":"stop.intake","id":"40000000-0000-4000-8000-000000000002","keys":["avoids","wants"]},
    {"key":"pickup-start1","op":"run.status","id":"10000000-0000-4000-8000-000000000001","status":"pickup"},
    {"key":"pickup-check1","op":"run.check","id":"10000000-0000-4000-8000-000000000001","check":"checked_in","on":true},
    {"key":"pickup-check2","op":"run.check","id":"10000000-0000-4000-8000-000000000001","check":"counted","on":true},
    {"key":"pickup-check3","op":"run.check","id":"10000000-0000-4000-8000-000000000001","check":"cooler","on":true},
    {"key":"count-i1-0001","op":"item.save","item":{"id":"30000000-0000-4000-8000-000000000001","run_id":"10000000-0000-4000-8000-000000000001","position":1,"name":"Produce box","kind":"produce","unit":"box","expected_qty":5,"received_qty":5}},
    {"key":"count-i2-0001","op":"item.save","item":{"id":"30000000-0000-4000-8000-000000000002","run_id":"10000000-0000-4000-8000-000000000001","position":2,"name":"Bread","kind":"bread","unit":"loaf","expected_qty":6,"received_qty":5,"contains":["gluten"]}},
    {"key":"pickup-done01","op":"run.status","id":"10000000-0000-4000-8000-000000000001","status":"delivering"},
    {"key":"reorder-00001","op":"stop.order","run_id":"10000000-0000-4000-8000-000000000001","ids":["40000000-0000-4000-8000-000000000002","40000000-0000-4000-8000-000000000001","40000000-0000-4000-8000-000000000003","40000000-0000-4000-8000-000000000005","40000000-0000-4000-8000-000000000004"]}
  ]$json$::jsonb);
  if (result->>'applied')::integer <> 21 or jsonb_array_length(result->'failed') <> 0 then raise exception 'asking batch: %', result; end if;
  if (select position from command.food_run_stops where id = '40000000-0000-4000-8000-000000000002') <> 1
    or (select bag from command.food_run_stops where id = '40000000-0000-4000-8000-000000000002') <> 2 then
    raise exception 'reorder moved the bag number or missed the position';
  end if;

  -- A share cannot be packed for a family that passed this time.
  result := command.apply_food_run_changes('[{"key":"pack-declined1","op":"stop.delivery","id":"40000000-0000-4000-8000-000000000004","state":"packed"}]'::jsonb);
  if result->'failed'->0->>'error' <> 'This family said they do not need it this time' then raise exception 'wrong declined error: %', result; end if;

  result := command.apply_food_run_changes($json$[
    {"key":"split-0000001","op":"portion.replace","run_id":"10000000-0000-4000-8000-000000000001","portions":[
      {"stop_id":"40000000-0000-4000-8000-000000000001","item_id":"30000000-0000-4000-8000-000000000001","quantity":2},
      {"stop_id":"40000000-0000-4000-8000-000000000002","item_id":"30000000-0000-4000-8000-000000000001","quantity":1},
      {"stop_id":"40000000-0000-4000-8000-000000000003","item_id":"30000000-0000-4000-8000-000000000001","quantity":1},
      {"stop_id":"40000000-0000-4000-8000-000000000005","item_id":"30000000-0000-4000-8000-000000000001","quantity":1},
      {"stop_id":"40000000-0000-4000-8000-000000000002","item_id":"30000000-0000-4000-8000-000000000002","quantity":2},
      {"stop_id":"40000000-0000-4000-8000-000000000003","item_id":"30000000-0000-4000-8000-000000000002","quantity":1},
      {"stop_id":"40000000-0000-4000-8000-000000000005","item_id":"30000000-0000-4000-8000-000000000002","quantity":2},
      {"stop_id":"40000000-0000-4000-8000-000000000001","item_id":"30000000-0000-4000-8000-000000000003","quantity":1},
      {"stop_id":"40000000-0000-4000-8000-000000000002","item_id":"30000000-0000-4000-8000-000000000003","quantity":1},
      {"stop_id":"40000000-0000-4000-8000-000000000003","item_id":"30000000-0000-4000-8000-000000000003","quantity":1},
      {"stop_id":"40000000-0000-4000-8000-000000000005","item_id":"30000000-0000-4000-8000-000000000003","quantity":1},
      {"stop_id":"40000000-0000-4000-8000-000000000001","item_id":"30000000-0000-4000-8000-000000000004","quantity":1},
      {"stop_id":"40000000-0000-4000-8000-000000000002","item_id":"30000000-0000-4000-8000-000000000004","quantity":1},
      {"stop_id":"40000000-0000-4000-8000-000000000005","item_id":"30000000-0000-4000-8000-000000000004","quantity":1},
      {"stop_id":"40000000-0000-4000-8000-000000000001","item_id":"30000000-0000-4000-8000-000000000005","quantity":4},
      {"stop_id":"40000000-0000-4000-8000-000000000002","item_id":"30000000-0000-4000-8000-000000000005","quantity":3},
      {"stop_id":"40000000-0000-4000-8000-000000000003","item_id":"30000000-0000-4000-8000-000000000005","quantity":3},
      {"stop_id":"40000000-0000-4000-8000-000000000001","item_id":"30000000-0000-4000-8000-000000000006","quantity":2},
      {"stop_id":"40000000-0000-4000-8000-000000000002","item_id":"30000000-0000-4000-8000-000000000006","quantity":1},
      {"stop_id":"40000000-0000-4000-8000-000000000003","item_id":"30000000-0000-4000-8000-000000000006","quantity":1},
      {"stop_id":"40000000-0000-4000-8000-000000000005","item_id":"30000000-0000-4000-8000-000000000006","quantity":1},
      {"stop_id":"40000000-0000-4000-8000-000000000001","item_id":"30000000-0000-4000-8000-000000000007","quantity":2},
      {"stop_id":"40000000-0000-4000-8000-000000000002","item_id":"30000000-0000-4000-8000-000000000007","quantity":1},
      {"stop_id":"40000000-0000-4000-8000-000000000003","item_id":"30000000-0000-4000-8000-000000000007","quantity":1},
      {"stop_id":"40000000-0000-4000-8000-000000000001","item_id":"30000000-0000-4000-8000-000000000008","quantity":3},
      {"stop_id":"40000000-0000-4000-8000-000000000002","item_id":"30000000-0000-4000-8000-000000000008","quantity":2},
      {"stop_id":"40000000-0000-4000-8000-000000000005","item_id":"30000000-0000-4000-8000-000000000008","quantity":3}
    ]},
    {"key":"drop-s1-onway","op":"stop.delivery","id":"40000000-0000-4000-8000-000000000001","state":"on_the_way"},
    {"key":"drop-s1-done1","op":"stop.delivery","id":"40000000-0000-4000-8000-000000000001","state":"delivered"},
    {"key":"drop-s2-done1","op":"stop.delivery","id":"40000000-0000-4000-8000-000000000002","state":"delivered"},
    {"key":"drop-s3-done1","op":"stop.delivery","id":"40000000-0000-4000-8000-000000000003","state":"delivered"},
    {"key":"drop-s5-done1","op":"stop.delivery","id":"40000000-0000-4000-8000-000000000005","state":"delivered"}
  ]$json$::jsonb);
  if (result->>'applied')::integer <> 6 or jsonb_array_length(result->'failed') <> 0 then raise exception 'delivery batch: %', result; end if;
  if (select count(*) from command.food_run_portions where run_id = '10000000-0000-4000-8000-000000000001') <> 27 then raise exception 'portions were not replaced'; end if;
  if (select last_served_at from command.food_run_households where id = '20000000-0000-4000-8000-000000000001') is null then raise exception 'delivery did not stamp the household'; end if;
end;
$$;

-- Pin the clock-dependent times so stamps are deterministic (fixture only).
reset role;
update command.food_runs set picked_up_at = '2026-10-03T13:00:00Z' where id = '10000000-0000-4000-8000-000000000001';
update command.food_run_stops set delivered_at = '2026-10-03T14:00:00Z' where run_id = '10000000-0000-4000-8000-000000000001' and delivery_state = 'delivered';
set local role authenticated;

-- Finish before opting in: nothing lands, the run still shows what it earned.
do $$
declare result jsonb; output jsonb; projected integer;
begin
  result := command.apply_food_run_changes('[{"key":"finish-run-0001","op":"run.complete","id":"10000000-0000-4000-8000-000000000001"}]'::jsonb, true);
  if jsonb_array_length(result->'failed') <> 0 then raise exception 'finish failed: %', result->'failed'; end if;
  output := result->'outputs'->'finish-run-0001';
  if (output->>'enrolled')::boolean then raise exception 'runner was enrolled without opting in'; end if;
  if (output->>'seeds_new')::integer <> 0 then raise exception 'seeds landed before opting in'; end if;
  select sum((entry->>'seeds')::integer) into projected from jsonb_array_elements(output->'breakdown') as entry;
  if projected <> 91 then raise exception 'projected % seeds, expected 91: %', projected, output->'breakdown'; end if;
  if not exists (select 1 from jsonb_array_elements(output->'breakdown') as entry where entry->>'component' = 'tough:solo') then raise exception 'tough window bonus missing'; end if;
  if jsonb_array_length(result->'board'->'runs') <> 1 or result->'board'->'runs'->0->>'status' <> 'completed' then raise exception 'the returned board is stale'; end if;

  -- Abuela Carmen asked to be kept only for this run.
  if exists (select 1 from command.food_run_households where id = '20000000-0000-4000-8000-000000000004') then raise exception 'one-run household was kept'; end if;
  if (select label from command.food_run_stops where id = '40000000-0000-4000-8000-000000000004') <> 'A family'
    or not (select forgotten from command.food_run_stops where id = '40000000-0000-4000-8000-000000000004')
    or (select household_id from command.food_run_stops where id = '40000000-0000-4000-8000-000000000004') is not null then
    raise exception 'forgotten stop still names the family';
  end if;
  result := command.apply_food_run_changes('[{"key":"revive-h4-001","op":"household.save","household":{"id":"20000000-0000-4000-8000-000000000004","label":"Abuela Carmen","seniors":1,"adults":0}}]'::jsonb);
  if result->'failed'->0->>'error' <> 'This family was forgotten. Add them again as a new family.' then raise exception 'wrong revive error: %', result; end if;

  -- A finished run is read-only until it is reopened.
  result := command.apply_food_run_changes('[{"key":"late-edit-0001","op":"stop.delivery","id":"40000000-0000-4000-8000-000000000001","state":"pending"},{"key":"late-edit-0002","op":"portion.set","run_id":"10000000-0000-4000-8000-000000000001","stop_id":"40000000-0000-4000-8000-000000000001","item_id":"30000000-0000-4000-8000-000000000001","quantity":9}]'::jsonb);
  if jsonb_array_length(result->'failed') <> 2 or result->'failed'->0->>'error' <> 'This run is finished. Reopen it to change it.' then raise exception 'finished run was editable: %', result; end if;
end;
$$;

-- Opting in plants the run once, with seven first stamps -----------------------
do $$
declare progress jsonb; result jsonb; output jsonb;
begin
  progress := command.enroll_food_mission(2::smallint);
  if (progress->>'seeds')::integer <> 126 then raise exception 'backfill planted %, expected 126', progress->>'seeds'; end if;
  if progress->>'level' <> 'sprout' or progress->>'next_level' <> 'vine' or (progress->>'next_at')::integer <> 150 then raise exception 'wrong level %', progress; end if;
  if jsonb_array_length(progress->'stamps') <> 7 then raise exception 'expected 7 stamps, got %', progress->'stamps'; end if;
  if not exists (select 1 from jsonb_array_elements(progress->'stamps') as stamp where stamp->>'slug' = 'cold-keeper') then raise exception 'cold-keeper stamp missing'; end if;
  if exists (select 1 from jsonb_array_elements(progress->'stamps') as stamp where stamp->>'slug' in ('night-owl','listener','rain-or-shine')) then raise exception 'unearned stamp awarded'; end if;
  if (progress->>'rhythm_weeks')::integer <> 1 or (progress->>'this_week')::integer <> 1 then raise exception 'wrong rhythm %', progress; end if;
  if (progress->>'families_served')::integer <> 4 then raise exception 'wrong families served %', progress->>'families_served'; end if;
  if (select seeds_awarded from command.food_runs where id = '10000000-0000-4000-8000-000000000001') <> 126 then raise exception 'run total not refreshed'; end if;

  -- Opting in again or finishing again never doubles anything.
  progress := command.enroll_food_mission(3::smallint);
  if (progress->>'seeds')::integer <> 126 or (progress->>'rhythm_goal')::integer <> 3 then raise exception 'second enrollment changed seeds: %', progress; end if;
  result := command.apply_food_run_changes('[{"key":"finish-run-0002","op":"run.complete","id":"10000000-0000-4000-8000-000000000001"}]'::jsonb);
  output := result->'outputs'->'finish-run-0002';
  if (output->>'seeds_new')::integer <> 0 or jsonb_array_length(output->'stamps_new') <> 0 then raise exception 'second completion planted again: %', result; end if;

  -- Reopen, fix a detail, finish again: still no double count.
  result := command.apply_food_run_changes('[{"key":"reopen-00001","op":"run.status","id":"10000000-0000-4000-8000-000000000001","status":"delivering"},{"key":"leftover-0001","op":"run.leftovers","id":"10000000-0000-4000-8000-000000000001","rehomed":true,"note":"Extra bread to the church fridge"},{"key":"finish-run-0003","op":"run.complete","id":"10000000-0000-4000-8000-000000000001"}]'::jsonb);
  output := result->'outputs'->'finish-run-0003';
  if jsonb_array_length(result->'failed') <> 0 or (output->>'seeds_new')::integer <> 0 or (output->'progress'->>'seeds')::integer <> 126 then raise exception 'refinish changed seeds: %', result; end if;

  -- Pause freezes, resume, leave, come back: seeds stay.
  progress := command.set_food_mission_status('paused', null);
  if progress->>'status' <> 'paused' or progress->>'paused_until' is null then raise exception 'pause failed %', progress; end if;
  if (select count(*) from command.food_mission_pauses where resumed_at is null) <> 1 then raise exception 'pause was not recorded'; end if;
  progress := command.set_food_mission_status('active', null);
  if progress->>'status' <> 'active' then raise exception 'resume failed %', progress; end if;
  if (select count(*) from command.food_mission_pauses where resumed_at is null) <> 0 then raise exception 'pause was not closed'; end if;
  progress := command.set_food_mission_status('left', null);
  if (progress->>'enrolled')::boolean then raise exception 'leave failed %', progress; end if;
  progress := command.enroll_food_mission(2::smallint);
  if (progress->>'seeds')::integer <> 126 then raise exception 'rejoin lost seeds %', progress; end if;

  -- Settings merge and stay validated.
  perform command.apply_food_run_changes('[{"key":"prefs-000001","op":"settings.save","prefs":{"contactLeadHours":12,"splitBy":"people","templates":{"ask":{"es":"Hola {name}"}}}},{"key":"prefs-000002","op":"settings.save","prefs":{"followUpMinutes":90}}]'::jsonb);
  if (select prefs from command.food_run_settings where owner_id = auth.uid()) <> '{"contactLeadHours":12,"splitBy":"people","templates":{"ask":{"es":"Hola {name}"}},"followUpMinutes":90}'::jsonb then
    raise exception 'settings did not merge: %', (select prefs from command.food_run_settings where owner_id = auth.uid());
  end if;

  -- The board carries everything the app needs in one call.
  result := command.get_food_run_board();
  if jsonb_array_length(result->'households') <> 4 or jsonb_array_length(result->'runs') <> 1 or jsonb_array_length(result->'items') <> 8
    or jsonb_array_length(result->'stops') <> 5 or jsonb_array_length(result->'portions') <> 27 then
    raise exception 'board is missing rows';
  end if;
  if result->'runs'->0 ? 'owner_id' or result->'households'->0 ? 'owner_id' then raise exception 'board leaks owner ids'; end if;
  if (result->'circle'->>'families_reached')::integer <> 4 then raise exception 'circle week wrong %', result->'circle'; end if;
  if jsonb_array_length(command.get_food_run('10000000-0000-4000-8000-000000000001')->'events') < 40 then raise exception 'activity log too short'; end if;
  if exists (
    select 1 from command.food_run_events
    where owner_id = auth.uid() and (summary::text ilike '%rosa%' or summary::text ilike '%5550101%')
  ) then raise exception 'activity log holds personal details'; end if;
end;
$$;

-- A practice run works end to end and counts for nothing -----------------------
do $$
declare result jsonb; output jsonb; before_seeds integer; progress jsonb;
begin
  before_seeds := (command.get_food_mission_progress()->>'seeds')::integer;
  result := command.apply_food_run_changes($json$[
    {"key":"practice-h1-01","op":"household.save","household":{"id":"21000000-0000-4000-8000-000000000001","label":"Sample: the Garcias","adults":2,"kids":1,"is_practice":true}},
    {"key":"practice-run1","op":"run.save","run":{"id":"11000000-0000-4000-8000-000000000001","title":"Practice: Oak Hill Baptist","source_name":"Oak Hill Baptist","pickup_starts_at":"2026-10-03T12:30:00Z","pickup_ends_at":"2026-10-03T13:00:00Z","is_practice":true}},
    {"key":"practice-i1-01","op":"item.save","item":{"id":"31000000-0000-4000-8000-000000000001","run_id":"11000000-0000-4000-8000-000000000001","name":"Produce box","kind":"produce","unit":"box","expected_qty":1}},
    {"key":"practice-s1-01","op":"stop.save","stop":{"id":"41000000-0000-4000-8000-000000000001","run_id":"11000000-0000-4000-8000-000000000001","household_id":"21000000-0000-4000-8000-000000000001","position":1,"bag":1}},
    {"key":"practice-mix01","op":"stop.save","stop":{"id":"41000000-0000-4000-8000-000000000002","run_id":"11000000-0000-4000-8000-000000000001","household_id":"20000000-0000-4000-8000-000000000001","position":2,"bag":2}},
    {"key":"practice-p1-01","op":"portion.set","run_id":"11000000-0000-4000-8000-000000000001","stop_id":"41000000-0000-4000-8000-000000000001","item_id":"31000000-0000-4000-8000-000000000001","quantity":1},
    {"key":"practice-d1-01","op":"stop.delivery","id":"41000000-0000-4000-8000-000000000001","state":"delivered"},
    {"key":"practice-done1","op":"run.complete","id":"11000000-0000-4000-8000-000000000001"}
  ]$json$::jsonb);
  if jsonb_array_length(result->'failed') <> 1 or result->'failed'->0->>'error' <> 'Practice runs use practice families, and real runs use your own families' then raise exception 'practice mixing: %', result; end if;
  output := result->'outputs'->'practice-done1';
  if not (output->>'practice')::boolean or (output->>'seeds_new')::integer <> 0 or jsonb_array_length(output->'stamps_new') <> 0 then raise exception 'practice run planted seeds: %', output; end if;
  if jsonb_array_length(output->'breakdown') = 0 then raise exception 'practice run shows no projected seeds'; end if;
  progress := command.get_food_mission_progress();
  if (progress->>'seeds')::integer <> before_seeds or (progress->>'runs_completed')::integer <> 1 or (progress->>'this_week')::integer <> 1 then raise exception 'practice run counted: %', progress; end if;
  if (command.get_food_run_circle_week()->>'runs_completed')::integer <> 1 then raise exception 'practice run counted in the circle'; end if;

  -- Deleting the practice run takes its sample family with it, and it stays deleted.
  result := command.apply_food_run_changes('[{"key":"practice-del-1","op":"run.delete","id":"11000000-0000-4000-8000-000000000001"}]'::jsonb);
  if jsonb_array_length(result->'failed') <> 0 then raise exception 'delete failed: %', result; end if;
  if exists (select 1 from command.food_runs where id = '11000000-0000-4000-8000-000000000001')
    or exists (select 1 from command.food_run_households where id = '21000000-0000-4000-8000-000000000001') then
    raise exception 'practice run or its sample family survived deletion';
  end if;
  if (select count(*) from command.food_run_events where run_id = '11000000-0000-4000-8000-000000000001') <> 1 then raise exception 'deleted run kept more than its tombstone'; end if;
  result := command.apply_food_run_changes('[{"key":"practice-back1","op":"run.save","run":{"id":"11000000-0000-4000-8000-000000000001","title":"Practice again","source_name":"Oak Hill Baptist","pickup_starts_at":"2026-10-04T15:00:00Z","pickup_ends_at":"2026-10-04T16:00:00Z"}}]'::jsonb);
  if result->'failed'->0->>'error' <> 'This run was deleted.' then raise exception 'wrong tombstone error: %', result; end if;

  -- Forgetting a family by hand works the same way.
  result := command.apply_food_run_changes('[{"key":"forget-h5-001","op":"household.forget","id":"20000000-0000-4000-8000-000000000005"}]'::jsonb);
  if jsonb_array_length(result->'failed') <> 0 or exists (select 1 from command.food_run_households where id = '20000000-0000-4000-8000-000000000005') then raise exception 'forget failed: %', result; end if;
  if (select label from command.food_run_stops where id = '40000000-0000-4000-8000-000000000005') <> 'A family' then raise exception 'forgotten family is still named on the old run'; end if;

  -- Rules belong to coordinators.
  begin
    perform command.set_food_run_rules('{"seeds_pickup":99}'::jsonb);
    raise exception 'no error';
  exception when others then
    if sqlerrm <> 'Only coordinators can change recognition rules' then raise exception 'wrong rules error: %', sqlerrm; end if;
  end;
end;
$$;

-- Direct writes are refused even for the owner.
do $$
begin
  begin
    insert into command.food_runs(owner_id, title, source_name, pickup_starts_at, pickup_ends_at)
    values (auth.uid(), 'Sneaky', 'Nowhere', now(), now() + interval '1 hour');
    raise exception 'no error';
  exception when insufficient_privilege then null;
  end;
  begin
    perform command.prune_food_run_events();
    raise exception 'no error';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- Runner B sees nothing of runner A ---------------------------------------------
reset role;
select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-00000000000b', true) as runner_b,
       set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-00000000000b","role":"authenticated"}', true) as claims;
set local role authenticated;

do $$
declare board jsonb; result jsonb;
begin
  if (select count(*) from command.food_runs) <> 0 or (select count(*) from command.food_run_households) <> 0
    or (select count(*) from command.food_run_stops) <> 0 or (select count(*) from command.food_run_portions) <> 0
    or (select count(*) from command.food_run_events) <> 0 then
    raise exception 'runner B can read runner A rows';
  end if;
  board := command.get_food_run_board();
  if jsonb_array_length(board->'runs') <> 0 or jsonb_array_length(board->'households') <> 0 then raise exception 'board leaks across runners'; end if;
  if (board->'progress'->>'enrolled')::boolean then raise exception 'runner B looks enrolled'; end if;
  begin
    perform command.get_food_run('10000000-0000-4000-8000-000000000001');
    raise exception 'no error';
  exception when others then
    if sqlerrm <> 'Run not found' then raise exception 'wrong cross-runner read error: %', sqlerrm; end if;
  end;
  result := command.apply_food_run_changes($json$[
    {"key":"steal-0000001","op":"stop.contact","id":"40000000-0000-4000-8000-000000000001","state":"declined"},
    {"key":"steal-0000002","op":"household.save","household":{"id":"20000000-0000-4000-8000-000000000001","label":"Mine now","adults":1}},
    {"key":"steal-0000003","op":"run.save","run":{"id":"10000000-0000-4000-8000-000000000001","title":"Mine now","source_name":"Oak Hill Baptist","pickup_starts_at":"2026-10-03T12:30:00Z","pickup_ends_at":"2026-10-03T13:00:00Z"}},
    {"key":"steal-0000004","op":"run.complete","id":"10000000-0000-4000-8000-000000000001"},
    {"key":"steal-0000005","op":"household.forget","id":"20000000-0000-4000-8000-000000000001"},
    {"key":"steal-0000006","op":"run.delete","id":"10000000-0000-4000-8000-000000000001"}
  ]$json$::jsonb);
  if result->'failed'->0->>'error' <> 'Stop not found' or result->'failed'->1->>'error' <> 'Family not found'
    or result->'failed'->2->>'error' <> 'Run not found' or result->'failed'->3->>'error' <> 'Run not found' then
    raise exception 'cross-runner writes were not refused: %', result;
  end if;
end;
$$;

reset role;
do $$
begin
  if not exists (select 1 from command.food_run_households where id = '20000000-0000-4000-8000-000000000001' and label = 'Rosa M.') then raise exception 'runner B changed or forgot runner A household'; end if;
  if not exists (select 1 from command.food_runs where id = '10000000-0000-4000-8000-000000000001' and title = 'Oak Hill Baptist pickup') then raise exception 'runner B changed or deleted runner A run'; end if;
end;
$$;

-- Anonymous visitors see only the circle totals ----------------------------------
select set_config('request.jwt.claim.sub', '', true) as anon_sub, set_config('request.jwt.claims', '{"role":"anon"}', true) as claims;
set local role anon;

do $$
declare circle jsonb;
begin
  circle := command.get_food_run_circle_week();
  if (circle->>'runs_completed')::integer <> 1 or (circle->>'families_reached')::integer <> 4 or (circle->>'people_fed')::integer <> 13 then
    raise exception 'circle week wrong for anon: %', circle;
  end if;
  begin
    perform 1 from command.food_runs;
    raise exception 'no error';
  exception when insufficient_privilege then null;
  end;
  begin
    perform command.get_food_run_board();
    raise exception 'no error';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- The coordinator tunes the rules and reads network totals -----------------------
reset role;
select set_config('request.jwt.claim.sub', 'c0000000-0000-4000-8000-00000000000c', true) as coordinator,
       set_config('request.jwt.claims', '{"sub":"c0000000-0000-4000-8000-00000000000c","role":"authenticated"}', true) as claims;
set local role authenticated;

do $$
declare rules jsonb; network jsonb;
begin
  rules := command.set_food_run_rules('{"circle_goal":60,"seeds_tough_cap":25}'::jsonb);
  if (rules->>'circle_goal')::integer <> 60 or (rules->>'seeds_tough_cap')::integer <> 25 or (rules->>'seeds_pickup')::integer <> 10 then raise exception 'rules update wrong: %', rules; end if;
  begin
    perform command.set_food_run_rules('{"seeds_pickup":500}'::jsonb);
    raise exception 'no error';
  exception when others then
    if sqlerrm not like 'Field seeds_pickup must be between 0 and 100%' then raise exception 'wrong rule range error: %', sqlerrm; end if;
  end;
  network := command.get_food_run_network(8);
  if jsonb_array_length(network->'weeks') <> 8 then raise exception 'network weeks wrong'; end if;
  if (network->'weeks'->7->>'families')::integer <> 4 or (network->'weeks'->7->>'tough_runs')::integer <> 1 or (network->'weeks'->7->>'runs')::integer <> 1 then raise exception 'network totals wrong: %', network->'weeks'->7; end if;
  if (network->>'enrolled')::integer <> 1 then raise exception 'enrolled count wrong %', network->>'enrolled'; end if;
end;
$$;

-- The worker prunes old receipts but keeps tombstones ----------------------------
reset role;
do $$
declare removed integer; tombstones integer;
begin
  select count(*) into tombstones from command.food_run_events where op in ('household.forget', 'run.delete');
  if tombstones < 3 then raise exception 'expected tombstones for the forgotten families and the deleted run, found %', tombstones; end if;
  alter table command.food_run_events disable trigger food_run_events_append_only;
  update command.food_run_events set created_at = now() - interval '200 days';
  alter table command.food_run_events enable trigger food_run_events_append_only;
  removed := command.prune_food_run_events();
  if removed < 40 then raise exception 'prune removed only % receipts', removed; end if;
  if (select count(*) from command.food_run_events) <> tombstones then raise exception 'prune did not keep exactly the tombstones'; end if;
end;
$$;

select 'food runs acceptance passed' as result;
rollback;
