# SEO audit: localhost:8899

- **Address:** http://localhost:8899/
- **Run:** 2026-10-27 15:21 UTC, 3 pages crawled, hand-client-seo 1.0.0
- **Score:** 79/100 (C)
- **Launch gate:** blocked by 5 faults
- **Findings:** 6 fail, 8 warn, 11 info; 64 checks passed, 2 skipped

| Area | Score | Fail | Warn | Info |
|---|---:|---:|---:|---:|
| crawlability | 42 | 2 | 1 | 1 |
| indexability | 67 | 1 | 1 | 0 |
| on-page | 100 | 0 | 0 | 0 |
| structured-data | 92 | 0 | 1 | 2 |
| social | 92 | 0 | 1 | 0 |
| links | 75 | 1 | 0 | 0 |
| images | 75 | 1 | 0 | 0 |
| performance | 84 | 0 | 2 | 2 |
| mobile | 90 | 0 | 2 | 2 |
| security | 75 | 1 | 0 | 1 |
| local | 100 | 0 | 0 | 2 |
| i18n | 100 | 0 | 0 | 1 |
| content | 100 | 0 | 0 | 0 |

## HAND can fix now

- **FAIL** (launch gate) http://localhost:8899/account/ answers 404 (/account/)
  - Evidence: linked from: http://localhost:8899/
  - Fix: Restore the page or remove the links to it.
- **FAIL** (launch gate) 5 image(s) do not load: /.netlify/images?url=%2Fimg%2Fphotos%2Fporsche-911-gt3-rs.j… → 404, /.netlify/images?url=%2Fimg%2Fphotos%2Fengine-rebuild.jpg&w… → 404, /.netlify/images?url=%2Fimg%2Fphotos%2Fmercedes-amg-sl63.jp… → 404 (+2 more) (home)
  - Fix: Fix the path or re-upload the photo.
- **FAIL** (launch gate) 1 broken internal link(s): http://localhost:8899/account/ → 404 (home)
  - Fix: Fix the address or remove the link.
- **FAIL** (launch gate) the site is served over plain http://
  - Fix: Serve it over HTTPS; Netlify provisions the certificate once the domain points at the site.
- **FAIL** the canonical points at https://precisionfixmobile.com/privacy/, which answers 404 (/privacy/)
  - Fix: A canonical must name a page that answers 200 directly.
- **WARN** 1 JavaScript error(s) at desktop width: Failed to load resource: the server responded with a status of 404 (Not Found)
  - Fix: Fix the script error; broken scripts can leave content hidden.
- **WARN** 1 request(s) failed at desktop width: http://localhost:8899/.netlify/images?url=%2Fimg%2Fphotos%2Fporsche-911-gt3-rs.jpg&w=480&q=78&fm=webp → 404
  - Fix: Fix or remove the missing files.
- **WARN** /robots.txt answers with an HTML page instead of a robots file
  - Fix: Serve a plain-text robots.txt, or a real 404.
- **WARN** the canonical hands this page's ranking to another site: https://precisionfixmobile.com/ (home)
  - Fix: Right when this copy is the secondary one; wrong if this is the address people should find.
- **WARN** the first large image is lazy-loaded (/.netlify/images?url=%2Fimg%2Fphotos%2Fporsche-91…): the browser waits to fetch what is probably the largest thing on screen (home)
  - Fix: Remove loading="lazy" from the hero image and add fetchpriority="high".
- **WARN** the HTML is served without gzip or brotli compression (home)
  - Fix: Turn on compression at the host (Netlify does it by default).
- **WARN** no Open Graph tags: a link to this page in a text or on Facebook shows no title card or photo (/privacy/)
  - Fix: Add og:title, og:description, og:image (1200×630), og:url and og:type.
- **INFO** 42 link(s) or button(s) are smaller than 44px on a phone
  - Evidence: a.nav__brand 28×28, button.lang-toggle 62×30, a.btn.btn--primary 118×33, a.contact__phone 212×42, a.btn.btn--primary 189×43
  - Fix: Give tap targets at least 44×44px.
- **INFO** 9 text block(s) render under 12px on a phone
  - Fix: Keep body text at 16px.
- **INFO** no AI-crawler rules in robots.txt: every crawler is allowed by the default group
- **INFO** Spanish copy is swapped in by the browser on the same URL (data-es): search engines index the English page only (home)
  - Fix: This serves Spanish-speaking visitors who arrive, not Spanish searches. To rank in Spanish, add a real /es page with its own title and hreflang tags.
- **INFO** PageSpeed (mobile) did not return a result: PageSpeed API 429: Quota exceeded for quota metric 'Queries' and limit 'Queries per day' of service 'pagespeedonline.googleapis.com' for co; no local Lighthouse (run "npx lighthouse --version" once to cache it)
- **INFO** PageSpeed (desktop) did not return a result: PageSpeed API 429: Quota exceeded for quota metric 'Queries' and limit 'Queries per day' of service 'pagespeedonline.googleapis.com' for co; no local Lighthouse (run "npx lighthouse --version" once to cache it)
- **INFO** missing response header(s): Strict-Transport-Security, X-Content-Type-Options
  - Fix: Add them at the host (netlify.toml [[headers]]). Not a ranking factor; it is basic hygiene.
- **INFO** FAQPage: Google shows FAQ rich results only for well-known government and health sites; the markup is harmless and still helps other engines read the answers (home)
  - Fix: Correct the structured data.

## Needs the owner

- **INFO** the page mentions "Menu Austin, TX", but no city or service area is on file for this business (home)
  - Fix: Confirm the service area with the owner and record it, so the title and structured data can use it.
- **INFO** no link to a Google Business Profile or a review page (home)
  - Fix: Once the Business Profile is verified, link to it (and to its "leave a review" link) from the site.
- **INFO** AutoRepair at @graph[1]: no "sameAs" links (Business Profile, Instagram, Facebook). Add them once the profiles exist (home)
  - Fix: Confirm the fact with the owner, then add it. Never fill it with a guess.

## At the domain move

- **FAIL** (launch gate) the sitemap lists 2 URL(s) on another host: https://precisionfixmobile.com/, https://precisionfixmobile.com/privacy/
  - Fix: Every <loc> must be on localhost:8899.
- **WARN** structured data names another host (url: https://precisionfixmobile.com/, @id: https://precisionfixmobile.com/#website, url: https://precisionfixmobile.com/, @id: https://prec…) (home)
  - Fix: url and @id must use this site's own address.

## PageSpeed

- mobile: not available (PageSpeed API 429: Quota exceeded for quota metric 'Queries' and limit 'Queries per day' of service 'pagespeedonline.googleapis.com' for co; no local Lighthouse (run "npx lighthouse --version" once to cache it))
- desktop: not available (PageSpeed API 429: Quota exceeded for quota metric 'Queries' and limit 'Queries per day' of service 'pagespeedonline.googleapis.com' for co; no local Lighthouse (run "npx lighthouse --version" once to cache it))

## Pages

| Page | Status | Indexable | Title | Words |
|---|---|---|---|---:|
| home | 200 | no: canonical points to https://precisionfixmobile.com/ | PrecisionFix – Mobile Mechanic / Austin, TX | 1030 |
| /account/ | 404 |  |  |  |
| /privacy/ | 200 | no: canonical points to https://precisionfixmobile.com/privacy/ | Privacy policy · PrecisionFix | 705 |

## Not checked this run

- www and the bare domain lead to one site: not a registrable domain (a subdomain has no www twin)
- no second indexable copy of the site on another address: no other addresses known for this site (pass --also=<url> to test one)
