# Deck — Handoff

**For: future-koH or anyone picking up `/deck` cold.**
**Last touched:** 2026-05-23

The deck is the public-facing flip-book inspector. It scrolls through every
HAND surface end-to-end with a pop-scroll, transitions between pages with a
loading overlay, and ships per-page feedback into the same kanban + Telegram
thread the operator inspector uses.

---

## What it is

A self-contained tool at `https://handprotocol.org/deck/` that:

- iframes every public page in order (foundation-campaign → … → legacy)
- scrolls the current page ~85% per **Next** click with a brief frame pop
- triggers a cinematic loading overlay (amber HUD, particles, brackets) when
  the current page reaches its bottom, then swaps the iframe to the next page
- captures **exactly where** the user is looking when they open feedback
  (nearest visible H1/H2/H3 or `section[id]`, scroll Y in px + %) and
  attaches that to the pin
- syncs each note to Supabase `command.feedback_pins` and the `🎯 Inspector`
  Telegram topic in real time; falls back to a localStorage retry queue
  that flushes on `online` + `visibilitychange` + a 2.5s / 15s backoff

Aesthetic borrows from `command/public/loading.html` — dark HUD chrome around
the warm-editorial iframe content.

---

## Live URLs

| What | URL |
|---|---|
| Deck | `https://handprotocol.org/deck/` (and `/deck` 301) |
| Feedback function | `https://handprotocol.org/.netlify/functions/feedback` |
| Kanban (where pins land) | `https://command.handprotocol.org/pins` |
| Operator inspector (sibling tool) | `https://command.handprotocol.org/inspector` |
| Telegram topic | `🎯 Inspector` topic id **41** in HAND forum group `-1003939876537` |

---

## File map

| Path | Role |
|---|---|
| `web/deck/index.html` | Shell — iframe stage, HUD, controls, modal, loading overlay, intro toast |
| `web/deck/style.css`  | All styling. Dark HUD chrome + warm iframe. ~1100 lines. |
| `web/deck/main.js`    | Page list, pop-scroll engine, transitions, focal capture, feedback + retry queue |
| `web/deck/HANDOFF.md` | This file |
| `netlify/functions/feedback.js` | POST endpoint → Supabase insert + Telegram sendMessage |
| `web/_redirects`      | Has `/deck → /deck/` 301 |

The deck is **independent** of `command/src/app/(dashboard)/inspector/` —
that's the authenticated operator tool being built in a parallel session.
Both feed the same `command.feedback_pins` table.

---

## Page list (edit in one place)

Top of `web/deck/main.js`:

```js
const PAGES = [
  { path: '/foundation-campaign/', title: 'Foundation Campaign', tag: 'Campaign' },
  { path: '/discovery/',           title: 'Discovery Hub',       tag: 'Hub' },
  // … 9 more
];
```

11 pages currently. Mystic Hearts (`/brief`, `/airstreamstudio`) is excluded
on purpose — they're password-gated and would dead-end the flow.

If you add a new page to the site, add it here in the order you want the
deck to walk through it. The progress bar, dots, counter, and transitions
all derive from this array.

---

## How sync works

```
client (deck modal)
  └── POST /.netlify/functions/feedback
        ├── inserts into command.feedback_pins  (Supabase REST, schema=command)
        └── posts to Telegram sendMessage      (chat_id + message_thread_id=41)
```

Either side effect failing alone does **not** fail the request — the user
still sees "Pinned to inspector ✓" if at least one path succeeds. The client
also keeps the note in `localStorage` (`hand_deck_feedback_v1`) regardless,
and queues failures in `hand_deck_feedback_queue_v1` for retry.

### What the focal capture sends

```json
{
  "text": "the actual note",
  "path": "/foundation-campaign/",
  "title": "Foundation Campaign",
  "name": "anonymous",
  "tags": ["🪄 magic"],
  "focal": {
    "selector": "section#funding > h2.section-title",
    "heading": "Funding goals",
    "fragment": "#funding",
    "scroll_y": 2840,
    "scroll_pct": 0.42,
    "visible_text": ""
  },
  "ts": 1748016000000,
  "vw": 1440, "vh": 900, "ua": "…"
}
```

