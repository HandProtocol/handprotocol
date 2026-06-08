/*
  scrape-lead: turn a Google Maps link into a canonical biz/<slug>/lead.md.

    npx tsx scripts/scrape-lead.mts "<maps-url>" [flags]

  Flags:
    --max=25        cap the number of reviews to capture (default 25). "Only as
                    much as needed" — most-relevant first; the demo curates a few.
    --slug=<slug>   override the auto slug (kebab of name + city)
    --lead=koH      hand_lead to stamp (default koH)
    --out=<path>    write somewhere else (preview) instead of biz/<slug>/lead.md
    --dry           print what it found, write nothing
    --headful       show the browser (debugging)
    --keep-website  write the lead even when the business already has a website
                    (default: still writes, but warns — they may not qualify)

  Why a real browser: maps.google.com is JS-rendered. WebFetch returns an empty
  shell. Raw headless Chrome (this script) renders it fine in this environment;
  the old "you cannot scrape" note was about the gstack browse daemon, not this.

  It scrapes facts (name, category, city/state, phone, address, website status,
  rating, review count, pin) plus reviews verbatim, then writes them in the exact
  format register-lead.mts reads back. Phone/address come straight from the Maps
  card here (more trustworthy than aggregator scraping), but stay UNCONFIRMED for
  the public demo's click-to-call until a human confirms — same rule as Phase 1.5.
*/
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium, type Browser, type Page } from "playwright-core";

// Pin cwd to command/ so the develop lib (repoRoot = cwd/..) resolves biz/.
process.chdir(fileURLToPath(new URL("../", import.meta.url)));

const {
  composeBizSlug,
  serializeBizLead,
  reviewsToBody,
  writeFileAtomic,
} = await import("../src/lib/develop/markdown.ts");
const { bizDir, bizLeadMarkdownPath } = await import("../src/lib/develop/paths.ts");
type ParsedReview = { author: string | null; rating: number | null; body: string };

// ─── args ───────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const url = argv.find((a) => !a.startsWith("--"));
const flag = (name: string, dflt = ""): string => {
  const a = argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split("=").slice(1).join("=") : dflt;
};
const has = (name: string) => argv.includes(`--${name}`);
if (!url) {
  console.error('usage: npx tsx scripts/scrape-lead.mts "<maps-url>" [--max=25] [--slug=] [--lead=koH] [--out=] [--dry] [--headful]');
  process.exit(1);
}
const MAX = Math.max(1, Number(flag("max", "25")) || 25);
const handLead = flag("lead", "koH");
const outOverride = flag("out");
const slugOverride = flag("slug");
const dry = has("dry");

// ─── chrome resolver ──────────────────────────────────────────────────────────
function chromePath(): string {
  const candidates = [
    process.env.PLAYWRIGHT_CHROME,
    `${process.env.HOME}/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`,
    `${process.env.HOME}/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome`,
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean) as string[];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  throw new Error("no chrome/chromium found; set PLAYWRIGHT_CHROME=/path/to/chrome");
}

// Follow maps.app.goo.gl / goo.gl short links to the real place URL.
async function resolveUrl(u: string): Promise<string> {
  if (!/goo\.gl|app\.goo\.gl/.test(u)) return u;
  try {
    const r = await fetch(u, { redirect: "follow" });
    return r.url || u;
  } catch {
    return u;
  }
}

