/*
  discover-leads: scroll a Google Maps SEARCH results feed and list every place
  as NDJSON — name, place URL, rating, review count, category, and whether the
  result card shows a Website chip (cheap pre-filter; the per-place scrape in
  scrape-lead.mts stays authoritative for website_status).

    npx tsx scripts/discover-leads.mts "<maps-search-url>" [--max-scrolls=40] [--headful]

  Output: one JSON object per line on stdout:
    {"name","href","rating","reviews","category","website"}
*/
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium, type Browser } from "playwright-core";

process.chdir(fileURLToPath(new URL("../", import.meta.url)));

const argv = process.argv.slice(2);
const url = argv.find((a) => !a.startsWith("--"));
const has = (name: string) => argv.includes(`--${name}`);
const flag = (name: string, dflt = ""): string => {
  const a = argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split("=").slice(1).join("=") : dflt;
};
if (!url) {
  console.error('usage: npx tsx scripts/discover-leads.mts "<maps-search-url>" [--max-scrolls=40]');
  process.exit(1);
}
const MAX_SCROLLS = Math.max(1, Number(flag("max-scrolls", "40")) || 40);

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let browser: Browser | undefined;
try {
  const target = (() => {
    const x = new URL(url);
    if (!x.searchParams.has("hl")) x.searchParams.set("hl", "en");
    return x.toString();
  })();
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
  await ctx.addInitScript(() => {
    (window as unknown as { __name: (f: unknown) => unknown }).__name = (f) => f;
  });
  const page = await ctx.newPage();
  await page.goto(target, { waitUntil: "domcontentloaded", timeout: 45000 });

  // Consent wall (rare on a US IP, best-effort).
  const btn = await page.$('button[aria-label*="Accept all" i], form[action*="consent"] button');
  if (btn) await btn.click({ timeout: 3000 }).catch(() => {});

  await page.waitForSelector('div[role="feed"]', { timeout: 30000 });
  await sleep(1500);

  // Scroll the feed until "the end of the list" or no growth.
  let lastCount = 0;
  let stale = 0;
  for (let i = 0; i < MAX_SCROLLS; i++) {
    const { count, done } = await page.evaluate(() => {
      const feed = document.querySelector('div[role="feed"]');
      if (!feed) return { count: 0, done: true };
      feed.scrollTop = feed.scrollHeight;
      const done = /reached the end of the list/i.test(feed.textContent || "");
      return { count: feed.querySelectorAll("a.hfpxzc").length, done };
    });
    if (done) break;
    if (count === lastCount) {
      stale++;
      if (stale >= 5) break;
    } else {
      stale = 0;
      lastCount = count;
    }
    await sleep(1200);
  }

  const results = await page.evaluate(() => {
    const out: {
      name: string; href: string; rating: number | null; reviews: number | null;
      category: string; website: boolean;
    }[] = [];
    for (const card of Array.from(document.querySelectorAll('div[role="feed"] div.Nv2PK'))) {
      const a = card.querySelector("a.hfpxzc");
      if (!a) continue;
      const name = (a.getAttribute("aria-label") || "").trim();
      const href = a.getAttribute("href") || "";
      const rating = parseFloat((card.querySelector("span.MW4etd")?.textContent || "").trim());
      const cnt = (card.querySelector("span.UY7F9")?.textContent || "").replace(/[(),]/g, "").trim();
      const reviews = cnt ? parseInt(cnt, 10) : null;
      // Category: first W4Efsd line usually reads "Category · Address".
      let category = "";
      for (const w of Array.from(card.querySelectorAll(".W4Efsd"))) {
        const t = (w.textContent || "").trim();
        const m = t.split("·").map((s) => s.trim()).filter(Boolean);
        if (m.length && !/^(open|closed|closes|opens)/i.test(m[0]) && !/\d/.test(m[0])) {
          category = m[0];
          break;
        }
      }
      const website = !!card.querySelector('a[data-value="Website"]');
      out.push({ name, href, rating: Number.isFinite(rating) ? rating : null, reviews, category, website });
    }
    return out;
  });

  await browser.close();
  browser = undefined;

  console.error(`found ${results.length} places`);
  for (const r of results) console.log(JSON.stringify(r));
} catch (err) {
  if (browser) await browser.close().catch(() => {});
  console.error("discover failed:", (err as Error).message);
  process.exit(1);
}
