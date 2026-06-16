/*
  find-nearby: "businesses near me that need a website." Drop a street, an
  address, or a business you are standing next to — get a ranked shortlist of
  nearby places with no (or weak) website, each with the build-lead command
  ready to paste.

    npx tsx scripts/find-nearby.mts "<where>" [flags]
    npx tsx scripts/find-nearby.mts "Barton Springs Rd, Austin TX" --category="food truck"
    npx tsx scripts/find-nearby.mts "Terry Black's Barbecue Austin"
    npx tsx scripts/find-nearby.mts --lat=30.2615 --lng=-97.7682   # standing here

  The front door to the discovery pipeline: it geocodes <where> with Nominatim
  (OSM, no API key), builds a Maps search URL, then runs the existing tools:
    1. discover-leads  Maps feed -> every place in view (NDJSON)
    2. check-websites  per place -> authoritative website_status + phone + addr
  and keeps only the ones worth a knock: no/weak website, rating + reviews above
  the floor. The shortlist prints with a build-lead command per pick.

  Flags:
    --category="food truck"   what to search Maps for (default: food truck)
    --zoom=15                 Maps zoom; lower = wider net (13 ≈ ~5km, 15 ≈ ~1km)
    --max-scrolls=30          how far to scroll the Maps feed
    --min-rating=4.0          drop places rated below this
    --min-reviews=10          drop places with fewer reviews (thin signal)
    --radius-km=0             only keep places within this many km (0 = no limit)
    --lat= --lng=             skip geocoding, search from these coords ("near me")
    --skip-known              drop places already in the checked-places registry
    --top=20                  how many to print (default 20)
    --out=<file.ndjson>       also save the qualified shortlist as NDJSON
    --headful                 watch the discover pass in a real window
    --keep                    keep the temp NDJSON files (for debugging)
*/
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const CMD = fileURLToPath(new URL("../", import.meta.url)); // command/

const argv = process.argv.slice(2);
const where = argv.find((a) => !a.startsWith("--"));
const has = (n: string) => argv.includes(`--${n}`);
const flag = (n: string, d = "") => {
  const a = argv.find((x) => x.startsWith(`--${n}=`));
  return a ? a.split("=").slice(1).join("=") : d;
};

const category = flag("category", "food truck");
const zoom = flag("zoom", "15");
const maxScrolls = flag("max-scrolls", "30");
const minRating = Number(flag("min-rating", "4.0")) || 0;
const minReviews = Number(flag("min-reviews", "10")) || 0;
const radiusKm = Number(flag("radius-km", "0")) || 0;
const top = Math.max(1, Number(flag("top", "20")) || 20);
const latArg = flag("lat");
const lngArg = flag("lng");
const outFile = flag("out");

if (!where && !(latArg && lngArg)) {
  console.error('usage: npx tsx scripts/find-nearby.mts "<street or business>" [--category="food truck"] [--zoom=15]');
  console.error('   or: npx tsx scripts/find-nearby.mts --lat=30.26 --lng=-97.77   # search from coords');
  process.exit(1);
}

// ── Nominatim geocode (OSM, courtesy User-Agent; same helper as backfill-geo) ──
async function geocode(q: string): Promise<{ lat: number; lng: number; label: string } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "HAND-Protocol/find-nearby (hello@handprotocol.org)" },
    });
    if (!res.ok) return null;
    const arr = (await res.json()) as { lat: string; lon: string; display_name: string }[];
    if (!arr.length) return null;
    return { lat: Number(arr[0].lat), lng: Number(arr[0].lon), label: arr[0].display_name };
  } catch {
    return null;
  }
}

