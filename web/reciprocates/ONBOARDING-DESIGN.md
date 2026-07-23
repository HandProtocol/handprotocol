# Reciprocates dual-mode onboarding — design doc

Companion to `web/reciprocates/index.html`. Scope: extend the existing single-form intake into two equal paths (formal form, conversational chat) that capture the same Reciprocate intake schema and persist to Supabase.

Authored 2026-05-19. Register: brand. Implementer should also read `PRODUCT.md`, `DESIGN.md`, and the existing `web/reciprocates/{index.html,main.js,style.css}` before starting.

---

## 1. Premise

The current Reciprocates page (`web/reciprocates/index.html`) opens with three "who fits" cards (impact entrepreneur / local business / grassroots), a "what HAND can actually do" block, and an intake card with variant tabs over a shared form. The form posts to `netlify/functions/intake.js` which sends a Resend notification email and adds the contact to a Resend audience.

This works for people who know what they want to say. It fails everyone else: the field-by-field interrogation is a high cognitive cost for someone whose work is hard to summarize in a single sentence. We need a second on-ramp that meets that person where they are.

Two paths, presented equally:

- **Submit your project.** The current form, polished. Best when the founder already has the language.
- **Chat about your project.** An LLM intake assistant that asks one or two warm questions at a time, listens, and quietly fills the same structured fields behind the scenes.

Both end in the same place: a real reply from HAND within five business days, and a row in `projects` in Supabase. The chat is not a downgrade or a fallback. It is the equal-weighted second door.

## 2. Information architecture

The page sections stay in the same order. The intake section (currently `#intake`) is the only one that changes shape.

```
nav
  ↓
rec-hero (unchanged)
  ↓
who-fits (unchanged, three cards)
  ↓
what-we-do (unchanged, three commitment levels)
  ↓
intake                           ←  CHANGES
  ├─ section header (lighter copy, see §3)
  ├─ mode picker (two equal cards, see §3)
  ├─ intake-card                 ←  contents swap
  │    ├─ #mode-form  (the form, polished, see §5)
  │    └─ #mode-chat  (chat layout, see §4)
  └─ a small "Switch to [other]" link sits above the active mode
  ↓
next (what happens after you send, unchanged)
  ↓
quiet-cta (unchanged)
  ↓
footer (unchanged)
```

The mode picker disappears once a mode is chosen; the "Switch to [other]" link takes its place. Switching is symmetric and instant. A draft token in localStorage (see §7) carries answers from one mode to the other.

### Variant vs mode

Two orthogonal axes. Don't conflate them.

- **Variant** (business / local_business / grassroots) = who the user is. Form mode asks up front; chat mode infers from the conversation.
- **Mode** (form / chat) = how they want to engage.

This means there is no separate chat for entrepreneurs or form for local businesses. One chat works for all three variants; one form has all three variant panels.

## 3. Mode-switcher UX

### Initial state: section header + two cards

Replace the current intake section header and the single intake card with:

```
─── Section eyebrow (mono): Reach out ─────────────────────────────────

   Start the conversation.

   Two ways in. Both end with the same real reply from HAND.

   ┌──────────────────────────────────┐  ┌──────────────────────────────────┐
   │  Submit your project             │  │  Chat about your project         │
   │  ──                              │  │  ──                              │
   │                                  │  │                                  │
   │  A short structured form.        │  │  A real conversation. We ask     │
   │  Pick the closest match, fill    │  │  one or two questions at a time. │
   │  the fields, send. About ten     │  │  Take as long as you need.       │
   │  minutes.                        │  │                                  │
   │                                  │  │  Best when it's easier to        │
   │  Best when you already have      │  │  explain in your own words than  │
   │  the language for the work.      │  │  to fill a field.                │
   │                                  │  │                                  │
   │              [ Open the form → ] │  │            [ Start chatting → ]  │
   └──────────────────────────────────┘  └──────────────────────────────────┘

   Both paths reach the same person. We'll write back within five business days.
```

Use the existing `.who-card` family from earlier in the page as the visual template (`--radius-lg`, soft `--color-border`, hover lifts `-2px`). No icons (keeps the typographic register). Same width, same internal padding (`--space-2xl`), same CTA placement. Equal visual gravity is the whole point.

### After a mode is chosen

The two-card grid collapses to a slim header above the active mode:

```
─── Mode: Chat about your project   ←→ Switch to form  ─────────────────

[ chat layout ]
```

The "Switch to [other]" is a small `<button>` styled as a quiet link with the existing arrow-translate hover, not a button-button. It is destructive of in-progress state only if the user has typed nothing. Once a draft exists, the switch carries the draft over and surfaces a short toast in the receiving mode: *"Brought your answers over. Edit anything you like."*

### JS-off fallback

