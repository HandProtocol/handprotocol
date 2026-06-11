/*
  scrape-photos: pull a business's own Google Maps photos for its demo site.

    npx tsx scripts/scrape-photos.mts <slug> [--max=5] [--url=<maps-url>]

  Reads google_url from biz/<slug>/lead.md (or --url), opens the place page in
  headless Chrome (same boilerplate as scrape-lead.mts), and collects photo
  URLs from three places: the og:image meta, every googleusercontent place
  photo rendered on the page (hero thumbnail + photo strip), and AF1Qip photo
  refs embedded in APP_INITIALIZATION_STATE. Dedupes by photo id, keeps the
  top --max in page order, upgrades each to w1600, downloads, and converts to
  webp with ffmpeg.

  Writes:
    web/demos/<slug>/img/photo-1.webp .. photo-N.webp
    web/demos/<slug>/img/manifest.json   [{file,w,h}, ...]

  Last stdout line is machine-readable: {"slug","photos":[{"file","w","h"}...]}
  A search-fallback URL with no place panel (or a place with no photos) is not
  an error: it prints an empty photos array and leaves the demo untouched.
*/
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium, type Browser, type Page } from "playwright-core";

// Pin cwd to command/ so the develop lib (repoRoot = cwd/..) resolves biz/.
process.chdir(fileURLToPath(new URL("../", import.meta.url)));

const { readBizFile } = await import("../src/lib/develop/markdown.ts");
const { bizLeadMarkdownPath, demoSiteDir } = await import("../src/lib/develop/paths.ts");

// ─── args ───────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const slug = argv.find((a) => !a.startsWith("--"));
const flag = (name: string, dflt = ""): string => {
  const a = argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split("=").slice(1).join("=") : dflt;
};
const has = (name: string) => argv.includes(`--${name}`);
if (!slug) {
  console.error('usage: npx tsx scripts/scrape-photos.mts <slug> [--max=5] [--url=<maps-url>]');
  process.exit(1);
}
const MAX = Math.max(1, Number(flag("max", "5")) || 5);

// ─── ffmpeg / ffprobe (probe up front; fail fast, not mid-download) ─────────
function findBin(name: "ffmpeg" | "ffprobe"): string {
  const onPath = spawnSync(name, ["-version"], { stdio: "ignore" });
  if (!onPath.error && onPath.status === 0) return name;
  // playwright ships ffmpeg (no ffprobe) under ~/.cache/ms-playwright/ffmpeg-*/
  if (name === "ffmpeg") {
    const root = `${process.env.HOME}/.cache/ms-playwright`;
    for (const d of fs.existsSync(root) ? fs.readdirSync(root) : []) {
      if (!d.startsWith("ffmpeg-")) continue;
      const cand = path.join(root, d, "ffmpeg-linux");
      if (fs.existsSync(cand)) return cand;
    }
  }
  throw new Error(`${name} not found on PATH`);
}
const FFMPEG = findBin("ffmpeg");
let FFPROBE: string | null = null;
try {
  FFPROBE = findBin("ffprobe");
} catch {
  FFPROBE = null; // playwright's ffmpeg dir has no ffprobe; fall back to ffmpeg -i parse
}

// ─── chrome resolver (same as scrape-lead) ───────────────────────────────────
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

// ─── photo url helpers ────────────────────────────────────────────────────────
// Dedupe key: the AF1Qip photo id when present, else the path sans size suffix.
function photoId(u: string): string {
  const m = u.match(/AF1Qip[A-Za-z0-9_-]+/);
  if (m) return m[0];
  try {
    return new URL(u).pathname.split("=")[0];
  } catch {
    return u.split("=")[0];
  }
}

// Upgrade the trailing =w###-h###... size directive to a big render.
function upscale(u: string): string {
  if (u.includes("=")) return u.replace(/=[^=]*$/, "=w1600-h1200-k-no");
  return `${u}=w1600-h1200-k-no`;
}

