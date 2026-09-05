# Three Hands Healing media

Place approved website media in this directory before launch.

- `hero-eft-poster.jpg`: compressed still poster for the homepage hero.
- `hero-eft-desktop.webm` and `.mp4`: desktop hero loop.
- `hero-eft-mobile.webm` and `.mp4`: portrait-oriented mobile hero loop.
- `practitioner-portrait.jpg`: owner-provided 4:5 portrait, ideally 1200 by 1500 pixels. Compose with enough room for `object-position: 50% 28%`, compress for web delivery, and replace the bracketed image alt text in `index.html` with the practitioner’s name.
- `human-touch.*`, `eft-tapping.*`, `energy-healing.*`, `reconnect.*`, `being-heard.*`, and `integration.*`: future scene media.

The current page uses an intentional CSS-based environmental fallback, so it remains fast and visually complete until these assets are delivered. Use optimized, muted, silent files and keep video decorative.

## Design-preview photo set (image1–image11)

Photographer proofs (Aneta Hayne Photography, watermarked) used by the on-page
design switcher. Replace with licensed, unwatermarked finals before launch.

- Design 1 Gateway: image1 (practitioner portrait), image2 (connection)
- Design 2 Meadow: image7 (hero), image6 (EFT), image11 (portrait), image8 (energy), image10 (connection)
- Design 3 Forest: image9 (hero), image3 (portrait), image5 (connection)
- Unused: image4 (soft focus + subject-left composition fights the text layouts)

## Licensed finals (2026-09-04) — `photos/`

Maria's ten licensed, unwatermarked finals (Aneta Hayne, Canon 5D IV, delivered
2026-09-04 as `clientDownloads-8Z3NsBxP4.zip`, 17–30 MB each). The raw drop stays
local/untracked (`threehandshealing/*.zip` is gitignored); these are web copies at
1600 px on the long edge, JPEG q≈90, plus `-700.jpg` variants for the three in use.

| File | Orig | Content | Used by |
|---|---|---|---|
| maria-arch-laughing.jpg (+ -700) | DQ6A6168 | portrait · laughing under the limestone arch, red door behind | **cathedral hero** |
| maria-arch-red-door.jpg (+ -700) | DQ6A6144 | portrait · standing barefoot in the open red door | **cathedral about** |
| maria-arch-open-hand.jpg (+ -700) | DQ6A6119 | portrait · under the wide arch, one open hand reaching to camera | **cathedral book** |
| maria-arch-leaning.jpg | DQ6A6081 | portrait · full-length, leaning in the arch, red door open | free — future pages |
| maria-eft-tapping.jpg | DQ6A5902 | portrait · black tank, demonstrating EFT tapping on the side of the hand | free — EFT / funnel |
| maria-arch-door-hand.jpg | DQ6A6007 | landscape · close at the arch door, hand on the door edge, pool behind | free — headers |
| maria-arch-palms.jpg | DQ6A6054 | landscape · beside the arch wall, palms behind, calm | free — wide backgrounds |
| maria-meadow-smile.jpg | DQ6A5635 | landscape · close warm smile, kimono, meadow | free — trust / about |
| maria-forest-kimono.jpg | DQ6A5701 | landscape · forest, arms crossed, kimono | free — about / nature |
| maria-meadow-arms-wide.jpg | DQ6A5748 | landscape · rust hat + kimono, arms flung wide, joyful | free — expansive heroes |

The proofs `image1–11.jpeg` above map onto these (image1≈red-door, image2≈open-hand,
image3≈leaning, image5≈door-hand, image6≈eft-tapping, image7≈arms-wide, image9≈forest,
image11≈meadow-smile); the other 26 styles still reference the proofs until Maria picks.

## Brand kit (2026-09-04) — `brand/`

Vectors pulled from `threehandshealing/brand/THH-Logo-Draft-1.pdf` (Illustrator,
June 2025; 9 pages: badges, Logo Kit 1/2, Colors, taglines, pattern). Each file
exists as `thh-<name>.svg` (`fill="currentColor"`, for inlining), `-gold.svg`
(#D8C971) and `-teal.svg` (#169999):

`icon` (hands + flame in a circle) · `wordmark` (THREE HANDS HEALING, Montserrat
caps as outlines) · `horizontal` (icon + wordmark) · `stacked` · `badge` (Badge 1,
open arc + ring text) · `badge2` (Badge 2, double ring).

- **Colors** — main: gold `#D8C971`, teal `#169999`; secondary: `#15B7B3`,
  aqua `#2BE2D8`, deep teal `#117575`.
- **Type** — wordmark/labels Montserrat; taglines STIX Two Text semibold lowercase.
- **Taglines** (two drafts in the kit): *embrace transformative evolution* ·
  *getting healthier and happier*.
- The kit's pattern page is the icon half-dropped on teal; Cathedral rebuilds it in
  CSS on the Book block.
