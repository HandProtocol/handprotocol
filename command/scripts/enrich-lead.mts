/*
  enrich-lead: fill the gaps the Google Maps paste leaves (locality, phone,
  hours). Reports only, it does not write, because a found phone must be confirmed
  before it goes on a real business's public site. Take the output, edit
  biz/<slug>/lead.md by hand, then run register-lead.

    npx tsx scripts/enrich-lead.mts <slug>                 # reverse-geocode the pin
    npx tsx scripts/enrich-lead.mts <slug> --url=<listing> # + scrape a listing page

  The reverse-geocode is reliable. The listing scrape is best-effort (many
  aggregators are JS-rendered or bot-walled); the agent's WebSearch/WebFetch is
  still the primary way to find a phone.
*/
import fs from "node:fs";
import { readBizFile } from "../src/lib/develop/markdown.ts";
import { bizLeadMarkdownPath } from "../src/lib/develop/paths.ts";

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith("--"));
const urlArg = args.find((a) => a.startsWith("--url="));
if (!slug && !urlArg) {
  console.error("usage: npx tsx scripts/enrich-lead.mts <slug> [--url=<listing>]");
  process.exit(1);
}

if (slug) {
  const file = bizLeadMarkdownPath(slug);
  if (!fs.existsSync(file)) {
    console.log("no lead.md for", slug);
  } else {
    const { frontmatter } = readBizFile(file);
    const gurl = String(frontmatter.google_url ?? "");
    const m = gurl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (!m) {
      console.log("no pin coords (!3d/!4d) in google_url");
    } else {
      const [, lat, lon] = m;
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=14`,
          { headers: { "User-Agent": "hand-biz-pitch/1.0 (HAND Protocol)" } },
        );
        const j = (await r.json()) as { display_name?: string; address?: Record<string, string> };
        const a = j.address ?? {};
        const locality = a.city || a.town || a.village || a.hamlet || a.suburb || "?";
        console.log(`pin:      ${lat}, ${lon}`);
        console.log(`locality: ${locality}${a.county ? `, ${a.county}` : ""}${a.state ? `, ${a.state}` : ""}`);
        console.log(`display:  ${j.display_name ?? ""}`);
      } catch (e) {
        console.error("reverse-geocode failed:", (e as Error).message);
      }
    }
  }
}

if (urlArg) {
  const url = urlArg.split("=").slice(1).join("=");
  try {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; hand-biz-pitch/1.0)" } });
    const text = (await r.text()).replace(/<[^>]+>/g, " ");
    const phones = [...new Set(text.match(/\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}/g) ?? [])].slice(0, 6);
    console.log(`\nfrom ${url}`);
    console.log("phone candidates:", phones.length ? phones.join("   ") : "(none found in HTML)");
    console.log("UNCONFIRMED. Confirm before putting a number on the public demo.");
  } catch (e) {
    console.error("fetch failed:", (e as Error).message);
  }
}