Each mode card is a real `<a href="#mode-form">` / `<a href="#mode-chat">` link. Both targets exist as `<section>` elements in the DOM. With JS off:

- `#mode-form` shows the form unchanged. It still POSTs to `intake.js`.
- `#mode-chat` shows a short fallback panel: *"Chat needs JavaScript to be on. The form below works just as well, or email hand@handprotocol.org and we'll have the same conversation by email."* with the form duplicated below.

With JS on, the upgrade hides one mode at a time and adds the switcher link.

## 4. Chat experience

### 4.1 Layout — desktop wide (≥980px)

Two-column inside the intake card. Left column carries the conversation; right column is the captured-fields panel.

```
┌─ Mode: Chat about your project   ←→ Switch to form ──────────────────────────┐
│                                                                              │
│ ┌─ Conversation ────────────────────────────┐ ┌─ What HAND is hearing ─────┐│
│ │                                            │ │                            ││
│ │  HAND ASSISTANT                            │ │  Variant                   ││
│ │  Hi. I'm an intake assistant. What you     │ │  ─                         ││
│ │  write here goes to a real person at HAND, │ │  (not yet)                 ││
│ │  who'll reply within five business days.   │ │                            ││
│ │  My job is just to help you tell the story │ │  About you                 ││
│ │  first. What are you building?             │ │  ─                         ││
│ │                                            │ │  Name      —               ││
│ │                              ┌─ You ────┐  │ │  Email     —               ││
│ │                              │ I run a  │  │ │  Location  —               ││
│ │                              │ peer-    │  │ │                            ││
│ │                              │ support  │  │ │  About the work            ││
│ │                              │ app for  │  │ │  ─                         ││
│ │                              │ new moms │  │ │  Name      —               ││
│ │                              │ in       │  │ │  What it   —               ││
│ │                              │ Austin.  │  │ │  does                      ││
│ │                              └──────────┘  │ │  LLC       —               ││
│ │                                            │ │  status                    ││
│ │  HAND ASSISTANT                            │ │                            ││
│ │  Lovely. Peer support is exactly the kind  │ │  Signals                   ││
│ │  of long-arc work HAND was built for. Is   │ │  ─                         ││
│ │  there an LLC formed yet, or are you       │ │  (none yet)                ││
│ │  pre-formation?                            │ │                            ││
│ │                                            │ │  Story                     ││
│ │  • • •                                     │ │  ─                         ││
│ │                                            │ │  (building from chat...)   ││
│ │                                            │ │                            ││
│ │                                            │ │  ─                         ││
│ │                                            │ │  [ View as form ↗ ]        ││
│ │                                            │ │  All answers carry over    ││
│ └────────────────────────────────────────────┘ └────────────────────────────┘│
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ Type a message...                                                         │ │
│ │                                                                           │ │
│ │                                                          [ Send  →  ]     │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│ ⌘+enter to send · esc to clear                                                │
└──────────────────────────────────────────────────────────────────────────────┘
```

Proportions: conversation column 60%, captured-fields panel 40%, gap `--space-2xl`. Card max-width `--container-wide` (1040px) so the chat doesn't sprawl on huge monitors.

### 4.2 Layout — narrow (<980px) and mobile

Captured-fields panel folds into a `<details>` element pinned above the thread. Native HTML, native semantics, keyboard works, screen reader works, no JS needed for the disclosure.

```
┌─ Mode: Chat about your project   ←→ Switch to form ─────────┐
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ ▸ What HAND is hearing  ·  3 of 8 details captured       │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ [ conversation thread, full width ]                          │
│                                                              │
│ [ composer, full width ]                                     │
└──────────────────────────────────────────────────────────────┘
```

Expanded, the `<details>` reveals the same field list as the desktop panel. The disclosure stays pinned at the top of the chat region (sticky inside the card on tall threads). Counter (`3 of 8`) updates as fields fill.

### 4.3 Message styling

No avatars. No bubble tails. The chat is a typographic conversation, not a SaaS UI cosplay.

**Assistant messages**

- Container: full-width row, left-aligned, max-width 75% of column.
- Background: `--color-bg-warm` (`#FBF8F1`), `--radius-lg`, padding `--space-lg`.
- Eyebrow: `HAND ASSISTANT` in JetBrains Mono uppercase, `0.6875rem`, `--color-text-muted`, tracking `0.12em`, sits above the message body with `--space-sm` gap.
- Body: Inter `1rem`/`1.65`, `--color-text`.
- New-message reveal: opacity 0→1 + 8px translateY, 300ms `ease-out-quart`. Honors `prefers-reduced-motion`.

**User messages**

- Container: full-width row, right-aligned, max-width 70% of column.
- Background: `--color-accent-light` (`#FEF3C7`), `--radius-lg`, padding `--space-lg`.
- No eyebrow. Right-alignment + tint carry the identity.
- Verify contrast: `--color-text` (`#111827`) on `#FEF3C7` ≈ 14:1. Passes AA easily.