function isPlacePhoto(u: string): boolean {
  if (!u || !/^https?:\/\//.test(u)) return false;
  return (
    /googleusercontent\.com\/p\//.test(u) ||
    /\/p\/AF1Qip/.test(u) ||
    /googleusercontent\.com\/gps-cs/.test(u)
  );
}

// ─── main ─────────────────────────────────────────────────────────────────────
let url = flag("url");
if (!url) {
  const leadPath = bizLeadMarkdownPath(slug);
  if (!fs.existsSync(leadPath)) {
    console.error(`no lead at ${leadPath} and no --url given`);
    process.exit(1);
  }
  const { frontmatter } = readBizFile(leadPath);
  url = (frontmatter.google_url || "").trim();
  if (!url) {
    console.error(`lead ${slug} has no google_url; pass --url=`);
    process.exit(1);
  }
}

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

  await dismissConsent(page);

  // Wait for the place panel (h1). A search fallback may never render one —
  // that is the photo-less case, not an error.
  await page.waitForSelector("h1", { timeout: 30000 }).catch(() => {});
  await sleep(1500);

  // Primary source: the place's own photo gallery via Google's internal
  // listentityphotos RPC, called from inside the page (consent cookies apply)
  // — headless Maps never renders the gallery UI, same story as reviews.
  // The RPC is keyed by the place's feature id (0x..:0x..); reuse the same
  // candidate-ordering trick as scrape-lead's review fetch.
  const featureIds: string[] = await page.evaluate(() => {
    const ids: string[] = [];
    const push = (s?: string) => {
      if (s && !ids.includes(s)) ids.push(s);
    };
    const href = location.href;
    const ID = /0x[0-9a-f]+:0x[0-9a-f]+/i;
    const IDg = /0x[0-9a-f]+:0x[0-9a-f]+/gi;
    const m1 = href.match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)!8m2!3d/i);
    push(m1?.[1]);
    for (const m of href.matchAll(/!3m\d+!1s(0x[0-9a-f]+:0x[0-9a-f]+)/gi)) push(m[1]);
    for (const m of href.match(IDg) ?? []) push(m.match(ID)?.[0]);
    try {
      const ais = JSON.stringify(
        (window as unknown as { APP_INITIALIZATION_STATE: unknown }).APP_INITIALIZATION_STATE,
      );
      for (const m of ais.match(IDg) ?? []) push(m.match(ID)?.[0]);
    } catch {
      /* not serializable */
    }
    return ids;
  });

  const collected: string[] = [];
  for (const fid of featureIds) {
    const text: string = await page.evaluate(async (id: string) => {
      const u =
        `https://www.google.com/maps/rpc/photo/listentityphotos?authuser=0&hl=en&gl=us` +
        `&pb=!1e2!3m3!1s${id}!9e0!11s!16m2!1i50!2i0`;
      try {
        const r = await fetch(u, { credentials: "include" });
        return await r.text();
      } catch {
        return "";
      }
    }, fid);
    const urls =
      text.match(/https:\/\/lh3\.googleusercontent\.com\/(?:gps-cs-s|p)\/[A-Za-z0-9_-]{10,}/g) ?? [];
    if (urls.length) {
      collected.push(...urls);
      break; // first feature id with a gallery is the place itself
    }
  }

  // Fallback: whatever the rendered page exposes (og:image hero + any place
  // photos in the DOM + AF1Qip refs in the data blob).
  if (collected.length === 0) {
    const visible: string[] = await page.evaluate(() => {
      const urls: string[] = [];
      const push = (u?: string | null) => {
        if (u) urls.push(u);
      };
      push(document.querySelector('meta[property="og:image"]')?.getAttribute("content"));
      for (const img of Array.from(document.querySelectorAll("img"))) {
        push(img.getAttribute("src"));
      }
      try {
        const ais = JSON.stringify(
          (window as unknown as { APP_INITIALIZATION_STATE: unknown }).APP_INITIALIZATION_STATE,
        );
        for (const m of ais.match(/AF1Qip[A-Za-z0-9_-]{10,}/g) ?? []) {
          push(`https://lh3.googleusercontent.com/p/${m}`);
        }
      } catch {
        /* not serializable */
      }
      return urls;
    });
    collected.push(...visible);
  }

  await browser.close();
  browser = undefined;

  // Filter to place photos, dedupe by photo id, keep page order, cap at MAX.
  const seen = new Set<string>();
  const picks: string[] = [];
  for (const u of collected) {
    if (!isPlacePhoto(u)) continue;
    const id = photoId(u);
    if (seen.has(id)) continue;
    seen.add(id);
    picks.push(upscale(u));
    if (picks.length >= MAX) break;
  }
  console.error(`found ${picks.length} candidate photo(s)`);

  const imgDir = path.join(demoSiteDir(slug), "img");
  type Entry = { file: string; w: number; h: number };
  const manifest: Entry[] = [];

  if (picks.length > 0) {
    fs.mkdirSync(imgDir, { recursive: true });
    let n = 0;
    for (const u of picks) {
      const idx = n + 1;
      const tmp = path.join(imgDir, `.photo-${idx}.src`);
      try {
        const res = await fetch(u, {
          headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64)" },
        });
        if (!res.ok) {
          console.error(`skip (http ${res.status}): ${u.slice(0, 90)}`);
          continue;
        }
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < 4096) {
          console.error(`skip (too small, ${buf.length}B): ${u.slice(0, 90)}`);
          continue;
        }
        fs.writeFileSync(tmp, buf);
        const out = path.join(imgDir, `photo-${manifest.length + 1}.webp`);
        const ff = spawnSync(
          FFMPEG,
          ["-y", "-i", tmp, "-c:v", "libwebp", "-preset", "photo", "-quality", "82", out],
          { stdio: ["ignore", "ignore", "pipe"] },
        );
        if (ff.status !== 0) {
          console.error(`skip (ffmpeg failed): ${u.slice(0, 90)}`);
          continue;
        }
        const dim = probeDims(out);
        if (!dim) {
          console.error(`skip (no dimensions): ${u.slice(0, 90)}`);
          fs.rmSync(out, { force: true });
          continue;
        }
        manifest.push({ file: path.basename(out), w: dim.w, h: dim.h });
        console.error(`photo-${manifest.length}.webp  ${dim.w}x${dim.h}`);
      } catch (e) {
        console.error(`skip (${(e as Error).message}): ${u.slice(0, 90)}`);
      } finally {
        fs.rmSync(tmp, { force: true });
        n++;
      }
    }

    if (manifest.length > 0) {
      // Drop stale photos beyond the new count, then write the manifest.
      for (const f of fs.readdirSync(imgDir)) {
        const m = f.match(/^photo-(\d+)\.webp$/);
        if (m && Number(m[1]) > manifest.length) fs.rmSync(path.join(imgDir, f), { force: true });
      }
      fs.writeFileSync(path.join(imgDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    }
  }

  if (manifest.length === 0) {
    console.error("no photos captured — demo keeps its current (photo-less) design");
  }
  console.log(JSON.stringify({ slug, photos: manifest }));
} catch (err) {
  if (browser) await browser.close().catch(() => {});
  console.error("scrape-photos failed:", (err as Error).message);
  process.exit(1);
}

function probeDims(file: string): { w: number; h: number } | null {
  if (FFPROBE) {
    const r = spawnSync(
      FFPROBE,
      ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", file],
      { encoding: "utf8" },
    );
    const m = (r.stdout || "").trim().match(/^(\d+),(\d+)/);
    if (m) return { w: Number(m[1]), h: Number(m[2]) };
  }
  // Fallback: parse "1600x1200" from ffmpeg -i stderr.
  const r = spawnSync(FFMPEG, ["-i", file], { encoding: "utf8" });
  const m = (r.stderr || "").match(/, (\d{2,5})x(\d{2,5})[ ,]/);
  if (m) return { w: Number(m[1]), h: Number(m[2]) };
  return null;
}