function withEnglish(u: string): string {
  try {
    const x = new URL(u);
    if (!x.searchParams.has("hl")) x.searchParams.set("hl", "en");
    if (!x.searchParams.has("gl")) x.searchParams.set("gl", "US");
    return x.toString();
  } catch {
    return u;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── main ─────────────────────────────────────────────────────────────────────
let browser: Browser | undefined;
try {
  const target = withEnglish(await resolveUrl(url));
  console.error(`→ ${target}`);
  browser = await chromium.launch({
    executablePath: chromePath(),
    headless: !has("headful"),
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--lang=en-US"],
  });
  const ctx = await browser.newContext({
    locale: "en-US",
    timezoneId: "America/Chicago",
    viewport: { width: 1280, height: 1400 },
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  });
  // tsx/esbuild wraps functions with a __name() helper; it doesn't exist in the
  // browser, so any evaluate() body that references it throws. Shim it in-page.
  await ctx.addInitScript(() => {
    (window as unknown as { __name: (f: unknown) => unknown }).__name = (f) => f;
  });
  const page = await ctx.newPage();
  await page.goto(target, { waitUntil: "domcontentloaded", timeout: 45000 });

  // Consent wall (rare on a US IP, best-effort).
  await dismissConsent(page);

  // Wait for the place panel to render (h1 with the business name).
  await page.waitForSelector("h1", { timeout: 30000 }).catch(() => {});
  await sleep(1200);

  const facts = await extractFacts(page);
  if (!facts.name) throw new Error("could not read the business name — is this a single-place Maps URL? (a place, not a search list)");

  // Pin / canonical url from the resolved page url (carries @lat,lng + !3d!4d).
  const resolvedUrl = page.url();
  facts.google_url = bestGoogleUrl(resolvedUrl, target, facts);

  // Reviews: headless Maps never renders the interactive reviews UI, but the
  // place's feature id unlocks Google's own review endpoint, which we call from
  // the page (so its consent cookies apply). Most-relevant first — exactly the
  // reviews a demo wants to lead with.
  const featureIds = await getFeatureIds(page);
  let reviews: ParsedReview[] = [];
  let total: number | null = null;
  if (featureIds.length) {
    const r = await fetchReviews(page, featureIds, MAX);
    reviews = r.reviews;
    total = r.total;
  } else {
    console.error("⚠ could not find any place feature id (0x..:0x..). Reviews skipped — is this a single place, not a search list?");
  }
  if (total != null) facts.reviewsCount = total;

  await browser.close();
  browser = undefined;

  // ─── compose lead ───────────────────────────────────────────────────────────
  const existing = new Set(
    fs.existsSync(bizDir())
      ? fs.readdirSync(bizDir(), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
      : [],
  );
  const slug = slugOverride || composeBizSlug(facts.name, facts.city || undefined, existing);

  const frontmatter = {
    slug,
    name: facts.name,
    category: facts.category || undefined,
    city: facts.city || undefined,
    state: facts.state || "TX",
    phone: facts.phone || undefined,
    address: facts.address || undefined,
    google_url: facts.google_url || undefined,
    google_rating: facts.rating ?? undefined,
    reviews_count: facts.reviewsCount ?? undefined,
    website_status: facts.websiteStatus,
    status: "prospect",
    hand_lead: handLead,
  };
  const body = reviewsToBody(reviews as ParsedReview[]);
  const md = serializeBizLead(frontmatter as any, body);

  const dest = outOverride || bizLeadMarkdownPath(slug);

  // ─── report ───────────────────────────────────────────────────────────────
  console.error("");
  console.error(`name:     ${facts.name}`);
  console.error(`category: ${facts.category || "?"}`);
  console.error(`where:    ${[facts.city, facts.state].filter(Boolean).join(", ") || "?"}`);
  console.error(`rating:   ${facts.rating ?? "?"}${facts.reviewsCount != null ? ` (${facts.reviewsCount} reviews)` : ""}`);
  console.error(`phone:    ${facts.phone || "(none on the card)"}`);
  console.error(`address:  ${facts.address || "(none on the card)"}`);
  console.error(`website:  ${facts.websiteStatus}${facts.websiteUrl ? ` — ${facts.websiteUrl}` : ""}`);
  console.error(`reviews:  scraped ${reviews.length}${facts.reviewsCount != null ? ` of ${facts.reviewsCount}` : ""} (cap ${MAX})`);
  console.error(`slug:     ${slug}`);
  if (facts.websiteStatus === "ok") {
    console.error("⚠ this business already has a website — confirm it still qualifies before pitching.");
  }
  if (reviews.length === 0) {
    console.error("⚠ zero reviews captured. Google may have changed the reviews DOM, or this place has none. Inspect with --headful.");
  }

  if (dry) {
    console.error(`\n[dry] would write ${dest}\n`);
    console.log(md);
  } else {
    await writeFileAtomic(dest, md);
    console.error(`\nwrote ${dest}`);
    // Machine-readable last line for the orchestrator.
    console.log(JSON.stringify({ slug, name: facts.name, reviews: reviews.length, path: dest, phone: facts.phone, website_status: facts.websiteStatus }));
  }
} catch (err) {
  if (browser) await browser.close().catch(() => {});
  console.error("scrape failed:", (err as Error).message);
  process.exit(1);
}

// ─── helpers (run in Node) ────────────────────────────────────────────────────
function bestGoogleUrl(resolved: string, target: string, facts: PlaceFacts): string {
  // Prefer the canonical place url with a pin (!3d!4d) so enrich-lead can
  // reverse-geocode. Fall back to a clean search url.
  if (/!3d-?\d+\.\d+!4d-?\d+\.\d+/.test(resolved)) return resolved.split("?")[0];
  if (/@-?\d+\.\d+,-?\d+\.\d+/.test(resolved)) return resolved.split("?")[0];
  const q = [facts.name, facts.address, facts.city, facts.state].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

async function dismissConsent(page: Page): Promise<void> {
  try {
    const btn = await page.$(
      'button[aria-label*="Accept all" i], button[aria-label*="Agree" i], form[action*="consent"] button',
    );
    if (btn) {
      await btn.click({ timeout: 3000 }).catch(() => {});
      await page.waitForLoadState("domcontentloaded").catch(() => {});
    }
  } catch {
    /* none — fine */
  }
}

type PlaceFacts = {
  name: string;
  category: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  websiteUrl: string;
  websiteStatus: "none" | "poor" | "ok";
  rating: number | null;
  reviewsCount: number | null;
  google_url: string;
};

async function extractFacts(page: Page): Promise<PlaceFacts> {
  const raw = await page.evaluate(() => {
    const txt = (el: Element | null) => (el?.textContent || "").trim();
    const attr = (sel: string, a: string) => document.querySelector(sel)?.getAttribute(a) || "";

    // Name: the panel h1 (skip the "Results" h1 some layouts add).
    let name = "";
    for (const h of Array.from(document.querySelectorAll("h1"))) {
      const t = (h.textContent || "").trim();
      if (t && !/^results$/i.test(t)) { name = t; break; }
    }

    // Category: the category chip/button next to the name.
    const category =
      txt(document.querySelector('button[jsaction*="category"]')) ||
      txt(document.querySelector(".DkEaL")) ||
      "";

    // Rating + count from the header score block.
    let rating: number | null = null;
    let reviewsCount: number | null = null;
    const ratingEl = document.querySelector('div.F7nice span[aria-hidden="true"]');
    const r = parseFloat(txt(ratingEl));
    if (Number.isFinite(r)) rating = r;
    // Count: aria-label like "157 reviews" anywhere in the score block.
    const cntLabel =
      document.querySelector('div.F7nice span[aria-label*="review" i]')?.getAttribute("aria-label") ||
      document.querySelector('button[aria-label*="review" i][jsaction*="reviewChart"]')?.getAttribute("aria-label") ||
      "";
    const cm = cntLabel.replace(/,/g, "").match(/([\d]+)\s*review/i);
    if (cm) reviewsCount = parseInt(cm[1], 10);

    // Address / phone / website via stable data-item-id anchors.
    const addrLabel = attr('button[data-item-id="address"]', "aria-label") || attr('[data-item-id="address"]', "aria-label");
    const address = addrLabel.replace(/^Address:\s*/i, "").trim();

    const phoneBtn = document.querySelector('button[data-item-id^="phone"], [data-item-id^="phone:tel"]');
    const phoneLabel = phoneBtn?.getAttribute("aria-label") || "";
    const phone = phoneLabel.replace(/^Phone:\s*/i, "").trim();

    const siteEl = document.querySelector('a[data-item-id="authority"]');
    const websiteUrl = (siteEl?.getAttribute("href") || "").trim();

    return { name, category, address, phone, websiteUrl, rating, reviewsCount };
  });

  // Parse city/state from the address tail: "..., Austin, TX 78704".
  let city = "";
  let state = "";
  if (raw.address) {
    const parts = raw.address.split(",").map((s) => s.trim()).filter(Boolean);
    const tail = parts[parts.length - 1] || ""; // "TX 78704"
    const sm = tail.match(/\b([A-Z]{2})\b/);
    if (sm) state = sm[1];
    if (parts.length >= 2) city = parts[parts.length - 2];
  }

  // Website classification: a real site qualifies them OUT; social-only links
  // (fb/ig/linktree/yelp) are effectively "no real website".
  let websiteStatus: "none" | "poor" | "ok" = "none";
  if (raw.websiteUrl) {
    const social = /facebook\.com|instagram\.com|linktr\.ee|linktree|yelp\.com|tiktok\.com|business\.site|google\.com/i;
    websiteStatus = social.test(raw.websiteUrl) ? "poor" : "ok";
  }

  return {
    name: raw.name,
    category: raw.category,
    address: raw.address,
    city,
    state,
    phone: raw.phone,
    websiteUrl: raw.websiteUrl,
    websiteStatus,
    rating: raw.rating,
    reviewsCount: raw.reviewsCount,
    google_url: "",
  };
}

// The place's feature id (0x<hi>:0x<lo>) is the key to its reviews. A place URL
// can carry SEVERAL ids (the place itself, the address/directions pin, nearby
// entities), so return ordered candidates: the place's own id first (the !1s
// right before its !8m2!3d<lat>!4d coords, or inside a !3m segment), then any
// other id in the URL, then ids from APP_INITIALIZATION_STATE. fetchReviews
// tries them in order and keeps the first that returns reviews.
async function getFeatureIds(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const ids: string[] = [];
    const push = (s?: string) => {
      if (s && !ids.includes(s)) ids.push(s);
    };
    const href = location.href;
    const ID = /0x[0-9a-f]+:0x[0-9a-f]+/i;
    const IDg = /0x[0-9a-f]+:0x[0-9a-f]+/gi;

    // 1. the place's own block: !1s<id>!8m2!3d<lat>!4d<lng>
    const m1 = href.match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)!8m2!3d/i);
    push(m1?.[1]);
    // 2. any !3m<n>!1s<id> (place-panel segment)
    for (const m of href.matchAll(/!3m\d+!1s(0x[0-9a-f]+:0x[0-9a-f]+)/gi)) push(m[1]);
    // 3. every id in the URL, in order
    for (const m of href.match(IDg) ?? []) push(m.match(ID)?.[0]);
    // 4. ids embedded in the place data blob
    try {
      const ais = JSON.stringify((window as unknown as { APP_INITIALIZATION_STATE: unknown }).APP_INITIALIZATION_STATE);
      for (const m of ais.match(IDg) ?? []) push(m.match(ID)?.[0]);
    } catch {
      /* not serializable */
    }
    return ids;
  });
}