**Typing indicator**

Three 4px dots in `--color-text-muted`, equal-spaced, gently pulse `opacity 0.3 → 1.0 → 0.3` with `cubic-bezier(.5,0,.5,1)`, 1.4s loop, staggered 0.2s. Lives inside an empty assistant-message container so the layout doesn't jump when the message arrives. Vanishes the moment the first token streams in.

**Send-it gate**

When the assistant judges it has enough (see §6.2), the final assistant message includes two inline buttons:

```
HAND ASSISTANT
Okay, I think I have what I need. Want me to send this over to HAND,
or is there something else you want to add first?

[ Send it to HAND ]   [ Add one more thing ]
```

`Send it to HAND` uses `.btn--primary`. `Add one more thing` uses `.btn--ghost`. They sit inline at the bottom of the message, not as a separate row, so the moment feels conversational rather than form-like.

### 4.4 Captured-fields panel

The panel is a `<dl>` using the existing `.key-value` discovery-doc pattern, lightly extended. Three states per field:

| State | Visual | When |
|---|---|---|
| `empty` | value cell shows `—` in `--color-text-faint` | Nothing said about this field yet |
| `inferred` | value in `--color-text-secondary`, italic, tiny "from your message" tooltip on hover | Assistant extracted from chat |
| `confirmed` | value in `--color-text`, regular weight, small ✓ in `--color-accent` | User clicked confirm OR re-sent the same fact unprompted |
| `edited` | value in `--color-text`, regular weight, mono chip `· edited` in `--color-text-muted` | User clicked the field and changed it |

When a value moves `empty → inferred`, the row animates with a brief 1px amber underline (`--color-accent`) that fades over 600ms. This is the only feedback the assistant emits for extraction; no toast, no banner. Quiet by design.

Each field value is clickable. Click → inline edit. Save → the panel logs a small system message into the thread: *"Updated LLC status to: in progress."* This gives the user a way to correct the assistant without re-typing in chat.

The bottom of the panel always shows:

- **View as form** link → switches to form mode with everything pre-filled
- **Counter**: `4 of 8 details captured` so the user knows how close they are

### 4.5 The assistant's first message

Locked copy for v1, to set tone:

> Hi. I'm an intake assistant. Whatever you write here goes to a real person at HAND, who'll reply within five business days. My job is just to help you tell the story first.
>
> So, what are you building? Take your time.

Plain, warm, names that a real person is behind the door without pretending to be that person. No specific individual is named, because intake routing on the HAND side may not always land on the same desk. Three sentences. Then asks the open question.

### 4.6 The assistant's behavior

System prompt is owned by `netlify/functions/intake-chat.js`. The high-level instructions:

1. Voice matches `PRODUCT.md` Brand Personality: earnest, evidence-based, relational; plain English; specific over abstract; warm but not soft.
2. Ask one or two questions per turn, never a battery.
3. Listen first. If the user said something rich, reflect a phrase back before asking the next question. ("Peer support for new moms — beautiful. Is the work in-person, app-based, or both?")
4. Infer variant (business / local_business / grassroots) from the first two turns. Don't ask "which category are you" head-on.
5. Cover the schema (see §7) but adapt order to what the user volunteered. If they led with the legal structure, don't ask about it again.
6. If the user goes off-topic, follow them for one turn, then gently return.
7. Never close a sale. The assistant's job is intake, not pitch.
8. When the assistant has name, email, variant, work-description, and a story-equivalent of ~200 words, offer the send-it gate (§4.3).

The structured-extraction sidecar (see §8) is invisible to the user. The user only sees natural prose. The model emits both in the same turn via Anthropic tool use.

## 5. Formal form polish

The existing form works. It is dense. Polish, don't rebuild.

### 5.1 Mockup