Stored on the pin as `selector_primary` (the focal selector when present),
`element_context.source = "deck"`, plus the full focal block, scroll, tags,
and viewport.

---

## Env vars (Netlify → `handprotocol` site, production scope)

All five are set in production as of 2026-05-23. The function gracefully
no-ops the half that's unconfigured.

| Var | Source of value |
|---|---|
| `SUPABASE_URL` | `command/.env.local` → `NEXT_PUBLIC_SUPABASE_URL` |
| `SUPABASE_SERVICE_ROLE_KEY` | `command/.env.local` → `SUPABASE_SERVICE_ROLE_KEY` |
| `TELEGRAM_BOT_TOKEN` | `kohlabsAI/nerve/.env` → `HAND_BOT_TOKEN` |
| `FORUM_GROUP_ID` | `kohlabsAI/nerve/.env` → `HAND_FORUM_GROUP_ID` (= `-1003939876537`) |
| `INSPECTOR_TOPIC_ID` | provisioned via nerve script; currently **41** |

Optional: `COMMAND_BASE_URL` (defaults to `https://command.handprotocol.org`)
for the "Open in kanban" link in Telegram messages.

### To re-provision the Telegram topic (if it's deleted or you lose the id)

```bash
cd ~/Documents/kohlabsAI/nerve/agents/hand
set -a && . ~/Documents/kohlabsAI/nerve/.env && set +a
npx tsx src/scripts/setup-inspector-topic.ts
# prints INSPECTOR_TOPIC_ID=<n>
# then on the handprotocol Netlify site:
netlify env:set INSPECTOR_TOPIC_ID -- <n>
netlify deploy --build --prod --message "rotate inspector topic id"
```

### To inspect what's set right now

```bash
cd ~/Documents/handprotocol
netlify env:list --context production
# masked values — add --plain to see them (handle with care)
```

---

## Verifying it works

### Smoke test the function in isolation

```bash
curl -s -X POST https://handprotocol.org/.netlify/functions/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "text":"handoff smoke — ignore",
    "path":"/deck/handoff-smoke",
    "title":"smoke",
    "name":"handoff-bot",
    "tags":["🐛 bug"],
    "focal":{"heading":"Smoke","scroll_pct":0,"scroll_y":0},
    "ts":'"$(date +%s%3N)"',"vw":1440,"vh":900,"ua":"smoke"
  }'
# expected:
#   {"status":"synced","pin":{"id":"…"},"telegram":"pinned"}
```

Failure shapes to recognize:

- `"pin":"supabase-unconfigured"` → Supabase env vars missing on Netlify
- `"telegram":"telegram-unconfigured"` → Telegram env vars missing
- `"pin":"supabase-401"` / `403` → service role key wrong
- `"pin":"supabase-404"` → schema not exposed; check Supabase dashboard
  → Project Settings → API → Exposed schemas includes `command`
- `"telegram":"telegram-400"` → topic id stale; re-provision (see above)

### End-to-end through the UI

1. Open `https://handprotocol.org/deck/`
2. Hit `F` (or click Feedback bottom-left). The focal chip should read
   `Focus: near "<heading>"` matching whatever's near the centre of the iframe.
3. Type a note, hit Send. Status flips to `Pinned to inspector ✓ near "<heading>"`.
4. The pin appears in `https://command.handprotocol.org/pins` (Open column).
5. A `🪶 Deck note` message arrives in the `🎯 Inspector` Telegram topic
   within ~1s.

---

## Smoke entries to clean up

These were created during the wire-up on 2026-05-23 — drop them when you
next triage `/pins`:

- one note labelled `📍 Deck sync smoke test`
- three notes on path `/deck/probe`
- one note labelled `handoff smoke — ignore` (if you run the smoke test above)

---

## Interaction model (so you don't have to re-read main.js)

