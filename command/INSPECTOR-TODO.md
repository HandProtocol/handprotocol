# Inspector + Telegram — Punch List

Status of the UX inspector + Telegram notifier ship. Both halves are scaffolded; this is what's left for you to wire up.

## What shipped

### Command center (`handprotocol/command/`)
- `supabase/migrations/015_feedback_pins.sql` — `command.feedback_pins` table + RLS + `updated_at` trigger
- `src/app/(dashboard)/inspector/page.tsx` + `src/components/inspector/*` — iframe-based pin tool (1025 LOC port of nored inspector)
- `src/app/(dashboard)/pins/page.tsx` + `src/components/pins/pins-kanban.tsx` — triage kanban with drag-to-status
- `src/app/proxy/web/[[...path]]/route.ts` — proxy that strips `X-Frame-Options` + CSP `frame-ancestors` so the public site can render inside the iframe; injects `<base href>` for relative URLs
- `src/lib/inspector/{types,queries,actions,notify}.ts` — server actions; `notify.ts` POSTs to Telegram on pin create
- `src/components/sidebar-nav.tsx` — Inspector + Pins entries added under the D pillar
- `package.json` — `html2canvas` added (run `npm install`)

### Telegram (`kohlabsAI/nerve/agents/hand/`)
- `src/forum/topics.ts` — `inspector` added to `TOPIC_KEYS` so provisioning is idempotent on next boot
- `src/format/telegram.ts` — `inspectorPinHtml()` for poll-path messages
- `src/schedules/inspector-pins.ts` — 5-min backup poller; gracefully handles missing table (PG 42P01)
- `src/scripts/setup-inspector-topic.ts` — one-shot topic provisioner, checks Redis cache first
- `package.json` — `setup:inspector-topic` script
- `.env.example` — `INSPECTOR_TOPIC_ID` line added

## What you need to do

### 1. Apply the Supabase migration
```bash
cd /home/koh/Documents/handprotocol/command
supabase db push
# or paste 015_feedback_pins.sql into the Supabase SQL editor
```

### 2. Install the new dep and boot the dev server
```bash
cd /home/koh/Documents/handprotocol/command
npm install
npm run dev
```

### 3. Provision the Telegram topic
The HAND bot is already in the forum group with admin + Manage Topics rights (your existing setup). Run:
```bash
cd /home/koh/Documents/kohlabsAI/nerve/agents/hand
npx tsx src/scripts/setup-inspector-topic.ts
# or from nerve root: npm --workspace @kohlabsai/agent-hand run setup:inspector-topic
```
This prints an `INSPECTOR_TOPIC_ID` (a positive integer). You'll see a new **🎯 Inspector** topic appear in the HAND forum group.

### 4. Wire env vars

**`handprotocol/command/.env.local`** (and Netlify build env):
```
TELEGRAM_BOT_TOKEN=<same value as HAND_BOT_TOKEN in nerve/.env>
FORUM_GROUP_ID=<same negative ID from nerve/.env>
INSPECTOR_TOPIC_ID=<from step 3>
NEXT_PUBLIC_COMMAND_BASE_URL=https://command.handprotocol.org   # optional; defaults already
```

**`kohlabsAI/nerve/.env`** — already has `HAND_BOT_TOKEN`, `FORUM_GROUP_ID`, `COMMAND_SUPABASE_*`. No new vars needed (the poller reads topic ID from Redis cache after step 3).

### 5. Restart the HAND agent
So the new `inspector-pins` schedule registers and the topic ID loads.

## Smoke test

1. Visit `http://127.0.0.1:3000/inspector` in the dashboard
2. Select **Foundation Campaign** from the page dropdown
3. Click **Inspect**, click on any element in the iframe, type a comment, set priority to **Critical**, click **Pin it**
4. Within ~1s a Telegram message lands in the 🎯 Inspector topic with a link back to `/pins?pin=<id>`
5. Visit `/pins` — the pin is in the Open column. Drag to In Progress — status updates. Click it — jumps back to inspector pre-selected at that pin
6. (Optional) Test the backup poller: insert a pin directly via SQL — within 5 min it should also land in Telegram

## Known gaps + deferred items

- **Screenshot storage** — currently stored as inline base64 data URLs in the `screenshot_url` column. Fine for v1; if you start pinning heavily, create a Supabase Storage bucket `feedback-screenshots` and upload there
- **Mobile bottom-sheet** — the noredFarms mobile UX wasn't ported. Desktop only for now
- **Style mismatch** — sync-path notifications use `· • ▲ ‼` priority badges; backup-poller uses `🎯 / 🚨`. Pick one if you care; both work
- **Page list is hardcoded** — the inspector dropdown enumerates `web/` subdirs as of this session. Add new pages by editing `src/app/(dashboard)/inspector/page.tsx` (or read them dynamically from `sitemap.xml` — TODO)
- **Iframe links navigate cross-origin** — if you click a real link inside an inspected page, the iframe leaves the proxy. Inspect-mode traps clicks while active; re-select the page from the dropdown to re-anchor
- **No retries on Telegram failures** — if Telegram is down when a pin is created, the message is lost. The kanban is the source of truth; pins still land in Supabase
