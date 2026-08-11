/* Run after migrations 024 through 041 on a nonproduction database. */
begin;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'food_needs','food_supplies','food_match_candidates','food_match_holds',
    'food_commitments','food_locations','food_payment_orders','food_events',
    'food_agent_actions','food_policy_decisions','food_outbox'
  ] loop
    if has_table_privilege('authenticated','command.'||table_name,'insert')
      or has_table_privilege('authenticated','command.'||table_name,'update')
      or has_table_privilege('authenticated','command.'||table_name,'delete') then
      raise exception 'authenticated retains a direct write privilege on %',table_name;
    end if;
  end loop;
end;
$$;

do $$
begin
  if has_table_privilege('anon','command.food_locations','select') then raise exception 'anon can select private locations'; end if;
  if has_table_privilege('anon','command.food_payment_orders','select') then raise exception 'anon can select payment orders'; end if;
  if has_function_privilege('authenticated','command.lease_food_outbox(text,text[],integer,integer)','execute') then raise exception 'authenticated can lease worker jobs'; end if;
  if has_function_privilege('authenticated','command.complete_food_match_run(uuid,text,text,jsonb,text,jsonb,jsonb,jsonb)','execute') then raise exception 'authenticated can persist optimizer output'; end if;
  if not has_function_privilege('service_role','command.record_food_stripe_event(text,text,text,jsonb)','execute') then raise exception 'service role cannot reconcile Stripe events'; end if;
end;
$$;

do $$
begin
  if not command.food_lifecycle_transition_allowed('draft','verified') then raise exception 'draft to verified must be allowed'; end if;
  if command.food_lifecycle_transition_allowed('draft','fulfilled') then raise exception 'draft to fulfilled must be blocked'; end if;
  if command.food_lifecycle_transition_allowed('incident_hold','in_fulfillment') then raise exception 'incident hold movement must be blocked'; end if;
end;
$$;

rollback;
