/*
  036_wxl_coordinator_gates.sql
  Coordinator-only verification, venue, pilot, subsidy, and external-agent
  certification commands. These gates remain independent by lane.
*/

alter table command.food_verifications add column if not exists idempotency_key text unique;
alter table command.food_contact_channels add column if not exists idempotency_key text unique;

create table if not exists command.food_agent_certifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  agent_principal text not null,
  conformance_version text not null,
  certified_actions text[] not null,
  evidence jsonb not null,
  status text not null check (status in ('certified','suspended','expired','revoked')),
  expires_at timestamptz not null,
  reviewed_by uuid not null references command.profiles(id) on delete restrict,
  review_note text not null,
  idempotency_key text not null unique,
  check (expires_at>created_at)
);

drop trigger if exists food_agent_certifications_immutable on command.food_agent_certifications;
create trigger food_agent_certifications_immutable before update or delete on command.food_agent_certifications for each row execute function command.food_guard_immutable();

create or replace function command.record_food_verification(p_participant_id uuid,p_verification_type text,p_issuer text,p_evidence_status text,p_evidence_reference text,p_expires_at timestamptz,p_review_note text,p_idempotency_key text)
returns command.food_verifications
language plpgsql security definer set search_path=command,public as $$
declare result command.food_verifications;
begin
  if auth.uid() is null or command.current_role()<>'admin' then raise exception 'Coordinator permission is required'; end if;
  insert into command.food_verifications(participant_id,verification_type,issuer,evidence_status,evidence_reference,expires_at,reviewed_by,reviewed_at,review_note,idempotency_key)
  values(p_participant_id,btrim(p_verification_type),btrim(p_issuer),p_evidence_status,nullif(btrim(p_evidence_reference),''),p_expires_at,auth.uid(),now(),btrim(p_review_note),p_idempotency_key)
  on conflict(idempotency_key) do nothing returning * into result;
  if result.id is null then select * into result from command.food_verifications where idempotency_key=p_idempotency_key; return result; end if;
  if p_evidence_status='verified' then
    update command.food_participants set trust_tier=greatest(trust_tier,case when p_verification_type in ('provider_compliance','host_verification','contributor_operational') then 3 when p_verification_type='community_verification' then 2 else trust_tier end) where id=p_participant_id;
  end if;
  return result;
end;
$$;

create or replace function command.review_food_venue(p_venue_id uuid,p_approved boolean,p_review_expires_at timestamptz,p_note text,p_idempotency_key text)
returns command.food_venues
language plpgsql security definer set search_path=command,public as $$
declare result command.food_venues; venue command.food_venues; host command.food_participants; receipt command.food_command_receipts; actor text:=auth.uid()::text;
begin
  if auth.uid() is null or command.current_role()<>'admin' then raise exception 'Coordinator permission is required'; end if;
  select * into receipt from command.food_command_receipts where actor_principal=actor and command_name='review_food_venue' and idempotency_key=p_idempotency_key;
  if receipt.id is not null then select * into result from command.food_venues where id=receipt.resource_id; return result; end if;
  select * into venue from command.food_venues where id=p_venue_id for update;
  select * into host from command.food_participants where id=venue.host_participant_id;
  if venue.id is null then raise exception 'Venue not found'; end if;
  if p_approved and p_review_expires_at<=now() then raise exception 'Approved venue evidence must expire in the future'; end if;
  if p_approved and venue.venue_type='private_home' and (host.trust_tier<3 or not venue.emergency_contact_configured or venue.conduct_agreement_version is null) then raise exception 'Private-home approval requires a T3 host, conduct agreement, and emergency contact'; end if;
  insert into command.food_command_receipts(actor_principal,command_name,idempotency_key,request_hash) values(actor,'review_food_venue',p_idempotency_key,encode(extensions.digest(concat_ws(':',p_venue_id,p_approved,p_review_expires_at,p_note),'sha256'),'hex'));
  update command.food_venues set verification_status=case when p_approved then 'verified' else 'rejected' end,reviewed_by=auth.uid(),reviewed_at=now(),review_expires_at=case when p_approved then p_review_expires_at else null end where id=venue.id returning * into result;
  update command.food_command_receipts set status='completed',resource_type='food_venue',resource_id=result.id,response=jsonb_build_object('id',result.id,'status',result.verification_status) where actor_principal=actor and command_name='review_food_venue' and idempotency_key=p_idempotency_key;
  return result;
