# Deploy walkthrough

The HAND Protocol public surfaces are static HTML/CSS/JS, no build step. The site is **live on Netlify at `handprotocol.netlify.app`** as of 2026-05-12. Pushes to `main` of `HandProtocol/handprotocol` auto-deploy. Config for Vercel and Cloudflare Pages is also kept in the repo for host portability.

## Pre-flight checklist

- [x] GitHub repo public at `github.com/HandProtocol/handprotocol`
- [x] Netlify connected, auto-deploy on `main` enabled
- [ ] Custom domain (`handprotocol.org` or alternative) pointed at Netlify
- [ ] OG / sitemap meta tags reference the canonical live domain (currently `https://handprotocol.org` — change in HTML if the canonical domain differs)
- [ ] Email `hand@handprotocol.org` exists and forwards somewhere readable

## Option 1 — Netlify (current, live)

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

## Option 2 — Vercel (former, ad-hoc / archived)

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

## Option 3 — Cloudflare Pages

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

Any commit pushed to `main` on the GitHub repo triggers an auto-deploy on the active host (currently Vercel). No manual deploy step needed.

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
