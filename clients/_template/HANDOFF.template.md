# Handoff — {{NAME}} · {{DATE}}

Client site for {{NAME}} (owner: {{OWNER}}). Server-rendered single page
with an owner CMS at `/admin/` (passwordless email link) for all copy and
photos. Built from `clients/_template` with the `hand-client-site` skill on
{{DATE}}.

**Status:** scaffolded, not provisioned. Fill in as it progresses.

## Start here (cold session)

1. Read this file, then `README.md` (architecture, deploy, env vars).
2. Site pack = `site.config.mjs`, `site/schema.mjs`, `site/page.mjs`,
   `public/assets/site.css|site.js`. Everything else is engine — do not edit
   it here; fix in `clients/_template` and run `sync-engine.mjs {{SLUG}}`.
3. `npm test` runs with no DB. `npm run preview` renders `dist-preview/`.

## Who can sign in (all `owner` role)

| Email | Who |
|---|---|
| hand@handprotocol.org | HAND operator inbox, seeded by migration |

## Where things are

- **Code:** `clients/{{SLUG}}/`
- **Database:** HAND's shared Supabase project `vconmgerblqbworcqkvr`, tables
  `command.{{PREFIX}}_editors / login_tokens / content / media / revisions`;
  migration `command/supabase/migrations/{{MIGRATION}}` — applied: **no**.
- **Storage:** public bucket `{{SLUG}}`.
- **Netlify:** project `{{SLUG}}`, site id `{{SITE_ID}}`, account **cryptokoh**.
  Env vars per README.
- **Custom domain:** none yet.
- **Setup tab:** `site/checklist.mjs` (consts at the top: `SITE`, `DOMAIN`,
  `OLD_SITE`, `CODE_ACCESS`, `HAS_LOOKS`, `HAS_BOOKING`). Ticks live in the
  content document under `setup` and save on the spot.
- **Booking calendar:** opt in with `booking: BOOKING` (`site/booking.mjs`)
  and `HAS_BOOKING = true`; the migration then includes `{{PREFIX}}_bookings`
  (for a live site: `node scripts/gen-migration.mjs --bookings`).

## Next steps

1. Design pass on the site pack (theme, copy, layout) → `npm test` + preview.
2. `node .claude/skills/hand-client-site/scripts/provision.mjs {{SLUG}}` (creates
   the Netlify site, sets env, applies the migration, deploys, verifies).
3. Owner signs in at `/admin/`, lands on the Setup tab, and works down it
   (every step is a button; tap each one and confirm it lands where it says).
   Replaces placeholders, publishes.