end;
$$;

create or replace function command.record_food_contact_channel(p_participant_id uuid,p_channel_type text,p_address_ciphertext bytea,p_address_fingerprint text,p_consent_status text,p_consent_source text,p_language text,p_accessibility_preferences jsonb,p_quiet_hours_start time,p_quiet_hours_end time,p_idempotency_key text)
returns command.food_contact_channels
language plpgsql security definer set search_path=command,public as $$
declare result command.food_contact_channels;
begin
  if auth.uid() is null or command.current_role()<>'admin' then raise exception 'Coordinator permission is required'; end if;
  select * into result from command.food_contact_channels where idempotency_key=p_idempotency_key;
  if result.id is not null then return result; end if;
  if p_channel_type='sms' then raise exception 'SMS contact activation is deferred to the next scope'; end if;
  if p_channel_type not in ('voice','email','web') then raise exception 'Unsupported contact channel'; end if;
  if p_consent_status not in ('opted_in','opted_out') then raise exception 'Explicit consent status is required'; end if;
  insert into command.food_contact_channels(participant_id,channel_type,address_ciphertext,address_fingerprint,verified_at,consent_status,consent_source,consent_recorded_at,language,accessibility_preferences,quiet_hours_start,quiet_hours_end,idempotency_key)
  values(p_participant_id,p_channel_type,p_address_ciphertext,p_address_fingerprint,now(),p_consent_status,btrim(p_consent_source),now(),p_language,coalesce(p_accessibility_preferences,'{}'),p_quiet_hours_start,p_quiet_hours_end,p_idempotency_key)
  on conflict(participant_id,channel_type,address_fingerprint) do update set address_ciphertext=excluded.address_ciphertext,verified_at=excluded.verified_at,consent_status=excluded.consent_status,consent_source=excluded.consent_source,consent_recorded_at=excluded.consent_recorded_at,language=excluded.language,accessibility_preferences=excluded.accessibility_preferences,quiet_hours_start=excluded.quiet_hours_start,quiet_hours_end=excluded.quiet_hours_end,idempotency_key=excluded.idempotency_key
  returning * into result;
  insert into command.food_agent_actions(agent_principal,participant_id,action_type,resource_type,resource_id,request_payload,status,evidence) values(auth.uid()::text,p_participant_id,'record_contact_consent','food_contact_channel',result.id,jsonb_build_object('channel',p_channel_type,'consent',p_consent_status,'idempotency_key',p_idempotency_key),'executed',jsonb_build_object('source',p_consent_source));
  return result;
end;
$$;

