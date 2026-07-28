# WXL:FOOD deployment

## Target

- Host: `wxl.handprotocol.org`
- Netlify site: `wxl-food`, id `56ee91bf-bf15-472d-8c1c-d6c30af05d6c`
- Netlify base directory: `wxl`
- Build command: `npm run build`
- Publish directory: `dist`

## Environment

Set these variables on the WXL:FOOD Netlify site:

```text
VITE_SUPABASE_URL=https://<HAND project ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<HAND anon key>
```

The browser receives only the anon key. The service-role key stays in the HAND Command Center and is never added to WXL:FOOD.

In the HAND Supabase dashboard, open **Authentication > Sign In / Providers > Email** and turn off **Confirm email**. WXL signup expects `signUp` to return a session immediately. The client then opens `/app/`; standard `username`, `new-password`, and form-submit metadata lets the member's browser offer to save the credentials locally.

In **Authentication > URL Configuration**, set:

```text
Site URL: https://wxl.handprotocol.org
Redirect URL: https://wxl.handprotocol.org/app/?mode=recovery
Redirect URL: http://localhost:5173/app/?mode=recovery
```

The production recovery URL must appear exactly in the redirect allowlist. Otherwise Supabase can fall back to its default Site URL, which is commonly `http://localhost:3000`.

If the recovery email template was customized, keep `{{ .ConfirmationURL }}` as the link target. A manually constructed link must use `{{ .RedirectTo }}`, not `{{ .SiteURL }}`, so the `redirectTo` value supplied by WXL is preserved.

The `FOOD IS HERE!` operations email hook also reads these server-side values:

```text
RESEND_API_KEY
EMAIL_FROM
EMAIL_TO_OPS
WXL_RESEND_AUDIENCE_ID
```

`EMAIL_FROM` should use the existing verified `handprotocol.org` domain, for example `WXL:FOOD <alerts@handprotocol.org>`. The function falls back to HAND's existing `RESEND_NOTIFY_FROM`, `RESEND_NOTIFY_TO`, and `RESEND_FORWARD_TO` names when present. Do not add a Resend key to any `VITE_` variable.

The email-only WXL updates form uses `RESEND_API_KEY` and `WXL_RESEND_AUDIENCE_ID` to add contacts to a Resend audience without creating Supabase accounts. If `WXL_RESEND_AUDIENCE_ID` is absent, it falls back to `RESEND_AUDIENCE_ID`. Use a WXL-specific audience when available so platform updates and future offerings can be managed separately. Audience emails must retain Resend's unsubscribe link.

The feedback panel posts to `https://handprotocol.org/.netlify/functions/feedback` by default. That HAND site function writes the durable Command Center record and sends the operations notification. Keep `EMAIL_TO_OPS=handprotocol@gmail.com` on the HAND Netlify site. `VITE_FEEDBACK_ENDPOINT` may override the shared endpoint for local or staging tests.

If WXL does not have its own Resend variables, the function forwards the authenticated alert to HAND's shared feedback endpoint. That endpoint provides the existing Command Center, Telegram, and Resend notification fan-out without exposing a key to WXL.

## Routing

- `/` is the WXL landing page.
- `/app/` is the WXL:FOOD command center.
- The SPA fallback is defined in `netlify.toml` and `public/_redirects`.

## Database

Apply these migrations to the HAND Supabase project in order, then add `command` to the project's exposed schemas if it is not already present:

```text
../command/supabase/migrations/024_wxl_food.sql
../command/supabase/migrations/025_wxl_community_map_alerts.sql
../command/supabase/migrations/026_wxl_profile_readiness.sql
../command/supabase/migrations/027_wxl_request_coordination.sql
../command/supabase/migrations/028_wxl_rescue_operations.sql
../command/supabase/migrations/029_wxl_contributor_readiness.sql
../command/supabase/migrations/030_wxl_harvest_runs.sql
../command/supabase/migrations/031_wxl_inventory.sql
../command/supabase/migrations/032_wxl_coordination_core.sql
../command/supabase/migrations/033_wxl_channels_payments_events.sql
../command/supabase/migrations/034_wxl_protocol_commands.sql
../command/supabase/migrations/035_wxl_agent_protocols.sql
../command/supabase/migrations/036_wxl_coordinator_gates.sql
../command/supabase/migrations/037_wxl_compost_returns.sql
../command/supabase/migrations/038_wxl_compost_route_gate.sql
../command/supabase/migrations/039_wxl_compost_trigger_permissions.sql
../command/supabase/migrations/040_wxl_food_dropoffs.sql
```

After migration 026, verify that no auth account is missing the profile row required by WXL food-record foreign keys:

```sql
select users.id, users.email
from auth.users as users
left join command.profiles as profiles on profiles.id = users.id
where profiles.id is null;
```

The query must return zero rows. Then create a new test account and confirm that its `command.profiles` row is created automatically before testing food writes.

After migration 027, verify that persisted request counters agree with their source records:

```sql
select
  requests.id,
  requests.responses_count,
  (select count(*) from command.food_request_messages where request_id = requests.id) as actual_responses,
  requests.supporters_count,
  (select count(*) from command.food_request_supporters where request_id = requests.id) as actual_supporters,
  requests.offers_count,
  (select count(*) from command.food_request_offers where request_id = requests.id and status <> 'withdrawn') as actual_offers
from command.food_requests as requests
where requests.responses_count <> (select count(*) from command.food_request_messages where request_id = requests.id)
   or requests.supporters_count <> (select count(*) from command.food_request_supporters where request_id = requests.id)
   or requests.offers_count <> (select count(*) from command.food_request_offers where request_id = requests.id and status <> 'withdrawn');
```

