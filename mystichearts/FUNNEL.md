# Mystic Hearts funnel: design flow

*2026-11-01, revised twice the same night (the dissolve replaces the leaf turn). Design only, nothing built. Visual version, with a working
sketch of the page turn: the "Mystic Hearts funnel" artifact.*

koH's ask: whichever of the four chapters someone opens, the path should carry them to the
calendar (what is unfolding), then suggest coming out to the land and signing up. Keep the
number of steps to the best action small, and give the chapters a direct way to the calendar and
to signup or get in touch.

## Revision 5 (2026-11-05): one door asks what brings you, every intent is an Akosi service

koH, 2026-11-05: the funnels must "properly guide someone to fill out the right info to get to the
best get in touch form", with "the complete booking". The first slip now asks what brings the
visitor and opens one slip per answer: Come out to the land (`visit`), Join a gathering, Host a
gathering (new service `host`: the space, the part of the day, how many, what kind), Stay on the
land (new service `stay`: arrival day, nights, people), Join the community or residency (Say hello
with a topic and four short questions), A session with a practitioner (opens later; Keep me
posted), Something else. Each slip collects only what the collective needs to say yes, and every
answer lands in the admin's Requests or Messages. The plan, slices and koH's eight decisions:
`../kohsi/docs/plans/2026-11-05-mystic-hearts-complete-booking.md` (record 0087). The pages, the
dissolve, the slips and Keep reading stay as revisions 2 to 4 settled them.

## The shape: read, see, come

1. **Read.** The stage and the four chapters (Our vision, How we live, The land, Gatherings).
2. **See.** The What's on calendar: gold days hold a gathering, softly lit days are open to visit.
3. **Come.** Two asks, always together:
   - **Come out to the land** (the best action: a visit request, confirmed by a person);
   - **Keep me posted** (the safety net: one email field).

Every screen ends by pointing at the next beat. No screen is a dead end.

## Revision (2026-11-01 night): one book, closing in a circle

koH, after reading the first version: the reader must be able to get back to the four chapters
from every other screen too, a full circle; be mindful of how they get there and how the cards are
presented; a swipe or book page-turn effect, unless that is too much. This revision replaces
"What changes" item 1 below and settles decision 1.

- **One book, five pages, in a circle:** I Our vision · II How we live · III The land ·
  IV Gatherings · ✦ What's on. Turning on past What's on begins again at Our vision ("Begin
  again · Our vision →" in its running foot). Every page has a running foot (previous and next
  page by name).
- **Pages turn, slips rise.** The pages are the story and the calendar. The actions (Come out to
  the land, Keep me posted, Say hello) are slips laid over whatever page you were on. The ribbon
  of five pages stays on screen under every slip, so a chapter is always one tap away.
- **Every slip ends in Keep reading:** the four chapters as small cards, always I to IV, numeral,
  name and one line. A filled dot marks a chapter read this visit, a hollow one is still waiting.
  No counts, nothing stored. Tapping a card lowers the slip and turns to that chapter.
- **Ways in:** the chapter row opens its chapter; the gold hero button opens What's on; the glass
  one opens What's on with the Come out slip up (closing it shows the calendar, not the video);
  Get in touch opens the Say hello slip over What's on; hash links open the page or slip named.
- **The turn: the leaf turn** (recommended). One leaf lifts on its spine and falls left, with a
  shadow over the page beneath, about 0.75 s. On a phone the thumb holds the page edge: past a
  third, or a quick flick, finishes the turn; a short drag settles back. Buttons that act
  (See what is unfolding, a chapter card) always turn forward; the ribbon takes the short way
  round the circle. Reduced motion: a fade. Fallback if it feels like a costume: a plain swipe.
- **Not a real book curl.** A bending, peeling paper curl needs a page-flip library or WebGL,
  fights the foggy glass (Safari flattens or flickers 3D under a blurred backdrop), stutters on
  older phones, and makes long scrolling pages a gimmick.
