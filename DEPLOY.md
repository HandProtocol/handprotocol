# Deploy walkthrough

The HAND Protocol public surfaces are static HTML/CSS/JS, no build step. The site is **live on Netlify at [handprotocol.org](https://handprotocol.org)** (since 2026-05-12, Netlify DNS). Pushes to `main` of `HandProtocol/handprotocol` auto-deploy. Config for Vercel and Cloudflare Pages is also kept in the repo for host portability.

## Pre-flight checklist

- [x] GitHub repo public at `github.com/HandProtocol/handprotocol`
- [x] Netlify connected, auto-deploy on `main` enabled
- [x] Custom domain `handprotocol.org` pointed at Netlify
- [x] OG / sitemap meta tags reference the canonical live domain `https://handprotocol.org`
- [ ] Email `hand@handprotocol.org` exists and forwards somewhere readable

## Option 1: Netlify (current, live)

The site is deployed here. `netlify.toml` at the repo root configures everything.

1. Project is connected to GitHub `HandProtocol/handprotocol`. Pushes to `main` auto-deploy.
2. Build settings (auto-detected from `netlify.toml`):
   - Base directory: blank (repo root)
   - Build command: blank (no build step)
   - Publish directory: **`web`**
3. `netlify.toml` handles:
   - Root path `/` → `/foundation-campaign/`
   - Pretty URLs (`/vision`, `/models`, `/landscape`, `/campaign`, `/raise`, `/crypto`)
   - Security headers (X-Frame-Options, Referrer-Policy, Permissions-Policy)
   - Cache control (long for assets, short for HTML)
4. **Custom domain:** Site Settings → Domain Management → Add custom domain → `handprotocol.org`. Let's Encrypt SSL auto-provisions within ~10 min after DNS propagation.

## Other Netlify sites HAND runs

Only handprotocol.org deploys from this repo's `main`. The rest deploy as listed, which matters because a push to `main` does NOT update them:

| Site | Source | How it deploys |
|---|---|---|
| handprotocol.org | `web/` + `netlify/` | Push to `main` |
| command.handprotocol.org (Command Center) | `command/` | Push to `main` (its own Netlify site) |
| waterdrop.handprotocol.org | `waterdrop/` | Push to `main` (base dir `waterdrop`) |
| yuhm.handprotocol.org | `yuhm/` | Netlify CLI by hand |
| waterfall.handprotocol.org | `projects/waterfall/` | Netlify CLI by hand; its own `netlify.toml` overrides the root CSP |
| sps.handprotocol.org | `solarpunk/` | Netlify CLI by hand |
| Client sites (`clients/<slug>/`) | per client | Netlify CLI by hand, except PrecisionFix, which deploys from its own public repo on the owner's account. See each client's `HANDOFF.md`. |

New Netlify sites start with the "Powered by Netlify" badge on and Netlify Forms detection off; turn the badge off and, if the site uses forms, detection on. The Free plan cannot build private organization repos.

## Function limits (handprotocol.org)

Resend's free plan stops at 100 emails a day for the whole account, which yuhm's auth mail and some client sites share. The public functions are limited so that one flooded form cannot use it up. Counts live in the database (`command.rate_hits`, `command.rate_take`, migration 057), because function instances do not share memory.

| Limit | Default | Env var to change it |
|---|---|---|
| Feedback notes per visitor per 10 minutes | 5 | `FEEDBACK_IP_BURST` |
| Feedback notes per visitor per day | 20 | `FEEDBACK_IP_DAILY` |
| Feedback notes from everyone per hour | 30 | `FEEDBACK_HOURLY_CAP` |
| Feedback notes that also send an email, per day | 10 (later notes still reach `/pins` and Telegram) | `FEEDBACK_EMAIL_DAILY_CAP` |
| All email sent by this site's functions per 24 hours | 50 | `EMAIL_DAILY_CAP` |

Visitors over a limit get HTTP 429 and the widget retries ten minutes later. The same note sent twice within an hour is accepted once. If the counter cannot be reached, feedback is still accepted but email is skipped. Any new function that sends email should use `sendEmail` from `netlify/functions/_email.js` so it counts against the daily cap.

Database changes go first: apply a migration through the Supabase management API and record it in `supabase_migrations.schema_migrations` before deploying code that needs it.

## Option 2: Vercel (former, ad-hoc / archived)

1. Sign in at [netlify.com](https://netlify.com), connect your GitHub account.
2. Click **Add new site → Import an existing project**.
3. Pick `HandProtocol/handprotocol` from the repo list.
4. Build settings (Netlify will auto-detect `netlify.toml`):
   - Base directory: (leave blank, repo root)
   - Build command: (blank)
   - Publish directory: `web`
5. Click **Deploy site**. Netlify will give you a `*.netlify.app` URL within a minute.
6. **Custom domain**: Site Settings → Domain Management → Add custom domain → `handprotocol.org`. Follow the DNS instructions to point your registrar at Netlify's name servers (or set up a CNAME).
7. Netlify auto-provisions a free Let's Encrypt SSL certificate. Wait ~10 minutes after DNS propagation for HTTPS to come up.

The `netlify.toml` at the repo root handles:
- Root path `/` → foundation campaign
- Pretty URLs (`/vision`, `/models`, `/landscape`, `/campaign`, `/raise`, `/crypto`)
- Security headers (X-Frame-Options, CSP, Referrer-Policy)
- Cache control (long for assets, short for HTML)

## Option 3: Cloudflare Pages

1. Sign in at [pages.cloudflare.com](https://pages.cloudflare.com).
2. **Create a project → Connect to Git → GitHub**, select `HandProtocol/handprotocol`.
3. Build settings:
   - Framework preset: **None**
   - Build command: (leave blank)
   - Build output directory: `web`
4. Click **Save and deploy**. You'll get a `*.pages.dev` URL.
5. **Custom domain**: project → Custom domains → Set up. Cloudflare will guide you through DNS (this is simplest if your domain is already on Cloudflare).
6. SSL is automatic.

Cloudflare Pages will respect the `web/_redirects` file (same content as the Netlify redirects, just simpler syntax).

## Post-deploy checklist

After the site is live at your custom domain:

- [ ] **Set GitHub repo `homepageUrl`** to the live URL. On the repo page → About (gear icon) → Website. Helps visitors landing on the repo find the live site.
- [ ] **Test OG image**: paste your foundation-campaign URL into [opengraph.xyz](https://www.opengraph.xyz) or directly into Twitter / Slack / Discord. Confirm the 1200×630 card renders with the right title and image.
- [ ] **Verify all routes return 200**:
  ```bash
  for path in / /discovery /legacy /raise /crypto /vision /models /landscape; do
    curl -s -o /dev/null -w "%{http_code} $path\n" https://handprotocol.org$path
  done
  ```
- [ ] **Submit sitemap to Google Search Console**. Add `handprotocol.org` as a property, submit `https://handprotocol.org/sitemap.xml`.
- [ ] **Set up analytics**: install [Plausible](https://plausible.io) or [Fathom](https://usefathom.com) (privacy-respecting, no cookie banner needed). Or self-host Plausible Community Edition.
- [ ] **Email forwarding**: ensure `hand@handprotocol.org` reaches a real inbox. Use ImprovMX, ForwardEmail, or your registrar's free email forwarding.

## Updating the site

Any commit pushed to `main` on the GitHub repo triggers an auto-deploy on Netlify. No manual deploy step needed.

When making any change that affects deploy behavior (redirects, headers, routing), **update both `vercel.json` and `netlify.toml`** in the same commit. They mirror each other so the eventual Netlify switch is zero-rework.

To preview before pushing:
```bash
cd web && python3 -m http.server 8000
# Visit http://localhost:8000/foundation-campaign/
```

## If the OG image needs regeneration

The 1200×630 OG image at `web/assets/og.png` is rendered from `web/assets/og-card.html` via headless Chrome. To regenerate after copy changes:

```bash
google-chrome --headless --disable-gpu --no-sandbox --hide-scrollbars \
  --window-size=1200,630 \
  --screenshot=web/assets/og.png \
  "file://$PWD/web/assets/og-card.html"
```

(macOS: replace `google-chrome` with `/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome`.)

## Domain notes

- If you don't have `handprotocol.org` yet, check availability on Namecheap, Porkbun, or Cloudflare Registrar (Cloudflare is at-cost).
- All OG meta tags and sitemap entries currently use `https://handprotocol.org/...`. If you go with a different domain, do a project-wide find/replace before deploy.
- The robots.txt and sitemap.xml are at `web/robots.txt` and `web/sitemap.xml`, which serve from `/robots.txt` and `/sitemap.xml` on the deployed site (since `web/` is the publish directory).