// Call Google's listentitiesreviews endpoint from inside the page (credentials
// carry the consent cookies). One request returns up to ~49 reviews, most-
// relevant first; that is plenty to curate a demo from. Response is a
// )]}'-prefixed JSON array: reviews at [2], total at [5][4]; per review
// r[0][1]=author, r[1]=relative date, r[3]=text, r[4]=rating.
async function fetchReviews(
  page: Page,
  featureIds: string[],
  max: number,
): Promise<{ reviews: ParsedReview[]; total: number | null }> {
  let bestTotal: number | null = null;
  for (const fid of featureIds) {
    const r = await fetchReviewsForId(page, fid, max);
    if (r.total != null && (bestTotal == null || r.total > bestTotal)) bestTotal = r.total;
    if (r.reviews.length > 0) return { reviews: r.reviews, total: r.total ?? bestTotal };
  }
  return { reviews: [], total: bestTotal };
}

async function fetchReviewsForId(
  page: Page,
  featureId: string,
  max: number,
): Promise<{ reviews: ParsedReview[]; total: number | null }> {
  const [hi, lo] = featureId.split(":");
  let hiDec: string, loDec: string;
  try {
    hiDec = BigInt(hi).toString();
    loDec = BigInt(lo).toString();
  } catch {
    return { reviews: [], total: null };
  }
  const count = Math.min(Math.max(max, 1), 49);
  const endpoint =
    `https://www.google.com/maps/preview/review/listentitiesreviews?authuser=0&hl=en&gl=us` +
    `&pb=!1m2!1y${hiDec}!2y${loDec}!2m1!2i${count}!3e1!4m5!3b1!4b1!5b1!6b1!7b1!5m2!1s_!7e81`;

  const text = await page.evaluate(async (u: string) => {
    try {
      const r = await fetch(u, { credentials: "include" });
      return await r.text();
    } catch {
      return "";
    }
  }, endpoint);
  if (!text) return { reviews: [], total: null };

  let data: unknown;
  try {
    data = JSON.parse(text.replace(/^\)\]\}'\s*/, ""));
  } catch {
    return { reviews: [], total: null };
  }
  const arr = data as unknown[];
  const rows: unknown[] = Array.isArray(arr?.[2]) ? (arr[2] as unknown[]) : [];
  const meta = arr?.[5] as unknown[] | undefined;
  const total = Array.isArray(meta) && typeof meta[4] === "number" ? (meta[4] as number) : null;

  const reviews: ParsedReview[] = [];
  for (const row of rows) {
    const r = row as unknown[];
    const author = ((r?.[0] as unknown[])?.[1] as string) || null;
    const body = typeof r?.[3] === "string" ? (r[3] as string).trim() : "";
    const ratingRaw = r?.[4];
    const rating = typeof ratingRaw === "number" ? Math.round(ratingRaw) : null;
    if (!body) continue; // rating-only reviews count toward the total, not the demo
    reviews.push({ author, rating, body });
    if (reviews.length >= max) break;
  }
  return { reviews, total };
}
