# Develop lead scripts

Headless helpers for the business-development ("Develop") pillar, the `hand-biz-pitch`
workflow. They use the **service-role** Supabase key on purpose: the `/develop` UI and
the `generate-*` API routes read through the authenticated SSR client (RLS), so an
unauthenticated process cannot use them. Run from anywhere, each pins cwd to `command/`.

Order of use for a new lead:

1. **`npx tsx scripts/enrich-lead.mts <slug> [--url=<listing>]`**
   Reverse-geocodes the Google Maps pin in `lead.md` to a locality, and (with `--url`)
   best-effort scrapes a directory listing for phone candidates. Reports only, it does
   not write, you confirm and edit `lead.md`. A found phone goes on the gated pitch
   page, not the public demo, until confirmed.

2. **`npx tsx scripts/register-lead.mts <slug>`**
   Syncs the canonical `biz/<slug>/lead.md` (frontmatter + `## Reviews`) into
   `command.biz_leads` / `biz_reviews`. Idempotent. Markdown is the source of truth,
   edit it first, then re-run this.

3. **`npx tsx scripts/generate-pitch.mts <slug> [--price=75] [--out=path] [--dry]`**
   Writes the gated pitch page `web/demos/<slug>/pitch/index.html` from the lead +
   reviews. Anthropic if `ANTHROPIC_API_KEY` is set, else a grounded deterministic
   fallback. Default offer is a flat $75 with optional add-ons. `--out` previews
   elsewhere (e.g. `/tmp`) without clobbering a hand-tuned page; `--dry` just reports.

The demo site itself (`web/demos/<slug>/index.html`) is the premium `/impeccable` build,
not scripted. Env comes from `command/.env.local`.