- **Build notes:** a turning page is solid night, not glass, so the two pages never show through
  each other; the new page starts at its top; the koordi calendar stays mounted across turns; a
  drag starting inside the calendar or a form field is never a turn; vertical scroll wins when
  the first movement is vertical. One `components/book.tsx` replaces `story-sheet.tsx` and
  `contact-modal.tsx`; framer-motion (already a dependency) drives the turn. Check on an iPhone
  in Safari for the glass case.
- **Decisions now:** (1) one book in a circle, (2) leaf turn, swipe or fade, (3) read dots or
  plain cards, plus the three below (email only, The land opens the calendar, hash links).

## Revision 4 (2026-11-02): open door on any event, and who is welcome, said plainly

koH: "open house mode is for anyone, allow it to be an option when setting calendar events. make
sure to be clear on the display of the events who is welcome and how to join, lets make sure to
have all the features of partiful or eventbrite and when we work on these features make sure to
import to koordi."

- **The sketch** (`design/funnel/dissolve.html`): sage now means *open to all, just come* and gold
  *ask to join*; the community meal is open door too, to show it is a choice on any event. Every
  event's dock says **Who is welcome** (the host's words) and **How to join** (worked out from the
  admission and the seats, so it never disagrees with the button), who holds it, how many are
  coming and the spots left, with Add to my calendar and Share. A full event offers the waitlist
  (the sound bath in the sample). The strip tags each event open to all or ask to join.
- **koordi**: open door and the welcome line are being built now (feature 0062 and 0063, brief
  `../kohsi/docs/briefs/2026-11-02-open-door-and-who-is-welcome.md`; local only, no deploy).
  Every Partiful and Eventbrite feature is a koordi feature entry (0062 to 0078), with the table
  and the build order in `../kohsi/docs/plans/2026-11-01-open-houses-and-the-calendar.md`.

## Revision 3 (2026-11-01 night): the slips work, and a real calendar

koH on the dissolve sketch: the features look good; the get-in-touch features did not work, and
the calendar needed design matching the rest. Then: a calendar with Come out to the land, maybe
open houses later, planned with koordi. All in `design/funnel/dissolve.html` (nothing is sent; a
mock send of one second):

- **Three slips rise over the page**, the leaf dimmed behind and the ribbon still live: Come out
  to the land (moonlight), Keep me posted (gold), Say hello (raspberry). Their words gather out of
  light like a page. Each checks name and email, shows Sending…, then a finish: what happens next,
  the other ask (Also keep me posted, or Come out to the land), and **Keep reading**: the four
  chapter cards with a dot for each one read. Esc or × closes; Enter sends.
- **Ways in:** Get in touch (top right) opens Say hello over any page; Host a gathering opens it
  with a first line written; the dock opens the visit slip on the chosen day; hash links
  `#visit`, `#keep-posted`, `#hello`, `#whats-on` work on arrival and on a live page.
- **The calendar:** one month per page, round days. Weekdays open to visit are numerals with a
  moonlit dot; gatherings are gold, breathing, with a turning halo; **open houses** (new, sample:
  first Saturday, 10 to 2) are sage leaf-cut tiles; full and new moons are marked. A strip of
  what is coming drifts past (tap to choose). The dock beside the month tells the chosen day in
  words and changes its button: Come out to the land (choose two hours), Ask to join (a person
  says yes), or Come to the open house (a count, no wait, Add to my calendar). Months turn with
  the dissolve. "As it is today" shows the honest empty state.
- **koordi side:** `../kohsi/docs/plans/2026-11-01-open-houses-and-the-calendar.md` (open
  admission, repeating gatherings, the calendar options, the followable feed, newsletter topics,
  the monthly letter, the after-open-house note). Five decisions there for koH.

## Revision 2 (2026-11-01 late): the dissolve, and a light for every page