```
┌─ Mode: Submit your project   ←→ Switch to chat ───────────────────────────┐
│                                                                            │
│   Step 1 of 3  ·  Pick the closest match                                   │
│   ────────────                                                              │
│                                                                            │
│   ╭───────────────────────────────────────────────────────────────────╮    │
│   │ ●  Impact-driven business or entrepreneur          PRIMARY PATH   │    │
│   │    Wellness brand, retreat space, co-op, community studio. May or │    │
│   │    may not have an LLC. May or may not have a site.               │    │
│   ╰───────────────────────────────────────────────────────────────────╯    │
│   ╭───────────────────────────────────────────────────────────────────╮    │
│   │ ○  Community-rooted small business                                │    │
│   │    Bodywork, energy work, doula, somatic, plant medicine.         │    │
│   ╰───────────────────────────────────────────────────────────────────╯    │
│   ╭───────────────────────────────────────────────────────────────────╮    │
│   │ ○  Grassroots organization                                        │    │
│   │    Mutual aid, harm reduction, food access, land stewardship.     │    │
│   ╰───────────────────────────────────────────────────────────────────╯    │
│                                                                            │
│                                                                            │
│   Step 2 of 3  ·  About you                                                │
│   ────────────                                                              │
│                                                                            │
│   Your name                            Email                               │
│   ┌──────────────────────────┐         ┌──────────────────────────┐        │
│   │                          │         │                          │        │
│   └──────────────────────────┘         └──────────────────────────┘        │
│                                                                            │
│   Where are you based?  (optional)     What do you call yourself? (opt.)   │
│   ┌──────────────────────────┐         ┌──────────────────────────┐        │
│   │                          │         │                          │        │
│   └──────────────────────────┘         └──────────────────────────┘        │
│                                                                            │
│                                                                            │
│   Step 3 of 3  ·  About the business                                       │
│   ────────────                                                              │
│                                                                            │
│   Business name                                                            │
│   ┌──────────────────────────────────────────────────────────────────┐     │
│   │                                                                  │     │
│   └──────────────────────────────────────────────────────────────────┘     │
│                                                                            │
│   What does the business do?  ·  One sentence, plain English.              │
│   ┌──────────────────────────────────────────────────────────────────┐     │
│   │                                                                  │     │
│   └──────────────────────────────────────────────────────────────────┘     │
│                                                                            │
│   LLC situation                                                            │
│   ◯ Not formed yet     ◯ In progress     ◯ Formed     ◯ Other / not sure   │
│                                                                            │
│   What's online now?                                                       │
│   ┌──────────────────────────────────────────────────────────────────┐     │
│   │                                                                  │     │
│   │                                                                  │     │
│   └──────────────────────────────────────────────────────────────────┘     │
│                                                                            │
│                                                                            │
│   Where you are, and what would help                                       │
│   ────────────                                                              │
│                                                                            │
│   Tell us in your own words.                                               │
│   Two paragraphs is plenty. About 200 to 400 words.                        │
│   ┌──────────────────────────────────────────────────────────────────┐     │
│   │                                                                  │     │
│   │                                                                  │     │
│   │                                                                  │     │
│   │                                                                  │     │
│   └──────────────────────────────────────────────────────────────────┘     │
│                                                                  0 / 1500  │
│                                                                            │
│   What you'd want help with  ·  Check any. We use these to direct the      │
│                                  reply, not to filter you in or out.       │
│                                                                            │
│   ╭─────────────╮ ╭─────────────╮ ╭─────────────╮ ╭─────────────╮          │
│   │ ☐ Website   │ │ ☐ Brand     │ │ ☐ LLC       │ │ ☐ Content   │          │
│   ╰─────────────╯ ╰─────────────╯ ╰─────────────╯ ╰─────────────╯          │
│   ╭─────────────╮ ╭─────────────╮ ╭─────────────────────────────╮          │
│   │ ☐ Automation│ │ ☐ Long arc  │ │ ☐ Not sure yet, that's okay │          │
│   ╰─────────────╯ ╰─────────────╯ ╰─────────────────────────────╯          │
│                                                                            │
│   ╭──────────────────────────────────────────────────────────────────╮     │
│   │ We write back within five business days, personally.             │     │
│   │ Not yet ≠ no, and you will always hear which.                    │     │
│   ╰──────────────────────────────────────────────────────────────────╯     │
│                                                                            │
│                          [  Start the conversation  →  ]                   │
└────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 What changed from today

| Change | Why |
|---|---|
| Variant chooser is now three radio-cards instead of three tabs | Tabs imply "you might switch a lot"; this is a one-time identity choice. Cards read more honestly and look less like an admin UI. |
| Numbered "Step 1 of 3" mono eyebrows | The form is long. Eyebrows give the eye a rhythm and a visible sense of progress without claiming to be a wizard. No step gating. |
| Max-width tightened to ~640px on desktop | Today the form stretches across the intake card and feels sparse. Tighter column reads like a letter. |
| Signals upgraded from inline checkboxes to clickable card chips | The current `.intake-check-grid` is checkbox-shaped. Card chips with amber-light fill on `:checked` (matching `--color-accent-light`) feel like a deliberate selection. |
| Pre-submit reassurance becomes a warm-paper banner above the submit | Sits in `--color-bg-warm` with `--radius-md`. Reinforces the brand promise at the moment of friction. |
| Body field gets a tiny serif italic hint above ("Two paragraphs is plenty. About 200 to 400 words.") | Source Serif italic is the archival voice in DESIGN.md; here it lowers the perceived stakes of the textarea. |
| Group C legend changes from "Where you are, and what would help" with a number badge to a section divider with the title and a thin amber rule | Less encyclopedic, more editorial. |
| Spacing between fieldsets bumps to `--space-3xl` | Today is `--space-2xl`. The form needs more air. |

### 5.3 What does not change

- All field names, types, max-lengths, validation rules
- The `data-variant-input` enable/disable logic in `main.js`
- The honeypot mechanism
- The success state structure (light copy additions, see §6.1)
- The POST payload to `intake.js`

The form continues to work with JS off.

## 6. Success states

### 6.1 Form mode success

Reuse `<template id="intakeSuccessTemplate">` with two additions:

```
                            ✓ (circle-check icon)

                       We got your note.

   We'll write back by Wednesday, May 27. You'll hear from a real person,
   not an autoresponder. A copy of what you sent is on its way to
   you@example.com so you have it too.

   If we're a fit, we'll set up a 30-minute call within the next two weeks.
   If we're not a fit right now, you'll still get a reply that says so,
   and points you somewhere useful.

   ── While you wait ──
     → Read the discovery research
     → Join the mailing list
     → Support the foundation
