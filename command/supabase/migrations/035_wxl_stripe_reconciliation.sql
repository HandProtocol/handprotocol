/*
  035_wxl_stripe_reconciliation.sql
  Idempotent, order-independent processing of verified Stripe events.
*/

create or replace function command.record_food_stripe_event(p_event_id text,p_event_type text,p_object_id text,p_payload jsonb)
returns command.food_stripe_events
language plpgsql security definer set search_path=command,public as $$
declare result command.food_stripe_events; object jsonb:=p_payload#>'{data,object}'; metadata jsonb; order_id uuid; donation_id uuid; participant_id uuid; payment command.food_payment_orders; donation command.food_donations; balance bigint; debit bigint;
begin
  if current_user not in ('postgres','service_role') then raise exception 'Payment processor permission is required'; end if;
  insert into command.food_stripe_events(stripe_event_id,event_type,object_id,payload,signature_verified)
  values(p_event_id,p_event_type,p_object_id,p_payload,true)
  on conflict(stripe_event_id) do nothing returning * into result;
  if result.id is null then select * into result from command.food_stripe_events where stripe_event_id=p_event_id; return result; end if;
  metadata:=coalesce(object->'metadata','{}');
  order_id:=nullif(metadata->>'food_payment_order_id','')::uuid;
  donation_id:=nullif(metadata->>'food_donation_id','')::uuid;
  participant_id:=nullif(metadata->>'food_participant_id','')::uuid;
  if order_id is null then select id into order_id from command.food_payment_orders where stripe_payment_intent_id in (nullif(object->>'id',''),nullif(object->>'payment_intent','')) or stripe_charge_id in (nullif(object->>'id',''),nullif(object->>'charge','')) limit 1; end if;
  if donation_id is null then select id into donation_id from command.food_donations where stripe_payment_intent_id in (nullif(object->>'id',''),nullif(object->>'payment_intent','')) limit 1; end if;
  if order_id is not null then
    select * into payment from command.food_payment_orders where id=order_id for update;
    if payment.id is null then raise exception 'Stripe event references an unknown payment order'; end if;
    if p_event_type='payment_intent.amount_capturable_updated' and payment.status in ('created','authorization_pending') then update command.food_payment_orders set status='authorized',stripe_payment_intent_id=object->>'id',authorized_at=now() where id=payment.id;
    elsif p_event_type='payment_intent.succeeded' and payment.status not in ('refunded','disputed') then update command.food_payment_orders set status='captured',stripe_payment_intent_id=object->>'id',stripe_charge_id=nullif(object->>'latest_charge',''),captured_at=now() where id=payment.id;
    elsif p_event_type='payment_intent.payment_failed' and payment.status in ('created','authorization_pending') then update command.food_payment_orders set status='failed',stripe_payment_intent_id=object->>'id' where id=payment.id;
    elsif p_event_type='charge.refunded' then update command.food_payment_orders set status='refunded',stripe_charge_id=object->>'id' where id=payment.id;
    elsif p_event_type='charge.dispute.created' then update command.food_payment_orders set status='disputed',stripe_charge_id=object->>'charge' where id=payment.id;
    end if;
    update command.food_commitments set payment_state=case when p_event_type='payment_intent.amount_capturable_updated' then 'authorized' when p_event_type='payment_intent.succeeded' then 'captured' when p_event_type='charge.refunded' then 'refunded' when p_event_type='charge.dispute.created' then 'disputed' when p_event_type='payment_intent.payment_failed' then 'failed' else payment_state end where id=payment.commitment_id;
  elsif donation_id is not null then
    select * into donation from command.food_donations where id=donation_id for update;
    if donation.id is null then raise exception 'Stripe event references an unknown donation'; end if;
    if p_event_type in ('payment_intent.succeeded','charge.refunded','charge.dispute.created') then
      if not exists(select 1 from command.food_subsidy_ledger where donation_id=donation.id and entry_type='donation_credit') then
        perform 1 from command.food_subsidy_campaigns where id=donation.campaign_id for update;
        select coalesce((select balance_after_cents from command.food_subsidy_ledger where campaign_id=donation.campaign_id order by created_at desc,id desc limit 1),0) into balance;
        insert into command.food_subsidy_ledger(campaign_id,donation_id,entry_type,amount_cents,balance_after_cents,reason,actor_principal,idempotency_key) values(donation.campaign_id,donation.id,'donation_credit',donation.amount_cents,balance+donation.amount_cents,'Verified donation payment','stripe:'||p_event_id,'stripe-donation-credit:'||donation.id);
      end if;
      if p_event_type in ('charge.refunded','charge.dispute.created') and not exists(select 1 from command.food_subsidy_ledger where donation_id=donation.id and entry_type='adjustment_debit') then
        select balance_after_cents into balance from command.food_subsidy_ledger where campaign_id=donation.campaign_id order by created_at desc,id desc limit 1;
        debit:=least(balance,donation.amount_cents);
        insert into command.food_subsidy_ledger(campaign_id,donation_id,entry_type,amount_cents,balance_after_cents,reason,actor_principal,idempotency_key) values(donation.campaign_id,donation.id,'adjustment_debit',-debit,balance-debit,case when p_event_type='charge.refunded' then 'Donation refunded' else 'Donation disputed' end,'stripe:'||p_event_id,'stripe-donation-debit:'||donation.id);
      end if;
      update command.food_donations set status=case when p_event_type='payment_intent.succeeded' and status not in ('refunded','disputed') then 'succeeded' when p_event_type='charge.refunded' then 'refunded' when p_event_type='charge.dispute.created' then 'disputed' else status end,stripe_payment_intent_id=coalesce(stripe_payment_intent_id,nullif(object->>'payment_intent',''),nullif(object->>'id','')) where id=donation.id;
    elsif p_event_type='payment_intent.payment_failed' then update command.food_donations set status='failed',stripe_payment_intent_id=object->>'id' where id=donation.id and status='pending';
    end if;
  elsif p_event_type='account.updated' and participant_id is not null then
    update command.food_participants set stripe_account_id=case when coalesce((object->>'charges_enabled')::boolean,false) and coalesce((object->>'payouts_enabled')::boolean,false) then object->>'id' else null end where id=participant_id;
  end if;
  update command.food_stripe_events set processed_at=now() where id=result.id returning * into result;
  return result;
exception when others then
  update command.food_stripe_events set processing_error=sqlerrm where stripe_event_id=p_event_id returning * into result;
  return result;
end;
$$;

revoke execute on function command.record_food_stripe_event(text,text,text,jsonb) from public,anon,authenticated;
grant execute on function command.record_food_stripe_event(text,text,text,jsonb) to service_role;