koH on the leaf turn: not a fan. Instead of a page flip, the words should shimmer and come apart
like dispersing particles, then the next page's words appear; and the same gold button on every
page felt static. Working sketch: `design/funnel/dissolve.html` (open it in a browser; arrow keys
or the ribbon turn the pages; reduced motion gets a plain fade).

- **The dissolve replaces the leaf turn.** Leaving a page, each letter of the heading and each word
  of the text brightens, blurs and drifts up and away, top to bottom, and motes of light lift off
  where it stood. The next page's words gather out of light: motes travel in and the words sharpen
  into place. About 0.6 s out and 0.9 s in. Drawn on one canvas over the sheet plus Web Animations
  on the words, so there is no library, no 3D and no clash with the foggy glass.
- **Each page carries its own light.** The page's colour tints the motes, the italic in the
  headline, the glow on the sheet and the dot on the ribbon:
  I Our vision gold · II How we live raspberry · III The land sage · IV Gatherings ember ·
  ✦ What's on moonlight.
- **Each page has its own button**, so no two pages ask the same way:
  - Our vision: **See what is unfolding**, a pill with a gold halo that slowly circles its edge
    and a sheen crossing the words.
  - How we live: **Feel it in person**, a raspberry pill that breathes.
  - The land: **Choose a day on the land**, a leaf-cut sage shape that flips its corners and grows
    a root line on hover.
  - Gatherings: **Join the circle**, an ember that flickers like the fire circle.
  - What's on: **Come out to the land**, a pale pill with a small moon that waxes and wanes.
  - The second action on every page stays quiet: words with a hairline underneath.
- **The next-page link breathes** (koH, same night): the running foot's next link, bottom right,
  is a light warm cream with a soft gold glow that swells and settles every 4.5 s (faster on
  hover). Reduced motion: a steady soft glow.
- **Build notes:** split the words at render (aria-label keeps the sentence whole for screen
  readers); only words in view throw motes; the koordi calendar is faded, not split; the motes
  canvas sits above the sheet and ignores pointers. Check Safari on an iPhone for the moving
  `filter: blur` on many words, and fall back to opacity only if it stutters.

## The calendar, refined (2026-11-01 night)

koH: the calendar needs more refining. Seen live at 390 and 1440 wide, it works (a day, then Come
out to the land, opens koordi's visit form on that day) but:

1. **One honest line when nothing is planned.** Today "Nothing on the calendar yet" sits above 22
   lit days, and a second "No gatherings" line sits under them. Refined: one line in the strip,
   "First gatherings open fall 2027. Until then the land is open on weekdays, to walk and talk."
2. **Only gatherings glow.** Today every open weekday is a lit tile with a halo. Refined: gathering
   days gold and breathing; open days plain numerals with a small dot; resting days faded; today a
   thin ring.
3. **A calendar, not a wall.** Tiles about 118 by 96 on wide push the next step below the fold.
   Refined: round days at most 42 wide, one month per page; on wide the dock sits beside the grid,
   on a phone under it.
4. **A day is chosen from the start** (the first open day), told in words in the dock; a tap on
   another day changes the words only. No day panel, no "Close this day".
5. **One gold button:** Come out to the land, or Ask to join on a gathering day. Hosting goes to
   Say hello as a link. Past events appear only once there are some.
6. **Three layers above the grid, not seven:** heading, strip, month. The way tabs go (the dock is
   the visit way); the legend is two keys under the grid.

Where it lives: mostly koordi's `<koordi-calendar>` element, added as options so other businesses
keep today's look (calm style, month per page, first lively day chosen, one-line day, host as a
link, past hidden while empty), plus a new event that tells the page which day is chosen. Split
`calendar.js`'s styles out first (864 lines). The heading, strip words and dock are the site's.
koordi deploys first; the site works with either version.

For the owner, not the design: visit hours are still the default weekdays 9 to 5. If people
mostly come on weekends, the owner sets that in the console.

Decisions added: (7) the six refinements, as options in koordi; (8) one month per page, or keep
five rolling weeks.