```

The two new lines:

1. *"A copy of what you sent is on its way to <email> so you have it too."* — sets expectation, reinforces that they have a record.
2. The horizontal rule + "While you wait" framing replaces the bald "a few things HAND is working on" list. Same links, less abrupt.

`replyByDate(new Date())` in `main.js` already computes the five-business-day date and is reused as-is.

### 6.2 Chat mode success

A conversational close, not a form-style success card.

Sequence:

1. User clicks `Send it to HAND` in the assistant's send-it gate (§4.3).
2. Composer disables. The assistant streams a final message:

   > Sent. We'll reply by Wednesday, May 27, and a copy of the conversation is on its way to your inbox so you have it too.

3. After the message finishes streaming, the conversation column dims to 60% opacity and a small card slides in below the thread (16px translateY, 400ms ease-out-quart):

   ```
   ── While you wait ──
     → Read the discovery research
     → Join the mailing list
     → Support the foundation
   ```

4. The captured-fields panel stays visible, now read-only, marked `· sent` in the header. No edit affordances.
5. Focus moves to the "While you wait" heading.

The chat mode never shows the same dialog as the form. The voice is different because the experience was different. The promise (real reply by date X, copy to inbox) is identical.

## 7. Persistence model

### 7.1 What gets written, when

| Event | Writes |
|---|---|
| Form submit succeeds | New row in `projects` (source = `form`). Resend notification + audience add proceed as today. |
| Chat first user message | New row in `project_drafts` with a fresh `draft_token`. Token also stored in `localStorage` under key `hand:reciprocate_draft`. New row in `project_messages` for the user message. Assistant turn appended after model responds. |
| Chat each subsequent turn | `project_messages` append (user, then assistant). `project_drafts` fields updated from extraction. |
| Chat drawer inline edit | `project_drafts` field update + a `project_messages` row with `role = system` describing the edit. |
| User switches mode mid-chat | No new write; the draft already has everything. Form pre-populates from `project_drafts` via the same draft token. |
| Chat finalize | New row in `projects` (source = `chat`), populated from the draft. `project_drafts.finalized_project_id` set. Resend notification + audience add run via the shared submit module. |
| Page refresh | Client reads `draft_token` from `localStorage`, fetches `project_drafts` + `project_messages` from `intake-draft.js`, replays into the UI. |
| 30 days idle | `project_drafts` row expires; cleanup job (or `pg_cron`) deletes draft + cascading messages. |

### 7.2 Proposed Supabase schema

Coordinate with the parallel Supabase setup work. This is the proposal; the other instance owns the migration.

```sql
-- one row per intake, regardless of how it arrived
create table projects (
  id                   uuid primary key default gen_random_uuid(),
  created_at           timestamptz not null default now(),
  source               text not null check (source in ('form','chat')),
  variant              text not null check (variant in ('business','local_business','grassroots')),
  name                 text not null,
  email                text not null,
  location             text,
  role                 text,
  variant_fields       jsonb not null default '{}'::jsonb,
  story                text not null,
  signals              text[] not null default '{}',
  status               text not null default 'new'
                         check (status in ('new','reviewed','replied','closed')),
  notified_email_id    text,         -- Resend message id for the notification email
  audience_contact_id  text,         -- Resend audience contact id (nullable on duplicate)
  raw_payload          jsonb         -- full original payload for forensics
);

create index projects_created_at_idx on projects (created_at desc);
create index projects_email_idx       on projects (email);
create index projects_status_idx      on projects (status);