create or replace function command.decide_food_lane_readiness(p_lane text,p_stage text,p_decision text,p_volume_ceiling integer,p_incident_contact text,p_evidence jsonb,p_rollback_trigger text,p_next_review_at timestamptz,p_idempotency_key text)
returns command.food_lane_readiness
language plpgsql security definer set search_path=command,public as $$
declare result command.food_lane_readiness;
begin
  if auth.uid() is null or command.current_role()<>'admin' then raise exception 'Coordinator permission is required'; end if;
  if p_decision='go' and (jsonb_typeof(p_evidence)<>'object' or (select count(*) from jsonb_object_keys(p_evidence))<3) then raise exception 'Go decisions require regulatory, safety, and incident evidence'; end if;
  insert into command.food_lane_readiness(lane,geography,stage,decision,volume_ceiling,coordinator_id,incident_contact,evidence,rollback_trigger,decided_by,decided_at,next_review_at)
  values(p_lane,'Austin, Texas',p_stage,p_decision,p_volume_ceiling,auth.uid(),nullif(btrim(p_incident_contact),''),p_evidence,nullif(btrim(p_rollback_trigger),''),auth.uid(),now(),p_next_review_at)
  on conflict(lane,geography) do update set stage=excluded.stage,decision=excluded.decision,volume_ceiling=excluded.volume_ceiling,coordinator_id=excluded.coordinator_id,incident_contact=excluded.incident_contact,evidence=excluded.evidence,rollback_trigger=excluded.rollback_trigger,decided_by=excluded.decided_by,decided_at=excluded.decided_at,next_review_at=excluded.next_review_at
  returning * into result;
  insert into command.food_agent_actions(agent_principal,action_type,resource_type,resource_id,request_payload,status,evidence) values(auth.uid()::text,'decide_lane_readiness','food_lane_readiness',result.id,jsonb_build_object('lane',p_lane,'stage',p_stage,'decision',p_decision,'idempotency_key',p_idempotency_key),'executed',p_evidence);
  return result;
end;
$$;

create or replace function command.create_food_subsidy_campaign(p_name text,p_rules jsonb,p_starts_at timestamptz,p_ends_at timestamptz,p_idempotency_key text)
returns command.food_subsidy_campaigns
language plpgsql security definer set search_path=command,public as $$
declare result command.food_subsidy_campaigns; receipt command.food_command_receipts; actor text:=auth.uid()::text;
begin
  if auth.uid() is null or command.current_role()<>'admin' then raise exception 'Coordinator permission is required'; end if;
  select * into receipt from command.food_command_receipts where actor_principal=actor and command_name='create_food_subsidy_campaign' and idempotency_key=p_idempotency_key;
  if receipt.id is not null then select * into result from command.food_subsidy_campaigns where id=receipt.resource_id; return result; end if;
  insert into command.food_command_receipts(actor_principal,command_name,idempotency_key,request_hash) values(actor,'create_food_subsidy_campaign',p_idempotency_key,encode(extensions.digest(concat_ws(':',p_name,p_rules,p_starts_at,p_ends_at),'sha256'),'hex'));
  insert into command.food_subsidy_campaigns(name,rules,starts_at,ends_at,status,created_by) values(btrim(p_name),p_rules,p_starts_at,p_ends_at,'draft',auth.uid()) returning * into result;
  update command.food_command_receipts set status='completed',resource_type='food_subsidy_campaign',resource_id=result.id,response=jsonb_build_object('id',result.id,'status',result.status) where actor_principal=actor and command_name='create_food_subsidy_campaign' and idempotency_key=p_idempotency_key;
  return result;
end;
$$;

create or replace function command.certify_food_agent(p_agent_principal text,p_conformance_version text,p_certified_actions text[],p_evidence jsonb,p_expires_at timestamptz,p_review_note text,p_idempotency_key text)
returns command.food_agent_certifications
language plpgsql security definer set search_path=command,public as $$
declare result command.food_agent_certifications;
begin
  if auth.uid() is null or command.current_role()<>'admin' then raise exception 'Coordinator permission is required'; end if;
  if p_expires_at>now()+interval '180 days' or p_expires_at<=now() then raise exception 'Agent certification must expire within 180 days'; end if;
  if not (p_evidence ?& array['scope_tests','prompt_injection_tests','retry_tests','location_tests']) then raise exception 'Agent certification evidence is incomplete'; end if;
  insert into command.food_agent_certifications(agent_principal,conformance_version,certified_actions,evidence,status,expires_at,reviewed_by,review_note,idempotency_key)
  values(btrim(p_agent_principal),btrim(p_conformance_version),p_certified_actions,p_evidence,'certified',p_expires_at,auth.uid(),btrim(p_review_note),p_idempotency_key)
  on conflict(idempotency_key) do nothing returning * into result;
  if result.id is null then select * into result from command.food_agent_certifications where idempotency_key=p_idempotency_key; end if;
  return result;
