# Resend transactional email — handprotocol.org setup

**Status (updated 2026-06-19):** ✅ **DNS records ADDED.** `handprotocol.org` was registered in Resend (full-access key obtained) and all four records — DKIM TXT, SPF TXT + MX on `send`, DMARC — were added to the Netlify DNS zone `6a034490d8f0c5ec10542e20`. See §3 for the exact records. **Remaining:** click Verify in Resend, set `EMAIL_FROM`, and set `RESEND_AUDIENCE_ID` (per app — see the multi-app note below). The original "blocked" notes are retained for history.

> **Multi-app sending (IMPORTANT):** Resend free tier = **1 verified domain**. Do NOT add per-app subdomains (e.g. `waterdrop.handprotocol.org`) as separate Resend domains — that exceeds the limit and is unnecessary. The verified `handprotocol.org` can send from any address on it. Separate each app by **from-address + audience**, not domain: e.g. WaterDrop sends as `WaterDrop <updates@handprotocol.org>` to its own Resend **audience** (`RESEND_AUDIENCE_ID` set on the WaterDrop Netlify site). Audiences are the per-app unit; the domain is shared.

**Date:** 2026-06-04
**Goal:** Send transactional email FROM `team@handprotocol.org` (Command Center invites, feedback notifications, "Apply for Command Center" flow) via Resend.

---

## 1. Credentials found (names + locations only — no secret values printed)

| Key name | Location | Notes |
|----------|----------|-------|
| `RESEND_API_KEY` | Netlify site **`handprotocol`** (id `0d46269a-789a-4e42-a00e-7f30e79c5869`), env scope: builds/functions/post_processing/runtime, context: **production** | **Present.** Valid `re_…` key (36 chars). **BUT restricted to send-only** — see boundary below. |
| `RESEND_AUDIENCE_ID` | **Not found anywhere** | Referenced by `netlify/functions/subscribe.js` but not set on either HAND site. The mailing-list signup flow likely fails silently today. |
| `EMAIL_FROM` | **Not found anywhere** | Required by `netlify/functions/_email.js` (transactional helper). Must be set to e.g. `HAND Protocol <team@handprotocol.org>` once the domain verifies. |

Other notes on the hunt:
- **1Password (`op`) CLI:** not installed on this machine (`op: command not found`). Could not check vaults.
- **Repo `.env` / `.env.local` files** (under `/home/koh/Documents/handprotocol`): contain **no** `RESEND*` key names. Checked `command/.env.local`, `command/.env.example`, `salescale/.env.example`, and others.
- **Account-wide scan** (94 Netlify sites under account `cryptokoh`/`koH`): the only `RESEND_API_KEY` lives on the `handprotocol` site.
- Caveat: `netlify env:list --plain --filter handprotocol` returned a *different, smaller* var set than the authoritative `netlify api getEnvVars`. Trust the API. The `RESEND_API_KEY` is real and present.

### Code that consumes these vars
- `netlify/functions/_email.js` — transactional helper. Needs `RESEND_API_KEY` + `EMAIL_FROM`. POSTs to `https://api.resend.com/emails`.
- `netlify/functions/subscribe.js` — mailing list. Needs `RESEND_API_KEY` + `RESEND_AUDIENCE_ID`. Writes to `https://api.resend.com/audiences/{id}/contacts`.
- `netlify/functions/intake.js`, `netlify/functions/feedback.js` — also reference Resend (transactional sends via the helper).

---

## 2. Current DNS state (handprotocol.org on Netlify DNS)

**Zone:** `handprotocol.org` — zone id **`6a034490d8f0c5ec10542e20`** (account `cryptokoh`).

Full record list (only 3 records — a clean slate):

| Type | Hostname | Value |
|------|----------|-------|
| NETLIFY | `handprotocol.org` | `handprotocol.netlify.app` |
| NETLIFY | `www.handprotocol.org` | `handprotocol.netlify.app` |
| NETLIFY | `command.handprotocol.org` | `handprotocol-command.netlify.app` |

**Collision analysis (critical for safe DNS changes):**
- **No MX records** — no inbound mail configured. Resend (send-only) does not need MX; nothing to preserve.
- **No TXT records at all** → **no existing SPF (`v=spf1`)**. Resend's SPF (on the `send.` subdomain) will NOT collide. Even a root TXT addition would be safe today.
- **No existing DKIM, `send.`, `resend`, or `_dmarc` records.**

