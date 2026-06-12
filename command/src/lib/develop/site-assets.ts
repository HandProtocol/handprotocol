/*
  HAND Command Center, shared asset selection for the generated pages.

  ONE place that picks the optional imagery and review-grounded mention chips
  for a lead, so the headless scripts (scripts/generate-site.mts,
  scripts/generate-pitch.mts) and the Command Center API routes render the
  exact same page for the same lead.

  - Public demo page: ambient sample imagery from the curated free-license
    library at web/assets/biz-samples/ (manifest.json keyed by category
    regex), plus dish/service chips for words literally present in the
    reviews. The public page NEVER shows the business's scraped Maps photos.
  - Gated pitch page: the business's scraped Maps photos written by
    scripts/scrape-photos.mts to web/demos/<slug>/pitch/img/manifest.json
    (gated path only, never public).

  Every loader fails soft: a missing or malformed manifest means "no images",
  and the type+color system carries the page.
*/
import fs from "node:fs";
import path from "node:path";
import {
  pickSampleImages,
  deriveMentions,
  type SampleImages,
  type RenderOptions,
} from "./site-template";
import type { PitchPhoto } from "./pitch-template";
import { repoRoot, demoPitchDir } from "./paths";

// Ambient sample imagery for the public demo page, selected from the curated
// library's manifest by category. No manifest (or no category match) means no
// images.
export function loadSampleImages(
  category: string | null | undefined,
  slug: string,
): SampleImages {
  try {
    const manifest = JSON.parse(
      fs.readFileSync(
        path.join(repoRoot(), "web", "assets", "biz-samples", "manifest.json"),
        "utf8",
      ),
    ) as unknown;
    return pickSampleImages(manifest, category, slug);
  } catch {
    /* no sample library yet */
    return {};
  }
}

// Everything renderDemoSite needs beyond the lead + copy: sample imagery plus
// the dish/service words actually present in the reviews (grounded chips).
export function demoRenderOptions(
  lead: { slug: string; category: string | null },
  reviews: { body: string }[],
): RenderOptions {
  return {
    samples: loadSampleImages(lead.category, lead.slug),
    mentions: deriveMentions(reviews.map((r) => r.body)),
  };
}

// The business's scraped Maps photos, when scrape-photos has captured them.
// They live at web/demos/<slug>/pitch/img/ (gated path only) and render as
// the "With your photos" section for the rep.
export function loadPitchPhotos(slug: string): PitchPhoto[] {
  try {
    const raw = JSON.parse(
      fs.readFileSync(path.join(demoPitchDir(slug), "img", "manifest.json"), "utf8"),
    ) as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (p): p is PitchPhoto =>
        !!p &&
        typeof (p as PitchPhoto).file === "string" &&
        Number.isFinite((p as PitchPhoto).w) &&
        Number.isFinite((p as PitchPhoto).h),
    );
  } catch {
    /* no scraped photos for this lead */
    return [];
  }
}
