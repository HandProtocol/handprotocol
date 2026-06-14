# Plan — the Develop service ladder (beyond the $75 site)

*Drafted 2026-06-11. Companion to `biz/_plan-field-mode-suggested-leads.md`.*

## Why a ladder

The $75 one-time site is the door-opener, not the business. Once a client is
live (Phase 6, own domain, "Made by HAND" credit) the relationship is the
asset: a small business that trusts HAND, a third of every dollar feeding the
pool, and a worker earning the rest. The ladder turns one-time closes into
recurring relationships without betraying the entry promise (no surprise
upsells; add-ons priced only when they ask, exactly like the pitch script
already does).

## Rungs (in the order we should build them)

**1. Social automation (next).** The truck posts nothing; their Maps photos
and reviews already write the content. A monthly service that drafts and
schedules posts (new menu item, review pull-quote cards, hours changes,
location-of-the-day for movers) to FB/IG using the client's OWN photos with
their standing permission (granted at close, the same permission that puts
photos on the production site). The review pull-quote card generator already
half-exists: the demo template picks and styles quotes. Telegram-first ops:
HandAI drafts, the owner approves with one tap in a chat. Price as a flat
monthly add-on. UBIT posture: same bucket as web services, see the hand-tax
gates before first recurring invoice.

**2. App-style rewards (after social proves retention).** A punch-card PWA on
the client's existing site/domain: "Buy 9 tacos, the 10th is free" as a QR the
truck shows at the window; customer scans, a count ticks up in localStorage +
a tiny backend. No app store, no customer accounts beyond a phone number.
This is the Reciprocate-pattern in miniature: the tooling stays simple,
group-owned, no lock-in (their domain, exportable data). Reuse: the demo
visit beacon plumbing (Netlify function + Supabase table) is the same shape
as a rewards counter. Gate it behind 3+ social clients so we learn retention
mechanics on the cheaper rung first.

**3. Later rungs (parking lot, do not start):** online ordering relays
(Square/Toast referral, not custom), Spanish-first site variants as a paid
toggle, multi-location pages for the La Trailas of the world, photo refresh
visits (a volunteer with a phone, permissioned shots replacing sample art).

## What this changes structurally (do early, cheap)

- **`services` on the lead record.** A lead/client carries which rungs they
  buy: `services: [site, social, rewards]` frontmatter + a Supabase column
  set. The kanban's Closed/YIELD column becomes a client roster with MRR-ish
  rollups. Build when the first social client signs, not before.
- **Permission ledger.** Photo/content permission granted at close must be a
  recorded fact (a line in lead.md `## Notes` + a checkbox in the close flow),
  because social automation republished their photos weekly. One sentence in
  the production handoff covers it.
- **HandAI as the ops surface.** Digest, hot-lead, and nearest-lead already
  live in Telegram; social-draft approval and rewards-stats land in the same
  topic-per-pillar pattern (nerve repo). No new dashboards until Telegram
  stops scaling.
- **Tax gates stay load-bearing.** Every new rung is more UBIT surface; the
  two-gate rule (position memo + TX sales tax registration) from `/hand-tax`
  applies before the FIRST invoice of each new service type, not just the
  first ever.

## Sequencing trigger

Start rung 1 when there are **3 closed clients** (today: 1, Hamburguesas
Emilia). That number means the pitch flow works and gives social automation
real subjects to learn on. Until then, everything above is parked by design.