-- in-progress chat sessions, anonymous until finalized
create table project_drafts (
  id                    uuid primary key default gen_random_uuid(),
  draft_token           text not null unique,   -- random token, lives in localStorage
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  variant               text,
  name                  text,
  email                 text,
  location              text,
  role                  text,
  variant_fields        jsonb not null default '{}'::jsonb,
  story_summary         text,
  signals               text[] not null default '{}',
  finalized_project_id  uuid references projects(id) on delete set null,
  expires_at            timestamptz not null default (now() + interval '30 days')
);

create index project_drafts_draft_token_idx on project_drafts (draft_token);
create index project_drafts_expires_idx     on project_drafts (expires_at);

-- conversation history for a draft
create table project_messages (
  id          uuid primary key default gen_random_uuid(),
  draft_id    uuid not null references project_drafts(id) on delete cascade,
  created_at  timestamptz not null default now(),
  role        text not null check (role in ('user','assistant','system')),
  content     text not null,
  extracted   jsonb               -- assistant turns only: the structured field updates emitted alongside
);

create index project_messages_draft_id_idx on project_messages (draft_id, created_at);

-- All client access goes through the service-role key in Netlify functions.
-- No anon access. Service role bypasses RLS. RLS still enabled so any future
-- direct client access requires an explicit, considered policy.
alter table projects         enable row level security;
alter table project_drafts   enable row level security;
alter table project_messages enable row level security;

-- when the command/ admin app reads these, add JWT-scoped read policies
-- there. Do not open them by default.
```

### 7.3 Draft token model

- Generated client-side on first user message: `crypto.randomUUID()`.
- Stored in `localStorage['hand:reciprocate_draft']` as a plain string.
- Sent on every chat API call as a header `X-Draft-Token` and in the JSON body.
- Server validates token format, looks up the draft, rejects if expired or finalized.
- Refresh recovery: page load reads token, calls `GET /.netlify/functions/intake-draft?token=<…>`. If the server returns a draft, the UI replays it. If 404, the token is purged and the chat starts fresh.

Token is not a secret. It's a session identifier. The data behind it is intake-scoped, not sensitive (the email itself is the contact channel, not auth). Service role enforces that one token reads one draft.

## 8. Netlify function inventory

Four functions. One existing, three new. Shared submit module factored out of `intake.js`.

### 8.1 `intake.js` (existing, extend)

Current behavior: validate, Resend notify, Resend audience add. Keep.

Add: after Resend notification succeeds, insert into `projects` with `source = 'form'` and the Resend ids on the row. Insert failure is logged and swallowed — Resend remains the brand promise; the form never appears to fail because of Supabase.

Factor the submit logic (validation + Resend + Supabase) into `netlify/functions/_lib/submit.js` so `intake-finalize.js` can reuse it.

### 8.2 `_lib/submit.js` (new shared module)

Pure-ish module exporting:

- `validatePayload(payload) → { ok, errors }`
- `submit(payload, { source }) → { status, projectId, notifiedEmailId, audienceContactId }`

Both `intake.js` (form) and `intake-finalize.js` (chat) call `submit`. Same validation, same Resend flow, same Supabase insert. Single source of truth.

### 8.3 `intake-chat.js` (new)

POST endpoint for chat turns.

Request body:

```json
{
  "draft_token": "uuid",
  "message": "user's typed message"
}
```

Flow:

1. Validate token format. Look up draft (or create on first call when the message is the user's opener).
2. Append user message to `project_messages`.
3. Load last N messages from the draft (N=20 for cost; full history is in DB).
4. Call Anthropic API with:
   - System prompt: HAND voice + extraction schema + tool definition `update_intake_fields`
   - Recent messages
   - Stream responses
5. As the model emits text: stream tokens back to the client (SSE or chunked response).
6. As the model calls the `update_intake_fields` tool: persist the extracted fields to the draft and emit a structured event frame in the stream so the client can update the panel in real time.
7. Persist the assistant's final message to `project_messages` with its `extracted` JSON.

Anti-abuse:

- Rate-limit by IP (token bucket, 30 messages / 10 min).
- Rate-limit by draft token (60 messages / draft, hard cap).
- Optional Cloudflare Turnstile on first turn if abuse surfaces. Not in v1.

Model: Claude Haiku 4.5 for cost. The system prompt does the heavy lifting on voice. Reassess after dogfooding.

### 8.4 `intake-draft.js` (new)

- `GET ?token=…` → returns `{ draft, messages }` for refresh recovery. 404 if expired or finalized.
- `PATCH` with `{ token, field, value }` → updates a single field on the draft, appends a `system` message describing the edit. Used by the drawer's inline-edit affordance.

### 8.5 `intake-finalize.js` (new)

POST endpoint to convert a draft into a project.

Request body: `{ draft_token, confirm: true }`.

Flow:

1. Load draft. Verify required fields are present (name, email, variant, story).
2. Assemble the canonical payload (same shape as `intake.js` accepts).
3. Call `submit(payload, { source: 'chat' })` from `_lib/submit.js`.
4. Set `project_drafts.finalized_project_id`. Mark the draft as finalized (it's no longer a draft, but we keep the row + messages for audit).
5. Return `{ status, replyByDate }`. Client renders the chat success state (§6.2).

### 8.6 Environment variables

New, in Netlify dashboard:

| Var | Purpose |
|---|---|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key. Functions only, never in client. |
| `ANTHROPIC_API_KEY` | Claude API key |
| `ANTHROPIC_MODEL` | Default `claude-haiku-4-5-20251001`. Overridable per deploy. |

Existing, unchanged: `RESEND_API_KEY`, `RESEND_RECIPROCATE_AUDIENCE_ID`, `RESEND_NOTIFY_FROM`, `RESEND_NOTIFY_TO`.

## 9. Accessibility plan

Per `PRODUCT.md` and `DESIGN.md` accessibility section: WCAG AA on text and interactives, keyboard reachability, screen reader friendly, motion-respectful, mobile-first.

### Specifics for this work

| Pattern | Plan |
|---|---|
| Mode picker | Two `<a>` links by default. Upgrade to `role="tab"` only when JS enhances. Arrow keys swap. Enter activates. |
| Switch link | `<button>` with `aria-label="Switch to chat mode"` (etc). Focus moves to the new mode's first interactive element after switch. |
| Chat thread | `role="log"`, `aria-live="polite"`, `aria-atomic="false"`. Assistant message containers are `<article>`. New messages announce once; scrolling past does not re-announce. |
| Typing indicator | Has `aria-label="HAND assistant is typing"`. Replaced by the actual message when the model streams. |
| Captured-fields panel | `role="region"`, `aria-label="Fields captured from your conversation"`. Each field update fires a separate visually-hidden `aria-live="polite"` announcement: *"Location captured: Austin, TX."* Inline edits announce: *"Location updated to Houston, TX."* |
| Form variant cards | Real `<input type="radio">` inside a `<label>` so native semantics carry. Visual styling overlays. |
| Form signals cards | Real `<input type="checkbox">` inside a `<label>`. Same model. |
| Step eyebrows | Plain decorative text (`<p class="step-eyebrow">`), not headings, so the heading outline stays clean. |
| Reduced motion | Add the global `@media (prefers-reduced-motion: reduce)` override that DESIGN.md flagged as a TODO. Disables: scroll-reveal, new-message slide-in, typing indicator pulse, captured-field amber underline, hover lifts, arrow translations. The work pays for itself for users who need it. |
| Focus management | On mode switch, focus moves to a `tabindex="-1"` heading at the top of the new mode. On chat finalize, focus moves to the success heading. On form error, focus moves to the first invalid field (already does). |
| Contrast | Verify `--color-text` on `--color-accent-light` (`#FEF3C7`) for user bubbles. AA-large is trivially met. Verify the small mono `· edited` chip on the field-panel background; if it's too faint, use `--color-text-secondary`, not `--color-text-muted`. |
| JS-off | Form mode is fully functional. Chat mode shows the fallback (§3) and offers email as the alternative. |

