/*
  check-websites: bulk pre-qualifier. Reads discover-leads NDJSON on a file,
  opens each place URL in one headless browser (reused page), and reports the
  authoritative website link + phone + rating/count from the place panel.

    npx tsx scripts/check-websites.mts <in.ndjson> [--out=<out.ndjson>]

  Output NDJSON per place: input fields + {website_url, website_status, phone,
  p_rating, p_reviews}. website_status mirrors scrape-lead's classification.
*/
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium, type Browser } from "playwright-core";

process.chdir(fileURLToPath(new URL("../", import.meta.url)));

const argv = process.argv.slice(2);
const inFile = argv.find((a) => !a.startsWith("--"));
const flag = (name: string, dflt = ""): string => {
  const a = argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split("=").slice(1).join("=") : dflt;
};
if (!inFile) {
  console.error("usage: npx tsx scripts/check-websites.mts <in.ndjson> [--out=]");
  process.exit(1);
}
const outFile = flag("out");

function chromePath(): string {
  const candidates = [
    process.env.PLAYWRIGHT_CHROME,
    `${process.env.HOME}/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`,
    `${process.env.HOME}/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome`,
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].filter(Boolean) as string[];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  throw new Error("no chrome found");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rows = fs
  .readFileSync(inFile, "utf8")
  .split("\n")
  .filter(Boolean)
  .map((l) => JSON.parse(l) as Record<string, unknown>);

let browser: Browser | undefined;
const out: string[] = [];
try {
  browser = await chromium.launch({
    executablePath: chromePath(),
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--lang=en-US"],
  });
  const ctx = await browser.newContext({
    locale: "en-US",
    timezoneId: "America/Chicago",
    viewport: { width: 1280, height: 1200 },
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  });
  await ctx.addInitScript(() => {
    (window as unknown as { __name: (f: unknown) => unknown }).__name = (f) => f;
  });
  const page = await ctx.newPage();
  // Block heavy assets for speed.
  await page.route("**/*", (route) => {
    const t = route.request().resourceType();
    if (t === "image" || t === "media" || t === "font") return route.abort();
    return route.continue();
  });

  for (const r of rows) {
    const href = String(r.href || "");
    if (!href) continue;
    let rec: Record<string, unknown> = { ...r };
    try {
      await page.goto(href, { waitUntil: "domcontentloaded", timeout: 35000 });
      await page.waitForSelector('button[data-item-id="address"], a[data-item-id="authority"], h1', { timeout: 15000 }).catch(() => {});
      await sleep(800);
      const facts = await page.evaluate(() => {
        const websiteUrl = (document.querySelector('a[data-item-id="authority"]')?.getAttribute("href") || "").trim();
        const phoneLabel = document.querySelector('button[data-item-id^="phone"]')?.getAttribute("aria-label") || "";
        const phone = phoneLabel.replace(/^Phone:\s*/i, "").trim();
        const addr = (document.querySelector('button[data-item-id="address"]')?.getAttribute("aria-label") || "").replace(/^Address:\s*/i, "").trim();
        const rating = parseFloat((document.querySelector('div.F7nice span[aria-hidden="true"]')?.textContent || "").trim());
        const cntLabel = document.querySelector('div.F7nice span[aria-label*="review" i]')?.getAttribute("aria-label") || "";
        const cm = cntLabel.replace(/,/g, "").match(/(\d+)\s*review/i);
        return {
          websiteUrl,
          phone,
          addr,
          rating: Number.isFinite(rating) ? rating : null,
          reviews: cm ? parseInt(cm[1], 10) : null,
        };
      });
      const social = /facebook\.com|instagram\.com|linktr\.ee|linktree|yelp\.com|tiktok\.com|business\.site|google\.com|square\.site|toasttab\.com|clover\.com/i;
      const status = !facts.websiteUrl ? "none" : social.test(facts.websiteUrl) ? "poor" : "ok";
      rec = {
        ...r,
        website_url: facts.websiteUrl,
        website_status: status,
        phone: facts.phone,
        address: facts.addr,
        p_rating: facts.rating,
        p_reviews: facts.reviews,
      };
      console.error(`${status.padEnd(4)} ${String(r.name).slice(0, 40).padEnd(40)} ${facts.websiteUrl || ""}`);
    } catch (e) {
      rec = { ...r, website_status: "error", error: (e as Error).message.slice(0, 120) };
      console.error(`ERR  ${String(r.name).slice(0, 40)}`);
    }
    out.push(JSON.stringify(rec));
  }
  await browser.close();
  browser = undefined;
} catch (err) {
  if (browser) await browser.close().catch(() => {});
  console.error("check failed:", (err as Error).message);
}
const text = out.join("\n") + "\n";
if (outFile) fs.writeFileSync(outFile, text);
else process.stdout.write(text);
