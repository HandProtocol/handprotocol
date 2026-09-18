# Handoff: Courtney (project unfuckwithable) · updated 2026-09-17, evening

**For the person picking this up cold, or for koH after time away.**

## Orient in one paragraph

Courtney is a HAND Develop client. **The brand is her name, Courtney.** She sells
two courses: **The Energetic Reset** (a mini-course on protecting, clearing and
recovering your energy, $167 USD, full copy in hand) and **Becoming
Unfuckwithable** (the main course; copy, contents and price still to come).
Her real site will be built on **Kajabi**; HAND's pages are the design
reference for that build. On day one HAND made four design directions for the
one Reset page. On day two she picked **Halo** (white leads), so that direction
became a four-page site: a cover page, an about page, and one sales page per
course. Placeholder copy is underlined in dotted rose until her words arrive.

**Status: LIVE at https://handprotocol.org/project/unfuckwithable/
(short link https://handprotocol.org/unfuckwithable), noindex.
Waiting on (1) her copy for the about page and the main-course page,
(2) the main-course price, (3) both Kajabi checkout URLs.**

The project was renamed from `unfuckable-with` to `unfuckwithable` on
2026-09-17 (koH's ask), after her main course. Naming, settled the same
evening after two corrections from koH: the site's wordmark, titles and
copyright say **Courtney**; "Unfuckwithable" appears only as the main course's
name (Becoming Unfuckwithable) and in links to that page; "Unfuckable With" is
gone from the site and survives only in the archived `directions/` pages. Old
`unfuckable-with` links redirect.

## Start here (cold session)

1. Read this file, then open the live site above or
   `web/project/unfuckwithable/index.html` from disk (everything works from
   disk; there is no JavaScript on the site pages).
2. `unfuckwithable/PRODUCT.md` and `DESIGN.md` are the impeccable context
   files. Load them before any design work:
   `IMPECCABLE_CONTEXT_DIR=unfuckwithable node ~/.claude/skills/impeccable/scripts/load-context.mjs`.
3. When her copy arrives: paste it in and delete the `class="todo"` span
   around the line it replaces. Grep `todo` under `web/project/unfuckwithable`
   to see what is still placeholder (the `directions/` archive has none).
4. Every change to the live preview goes through `main`; see "How to update
   the live preview". Never push the working branch as a whole, other sessions
   share this checkout.

## What shipped, in order

| Date | Branch commit | On `main` as | What |
|---|---|---|---|
| 2026-09-16 | `2ad07c73a` | `dbcbd3a42` | Gallery + four design directions + thumbnails + routing. |
| 2026-09-16 | `4c3b4210d` | `e3a0f76a5` | Handoff for the live state. |
| 2026-09-17 | `672cf6175` | `9b7cd2b79` | Courtney's Giza photo in all four directions. |
| 2026-09-17 | `6cb95dd2e` | `6ea115677` | Halo chosen. Rename to `unfuckwithable`, four-page site on Halo, directions archived under `directions/`, redirects for the old links. Wordmark still "Unfuckable With". |
| 2026-09-17 | see below | see below | Brand corrected to Courtney on every site page; handoff and context files follow. |

The last row's shas are filled in by the docs commit that follows the landing
(look at `git log --oneline -3 -- web/project/unfuckwithable`).

## The brief, as koH gave it

**2026-09-16.** Name "Unfuckable With". Hosting Kajabi, later. Direct, not too
many sections. Palette strictly light gold, black, rose pink, white. Include her
image. At least three designs. Full copy for the one offer page was supplied.
koH's spelling of her name is "Courtney"; no last name; do not guess one.

**2026-09-17, evening.** "Use theme #3 [Halo]. A cover page for the website,
an about me page, and 2 separate sales pages, one for my mini course and one
for my main course Becoming Unfuckwithable. We will add all the copy later.
Rename the project from unfuckablewith to unfuckwithable." Then, mid-build:
"Unfuckwithable is only one course, not the whole site." And after the first
landing: "Unfuckable With is not the brand, the brand is Courtney. The only
thing that should say unfuckwithable is the one page that we made first."
Read as: wordmark = Courtney; the course keeps its name. If koH meant that the
Reset page (the first page built) should carry the Unfuckwithable name
instead, that is a one-line change in the nav and the two page titles.

## The site

Four pages, one stylesheet (`site.css`), no JavaScript, the same header and
footer on all of them (the wordmark "Courtney", three nav links, one
page-specific action).

| Page | Path | Hero | Sections | Copy state |
|---|---|---|---|---|
| Cover | `index.html` | `.hero--stack`: headline full width, subline and buttons below left, the halo portrait below right | Two doors (both courses, main one marked gold) → about teaser with pull line → aura closer pointing at the Reset | Headline and subline are HAND's draft (her "Stop absorbing" line, placed by HAND); the about teaser needs two lines from her |
| About | `about/` | `.hero`: side by side, "Hi, I'm Courtney." | "How I got here" (two columns) → "What I believe" (three beliefs on the gold thread) → "Work with me" (two doors) | Her story, credentials and the belief lines are drafts; only the argument lifted from her Reset copy is hers |
| The Energetic Reset | `energetic-reset/` | `.hero`: side by side, $167 | The same five beats as the chosen Halo direction | **Her words, verbatim** (same mechanical edits as before, see "Copy notes") |
| Becoming Unfuckwithable | `becoming-unfuckwithable/` | `.hero--center`: centered headline, price placeholder, halo portrait beneath | Problem/promise → "By the end you will have" (8) → "Inside the course" (6 modules on the gold thread) → aura offer → one line back to the Reset | **All placeholder**, every line underlined |

Recurring elements are described in `DESIGN.md` (halo portrait, gold thread,
aura offer, two doors, draft marker). The price placeholder is `$•••` with
`class="todo"`; replace the whole `<b>` when she gives a number.

The four original directions and the pick gallery live on unchanged at
`web/project/unfuckwithable/directions/` (Noir, Rosé, Halo, Gilt; gallery at
`directions/index.html`, which now says Halo was chosen). They are an archive.
Delete the folder at launch, or earlier if koH says so; nothing on the site
links to it.

## Where things are

| What | Path |
|---|---|
| Site pages | `web/project/unfuckwithable/index.html`, `about/`, `energetic-reset/`, `becoming-unfuckwithable/` |
| Site stylesheet | `web/project/unfuckwithable/site.css` (derived from `directions/halo/style.css`) |
| **The one shared image** | `web/project/unfuckwithable/assets/feature.jpg` (1000×1428, her Giza photo) |
| Archived directions + gallery | `web/project/unfuckwithable/directions/` (`gallery.*`, `_portfolio.*`, `_shots/`, `noir/ rose/ halo/ gilt/`) |
| Routing | `netlify.toml` and `web/_redirects`: `/unfuckwithable`, `/project/unfuckwithable` → `/project/unfuckwithable/`; `/unfuckable-with`, `/project/unfuckable-with`, `/project/unfuckable-with/` → the new cover; `/project/unfuckable-with/*` → `/project/unfuckwithable/directions/:splat`; `X-Robots-Tag: noindex, nofollow` on `/project/unfuckwithable/*` |
| Screenshot tool | `unfuckwithable/tools/shot.mjs` (`node unfuckwithable/tools/shot.mjs <index|about|energetic-reset|becoming-unfuckwithable|directions|directions/halo> [outdir]`) |
| Context files | `unfuckwithable/PRODUCT.md`, `unfuckwithable/DESIGN.md` |
| This handoff | `unfuckwithable/HANDOFF.md` |
| Memory | `~/.claude/projects/-home-koh-Documents-handprotocol/memory/hand-client-unfuckable-with.md` |

## The image

Unchanged from the previous handoff: her Giza photo (a full scene, not a
headshot) is clipped in an oval and scaled 1.4 at origin 52% 52% so the
doorway fills the frame; her feet sit at about 77% of the image height and the
sun at about 21%, keep both. No grayscale or duotone. The alt text describes
the scene and does not name her (nobody has confirmed the woman in the photo
is Courtney). The file is ~1000px wide and soft on large retina screens; ask
for the original before the Kajabi build. To swap it, overwrite
`assets/feature.jpg` and update `width`/`height` on the `img` tags if the
aspect changes.

## Copy notes

The Reset page keeps her words verbatim with the same mechanical edits as
before: "w/o" written out, list dashes removed, list items capitalised, the
section headlines are her own phrases. HAND's words on that page: the button
labels, the eyebrow "The mini-course", the copyright line, the footer note and
the one line pointing at the main course.

Worth a gentle mention before launch, still as she wrote them: "Palo-santo,
sage, and breathwork **is** not enough" (three things, so "are"); "everyday"
where "every day" is meant (three times); "Palo-santo" is usually "palo santo".

Draft copy on the other three pages was written in her register from her Reset
copy. It invents no biography, no credentials, no numbers and no price. Where
a fact is needed the placeholder says so in plain words ("Courtney's story, in
her words: …", "How many modules, how long it runs…").

## Open items

1. **Her copy** for the cover subline and about teaser, the whole about page,
   and the whole main-course page. Everything underlined in rose.
2. **The main-course price** (`$•••` on the cover, about, and main-course pages).
3. **Both Kajabi checkout URLs.** Every buy button is `href="#checkout"` with
   a `data-checkout` attribute.
4. **Confirm the woman in the photo is Courtney**, then name her in the alt text.
5. **Ask for the original photo file.**
6. **Testimonials and socials** are still missing; none were supplied.
7. Delete `directions/` at launch.
8. **Root `HANDOFF.md`** carries an entry for this work; like its neighbours
   it is uncommitted in the shared checkout.

## How to update the live preview

The preview is served from `main` (Netlify site `handprotocol`, id
`0d46269a-789a-4e42-a00e-7f30e79c5869`, publish dir `web`, no build step).
Other Claude sessions work in this same checkout and branch, so:

1. Stage by explicit path only (`git add -- web/project/unfuckwithable unfuckwithable netlify.toml web/_redirects`), never `-A`.
2. Commit on the branch. Plain imperative message, no trailer (matches the log).
3. Fetch `main` over HTTPS as **cryptokoh** (SSH fails from Claude shells, and
   the active `gh` login is zantrra, which cannot push):
   `TOK=$(gh auth token -u cryptokoh)` then
   `git -c credential.helper= -c "credential.helper=!f(){ echo username=cryptokoh; echo password=$TOK; }; f" fetch https://github.com/HandProtocol/handprotocol.git main:refs/remotes/origin/main`.
4. `git worktree add --detach <scratch> origin/main`, `git cherry-pick <sha>`
   there (no `-q`, it silently skips), push `HEAD:main` with the same
   credential helper, re-fetch, assert `origin/main` equals your HEAD, then
   `git worktree remove` the scratch.
5. Watch the deploy: `netlify api listSiteDeploys --data '{"site_id":"0d46269a-789a-4e42-a00e-7f30e79c5869","per_page":3}'`
   until the row for your commit is `ready` (about a minute), then curl the
   live pages. A deploy in `error` state is a real failure here; read
   `error_message`.

## Moving to Kajabi

Four HTML files and one CSS file, no JavaScript, Google Fonts (Marcellus +
Jost). Motion is CSS only and honours reduced motion. Each page ports into a
Kajabi landing page as custom code blocks (section HTML plus `site.css` in the
page's custom CSS / header code), or the four together as the basis for a
custom Kajabi theme. Kajabi's own checkout stays the checkout. Keep the palette
strict; the photo's sandstone counts as gold. Remove the footer preview note
and every `todo` class before launch.

## Verified

- **2026-09-16 and 2026-09-17 (photo)** as in the previous handoff: all four
  directions and the gallery, headless Chromium at four viewports, no errors,
  no overflow, live checks after each deploy.
- **2026-09-17, evening, first landing (`6ea115677`).** Live checks after the
  deploy: all four pages, `site.css`, `assets/feature.jpg`, the archived
  gallery and `directions/halo/` return 200 with the right content types;
  `/unfuckwithable`, `/unfuckable-with`, `/project/unfuckable-with` and
  `/project/unfuckable-with/` 301 to the new cover; `/project/unfuckable-with/halo/`
  and an old `_shots/` asset 301 into `directions/`; `X-Robots-Tag: noindex,
  nofollow` present.
- **2026-09-17, evening (this build).** Headless Chromium at 1440×900,
  820×1180 and 390×844, first screen and full page, all four site pages plus
  the archived Halo page and gallery from their new location: no console
  errors, no horizontal overflow, images load from the new `assets/` path.
  Fixed on sight: the mobile header dropped the page action onto its own row
  (grid auto-placement), the cover headline floated away from its subline, and
  the first rose-fill draft marker turned the main-course page pink (now a
  dotted underline). Live checks after the deploy are recorded in the docs
  commit that follows.
- **Not checked:** Safari, Firefox, a real phone, Lighthouse.