Sketch note: the artifact's sketch is a working mock (no mail is sent). Its first version used
`<form>` submits, which claude.ai's sandboxed frame blocks before the submit event fires, so Keep
me posted and Send did nothing there; it now uses plain buttons. The live site's Come out to the
land was checked and works.

## What changes (first version)

1. **One sheet instead of two.** Today the chapters and What's on are separate sheets, so getting
   from a chapter to the calendar means closing one and opening the other. One sheet, one tab bar:
   `Our vision · How we live · The land · Gatherings · ✦ What's on` (the last tab gold). Say hello
   stays reachable from the header's Get in touch and from the calendar.
2. **A bridge at the end of every chapter.** A card with one line that fits the chapter and two
   buttons: gold **See what is unfolding** (opens What's on) and glass **Keep me posted** (opens an
   email field in place, no navigation).
   - Our vision: "The dream is already taking root."
   - How we live: "These principles are lived on the land, not only read."
   - The land: "Ten acres, open on chosen days." Its gold button reads **Choose a day on the
     land** and opens the calendar instead of jumping straight to the visit form.
   - Gatherings: "The first gatherings are being set now." Host a gathering stays as a link.
3. **A next-step dock on the calendar.** Pinned under the calendar: gold **Come out to the land**
   (first open day, or the day chosen) and the one-field **Keep me posted**. It replaces the
   "Something else in mind? Say hello" line, which moves into the dock as a small link.
4. **Keep me posted is its own one-field form.** Email only (name optional), separate from Say
   hello's three fields. For now it posts to HAND's feedback function with
   `source: "mystichearts-list"`; when koordi's list lands (record 0040 C1, C2 and C5) it moves
   there with no change on the page.
5. **Every finish line points at the other ask.**
   - Visit request sent: "A person confirms by hand." Then Keep me posted (if not already) and the
     next gathering on the calendar.
   - Signed up: "You are on the list." Then Come out to the land.
   - Say hello sent: "Received, with thanks." Then See what is unfolding.
6. **Links that land inside the funnel.** The sheet state lives in the address hash: `#whats-on`,
   `#visit`, `#keep-posted`, `#vision`, `#principles`, `#land`, `#gatherings`. A flyer QR, an
   Instagram bio or a text message can open the calendar directly, and the back button closes the
   sheet.

The hero stays as it is: gold What's on and glass Visit the land, Get in touch in the header,
the chapter row at the foot.

## Steps to the best action

| From | To | Today | Proposed |
| --- | --- | --- | --- |
| Our vision or How we live | the calendar | 2 taps (close, then What's on) | 1 tap |
| Our vision or How we live | any action | none offered | 1 tap |
| Any chapter | signup | 2 taps (close, then Get in touch) and three fields | 1 tap and one field |
| The land | a visit request | 1 tap, but skips the calendar | 2 taps (calendar, then a day), seeing what is on |
| The calendar | a visit request | 1 tap, on a tab above the calendar | 1 tap, on a dock under it where the eye lands |
| Visit request sent | anything else | dead end | 1 tap |

## Decisions for koH

1. **One sheet** for chapters and What's on (recommended), or keep two sheets and add the bridge only.
2. **Keep me posted asks for email only** (recommended), or email and name.
3. **The land's button opens the calendar** (recommended, so they see what is on), or goes straight
   to the visit form as today.
4. **Hash links** for every view (recommended).

## Build (one session after sign-off)

- Site only, no koordi change: `mystic-hearts-page.tsx`, `story-sheet.tsx` and `contact-modal.tsx`
  fold into one funnel sheet; new `keep-posted.tsx`; bridge lines in `copy.ts`; dock and bridge
  styles in `app/globals.css`.
- Later, with koordi: a compact "next three days" strip inside each bridge (the calendar's marquee
  in a small mode), so a chapter reader can pick a day without opening the full calendar; and the
  list moving to koordi (C5).
- Verify at 375 and 1440 wide, keyboard and reduced motion, then `./scripts/publish-mhh.sh`.