end;
$$;

create or replace function command.food_agent_is_certified(p_agent_principal text,p_actions text[])
returns boolean language sql stable security definer set search_path=command,public as $$
  select coalesce((select status='certified' and expires_at>now() and p_actions<@certified_actions from command.food_agent_certifications where agent_principal=p_agent_principal order by created_at desc limit 1),false);
$$;

create or replace function command.revoke_food_agent_certification(p_agent_principal text,p_reason text,p_idempotency_key text)
returns command.food_agent_certifications
language plpgsql security definer set search_path=command,public as $$
declare prior command.food_agent_certifications; result command.food_agent_certifications;
begin
  if auth.uid() is null or command.current_role()<>'admin' then raise exception 'Coordinator permission is required'; end if;
  select * into prior from command.food_agent_certifications where agent_principal=p_agent_principal order by created_at desc limit 1;
  if prior.id is null then raise exception 'Agent certification was not found'; end if;
  insert into command.food_agent_certifications(agent_principal,conformance_version,certified_actions,evidence,status,expires_at,reviewed_by,review_note,idempotency_key)
  values(p_agent_principal,prior.conformance_version,prior.certified_actions,prior.evidence,'revoked',greatest(now()+interval '1 second',prior.expires_at),auth.uid(),btrim(p_reason),p_idempotency_key)
  on conflict(idempotency_key) do nothing returning * into result;
  if result.id is null then select * into result from command.food_agent_certifications where idempotency_key=p_idempotency_key; return result; end if;
  update command.food_agent_mandates set revoked_at=now(),revoked_by=auth.uid(),revocation_reason='Agent certification revoked: '||btrim(p_reason) where agent_principal=p_agent_principal and revoked_at is null;
  return result;
end;
$$;

alter table command.food_agent_certifications enable row level security;
drop policy if exists food_agent_certifications_admin_read on command.food_agent_certifications;
create policy food_agent_certifications_admin_read on command.food_agent_certifications for select using(command.current_role()='admin');
grant select on command.food_agent_certifications to authenticated;
revoke insert,update,delete on command.food_agent_certifications from anon,authenticated;
revoke execute on function command.record_food_verification(uuid,text,text,text,text,timestamptz,text,text),command.record_food_contact_channel(uuid,text,bytea,text,text,text,text,jsonb,time,time,text),command.review_food_venue(uuid,boolean,timestamptz,text,text),command.decide_food_lane_readiness(text,text,text,integer,text,jsonb,text,timestamptz,text),command.create_food_subsidy_campaign(text,jsonb,timestamptz,timestamptz,text),command.certify_food_agent(text,text,text[],jsonb,timestamptz,text,text),command.revoke_food_agent_certification(text,text,text) from public;
grant execute on function command.record_food_verification(uuid,text,text,text,text,timestamptz,text,text),command.record_food_contact_channel(uuid,text,bytea,text,text,text,text,jsonb,time,time,text),command.review_food_venue(uuid,boolean,timestamptz,text,text),command.decide_food_lane_readiness(text,text,text,integer,text,jsonb,text,timestamptz,text),command.create_food_subsidy_campaign(text,jsonb,timestamptz,timestamptz,text),command.certify_food_agent(text,text,text[],jsonb,timestamptz,text,text),command.revoke_food_agent_certification(text,text,text) to authenticated;
revoke execute on function command.food_agent_is_certified(text,text[]) from public,anon;
grant execute on function command.food_agent_is_certified(text,text[]) to authenticated,service_role;

comment on table command.food_agent_certifications is 'Time-bound conformance and adversarial-security certification for external agent authority.';