➡ **Conclusion:** Resend's records can be added with **zero merge risk**. No deletions or modifications to existing records are required.

---

## 3. What I changed in DNS

**Done 2026-06-19.** Added these four records to zone `6a034490d8f0c5ec10542e20` (via `POST /api/v1/dns_zones/{zone}/dns_records`):

| Type | Hostname | Value | Priority |
|------|----------|-------|----------|
| TXT | `resend._domainkey.handprotocol.org` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCk9yKeXJz3ZtwLXEBa9HMFGIfDMSmvCLZRey1vDyDtK4BFs8cStUp6Ntfdu/HflDG6uK6V+Qs5KsAL2dZY4hwj5ewoPp9EV+o1GfOx0kT6sWAkjeM/ts494TbInVd2egB9WQ1O0CKvGmGyjDhlP43egBQUXr8Jc+rVVaI6b6tiyQIDAQAB` (218 chars) | — |
| MX | `send.handprotocol.org` | `feedback-smtp.us-east-1.amazonses.com` | 10 |
| TXT | `send.handprotocol.org` | `v=spf1 include:amazonses.com ~all` | — |
| TXT | `_dmarc.handprotocol.org` | `v=DMARC1; p=none;` | — |

All additive, zero collision with the prior 3 NETLIFY records. Note: modern Resend uses a **TXT** DKIM record (`p=…`) at `resend._domainkey`, not a CNAME. Verify values stored intact via `GET /dns_zones/{zone}/dns_records` before clicking Verify in Resend.

---

## 4. Resend domain status

**Not yet registered.** The domain `handprotocol.org` has not been added to Resend because:

```
POST https://api.resend.com/domains  →  401
{ "name": "restricted_api_key",
  "message": "This API key is restricted to only send emails" }
```

The same restriction blocks `GET /domains`, `GET /audiences`, and domain verify.

---

## 5. THE BOUNDARY — what Russell must do (one step)

The existing `RESEND_API_KEY` is a **send-only restricted key**. It can send email but **cannot create or verify a sending domain** (nor manage audiences). Registering + verifying `handprotocol.org` requires a **full-access** Resend API key.

The Resend account **already exists** (the send-only key is valid), so this is NOT account creation — it's just minting one full-access key.

### Russell, do this:
1. Sign in to **https://resend.com** (the account tied to `cshearer210@gmail.com`).
2. Go to **API Keys → Create API Key**, permission **Full access** (name it e.g. `handprotocol-domain-setup`).
3. Provide that key to the automation (paste it to me in chat, or set it locally so the script below can read it). **Do not commit it to the repo.**

Once the full-access key is available, the remaining work is automated — see §6. After verification succeeds, that temporary full-access key can be deleted; the send-only key already in Netlify env is sufficient for ongoing sends.

---

## 6. Remaining steps — automated once the full-access key exists

These are pre-written so completion is one step. Set the key in the current shell only (never the repo):

```bash
export RESEND_FULL_KEY="re_…full_access_key…"   # paste, do not commit
ZONE=6a034490d8f0c5ec10542e20                    # handprotocol.org zone
```

### 6a. Register the sending domain (US region; pick a region close to Netlify functions)
```bash
curl -s -X POST https://api.resend.com/domains \
  -H "Authorization: Bearer $RESEND_FULL_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"handprotocol.org","region":"us-east-1"}' | python3 -m json.tool
