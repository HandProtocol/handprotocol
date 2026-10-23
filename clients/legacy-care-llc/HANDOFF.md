# Handoff — Legacy Care LLC · 2026-09-11

Client site for Legacy Care LLC (owner: cryptokoh@gmail.com,emarie12202007@gmail.com). Server-rendered single page
with an owner CMS at `/admin/` (passwordless email link) for all copy and
photos. Built from `clients/_template` with the `hand-client-site` skill on
2026-09-11.

**Status:** LIVE at https://legacycare.llc since 2026-09-11 (provisioned by provision.mjs).

## Babysitting & childcare (2026-10-23, built, NOT deployed)

New `#babysitting` section between Senior care and About, styled from the
owner's "Compassionate Care for Every Generation" flyer: service strip
(Senior care / Babysitting & childcare / In-home services), brush-stroke
script titles, pill rate rows, blue ribbons, and the flyer's watercolor heart
(`public/img/children-heart.webp`, cropped from the flyer, decorative). Rates
are the flyer's: 1 child $18–20, 2 children $22–25, 3 children $25–30,
date night $20–25, weekend $20–25 per hour, 3-hour minimum. No licensing or
age claims. All copy EN/ES and owner-editable under **Babysitting &
childcare** (rates and reasons are lists; empty rates list hides the card).
Nav gains a Babysitting link; nav links now hide below 1100px (was 900) so
five links never wrap. Removed a duplicate hard-coded meta description.
Asset version `20261023a`.

**Deploy note:** the new section and nav link arrive by schema defaults, but
the stored content document still holds the old hero eyebrow + lead,
services eyebrow, and SEO title/description. Those four changed defaults only
show live after the stored doc is updated (owner had not edited them; they
matched the old defaults on 2026-10-23).

## Display fixes (2026-09-11)

CMS tokens now render as live values in call buttons and the footer. The page
shows `© 2026 Legacy Care LLC.`, and the Made by HAND credit sits inside the
footer with the owner sign-in. Service text is constrained to its grid track
and wraps within the card on mobile. Asset version: `20260911d`.

## Social links (2026-09-11)

Facebook, Instagram, and the Google review link appear after the direct contact
options and in the footer. The owner can edit or hide them under **Social &
reviews** in the admin. Missing fields in older stored content receive the
schema defaults; no database migration is needed. Facebook and Instagram also
populate LocalBusiness `sameAs` metadata. The Instagram URL uses the clean
profile address without QR tracking parameters. Asset version: `20260911c`.

Validation: 32 tests pass; English and Spanish layouts checked at 360, 390,
768, and 1440px with no horizontal overflow and at least 44px link targets.

## Start here (cold session)

1. Read this file, then `README.md` (architecture, deploy, env vars).
2. Site pack = `site.config.mjs`, `site/schema.mjs`, `site/page.mjs`,
   `public/assets/site.css|site.js`. Everything else is engine — do not edit
   it here; fix in `clients/_template` and run `sync-engine.mjs legacy-care-llc`.
3. `npm test` runs with no DB. `npm run preview` renders `dist-preview/`.

## Who can sign in (all `owner` role)

| Email | Who |
|---|---|
| cryptokoh@gmail.com | Legacy Care owner |
| emarie12202007@gmail.com | Legacy Care owner |
| hand@handprotocol.org | HAND operator inbox, seeded by migration |

## Where things are

- **Code:** `clients/legacy-care-llc/`
- **Database:** HAND's shared Supabase project `vconmgerblqbworcqkvr`, tables
  `command.legacy_care_llc_editors / login_tokens / content / media / revisions`;
  migration `command/supabase/migrations/045_legacy_care_llc.sql` — applied: **yes** (2026-09-11).
- **Storage:** public bucket `legacy-care-llc`.
- **Netlify:** project `legacy-care-llc`, site id `5a3d778d-9067-470c-82fa-330fbefe5d15`, account **cryptokoh**.
  Env vars per README.
- **Custom domain:** `legacycare.llc`.

## Next steps

1. Design pass on the site pack (theme, copy, layout) → `npm test` + preview.
2. `node .claude/skills/hand-client-site/scripts/provision.mjs legacy-care-llc` (creates
   the Netlify site, sets env, applies the migration, deploys, verifies).
3. Owner signs in at `/admin/`, replaces placeholders, publishes.
