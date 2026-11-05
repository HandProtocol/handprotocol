# SEO audit: three-hands-healing

- **Address:** https://three-hands-healing.netlify.app/ (local build)
- **Run:** 2026-10-01 15:48 UTC, 1 page crawled, hand-client-seo 1.0.0
- **Score:** 95/100 (A)
- **Launch gate:** blocked by 1 fault
- **Findings:** 1 fail, 5 warn, 13 info; 65 checks passed, 7 skipped

| Area | Score | Fail | Warn | Info |
|---|---:|---:|---:|---:|
| crawlability | 100 | 0 | 0 | 2 |
| indexability | 100 | 0 | 0 | 1 |
| on-page | 100 | 0 | 0 | 1 |
| structured-data | 92 | 0 | 1 | 4 |
| social | 92 | 0 | 1 | 1 |
| links | 100 | 0 | 0 | 0 |
| images | 92 | 0 | 1 | 1 |
| performance | 100 | 0 | 0 | 0 |
| mobile | 100 | 0 | 0 | 2 |
| security | 100 | 0 | 0 | 0 |
| local | 67 | 1 | 1 | 1 |
| i18n | 100 | 0 | 0 | 0 |
| content | 92 | 0 | 1 | 0 |

## HAND can fix now

- **WARN** 1 image(s) weigh more than 400 KB: /img/photos/maria-arch-red-door.jpg (432 KB, 1066×1600) (home)
  - Fix: Resize to the width it is shown at and serve WebP or AVIF; on Netlify use /.netlify/images?url=…&w=…&fm=webp.
- **WARN** og:image is 1066×1600 (portrait): preview cards crop to about 1.91:1, so faces and words get cut (home)
  - Fix: Serve a 1200×630 crop.
  - Engine: Engine sites: the current engine builds a 1200×630 JPEG from the Featured photo; run sync-engine for this client.
- **INFO** 3 link(s) or button(s) are smaller than 44px on a phone
  - Evidence: a.brand 221×33, button.menu-btn 77×33, a.link 226×19
  - Fix: Give tap targets at least 44×44px.
- **INFO** 12 text block(s) render under 12px on a phone
  - Fix: Keep body text at 16px.
- **INFO** no AI-crawler rules in robots.txt: every crawler is allowed by the default group
- **INFO** the sitemap has no <lastmod> dates. Google uses lastmod when it is accurate; changefreq and priority are ignored
  - Fix: Emit the real last-edit date per URL.
- **INFO** 2 image(s) over 120 KB are JPEG/PNG: /img/photos/maria-arch-laughing.jpg (272 KB), /img/photos/maria-arch-open-hand.jpg (371 KB) (home)
  - Fix: WebP or AVIF is usually half the size at the same quality.
- **INFO** https://three-hands-healing.netlify.app/index.html answers 200 (the canonical tag points at https://three-hands-healing.netlify.app/)
  - Fix: 301 it to the folder URL so there is one address.
  - Engine: Engine sites: the current engine already redirects /index.html; run sync-engine for this client.
- **INFO** the title is 63 characters and may be cut off in results ("EFT / Tapping and Energy Healing in Texas | Three Hands Healing") (home)
  - Fix: Trim toward 60 characters if the cut would hide something important.
- **INFO** link-preview polish missing: og:image:width/height (lets the first share render without a delay) (home)
  - Fix: Add them.
  - Engine: Engine sites: all emitted by the current engine; run sync-engine for this client.

## Needs the owner

- **FAIL** (launch gate) there is no way to contact or book: no phone link, email link, form or booking link anywhere on the site (the "Book a session" button only scrolls the page) (home)
  - Fix: Get one real contact route from the owner (a booking link, a phone number, or an email) and wire the main button to it.
- **WARN** the page tells visitors it is not finished: "n · Sessions in Texas Booking and contact details will be added at launch getting healthier and happier Three Hands Heal" (home)
  - Fix: Get the missing detail from the owner (booking link, phone, prices) and replace the line.
- **WARN** no phone number on the site (home)
  - Fix: Ask the owner whether they take calls or texts. If yes, add the number as a tel: link; if no, leave it out on purpose.
- **WARN** HealthAndBeautyBusiness at @graph[1]: "telephone" is missing (home)
  - Fix: Confirm the fact with the owner, then add it. Never fill it with a guess.
- **INFO** no link to a Google Business Profile or a review page (home)
  - Fix: Once the Business Profile is verified, link to it (and to its "leave a review" link) from the site.
- **INFO** HealthAndBeautyBusiness at @graph[1]: no "address". Fine for a service-area business that hides its address; add at least addressLocality + addressRegion + addressCountry once the owner confirms the city (home)
  - Fix: Confirm the fact with the owner, then add it. Never fill it with a guess.
- **INFO** HealthAndBeautyBusiness at @graph[1]: no opening hours (openingHoursSpecification). Add them once the owner confirms hours; by-appointment businesses can skip this (home)
  - Fix: Confirm the fact with the owner, then add it. Never fill it with a guess.
- **INFO** HealthAndBeautyBusiness at @graph[1]: no "priceRange" (home)
  - Fix: Confirm the fact with the owner, then add it. Never fill it with a guess.
- **INFO** HealthAndBeautyBusiness at @graph[1]: no "sameAs" links (Business Profile, Instagram, Facebook). Add them once the profiles exist (home)
  - Fix: Confirm the fact with the owner, then add it. Never fill it with a guess.

## Pages

| Page | Status | Indexable | Title | Words |
|---|---|---|---|---:|
| home | 200 | yes | EFT / Tapping and Energy Healing in Texas / Three Hands Hea… | 704 |

## Not checked this run

- http:// sends visitors to https://: local build
- www and the bare domain lead to one site: local build
- no second indexable copy of the site on another address: local build
- the page is served compressed: local build
- baseline security headers are present: local build
- PageSpeed Insights scores: PageSpeed was not run (add --psi)
- Core Web Vitals are in the good range: PageSpeed was not run (add --psi)
