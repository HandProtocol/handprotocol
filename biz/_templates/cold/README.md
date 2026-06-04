# Cold outreach templates

Canonical per-variant template files for the HAND Protocol biz-outreach (Develop pillar) cold pitch. The Command Center app reads these files to surface the right script for each surface. One pitch, five surfaces: a prospect who sees two of them should feel one organization, not five.

## Files

| order | file | surface | what it is |
|-------|------|---------|------------|
| 1 | `email-founder.md` | email | Cold email, founder-direct. The default: short, signed by the founder, no template feel. |
| 2 | `email-specific.md` | email | Cold email, specific-observation. Longer, personalized; use after a real PageSpeed/screenshot review in Qualify. |
| 3 | `call-live.md` | call | Live two-speaker call script (REP / PROSPECT). The rep's lines stand alone as a monologue. |
| 4 | `voicemail.md` | voicemail | 25-second voicemail for unanswered calls. |
| 5 | `dm.md` | dm | Instagram or Facebook DM, two to three sentences. |

Each template file carries YAML frontmatter (`title`, `variant`, `surface`, `order`, `status`, `updated`, plus `subject_options` on the two email files only) followed by the script body in markdown.

## The shared beats

Every variant hits the same beats in the same order:

1. Specific hook on the prospect's current site (missing, dated, broken, no mobile, etc.).
2. Who HAND is, one sentence, with the fiscal-sponsor framing.
3. The pool mechanic: 33% minimum of the invoice routes to the HAND pool to fund web work for nonprofits and impact entrepreneurs.
4. The tax line: the routed portion is tax-deductible via the fiscal sponsor.
5. Soft, single ask: a short call this week, or a one-pager.

## The 33% pool floor

The 33% number is the pool floor agreed on 2026-05-25. When a small business hires HAND for a build, 33% minimum of the invoice routes into the HAND resource pool to fund web work for the next nonprofit. Workers on the project may contribute their own share of the remaining 67% back into the pool to draw other resources (design, mentorship, agent compute, fiscal services). That second mechanic stays out of the cold pitch; it surfaces once a prospect is engaged.

## Placeholder-token convention

Bracketed tokens are filled in by the rep before sending. Keep them exact:

- `[FIRST_NAME]` — the prospect's first name
- `[BUSINESS_NAME]` — the business name
- `[YEAR]` — approximate year the site was last updated
- `[ESTIMATE]` — dollar amount routed to the pool (smallest tier's 33%)
- `[PHONE]` — rep callback number
- `[EMAIL]` — rep email
- `[ONE SPECIFIC OBSERVATION]` — a concrete, observed site issue

Slash-separated brackets (e.g. `[is missing / could use a refresh]`) are pick-one options for the rep to choose from.

## Source

The original rationale, full draft, open questions, and source notes live at `funding/grants/_outreach-script-cold.md`. These template files carry the variant bodies faithfully; the draft doc is the staging ground and the place to revise rationale.
