# SEO audit: three-hands-healing

- **Address:** https://three-hands-healing.netlify.app/
- **Run:** 2026-10-01 15:51 UTC, 1 page crawled, hand-client-seo 1.0.0
- **Score:** 92/100 (A)
- **Launch gate:** blocked by 2 faults
- **Findings:** 2 fail, 3 warn, 8 info; 72 checks passed, 4 skipped

| Area | Score | Fail | Warn | Info |
|---|---:|---:|---:|---:|
| crawlability | 100 | 0 | 0 | 1 |
| indexability | 75 | 1 | 0 | 0 |
| on-page | 100 | 0 | 0 | 1 |
| structured-data | 92 | 0 | 1 | 4 |
| social | 100 | 0 | 0 | 0 |
| links | 100 | 0 | 0 | 0 |
| images | 100 | 0 | 0 | 0 |
| performance | 100 | 0 | 0 | 0 |
| mobile | 100 | 0 | 0 | 0 |
| security | 100 | 0 | 0 | 1 |
| local | 67 | 1 | 1 | 1 |
| i18n | 100 | 0 | 0 | 0 |
| content | 92 | 0 | 1 | 0 |

## HAND can fix now

- **FAIL** (launch gate) handprotocol.org/threehandshealing/ is a second, indexable copy of this site (canonical: https://handprotocol.org/threehandshealing/) (https://handprotocol.org/threehandshealing/)
  - Fix: Point its canonical at https://three-hands-healing.netlify.app/, or 301 it here.
- **INFO** no AI-crawler rules in robots.txt: every crawler is allowed by the default group
- **INFO** the title is 63 characters and may be cut off in results ("EFT / Tapping and Energy Healing in Texas | Three Hands Healing") (home)
  - Fix: Trim toward 60 characters if the cut would hide something important.
- **INFO** missing response header(s): Referrer-Policy
  - Fix: Add them at the host (netlify.toml [[headers]]). Not a ranking factor; it is basic hygiene.

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

- www and the bare domain lead to one site: not a registrable domain (a subdomain has no www twin)
- PageSpeed Insights scores: PageSpeed was not run (add --psi)
- Core Web Vitals are in the good range: PageSpeed was not run (add --psi)
- the page works at phone width: the browser lab was not run (add --lab)
