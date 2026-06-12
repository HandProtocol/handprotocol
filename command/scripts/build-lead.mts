/*
  build-lead: drop a Google Maps link, get a lead + demo + pitch in one shot.

    npx tsx scripts/build-lead.mts "<maps-url>" [flags]

  The whole Phase 1 -> 4 pipeline, headless, no agent in the loop:
    1. scrape-lead    Maps link  -> biz/<slug>/lead.md (facts + reviews verbatim)
    2. register-lead  lead.md     -> command.biz_leads + biz_reviews
    3. generate-site  lead+reviews-> web/demos/<slug>/index.html (quick template)
    4. generate-pitch lead+reviews-> web/demos/<slug>/pitch/index.html

  Stamping demo_generated_at in step 3 is what the agent's develop-leads poll
  turns into the "demo built" post in the Telegram 💼 Develop topic — so a dropped
  link self-announces with a working demo URL within ~3 minutes. This script is
  the entrypoint a Telegram hook (or `hand` CLI) calls.

  Still to do by a human after this runs: confirm the phone before it goes on the
  public demo's click-to-call, and (for a lead worth it) upgrade the quick demo to
  a premium /impeccable build, then redeploy.

  Flags:
    --max=12        reviews to capture (default 12 — enough to curate from)
    --slug=<slug>   force the slug (else kebab of name + city; re-runs need this)
    --lead=koH      hand_lead to stamp
    --price=75      pitch offer price
    --no-pitch      stop after the demo (skip the pitch page)
    --keep-going    don't abort the pipeline if a step errors
*/
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const CMD = fileURLToPath(new URL("../", import.meta.url)); // command/
const argv = process.argv.slice(2);
const url = argv.find((a) => !a.startsWith("--"));
const flag = (n: string, d = "") => {
  const a = argv.find((x) => x.startsWith(`--${n}=`));
  return a ? a.split("=").slice(1).join("=") : d;
};
const has = (n: string) => argv.includes(`--${n}`);
if (!url) {
  console.error('usage: npx tsx scripts/build-lead.mts "<maps-url>" [--max=12] [--slug=] [--lead=koH] [--price=75] [--no-pitch]');
  process.exit(1);
}

const max = flag("max", "12");
const lead = flag("lead", "koH");
const price = flag("price", "75");
const slugOverride = flag("slug");
const keepGoing = has("keep-going");

function run(label: string, args: string[], capture = false): string {
  console.error(`\n━━ ${label} ━━`);
  try {
    const out = execFileSync("npx", ["tsx", ...args], {
      cwd: CMD,
      encoding: "utf8",
      stdio: capture ? ["inherit", "pipe", "inherit"] : "inherit",
    });
    return out || "";
  } catch (e) {
    const msg = (e as Error).message;
    console.error(`✗ ${label} failed: ${msg}`);
    if (!keepGoing) process.exit(1);
    return "";
  }
}

// 1. scrape — capture stdout to read the slug (last line is JSON).
const scrapeArgs = ["scripts/scrape-lead.mts", url, `--max=${max}`, `--lead=${lead}`];
if (slugOverride) scrapeArgs.push(`--slug=${slugOverride}`);
const scrapeOut = run("scrape", scrapeArgs, true);

let slug = slugOverride;
let websiteStatus = "";
const jsonLine = scrapeOut.trim().split("\n").filter(Boolean).pop() || "";
try {
  const meta = JSON.parse(jsonLine) as { slug?: string; website_status?: string };
  if (!slug && meta.slug) slug = meta.slug;
  websiteStatus = meta.website_status || "";
} catch {
  /* fall through to the guard below */
}
if (!slug) {
  console.error("✗ could not determine the slug from the scrape; aborting.");
  process.exit(1);
}
console.error(`slug = ${slug}`);

// 2. register -> Supabase
run("register", ["scripts/register-lead.mts", slug]);

// 3. generate-site (quick template) — stamps demo_generated_at -> Telegram poll
run("generate-site", ["scripts/generate-site.mts", slug]);

// 4. generate-pitch
if (!has("no-pitch")) {
  run("generate-pitch", ["scripts/generate-pitch.mts", slug, `--price=${price}`]);
}

// summary
const demo = `https://handprotocol.org/demos/${slug}/`;
const pitch = `https://handprotocol.org/demos/${slug}/pitch/`;
console.error("\n━━ done ━━");
console.error(`lead.md:  biz/${slug}/lead.md`);
console.error(`demo:     web/demos/${slug}/index.html  →  ${demo}`);
if (!has("no-pitch")) console.error(`pitch:    web/demos/${slug}/pitch/index.html  →  ${pitch} (login hand / handme)`);
console.error("");
console.error("Telegram: the 💼 Develop topic posts this lead + demo on the next poll (≤3 min).");
console.error("Next:     1) confirm the phone before it goes on the public demo's tel: link");
console.error("          2) deploy — stage biz/" + slug + "/ + web/demos/" + slug + "/, commit, cherry-pick to main");
if (websiteStatus === "ok") {
  console.error(`\n⚠ heads-up: ${slug} already has a website — confirm it still qualifies before pitching.`);
}
// stdout: machine-readable for a caller (the Telegram hook)
console.log(JSON.stringify({ slug, demo, pitch: has("no-pitch") ? null : pitch, website_status: websiteStatus }));