const PIN = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/;
function pinFromHref(href: string): { lat: number; lng: number } | null {
  const m = href.match(PIN);
  return m ? { lat: Number(m[1]), lng: Number(m[2]) } : null;
}
function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371, toRad = Math.PI / 180;
  const dLat = (bLat - aLat) * toRad, dLng = (bLng - aLng) * toRad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * toRad) * Math.cos(bLat * toRad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function run(label: string, args: string[]): string {
  console.error(`\n━━ ${label} ━━`);
  return execFileSync("npx", ["tsx", ...args], {
    cwd: CMD,
    encoding: "utf8",
    stdio: ["inherit", "pipe", "inherit"],
    maxBuffer: 64 * 1024 * 1024,
  });
}

type Row = {
  name?: string; href?: string; category?: string;
  rating?: number | null; reviews?: number | null;
  website_status?: string; website_url?: string; phone?: string; address?: string;
  p_rating?: number | null; p_reviews?: number | null;
};

(async () => {
  // 1. Resolve coordinates.
  let origin: { lat: number; lng: number; label: string };
  if (latArg && lngArg) {
    origin = { lat: Number(latArg), lng: Number(lngArg), label: `${latArg},${lngArg}` };
  } else {
    console.error(`→ geocoding "${where}" …`);
    const geo = await geocode(where!);
    if (!geo) {
      console.error(`✗ could not geocode "${where}". Try a more specific query (add the city/state),`);
      console.error(`  or pass coordinates directly: --lat=30.26 --lng=-97.77`);
      process.exit(1);
    }
    origin = geo;
    console.error(`  ${origin.label}`);
    console.error(`  ${origin.lat},${origin.lng}`);
  }

  // 2. Build the Maps search URL and discover everything in view.
  const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(category)}/@${origin.lat},${origin.lng},${zoom}z`;
  const discoverArgs = ["scripts/discover-leads.mts", mapsUrl, `--max-scrolls=${maxScrolls}`];
  if (has("skip-known")) discoverArgs.push("--skip-known");
  if (has("headful")) discoverArgs.push("--headful");
  const foundText = run(`discover · "${category}"`, discoverArgs);
  const foundLines = foundText.split("\n").filter(Boolean);
  if (!foundLines.length) {
    console.error(`\nNo places found for "${category}" here. Try a wider --zoom (e.g. 13) or a different --category.`);
    process.exit(0);
  }

  // 3. Confirm website status per place (writes a temp file for check-websites).
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "find-nearby-"));
  const foundFile = path.join(tmpDir, "found.ndjson");
  fs.writeFileSync(foundFile, foundLines.join("\n") + "\n");
  const checkedText = run(`check websites · ${foundLines.length} places`, ["scripts/check-websites.mts", foundFile]);
  const rows: Row[] = checkedText.split("\n").filter(Boolean).map((l) => {
    try { return JSON.parse(l) as Row; } catch { return {} as Row; }
  });

  // 4. Qualify + rank: no/weak website, rating + reviews above the floor.
  const qualified = rows
    .map((r) => {
      const rating = r.p_rating ?? r.rating ?? null;
      const reviews = r.p_reviews ?? r.reviews ?? null;
      const pin = pinFromHref(String(r.href || ""));
      const km = pin ? haversineKm(origin.lat, origin.lng, pin.lat, pin.lng) : null;
      return { ...r, _rating: rating, _reviews: reviews, _km: km };
    })
    .filter((r) => r.website_status === "none" || r.website_status === "poor")
    .filter((r) => (r._rating ?? 0) >= minRating)
    .filter((r) => (r._reviews ?? 0) >= minReviews)
    .filter((r) => !radiusKm || (r._km != null && r._km <= radiusKm))
    .map((r) => {
      const quality = (r._rating ?? 3) * Math.log10(Math.max(r._reviews ?? 0, 10));
      const noSiteBonus = r.website_status === "none" ? 1.25 : 1; // a true blank beats a weak social page
      return { ...r, _score: quality * noSiteBonus };
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, top);

  // 5. Report.
  const skipped = rows.length - rows.filter((r) => r.website_status === "none" || r.website_status === "poor").length;
  console.error(""); // spacer; the shortlist itself goes to stdout
  if (!qualified.length) {
    console.log(`No qualifying businesses near ${origin.label}.`);
    const within = radiusKm ? ` within ${radiusKm}km AND` : "";
    console.log(`Checked ${rows.length} "${category}" places — none had a no/weak website${within} ≥${minRating}★ AND ≥${minReviews} reviews.`);
    console.log(`Loosen the net: --min-rating=3.8, --min-reviews=5, a bigger --radius-km, a wider --zoom=13, or a different --category.`);
    process.exit(0);
  }

  const within = radiusKm ? `, within ${radiusKm}km` : "";
  console.log(`\n${qualified.length} businesses near ${origin.label}`);
  console.log(`that look like they need a website ("${category}", ≥${minRating}★, ≥${minReviews} reviews${within}):\n`);
  qualified.forEach((r, i) => {
    const n = String(i + 1).padStart(2, " ");
    const site = r.website_status === "none" ? "no website" : `weak: ${r.website_url || "social only"}`;
    const dist = r._km != null ? `~${r._km.toFixed(1)}km` : "dist n/a";
    const stars = r._rating != null ? `${r._rating}★` : "no rating";
    const revs = r._reviews != null ? `(${r._reviews})` : "";
    console.log(`${n}. ${r.name}`);
    console.log(`    ${stars} ${revs} · ${r.category || "—"} · ${site} · ${dist}`);
    if (r.phone || r.address) console.log(`    ${[r.phone, r.address].filter(Boolean).join(" · ")}`);
    console.log(`    build:  npx tsx scripts/build-lead.mts "${r.href}" --keep-going`);
    console.log("");
  });
  console.log(`Checked ${rows.length} places · skipped ${skipped} that already have a real website.`);
  console.log(`Confirm the phone before any number goes on a public demo. Then build the ones worth a knock.`);

  if (outFile) {
    fs.writeFileSync(outFile, qualified.map((r) => JSON.stringify(r)).join("\n") + "\n");
    console.error(`\nsaved shortlist → ${outFile}`);
  }
  if (has("keep")) console.error(`temp files kept in ${tmpDir}`);
  else fs.rmSync(tmpDir, { recursive: true, force: true });
})().catch((err) => {
  console.error("find-nearby failed:", (err as Error).message);
  process.exit(1);
});