```
The response includes a `id` and a `records[]` array. Each record has `type` (CNAME/TXT/MX), `name` (full hostname), `value`, and for MX a `priority`. **Typical Resend record set:**
- **DKIM** — `CNAME` at `resend._domainkey.handprotocol.org` → `…resend.com` (exact value is per-domain, from the response).
- **SPF (return-path)** — `TXT` at `send.handprotocol.org` → `v=spf1 include:amazonses.com ~all`.
- **SPF MX (return-path)** — `MX` at `send.handprotocol.org` → `feedback-smtp.us-east-1.amazonses.com` priority `10`.
- **(optional) DMARC** — `TXT` at `_dmarc.handprotocol.org` → `v=DMARC1; p=none;` (only if Resend offers/recommends it).

> The DKIM `value` is unique and only known after registration — that is the single reason this could not be fully pre-staged.

### 6b. Add each returned record to Netlify DNS
Run once per record from the response. `hostname` must be the **full** name Resend returns (e.g. `send.handprotocol.org`, `resend._domainkey.handprotocol.org`). Strip any trailing dot from CNAME values.

```bash
# CNAME (DKIM) — repeat for each CNAME in the response
netlify api createDnsRecord --data '{
  "zone_id":"'"$ZONE"'",
  "type":"CNAME",
  "hostname":"resend._domainkey.handprotocol.org",
  "value":"<DKIM_VALUE_FROM_RESPONSE>",
  "ttl":3600
}'

# TXT (SPF on send subdomain)
netlify api createDnsRecord --data '{
  "zone_id":"'"$ZONE"'",
  "type":"TXT",
  "hostname":"send.handprotocol.org",
  "value":"v=spf1 include:amazonses.com ~all",
  "ttl":3600
}'

# MX (return-path on send subdomain) — note priority
netlify api createDnsRecord --data '{
  "zone_id":"'"$ZONE"'",
  "type":"MX",
  "hostname":"send.handprotocol.org",
  "value":"feedback-smtp.us-east-1.amazonses.com",
  "priority":10,
  "ttl":3600
}'

# (optional) DMARC, only if Resend returns it
netlify api createDnsRecord --data '{
  "zone_id":"'"$ZONE"'",
  "type":"TXT",
  "hostname":"_dmarc.handprotocol.org",
  "value":"v=DMARC1; p=none;",
  "ttl":3600
}'
```

> ⚠ **SPF collision guard (future-proofing):** today there is NO root SPF, so the `send.` SPF is safe. If a root `v=spf1` is ever added later, do NOT create a second SPF TXT on the same name — merge includes into one record.

### 6c. Trigger verification (will be `pending` until DNS propagates, then `verified`)
```bash
DOMAIN_ID="<id from 6a>"
curl -s -X POST https://api.resend.com/domains/$DOMAIN_ID/verify \
  -H "Authorization: Bearer $RESEND_FULL_KEY" | python3 -m json.tool
# poll:
curl -s https://api.resend.com/domains/$DOMAIN_ID \
  -H "Authorization: Bearer $RESEND_FULL_KEY" | python3 -m json.tool
```

### 6d. Set the missing app env vars on the `handprotocol` site (after verify)
```bash
# Transactional "from" — required by netlify/functions/_email.js
netlify env:set EMAIL_FROM "HAND Protocol <team@handprotocol.org>" --context production

# Mailing-list audience id — required by netlify/functions/subscribe.js (currently missing)
# Get the audience id with the full key, then set it:
curl -s https://api.resend.com/audiences -H "Authorization: Bearer $RESEND_FULL_KEY" | python3 -m json.tool
# netlify env:set RESEND_AUDIENCE_ID "<uuid>" --context production
```
> The `RESEND_API_KEY` already on the site is send-only — sufficient for `_email.js` transactional sends and `subscribe.js` audience writes (the audience-write scope is included in Resend "sending" keys). If subscribe still fails after setting `RESEND_AUDIENCE_ID`, mint a key with "Sending access" to a specific domain + full audience access.

### 6e. Redeploy so functions pick up the new env, then smoke-test
```bash
netlify deploy --build --prod   # or push to main (auto-deploy)
```

---

## 7. Summary of remaining records still needed

| Record | Type | Hostname | Value | Source |
|--------|------|----------|-------|--------|
| DKIM | CNAME | `resend._domainkey.handprotocol.org` | *(per-domain, from Resend response)* | Resend `POST /domains` |
| SPF | TXT | `send.handprotocol.org` | `v=spf1 include:amazonses.com ~all` | Resend |
| Return-path | MX | `send.handprotocol.org` (priority 10) | `feedback-smtp.<region>.amazonses.com` | Resend |
| DMARC (optional) | TXT | `_dmarc.handprotocol.org` | `v=DMARC1; p=none;` | Resend (if offered) |

All four are **additive** with zero collision against the current 3 NETLIFY records. The exact values come from the `POST /domains` response (§6a) — they cannot be hardcoded ahead of registration.
