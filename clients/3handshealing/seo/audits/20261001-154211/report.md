# SEO audit: three-hands-healing

- **Address:** https://three-hands-healing.netlify.app/
- **Run:** 2026-10-01 15:42 UTC, 1 page crawled, hand-client-seo 1.0.0
- **Score:** 88/100 (B)
- **Launch gate:** blocked by 2 faults
- **Findings:** 2 fail, 9 warn, 13 info; 67 checks passed, 1 skipped

| Area | Score | Fail | Warn | Info |
|---|---:|---:|---:|---:|
| crawlability | 92 | 0 | 1 | 2 |
| indexability | 75 | 1 | 0 | 1 |
| on-page | 92 | 0 | 1 | 0 |
| structured-data | 90 | 0 | 2 | 5 |
| social | 90 | 0 | 2 | 1 |
| links | 100 | 0 | 0 | 0 |
| images | 100 | 0 | 0 | 0 |
| performance | 100 | 0 | 0 | 0 |
| mobile | 100 | 0 | 0 | 2 |
| security | 100 | 0 | 0 | 1 |
| local | 59 | 1 | 2 | 1 |
| i18n | 100 | 0 | 0 | 0 |
| content | 92 | 0 | 1 | 0 |

## HAND can fix now

- **FAIL** (launch gate) handprotocol.org/threehandshealing/ is a second, indexable copy of this site (canonical: https://handprotocol.org/threehandshealing/) (https://handprotocol.org/threehandshealing/)
  - Fix: Point its canonical at https://three-hands-healing.netlify.app/, or 301 it here.
- **WARN** robots.txt has no "Sitemap:" line
  - Fix: Add "Sitemap: https://three-hands-healing.netlify.app/sitemap.xml". It is how Bing and other crawlers find the sitemap without a webmaster account.
  - Engine: Engine sites: delete public/robots.txt so the engine serves /robots.txt itself, with the Sitemap line on the right host.
- **WARN** the title is 71 characters; results cut off near 60 ("Three Hands Healing — EFT, energy healing & bodywork with Maria · Texas") (home)
  - Fix: Lead with the service and the place; keep it near 60 characters.
  - Engine: Engine sites: edit it in /admin/ → Search & sharing → Page title.
- **WARN** og:image is 1066×1600 (portrait): preview cards crop to about 1.91:1, so faces and words get cut (home)
  - Fix: Serve a 1200×630 crop.
  - Engine: Engine sites: the current engine builds a 1200×630 JPEG from the Featured photo; run sync-engine for this client.
- **WARN** og:image is a WEBP file: several apps that build link previews do not show it (home)
  - Fix: Use JPEG or PNG for the share image.
  - Engine: Engine sites: fixed by the current engine (JPEG share image); run sync-engine for this client.
- **INFO** 3 link(s) or button(s) are smaller than 44px on a phone
  - Evidence: a.brand 221×33, button.menu-btn 77×33, a.link 226×19
  - Fix: Give tap targets at least 44×44px.
- **INFO** 12 text block(s) render under 12px on a phone
  - Fix: Keep body text at 16px.
- **INFO** no AI-crawler rules in robots.txt: every crawler is allowed by the default group
- **INFO** the sitemap has no <lastmod> dates. Google uses lastmod when it is accurate; changefreq and priority are ignored
  - Fix: Emit the real last-edit date per URL.
- **INFO** https://three-hands-healing.netlify.app/index.html answers 200 (the canonical tag points at https://three-hands-healing.netlify.app/)
  - Fix: 301 it to the folder URL so there is one address.
  - Engine: Engine sites: the current engine already redirects /index.html; run sync-engine for this client.
- **INFO** missing response header(s): Referrer-Policy
  - Fix: Add them at the host (netlify.toml [[headers]]). Not a ranking factor; it is basic hygiene.
- **INFO** link-preview polish missing: og:image:width/height (lets the first share render without a delay) (home)
  - Fix: Add them.
  - Engine: Engine sites: all emitted by the current engine; run sync-engine for this client.
- **INFO** HealthAndBeautyBusiness: add a stable "@id" (for example https://three-hands-healing.netlify.app/#business) so other nodes can point at the business (home)
  - Fix: Correct the structured data.
- **INFO** no WebSite node: Google picks the site name shown above results from WebSite.name on the home page, then og:site_name, then the title (home)
  - Fix: Add { "@type": "WebSite", "name": "<business name>", "url": "<home page>" } to the home page's JSON-LD.

## Needs the owner

- **FAIL** (launch gate) there is no way to contact or book: no phone link, email link, form or booking link anywhere on the site (the "Book a session" button only scrolls the page) (home)
  - Fix: Get one real contact route from the owner (a booking link, a phone number, or an email) and wire the main button to it.
- **WARN** the page tells visitors it is not finished: "n · Sessions in Texas Booking and contact details will be added at launch getting healthier and happier Three Hands Heal" (home)
  - Fix: Get the missing detail from the owner (booking link, phone, prices) and replace the line.
- **WARN** no phone number on the site (home)
  - Fix: Ask the owner whether they take calls or texts. If yes, add the number as a tel: link; if no, leave it out on purpose.
- **WARN** the page names no city: nothing tells a search engine (or a visitor) where the business works (home)
  - Fix: Ask the owner for the city or service area, then put it in the title, the copy and the structured data. Do not guess it.
- **WARN** HealthAndBeautyBusiness: neither "address" nor "areaServed". Google lists address as required for local business results; a service-area business should state at least its city/region and areaServed (home)
  - Fix: Confirm the fact with the owner, then add it. Never fill it with a guess.
- **WARN** HealthAndBeautyBusiness: "telephone" is missing (home)
  - Fix: Confirm the fact with the owner, then add it. Never fill it with a guess.
- **INFO** no link to a Google Business Profile or a review page (home)
  - Fix: Once the Business Profile is verified, link to it (and to its "leave a review" link) from the site.
- **INFO** HealthAndBeautyBusiness: no opening hours (openingHoursSpecification). Add them once the owner confirms hours; by-appointment businesses can skip this (home)
  - Fix: Confirm the fact with the owner, then add it. Never fill it with a guess.
- **INFO** HealthAndBeautyBusiness: no "priceRange" (home)
  - Fix: Confirm the fact with the owner, then add it. Never fill it with a guess.
- **INFO** HealthAndBeautyBusiness: no "sameAs" links (Business Profile, Instagram, Facebook). Add them once the profiles exist (home)
  - Fix: Confirm the fact with the owner, then add it. Never fill it with a guess.

## PageSpeed

- mobile (Lighthouse on this machine): performance 99, SEO 100, accessibility 100, best practices 100; LCP 1.7 s, CLS 0.00, TBT 0 ms
- desktop (Lighthouse on this machine): performance 99, SEO 100, accessibility 100, best practices 100; LCP 0.9 s, CLS 0.00, TBT 0 ms

## Pages

| Page | Status | Indexable | Title | Words |
|---|---|---|---|---:|
| home | 200 | yes | Three Hands Healing — EFT, energy healing & bodywork with M… | 704 |

## Not checked this run

- www and the bare domain lead to one site: not a registrable domain (a subdomain has no www twin)