## 10. Phased build plan

Four ship-able increments. Each can deploy independently and is reversible.

### Phase 1 — Schema and form-to-Supabase

**Goal**: every form submission lands in Supabase. No UX changes.

- Coordinate with the parallel Supabase work: confirm the migration applies the schema in §7.2.
- Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Netlify env.
- Create `netlify/functions/_lib/supabase.js` (service-role client).
- Create `netlify/functions/_lib/submit.js` factored out of `intake.js`. Move the existing validation, Resend notify, audience-add logic into it. `intake.js` becomes a thin wrapper that parses the request and calls `submit`.
- Add the Supabase insert step inside `submit`. Insert failure: log, swallow, do not fail the request.
- Smoke: submit the form locally and on a Deploy Preview. Verify the `projects` row appears and the Resend email still arrives.
- Ship.

Risk: low. Pure additive.

### Phase 2 — Mode switcher and chat MVP (scripted)

**Goal**: chat mode exists, looks finished, no LLM yet. Equal-weight with the form.

- Reorganize the intake section in `index.html` per §2 and §3. Two `<section>` regions: `#mode-form` (current form) and `#mode-chat` (new). Two `<a>` cards above. Section header copy updated.
- Build `chat.css` (or extend `style.css`) with: mode picker cards, mode switcher link, two-column chat layout, message bubble styles, composer, captured-fields panel, mobile `<details>` variant.
- Build `chat.js`: render the conversation, append messages, autosize textarea, ⌘-Enter and Esc shortcuts, focus management.
- Implement a scripted decision tree as the temporary chat brain. About eight turns. Persists each user message and asks the form's questions conversationally. Updates the panel via a tiny extractor.
- Build `netlify/functions/intake-draft.js` (GET + PATCH).
- Finalize at the end of the scripted flow posts to `intake.js` exactly like the form. No new function yet.
- Verify: chat round-trip works on mobile and desktop. Refresh recovery works. Switch-to-form preserves answers. Switch-to-chat from a partially-filled form is deferred to Phase 4.
- Ship.

