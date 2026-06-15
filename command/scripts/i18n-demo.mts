#!/usr/bin/env -S npx tsx
/**
 * i18n-demo.mts — bulk EN/ES localizer for HAND demo sites.
 *
 * Source-preserving codemod: it does NOT reparse/reserialize the HTML (which
 * would mangle the hand-built /impeccable demos). It operates on the raw string:
 *   - injects a floating language toggle right after <body>,
 *   - injects the ~25-line auto-detect i18n script before </body>,
 *   - wraps each translatable visible text RUN ( >text< with no nested tags )
 *     in <span data-es="…">…</span>, but ONLY when the run's trimmed text is a
 *     key in (CHROME dictionary ∪ the per-site translations map). Exact-match
 *     only — zero false positives, so verbatim review quotes left out of the
 *     map simply stay in their original language.
 *   - translates <title> + <meta name=description> via a data-es attribute.
 *
 * Two phases:
 *   extract <slug…>  -> writes /tmp/i18n-extract.json: per-site unique runs NOT
 *                       covered by CHROME, for a translator (Haiku batch, or a
 *                       human) to fill. Skips <script>/<style>/<title> regions.
 *   apply   <slug…>  -> reads /tmp/i18n-translations.json (same shape) + CHROME
 *                       and rewrites web/demos/<slug>/index.html in place.
 *
 * The translate step in production is a Haiku Batch-API call over the extract
 * JSON; here the map is hand-curated for the test batch. Idempotent: apply bails
 * if the file already carries the toggle.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = "/home/koh/Documents/handprotocol";
const EXTRACT_OUT = "/tmp/i18n-extract.json";
const TRANSLATIONS_IN = "/tmp/i18n-translations.json";
const MARKER = 'data-lang-toggle';

// Shared "chrome" — repeated UI strings translated ONCE and reused across every
// demo. Mexican Spanish. Keys are exact trimmed visible runs.
const CHROME: Record<string, string> = {
  "Skip to content": "Saltar al contenido",
  "Get directions": "Cómo llegar",
  "Directions": "Cómo llegar",
  "Open in Google Maps": "Abrir en Google Maps",
  "View on Google Maps": "Ver en Google Maps",
  "Call now": "Llama ahora",
  "Call to order": "Llama para ordenar",
  "Call to order ahead": "Llama para ordenar",
  "Order now": "Ordena ya",
  "View menu": "Ver el menú",
  "See the menu": "Ver el menú",
  "Find us": "Encuéntranos",
  "Find the truck": "Encuentra el food truck",
  "Straight from Google": "Directo de Google",
  "From Google reviews": "De las reseñas de Google",
  "What people say": "Lo que dice la gente",
  "Hours": "Horario",
  "Hours & contact": "Horario y contacto",
  "Address": "Dirección",
  "Phone": "Teléfono",
  "Menu": "Menú",
  "Reviews": "Reseñas",
  "Walk-ins welcome": "Aceptamos walk-ins",
  "Cash only": "Solo efectivo",
};

const args = process.argv.slice(2);
const cmd = args[0];
const slugs = args.slice(1);
if (!["extract", "apply"].includes(cmd) || slugs.length === 0) {
  console.error("usage: i18n-demo.mts <extract|apply> <slug…>");
  process.exit(1);
}

const demoPath = (slug: string) => join(ROOT, "web/demos", slug, "index.html");

// --- shared helpers ---------------------------------------------------------

// Mask <script>, <style>, and <title> regions so we never wrap text inside them.
// Returns the html with those regions replaced by same-length filler, plus the
// original so callers can map back by index (we only need indices to be stable).
function maskedHtml(html: string): string {
  return html.replace(/<(script|style|title)\b[\s\S]*?<\/\1>/gi, (m) =>
    m[0] + "\x00".repeat(m.length - 1),
  );
}

// A "run" is visible text between > and < with no nested tags.
const RUN_RE = />([^<>\x00]+)</g;

// Does a trimmed run look like real translatable copy? (used for extract only)
function isTranslatable(t: string): boolean {
  const stripped = t.replace(/&[a-zA-Z]+;|&#\d+;|&#x[0-9a-fA-F]+;/g, " ");
  const letters = (stripped.match(/[A-Za-zÀ-ÿ]/g) || []).length;
  return letters >= 2 && /[A-Za-z]/.test(stripped);
}

function escAttr(s: string): string {
  return s
    .replace(/&(?!(amp|lt|gt|quot|#\d+|#x[0-9a-fA-F]+);)/g, "&amp;")
    .replace(/"/g, "&quot;");
}

// --- extract ----------------------------------------------------------------

// Is index `i` inside an element whose class/section marks it as a verbatim
// review quote? Scan the open tags before i for a quote-ish container that
// hasn't closed. Coarse but safe: a false positive just leaves a string for the
// translator to skip; the apply pass is exact-match either way.
const QUOTE_CLASS = /class="[^"]*\b(quote|quotes|voice|voices|review|reviews|testimonial|testimonials|cite)\b/i;
function inQuoteContainer(html: string, i: number): boolean {
  const before = html.slice(Math.max(0, i - 1400), i);
  // nearest preceding <blockquote …> / <figure|div|section class="…quote…"> with no closer after it
  const opens = before.match(/<(blockquote|figure|div|section|article|cite)\b[^>]*>/gi) || [];
  for (let k = opens.length - 1; k >= 0; k--) {
    const tag = opens[k];
    const name = tag.match(/^<(\w+)/)![1].toLowerCase();
    if (name === "blockquote" || name === "cite" || QUOTE_CLASS.test(tag)) {
      const openIdx = before.lastIndexOf(tag);
      const closer = new RegExp(`</${name}>`, "i");
      if (!closer.test(before.slice(openIdx + tag.length))) return true; // still open at i
    }
  }
  return false;
}

if (cmd === "extract") {
  const out: Record<string, { runs: string[]; skippedReviews?: string[]; title?: string; description?: string }> = {};
  for (const slug of slugs) {
    const p = demoPath(slug);
    if (!existsSync(p)) { console.error(`skip (missing): ${slug}`); continue; }
    const html = readFileSync(p, "utf8");
    const masked = maskedHtml(html);
    const seen = new Set<string>();
    const runs: string[] = [];
    const skippedReviews: string[] = [];
    let m: RegExpExecArray | null;
    RUN_RE.lastIndex = 0;
    while ((m = RUN_RE.exec(masked))) {
      const raw = m[1].trim();
      if (!raw || !isTranslatable(raw)) continue;
      if (CHROME[raw]) continue;          // already covered by the shared dict
      if (seen.has(raw)) continue;
      seen.add(raw);
      // route verbatim review quotes / cites to a do-not-translate list
      if (inQuoteContainer(html, m.index)) { skippedReviews.push(raw); continue; }
      runs.push(raw);
    }
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1].trim();
    const description = html.match(/<meta\s+name=["']description["'][^>]*\bcontent=["']([^"']*)["']/i)?.[1].trim();
    out[slug] = { runs, ...(skippedReviews.length ? { skippedReviews } : {}), ...(title ? { title } : {}), ...(description ? { description } : {}) };
    console.error(`${slug}: ${runs.length} runs to translate, ${skippedReviews.length} review/cite runs skipped` +
      (title ? " + title" : "") + (description ? " + description" : ""));
  }
  writeFileSync(EXTRACT_OUT, JSON.stringify(out, null, 2));
  // token-cost telemetry
  let chars = 0, count = 0;
  for (const v of Object.values(out)) {
    for (const r of v.runs) { chars += r.length; count++; }
    if (v.title) { chars += v.title.length; count++; }
    if (v.description) { chars += v.description.length; count++; }
  }
  console.error(`\nwrote ${EXTRACT_OUT}`);
  console.error(`total unique strings: ${count}  (~${chars} chars ≈ ~${Math.round(chars / 4)} input tokens to translate, both directions ≈ ~${Math.round(chars / 2)} tokens)`);
}

// --- apply ------------------------------------------------------------------

if (cmd === "apply") {
  if (!existsSync(TRANSLATIONS_IN)) {
    console.error(`missing ${TRANSLATIONS_IN} — run extract, translate, then apply`);
    process.exit(1);
  }
  const T = JSON.parse(readFileSync(TRANSLATIONS_IN, "utf8")) as
    Record<string, { runs?: Record<string, string>; title?: string; description?: string }>;

  // Bottom-right floating pill: the standard "translate widget" position, clear
  // of the heterogeneous top-right nav CTAs the demos carry (a top-right pill
  // collided with them). Uniform across all 218 demos regardless of header markup.
  const TOGGLE =
    `\n<button ${MARKER} data-lang-to="es" type="button" aria-label="Ver en español" aria-pressed="false" ` +
    `style="position:fixed;bottom:16px;right:16px;z-index:99999;display:inline-flex;align-items:center;gap:.45em;` +
    `padding:.6em 1em;font:700 14px/1 system-ui,-apple-system,sans-serif;color:#fff;background:rgba(22,22,22,.9);` +
    `border:1px solid rgba(255,255,255,.3);border-radius:999px;cursor:pointer;` +
    `-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);box-shadow:0 6px 20px -6px rgba(0,0,0,.6)">` +
    `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ` +
    `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/>` +
    `<path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>` +
    `</svg><span class="hand-lang-label">Español</span></button>\n`;

  const SCRIPT =
    `\n<script>\n(function(){var KEY="hand-lang";` +
    `var nodes=[].slice.call(document.querySelectorAll("[data-es]"));` +
    `nodes.forEach(function(n){n.__en=(n.tagName==="META")?n.getAttribute("content"):n.innerHTML;});` +
    `function setToggles(es){[].forEach.call(document.querySelectorAll("[${MARKER}]"),function(b){` +
    `b.setAttribute("data-lang-to",es?"en":"es");b.setAttribute("aria-pressed",es?"true":"false");` +
    `b.setAttribute("aria-label",es?"View in English":"Ver en español");` +
    `var l=b.querySelector(".hand-lang-label");if(l)l.textContent=es?"English":"Español";});}` +
    `function apply(lang){var es=lang==="es";nodes.forEach(function(n){` +
    `var v=es?n.getAttribute("data-es"):n.__en;if(v==null)return;` +
    `if(n.tagName==="META")n.setAttribute("content",v);else n.innerHTML=v;});` +
    `document.documentElement.lang=es?"es":"en";setToggles(es);}` +
    `var stored=null;try{stored=localStorage.getItem(KEY);}catch(e){}` +
    `var nav=(navigator.language||navigator.userLanguage||"").toLowerCase();` +
    `apply(stored||(nav.indexOf("es")===0?"es":"en"));` +
    `document.addEventListener("click",function(e){var b=e.target.closest&&e.target.closest("[${MARKER}]");` +
    `if(!b)return;e.preventDefault();var to=b.getAttribute("data-lang-to")||"es";apply(to);` +
    `try{localStorage.setItem(KEY,to);}catch(e2){}});})();\n</script>\n`;

  for (const slug of slugs) {
    const p = demoPath(slug);
    if (!existsSync(p)) { console.error(`skip (missing): ${slug}`); continue; }
    let html = readFileSync(p, "utf8");
    if (html.includes(MARKER)) { console.error(`skip (already localized): ${slug}`); continue; }

    const t = T[slug] || {};
    const map: Record<string, string> = { ...CHROME, ...(t.runs || {}) };

    // 1) wrap visible runs — only outside script/style/title, only exact map hits.
    const masked = maskedHtml(html);
    // walk masked to find run spans, but mutate the real html by the same indices
    // (mask preserves length + positions, so indices line up).
    let result = "";
    let last = 0;
    let wrapped = 0;
    let m: RegExpExecArray | null;
    RUN_RE.lastIndex = 0;
    while ((m = RUN_RE.exec(masked))) {
      const full = m[0];                       // ">...<"
      const inner = m[1];                      // raw text incl. surrounding ws
      const start = m.index;
      const key = inner.trim();
      const es = map[key];
      result += html.slice(last, start);
      if (es) {
        const lead = inner.match(/^\s*/)![0];
        const trail = inner.match(/\s*$/)![0];
        const core = inner.slice(lead.length, inner.length - trail.length);
        result += `>${lead}<span data-es="${escAttr(es)}">${core}</span>${trail}<`;
        wrapped++;
      } else {
        result += full;
      }
      last = start + full.length;
    }
    result += html.slice(last);
    html = result;

    // 2) <title> + meta description via data-es attribute
    if (t.title) {
      html = html.replace(/<title(\s[^>]*)?>/i, (m0) =>
        m0.includes("data-es") ? m0 : m0.replace(/^<title/i, `<title data-es="${escAttr(t.title!)}"`));
    }
    if (t.description) {
      html = html.replace(/<meta\s+name=["']description["'][^>]*>/i, (tag) =>
        tag.includes("data-es") ? tag : tag.replace(/^<meta/i, `<meta data-es="${escAttr(t.description!)}"`));
    }

    // 3) inject toggle after <body…> and script before </body>
    html = html.replace(/<body[^>]*>/i, (b) => b + TOGGLE);
    html = html.replace(/<\/body>/i, SCRIPT + "</body>");

    writeFileSync(p, html);
    console.error(`${slug}: wrapped ${wrapped} runs` + (t.title ? " + title" : "") + (t.description ? " + desc" : ""));
  }
}
