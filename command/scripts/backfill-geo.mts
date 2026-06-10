/*
  backfill-geo: fill lat/lng on every biz/<slug>/lead.md so the Develop map can
  plot it. Source of truth, in order:
    1. the Maps pin in google_url (...!3d<lat>!4d<lng>...) — most accurate
    2. Nominatim geocode of the address (OSM, courtesy 1 req/s + User-Agent)
  Markdown-first (writes lat/lng frontmatter). Re-run after the 019 migration is
  applied, then `register-lead.mts <slug>` to push lat/lng into Supabase.

    npx tsx scripts/backfill-geo.mts [--force]   # --force re-geocodes even if lat set
*/
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const force = process.argv.includes("--force");
const bizDir = path.resolve(process.cwd(), "..", "biz");

function pinFromUrl(url: string | undefined): { lat: number; lng: number } | null {
  if (!url) return null;
  const m = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (!m) return null;
  return { lat: Number(m[1]), lng: Number(m[2]) };
}

async function geocode(
  q: string,
): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "HAND-Protocol/develop-geo (hello@handprotocol.org)" },
    });
    if (!res.ok) return null;
    const arr = (await res.json()) as { lat: string; lon: string }[];
    if (!arr.length) return null;
    return { lat: Number(arr[0].lat), lng: Number(arr[0].lon) };
  } catch {
    return null;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const slugs = fs
  .readdirSync(bizDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
  .map((d) => d.name);

let filled = 0;
let geocoded = 0;
for (const slug of slugs) {
  const file = path.join(bizDir, slug, "lead.md");
  if (!fs.existsSync(file)) continue;
  const raw = fs.readFileSync(file, "utf8");
  const parsed = matter(raw);
  const fm = parsed.data as Record<string, unknown>;

  if (fm.lat != null && fm.lng != null && !force) {
    console.log(`skip   ${slug} (lat/lng already set)`);
    continue;
  }

  let coords = pinFromUrl(fm.google_url as string | undefined);
  let source = "pin";
  if (!coords && fm.address) {
    await sleep(1100); // Nominatim courtesy
    coords = await geocode(String(fm.address));
    source = "geocode";
    geocoded += 1;
  }

  if (!coords) {
    console.log(`MISS   ${slug} (no pin, geocode failed)`);
    continue;
  }

  fm.lat = Number(coords.lat.toFixed(6));
  fm.lng = Number(coords.lng.toFixed(6));
  fs.writeFileSync(file, matter.stringify(parsed.content, fm, { language: "yaml" }));
  filled += 1;
  console.log(`set    ${slug} -> ${fm.lat},${fm.lng} (${source})`);
}

console.log(`\ndone: ${filled} filled (${geocoded} geocoded) of ${slugs.length}`);