| Input | Action |
|---|---|
| `Space` / `→` / `PageDown` / **Next** | Scroll iframe ~85% with pop; at bottom → transition to next page |
| `←` / `PageUp` / **Prev** | Scroll back; at top → transition to previous page (lands at its bottom) |
| `F` | Open feedback modal (captures focal at moment of opening) |
| `Home` / `End` | Jump to first / last page |
| `Esc` | Close feedback modal |
| Click any progress dot | Jump to that page |
| `Cmd/Ctrl + Enter` (in textarea) | Send feedback |

Keyboard listeners are bound to **both** parent and iframe `contentDocument`
so Space works even when iframe content has focus.

---

## Tunables (top of `main.js`)

| Constant | Default | What it controls |
|---|---|---|
| `SCROLL_FRAC` | `0.85` | Fraction of viewport scrolled per Next click |
| `SCROLL_DUR` | `520ms` | Smooth-scroll duration |
| `POP_DUR` | `220ms` | Frame pop CSS class duration (must match `.frame.popping` transition) |
| `TRANSITION_MIN` | `740ms` | Minimum loading-overlay visibility |
| `TRANSITION_MAX` | `2400ms` | Bail-out before iframe load completes |
| `AT_BOTTOM_PX` | `14` | Tolerance to count as "at bottom of page" |

If the pop feels too aggressive: lower the CSS `scale(0.992)` in `.frame.popping`
toward `1.0`. If too floaty: shorten `transition: transform 220ms`. The
shadow on `.frame` is intentionally **not** transitioned — transitioning it
caused per-frame paints and the first-click jank.

---

## Known gaps / next moves

- **No screenshot capture.** The focal selector + scroll position is usually
  enough but a thumbnail would make pins instantly recognizable in the kanban.
  Could lift `html2canvas` from `command/` (already a dep there) — be mindful
  of bundle size; deck is currently zero-deps.
- **Page list is hardcoded.** Could read from `web/sitemap.xml` at build time
  (or runtime fetch) so adding a new public page automatically lights up in
  the deck. Tradeoff: lose the curated order + title overrides.
- **No spam protection beyond a honeypot.** If feedback gets abused, add
  Netlify's rate-limit headers or a Turnstile challenge in the modal.
- **Telegram message has no thread-anchor preview.** The kanban link works,
  but a one-line "near `<heading>`" line in the TG message would help triage
  without clicking through. Easy add in `feedback.js → notifyTelegram`.
- **No way to mark a deck note resolved from the deck itself.** Status
  changes happen in `/pins`. That's probably correct — keep the deck purely
  for capture, not management.
- **Mystic Hearts excluded.** If you want to deck-walk those, the deck would
  need to either skip them gracefully on auth failure or carry a session
  cookie through.

---

## Reverting

The deck is fully isolated. To pull it:

```bash
git rm -r web/deck/
git rm netlify/functions/feedback.js
# remove the `/deck → /deck/` line from web/_redirects
git commit -m "remove deck inspector"
```

Then unset the env vars (only `INSPECTOR_TOPIC_ID`, `FORUM_GROUP_ID`,
`TELEGRAM_BOT_TOKEN` are deck-specific; Supabase vars are useful for any
future function):

```bash
netlify env:unset INSPECTOR_TOPIC_ID
netlify env:unset FORUM_GROUP_ID
netlify env:unset TELEGRAM_BOT_TOKEN
netlify deploy --build --prod
```

The pins already created in Supabase will stay — drop them via the kanban
or `delete from command.feedback_pins where element_context->>'source' = 'deck';`

---

## Quick reopen checklist

When you come back to this:

1. `cd ~/Documents/handprotocol && git pull`
2. `open https://handprotocol.org/deck/` — does it still scroll?
3. Hit F, send a test note — does it land in the kanban + Telegram?
4. If sync is broken: run the smoke curl above, check `--plain` env list,
   re-deploy if env was lost.
5. If the topic is gone: re-provision (see env section).
