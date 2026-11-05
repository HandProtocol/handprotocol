# Verify checklist

## Local (no DB)

```bash
cd clients/<slug> && npm test && npm run preview
node /path/to/shot.mjs dist-preview /tmp/out      # Playwright from ~/.claude/skills/gstack/node_modules/playwright, chromiumSandbox:false + --no-sandbox; Bash needs dangerouslyDisableSandbox
```

- [ ] tests green
- [ ] desktop + mobile screenshots read right (fonts loaded, theme colors, no unstyled block)
- [ ] no console errors; no horizontal overflow at 390px (probe `scrollWidth > clientWidth`)
- [ ] every section with an empty list is hidden and its nav link gone
- [ ] `<style id="theme">` present, `Owner sign in` link present, JSON-LD present
- [ ] `dist-preview/admin/index.html` (login view) reads as the site: same palette, fonts, button shape, label case
- [ ] `node scripts/gen-migration.mjs` mentions only this slug's tables/bucket
- [ ] `tests/checklist.test.mjs` green: every Setup action/check validated; `dist-preview/admin/index.html` carries `data-action-kind` buttons (and `looks-tpl` when the pack has themes)

## Live (after provision)

- [ ] `/` 200, no `/.netlify/scripts/hud`, `Netlify-Cache-Tag` = slug (`curl -sI`)
- [ ] `/admin/` 200 with `X-Robots-Tag: noindex`, themed like the site (screenshot signed in: header, tabs, a section card, the Media grid)
- [ ] `/api/content` `ok:true`; `/api/auth/me` 401
- [ ] request a link for `hand@handprotocol.org` → email delivered (Resend log) or mint a token via SQL
- [ ] publish once → `source` flips to `db`; page reflects the edit within a second (purge ok)
- [ ] upload a photo → Image CDN 200/webp; replace a placeholder; reorder; delete (object removed)
- [ ] add the owner in Editors; they can request a link; last-owner guard holds
- [ ] token replay rejected; cross-origin POST blocked (curl with a foreign Origin → 403)
- [ ] mobile Safari: sticky action bar, lightbox swipe
- [ ] Portal: sign-in lands on Home; at 390 wide the dock shows 5 buttons and Menu opens the bottom sheet; Find "phone" lists the phone field first and picking it focuses the input; the phone's back gesture returns to the previous place; Words and info shows the section list below 1200px and one section at a time; no horizontal overflow at 320 / 390 / 1024 / 1440
- [ ] Payments (sites with `config.payments`): migration has `<prefix>_secrets`; a `pk_` key is refused in words; a test key (`rk_test_`) connects, shows Test mode + last 4, the Setup Stripe item ticks itself, a confirmed test booking mails the Pay link; Disconnect removes the Stripe webhook endpoint
- [ ] Setup: the Continue setup card on Home lands on the next task; every action button lands where it says (field focus + highlight, tab switch, live site in a new tab, external link); a manual tick survives a reload without Publish; done tasks collapse to one line; self-ticking items flip when the field / photo / host condition is met
- [ ] Looks picker (packs with themes): Preview shows `/?theme=<id>` in the overlay at 390 and 1440 wide; Use this look → `/` serves that `data-theme` within a second and the theme task ticks

## Booking calendar (sites with `config.booking`)

- `/` carries `data-booking` + `/booking/booking.js?v=<assetVersion>`; `/api/booking/days` lists open days; `/forms/<name>.html` is gone if the calendar replaced a Netlify form.
- A request through the widget at 390 wide (pick service, an open day, a time, fill the details) shows the thank-you with the summary + manage link; zero console errors; both Resend sends ok in the function log.
- Signed in: Bookings tab first with the badge; the card shows intake / where / notes / tel / sms / mailto; Confirm moves it to Confirmed with the toast; `.ics` serves text/calendar; feed link is a `webcal://` URL; Setup's **Set my hours** lands on the hours list.
- `GET /api/booking/act?t=<bad>` 303s to `/admin/?toast=link-invalid#bookings`; cross-origin POST is 403; bad manage / feed tokens 404.
- Delete the test rows from `<prefix>_bookings` afterwards (management API) so the owner's first view is empty.