The query must return zero rows. Use two non-production test accounts to verify that the request owner can decide an offer, the offer author can withdraw a separate proposed offer, and neither account can perform the other account's protected action.

After migration 028, verify that the rescue tables have row-level security enabled:

```sql
select relname, relrowsecurity
from pg_class
where oid in (
  'command.food_rescues'::regclass,
  'command.food_rescue_checkpoints'::regclass,
  'command.food_rescue_events'::regclass
)
order by relname;
```

All three rows must return `true`. Then use separate non-production creator, Contributor, and administrator accounts to verify:

1. The creator submits a future rescue, sees `awaiting_review`, and cannot approve it.
2. The administrator cannot approve without a note and explicit safety confirmation, then can publish the rescue.
3. Anonymous and unrelated member sessions see only the privacy-safe fields returned by `list_food_rescues()`.
4. Two Contributor sessions attempt to claim the same rescue. Exactly one claim succeeds.
5. Only the creator, assigned Contributor, and administrator can read private run instructions.
6. The assigned Contributor records pickup and delivery. The creator or administrator records acceptance.
7. A failed temperature or handling checkpoint enters `incident_hold` and cannot continue through the normal path.
8. Only an administrator can resolve the hold as rejected or cancelled, and the event history records the outcome.
9. Release and cancellation clear assignment data and preserve an audit event.

Do not enable unsupervised claiming for real runs until approved Contributor eligibility is enforced in the claim function and the operating gates in `docs/DELIVERY-READINESS.md` have passed.

After migration 029, verify Contributor privacy and operational claim eligibility with separate non-production accounts:

1. A member submits readiness information and can read their own private record, but another member cannot.
2. Self-editing an approved record returns it to `submitted` and clears the earlier run classes and training approval.
3. Only an administrator can approve, decline, or suspend readiness.
4. Approval fails without a current training expiry, a run class, and required equipment for chilled, frozen, or hot runs.
5. An unapproved member cannot claim any rescue. An administrator without an approved Contributor record also cannot claim.
6. An approved Contributor can claim only matching run classes.
7. An expired training or credential date blocks a new claim.
8. Suspension blocks a new claim immediately, and review history records the decision.
9. Private phone, emergency contact, accessibility, training, and equipment fields are absent from anonymous and unrelated-member reads.

Migration 029 enforces core rescue-claim eligibility. Migration 030 adds reviewed route-level matching and assignment.

After migration 030, use administrator, approved Contributor, unrelated member, and second Contributor sessions to verify:

1. Only an administrator can create plans, add stops, assign, cancel before start, or resolve a run incident.
2. Exact stop order, instructions, rescue identifiers, and route details are readable only by the assigned Contributor and administrators.
3. Rescue-linked stop windows outside the rescue or run window are rejected.
4. Assignment fails for expired training or credentials, missing run classes or equipment, the wrong vehicle, insufficient exact-unit capacity, insufficient lifting limit, or unconfirmed availability and service area.
5. A rescue cannot belong to two active runs, and successful assignment atomically reserves every linked rescue for the selected Contributor.
6. Start check-in is rejected earlier than 30 minutes before the run and rechecks approval through the scheduled end.
7. Stops must receive outcomes in order. Linked pickup and delivery completion requires the corresponding rescue safety checkpoint first.
8. A stop incident holds the run and linked rescue. Only an administrator can record whether the run resumes or closes.
9. A run cannot complete until every stop is completed or explicitly skipped with evidence.
10. Cancellation before pickup releases only the run's eligible rescue claims, and event history preserves every transition.

The partner pilot remains blocked on notifications, acknowledgement and overdue escalation, offline retry behavior, approved operating runbooks, and supervised rehearsal evidence.

After migration 031, use administrator and unrelated-member sessions plus two concurrent administrator windows to verify:

1. Only an administrator can view storage locations, allocations, condition checks, and the ledger.
2. A lot cannot be created before rescue acceptance, without a passing acceptance checkpoint, with zero accepted quantity, or more than once per rescue.
3. Received quantity exactly matches the acceptance checkpoint and cannot be overridden from the browser.
4. Temperature-controlled lots require valid server-enforced bounds. Condition checks outside those bounds place the lot on hold.
5. Two concurrent reservations cannot exceed unreserved stock, even when submitted together.
6. Fulfillment reduces on-hand and reserved quantities exactly once. Cancellation releases reserved quantity without changing physical stock.
7. Cancelling a reservation does not release a safety hold. Hold release fails until a newer passing condition check exists.
8. Held or expired inventory cannot be fulfilled. Allocations cannot extend beyond the lot use-by time.
9. Discard cannot consume reserved quantity and always requires a documented reason.
10. For every lot, ledger `balance_after` and `reserved_after` equal the current lot values after the latest event, and no balance is negative.

Inventory code does not yet provide automated expiry, recall quarantine, lot transfer, cycle count, or disposal approval. Those controls remain required before warehousing real food.

## Domain

The Netlify site `wxl-food` is configured with `wxl.handprotocol.org` as its primary custom domain. Netlify provisioned SSL and manages the DNS record for the existing `handprotocol.org` zone. The current deployment is live at `https://wxl.handprotocol.org`.