Risk: medium. New layout, new module, but no model dependency yet.

### Phase 3 — LLM extraction and finalize

**Goal**: chat is genuinely conversational. Extraction is automatic.

- Add `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` to Netlify env.
- Build `netlify/functions/intake-chat.js` (§8.3) with streaming and the `update_intake_fields` tool.
- Write the system prompt (separate file: `netlify/functions/_lib/chat-prompt.js`) anchored in HAND voice and the extraction schema.
- Wire `chat.js` to consume the streaming endpoint and update the panel as extraction events arrive.
- Replace the Phase-2 scripted brain. Keep a `chat.js` flag (`CHAT_MODE=scripted|llm`) for emergency rollback the first 48 hours.
- Build `netlify/functions/intake-finalize.js` (§8.5). Wire the send-it gate to it.
- Verify: tone, extraction quality, edge cases (user changes their mind, user dumps a 3000-word essay, user says nothing useful, user attempts prompt injection).
- Rate-limit testing.
- Ship.

Risk: highest. Tone and extraction quality require iteration. Plan for one tuning pass in the first two weeks.

### Phase 4 — Bidirectional mode switching, polish, audit

**Goal**: full round-trip between modes. Production-ready.

- Form mode reads `localStorage['hand:reciprocate_draft']` on load. If present, fetches the draft and pre-fills.
- Form-side edits (mid-stream, before submit) PATCH the draft via `intake-draft.js`. Switching to chat shows a `system` message: *"You updated [field] to [value]."*
- Captured-fields panel inline-edit (§4.4) ships.
- Reduced-motion overrides ship (§9). Apply to the whole site, not just this section.
- Success-state polish: `replyByDate` already exists; thread it through the chat success message too. Confirm the "copy to your inbox" claim is real (sender flow exists or is added).
- Cross-browser pass. Keyboard pass. Screen reader pass (NVDA + VoiceOver). Mobile pass (≤360px).
- Audit pass per the impeccable `audit` checklist for both modes.
- Ship.

Risk: medium. Mostly polish, but the bidirectional sync has edge cases.

## 11. Open questions

To resolve before or during Phase 3, not blocking Phase 1 or 2.

1. **Sending the conversation copy to the user.** Phases 1/2 don't promise it. Phase 3/4 success states do. Decide if Resend sends an actual receipt email containing the chat transcript, or if "copy" means a link they can revisit by holding the draft token. Probably the email — feels honest and durable.
2. **Audience-add on chat finalize.** Form mode adds to the Reciprocate audience. Chat finalize should match. Confirm with koH.
3. **Anti-abuse beyond rate limits.** If the chat endpoint sees scripted abuse, add Cloudflare Turnstile on first turn. Not in v1.
4. **Model choice.** Haiku 4.5 is the v1 plan. If tone falls flat, switch to Sonnet 4.6 with a tighter system prompt. Either way, never expose the model name in user-facing copy (per memory: HAND's stance is "leading and experimental", not specific models).
5. **Admin view.** Where does koH actually read these? `command/` Next.js + Supabase app is the natural home. Out of scope for this doc, but the schema is built for it.
6. **Concurrency: two devices, one draft.** If a Reciprocate starts chat on phone and continues on desktop, do they share state? v1 says no (localStorage is per-device). Acceptable for v1; revisit if requested.

## 12. Slop check

Run before merging Phase 2 and again before Phase 4.

- **First-order**: would someone guess "AI intake form for nonprofits → cream background, sans-serif, chat bubbles with circular avatars"? Yes, that's the cliché. We rejected the avatars and built the chat in the warm editorial register, with monospace eyebrows and a captured-fields panel that looks like a `<dl>`, not a SaaS sidebar. Pass.
- **Second-order**: would someone guess "nonprofit AI intake, not SaaS → warm minimalist with a sage-green accent"? That is the second reflex. We are amber (the established HAND signature), not sage. Pass.
- **Cross-register absolute bans**: no side-stripe borders, no gradient text, no decorative glass, no hero-metric template, no identical card grids, no modals as first thought. Pass.
- **Voice**: scan all UI copy in this doc. Em dashes used purposefully (not as default punctuation, per the brand audit). No corporate fluff. Specific (named the five-business-day promise, named the schema fields, the assistant speaks for HAND in first-person plural rather than for any one individual). Pass.

---

End of doc. Next step: confirm Phase 1 with the Supabase-instance work, then ship.
