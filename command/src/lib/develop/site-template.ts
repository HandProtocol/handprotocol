/*
  HAND Command Center, demo-site renderer.
  Turns a business lead plus the assistant's (or the fallback's) structured copy
  into a single self-contained HTML page. No build step, no JS dependencies
  (Google Fonts link plus the visit beacon only), one inline stylesheet.

  Design system: category-aware themes. Each theme keys a display font, a body
  font, and a full palette to the business category (taco truck reds, BBQ char
  and ember, espresso and cream, and so on) so the page reads like it was
  designed for THAT business, not stamped from a generic template. The type and
  color system carries the page with zero images.

  Image policy (settled): public demo pages NEVER show scraped Google Maps
  photos. They may use the curated free-license sample library at
  web/assets/biz-samples/ as AMBIENT imagery only: a hero background under a
  strong tinted overlay, plus one accent band. Never presented as the
  business's own photos; a footer line discloses the sample art. The
  business's scraped photos live only on the gated pitch page.
*/
import type { BizLead, SiteCopy } from "./types";

// Ambient sample imagery for the public page. Both are site-absolute URL
// paths (e.g. /assets/biz-samples/mexican-1.webp) into the curated library.
export type SampleImages = { hero?: string; accent?: string };

export type RenderOptions = {
  samples?: SampleImages;
  // Dish/service words actually present in the reviews (deriveMentions).
  mentions?: string[];
};

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function telHref(phone: string | null): string {
  if (!phone) return "";
  return phone.replace(/[^\d+]/g, "");
}

function mapsHref(lead: BizLead): string {
  if (lead.google_url) return lead.google_url;
  const q = [lead.name, lead.address, lead.city, lead.state]
    .filter(Boolean)
    .join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

// Click-for-directions deep link (Maps dir API; output=embed iframes render
// blank on the demos domain, so links it is).
function directionsHref(lead: BizLead): string {
  const dest = [lead.name, lead.address, lead.city, lead.state]
    .filter(Boolean)
    .join(", ");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
}

function stars(rating: number | null): string {
  if (!rating) return "";
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(Math.max(0, 5 - full));
}

// ─── Category themes ─────────────────────────────────────────────────────────

type Theme = {
  key: string;
  re: RegExp;
  fontsHref: string;
  display: string; // css font-family stack for display type
  body: string; // css font-family stack for body type
  upper: boolean; // condensed poster fonts read best uppercase
  heroSize: string;
  v: {
    bg: string;
    ink: string;
    dim: string;
    line: string;
    card: string;
    accent: string;
    accentInk: string;
    gold: string;
    tint: string;
    band: string;
    bandInk: string;
    deepA: string;
    deepB: string;
    deepInk: string;
    heroA: string;
    heroB: string;
    shadeA: string;
    shadeB: string;
  };
};

const WORK_SANS = `"Work Sans", -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
const KARLA = `"Karla", -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;

const THEMES: Theme[] = [
  {
    // Mariscos before the Mexican catch-all so seafood trucks read coastal.
    key: "seafood",
    re: /(seafood|mariscos|cevich|fish|crab|shrimp|oyster|lobster)/i,
    fontsHref:
      "https://fonts.googleapis.com/css2?family=Bitter:wght@500;700;800&family=Karla:wght@400;600;700&display=swap",
    display: `"Bitter", Georgia, serif`,
    body: KARLA,
    upper: false,
    heroSize: "clamp(2.7rem, 9vw, 5.2rem)",
    v: {
      bg: "#F4F6F2", ink: "#16282F", dim: "#54676E", line: "#DCE3DE", card: "#FCFEFB",
      accent: "#C75F40", accentInk: "#FFF2EC", gold: "#E3B25C",
      tint: "#E7EEE9",
      band: "#143246", bandInk: "#EAF2F5",
      deepA: "#122C3E", deepB: "#0A1B27", deepInk: "#E7F0F4",
      heroA: "#16384E", heroB: "#0C2231",
      shadeA: "rgba(10,27,39,0.80)", shadeB: "rgba(7,18,26,0.93)",
    },
  },
  {
    key: "mexican",
    re: /(mexican|tex.?mex|taco|taquer|birria|barbacoa|pupus|salvador|hondur|venezuel|colomb|peruv|latin|antojito|arepa|botana|guatemal|cuban|nicarag|menudo|tamale)/i,
    fontsHref:
      "https://fonts.googleapis.com/css2?family=Anton&family=Work+Sans:wght@400;600;700&display=swap",
    display: `"Anton", "Arial Narrow", sans-serif`,
    body: WORK_SANS,
    upper: true,
    heroSize: "clamp(3rem, 11vw, 6.2rem)",
    v: {
      bg: "#FBF4E4", ink: "#2D1A10", dim: "#6E5847", line: "#EAD9BD", card: "#FFFDF6",
      accent: "#C03A14", accentInk: "#FFF4E4", gold: "#F0A832",
      tint: "#F6E8CC",
      band: "#8E2912", bandInk: "#FFEFD9",
      deepA: "#461309", deepB: "#2C0C05", deepInk: "#F7E7D4",
      heroA: "#93290F", heroB: "#5F1A08",
      shadeA: "rgba(63,17,5,0.80)", shadeB: "rgba(40,10,3,0.93)",
    },
  },
  {
    key: "bbq",
    re: /(barbecue|bbq|smokehouse|smoke|grill|steak|brisket)/i,
    fontsHref:
      "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Bitter:wght@400;600;700&display=swap",
    display: `"Bebas Neue", "Arial Narrow", sans-serif`,
    body: `"Bitter", Georgia, serif`,
    upper: true,
    heroSize: "clamp(3.2rem, 12vw, 6.6rem)",
    v: {
      bg: "#F4EDE1", ink: "#211910", dim: "#6A5C4B", line: "#E3D6C1", card: "#FCF8F0",
      accent: "#C8521C", accentInk: "#FFF3E6", gold: "#E89B3C",
      tint: "#ECE0CC",
      band: "#1B130C", bandInk: "#F4E8D6",
      deepA: "#221710", deepB: "#120C07", deepInk: "#EFE3D0",
      heroA: "#2B1D11", heroB: "#15100A",
      shadeA: "rgba(20,13,7,0.82)", shadeB: "rgba(14,9,5,0.94)",
    },
  },
  {
    key: "cafe",
    re: /(coffee|caf[eé]|bakery|dessert|ice cream|gelato|paleter|donut|doughnut|juice|smoothie|crepe|boba|tea house|panader|past(ry|eler)|sweet)/i,
    fontsHref:
      "https://fonts.googleapis.com/css2?family=Spectral:wght@500;600;700&family=Karla:wght@400;600;700&display=swap",
    display: `"Spectral", Georgia, serif`,
    body: KARLA,
    upper: false,
    heroSize: "clamp(2.6rem, 8.5vw, 4.8rem)",
    v: {
      bg: "#F8F2E8", ink: "#31231A", dim: "#76624F", line: "#E8DCC9", card: "#FFFCF6",
      accent: "#9C5C24", accentInk: "#FFF6E9", gold: "#D8A35C",
      tint: "#F1E6D3",
      band: "#3C2818", bandInk: "#F4E9DA",
      deepA: "#382517", deepB: "#20140C", deepInk: "#F2E7D8",
      heroA: "#432C1A", heroB: "#2A1A0F",
      shadeA: "rgba(38,24,14,0.78)", shadeB: "rgba(26,16,9,0.93)",
    },
  },
  {
    key: "asian",
    re: /(thai|viet|pho\b|chinese|asian|japan|sushi|ramen|korean|momo|nepal|himalay|dumpling|wok|teriyaki|hibachi|poke|indones|filipino|malay|szechuan|sichuan|dim sum)/i,
    fontsHref:
      "https://fonts.googleapis.com/css2?family=Archivo+Black&family=Work+Sans:wght@400;600;700&display=swap",
    display: `"Archivo Black", "Arial Black", sans-serif`,
    body: WORK_SANS,
    upper: false,
    heroSize: "clamp(2.4rem, 8.5vw, 4.9rem)",
    v: {
      bg: "#F6F4EC", ink: "#1B201D", dim: "#5C655F", line: "#DFE0D2", card: "#FDFCF7",
      accent: "#BE3A2B", accentInk: "#FFF3EE", gold: "#D9A441",
      tint: "#E9EBDD",
      band: "#14342A", bandInk: "#ECF2E9",
      deepA: "#122A22", deepB: "#0A1A14", deepInk: "#E8F0EA",
      heroA: "#173B2F", heroB: "#0D241C",
      shadeA: "rgba(11,30,23,0.80)", shadeB: "rgba(7,20,15,0.93)",
    },
  },
  {
    key: "mediterranean",
    re: /(mediterran|greek|lebanes|turkish|halal|middle eastern|gyro|kebab|kabob|shawarma|falafel|indian|pakistan|biryani|persian|afghan|moroc|demashqi|syrian|israeli)/i,
    fontsHref:
      "https://fonts.googleapis.com/css2?family=Marcellus&family=Karla:wght@400;600;700&display=swap",
    display: `"Marcellus", Georgia, serif`,
    body: KARLA,
    upper: false,
    heroSize: "clamp(2.7rem, 9vw, 5rem)",
    v: {
      bg: "#F8F3E7", ink: "#27291F", dim: "#67695A", line: "#E5DFC9", card: "#FEFBF2",
      accent: "#37717E", accentInk: "#EFF7F6", gold: "#D9B25F",
      tint: "#EFE9D4",
      band: "#4A5631", bandInk: "#F2F0DF",
      deepA: "#234046", deepB: "#14272B", deepInk: "#E9F0EC",
      heroA: "#2A4D54", heroB: "#182F33",
      shadeA: "rgba(20,38,42,0.78)", shadeB: "rgba(13,25,28,0.93)",
    },
  },
  {
    key: "caribbean",
    re: /(jamaic|caribbean|creole|cajun|soul|southern|afro|african|haitian|trinidad|island)/i,
    fontsHref:
      "https://fonts.googleapis.com/css2?family=Bitter:wght@500;700;800&family=Work+Sans:wght@400;600;700&display=swap",
    display: `"Bitter", Georgia, serif`,
    body: WORK_SANS,
    upper: false,
    heroSize: "clamp(2.7rem, 9vw, 5.2rem)",
    v: {
      bg: "#F9F3E2", ink: "#221B10", dim: "#6A5E48", line: "#E8DCC0", card: "#FFFCF2",
      accent: "#1E7A48", accentInk: "#ECFAF0", gold: "#E2A93B",
      tint: "#F1E6C8",
      band: "#173F28", bandInk: "#EFF6E8",
      deepA: "#14351F", deepB: "#0B2113", deepInk: "#E9F2E5",
      heroA: "#1A4A2C", heroB: "#0E2C1A",
      shadeA: "rgba(12,38,21,0.80)", shadeB: "rgba(8,25,14,0.93)",
    },
  },
  {
    key: "diner",
    re: /(burger|hamburg|hot ?dog|wing|pizza|sandwich|deli\b|fast food|fried chicken|chicken|diner|breakfast)/i,
    fontsHref:
      "https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Work+Sans:wght@400;600;700&display=swap",
    display: `"Oswald", "Arial Narrow", sans-serif`,
    body: WORK_SANS,
    upper: true,
    heroSize: "clamp(3rem, 10.5vw, 6rem)",
    v: {
      bg: "#FAF5EA", ink: "#25283A", dim: "#62657A", line: "#E5E0D0", card: "#FFFDF5",
      accent: "#C22F35", accentInk: "#FFF1EE", gold: "#E8B23A",
      tint: "#EFEADB",
      band: "#222A47", bandInk: "#EFF1F7",
      deepA: "#1F2742", deepB: "#12172B", deepInk: "#E9ECF5",
      heroA: "#28304F", heroB: "#161C33",
      shadeA: "rgba(18,23,43,0.80)", shadeB: "rgba(12,15,29,0.93)",
    },
  },
  {
    key: "salon",
    re: /(salon|barber|beauty|nail|spa\b|hair|lash|brow)/i,
    fontsHref:
      "https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Karla:wght@400;600;700&display=swap",
    display: `"DM Serif Display", Georgia, serif`,
    body: KARLA,
    upper: false,
    heroSize: "clamp(2.7rem, 9vw, 5rem)",
    v: {
      bg: "#FAF6F1", ink: "#2B2320", dim: "#6F615B", line: "#EADFD6", card: "#FFFCF9",
      accent: "#A45C50", accentInk: "#FFF3EE", gold: "#D2A47C",
      tint: "#F2E8DF",
      band: "#3C2C26", bandInk: "#F4EAE3",
      deepA: "#352723", deepB: "#201613", deepInk: "#F0E6DF",
      heroA: "#3F2D27", heroB: "#271B17",
      shadeA: "rgba(38,26,22,0.78)", shadeB: "rgba(26,17,14,0.93)",
    },
  },
];

const DEFAULT_THEME: Theme = {
  key: "default",
  re: /./,
  fontsHref:
    "https://fonts.googleapis.com/css2?family=Bitter:wght@400;600;800&family=Work+Sans:wght@400;600;700&display=swap",
  display: `"Bitter", Georgia, serif`,
  body: WORK_SANS,
  upper: false,
  heroSize: "clamp(2.7rem, 9vw, 5.2rem)",
  v: {
    bg: "#F8F4EB", ink: "#27211A", dim: "#6C6052", line: "#E7DECC", card: "#FFFCF4",
    accent: "#B4541E", accentInk: "#FFF3E8", gold: "#D9A441",
    tint: "#F0E7D3",
    band: "#33281C", bandInk: "#F2EADC",
    deepA: "#30251A", deepB: "#1C140D", deepInk: "#EFE7D9",
    heroA: "#3A2C1D", heroB: "#231A10",
    shadeA: "rgba(35,26,16,0.78)", shadeB: "rgba(24,17,10,0.93)",
  },
};

export function themeFor(category: string | null | undefined): Theme {
  const c = category || "";
  for (const t of THEMES) if (t.re.test(c)) return t;
  return DEFAULT_THEME;
}

// ─── Sample-library selection ────────────────────────────────────────────────
/*
  The curated free-license sample library lives at web/assets/biz-samples/ with
  a manifest.json mapping category regexes to files. Produced by a separate
  pipeline; this parser is deliberately tolerant of shape:
    { "categoryMap": { "<regex>": ["a.webp", ...], ... } }
    { "categoryMap": [ { "pattern": "<regex>", "files": [...] }, ... ] }
  File entries may be plain strings or { "file": "..." } objects. A key of
  "default" or ".*" acts as the fallback bucket. Selection is deterministic
  per slug so regeneration is stable.
*/
export function pickSampleImages(
  manifest: unknown,
  category: string | null | undefined,
  slug: string,
): SampleImages {
  type Entry = { re: RegExp; files: string[]; isDefault: boolean };
  const entries: Entry[] = [];

  const toFiles = (v: unknown): string[] => {
    if (!Array.isArray(v)) return [];
    return v
      .map((f) => {
        if (typeof f === "string") return f;
        if (f && typeof f === "object" && typeof (f as { file?: unknown }).file === "string") {
          return (f as { file: string }).file;
        }
        return "";
      })
      .filter(Boolean);
  };

  const add = (pattern: string, filesRaw: unknown) => {
    const files = toFiles(filesRaw);
    if (!files.length) return;
    const isDefault =
      pattern === "default" || pattern === "_default" || pattern === ".*" || pattern === "*";
    try {
      entries.push({ re: new RegExp(isDefault ? "." : pattern, "i"), files, isDefault });
    } catch {
      /* bad regex in manifest; skip the bucket */
    }
  };

  if (manifest && typeof manifest === "object") {
    const m = manifest as Record<string, unknown>;
    const cm = m.categoryMap ?? m.categories ?? null;
    if (Array.isArray(cm)) {
      for (const e of cm) {
        if (!e || typeof e !== "object") continue;
        const ev = e as Record<string, unknown>;
        const pattern = ev.pattern ?? ev.regex ?? ev.match ?? ev.category;
        if (typeof pattern === "string") add(pattern, ev.files ?? ev.images);
      }
    } else if (cm && typeof cm === "object") {
      for (const [pattern, files] of Object.entries(cm)) add(pattern, files);
    } else if (!("categoryMap" in m)) {
      // Bare map shape: { "<regex>": [files] }
      for (const [pattern, files] of Object.entries(m)) add(pattern, files);
    }
  }
  if (!entries.length) return {};

  const cat = category || "";
  // The default bucket is food imagery; it only applies to plainly food-shaped
  // categories. A salon or limo service gets the no-image treatment instead of
  // an unrelated plate of food.
  const FOODISH =
    /(restaurant|food|truck|kitchen|catering|caterer|grill|eatery|takeaway|take ?out|deli\b|diner|taco|stand\b|cocina|cuisine)/i;
  const hit =
    entries.find((e) => !e.isDefault && e.re.test(cat)) ??
    (FOODISH.test(cat) ? entries.find((e) => e.isDefault) : null) ??
    null;
  if (!hit) return {};

  // djb2 over the slug: stable picks, varied across businesses.
  let h = 5381;
  for (let i = 0; i < slug.length; i++) h = ((h << 5) + h + slug.charCodeAt(i)) >>> 0;
  const n = hit.files.length;
  const hero = hit.files[h % n];
  const accent = n > 1 ? hit.files[(h + 1) % n] : undefined;
  const url = (f: string) => `/assets/biz-samples/${f.replace(/^\/+/, "")}`;
  return { hero: url(hero), accent: accent ? url(accent) : undefined };
}

// ─── Review mentions ─────────────────────────────────────────────────────────
/*
  Dish and service words actually present in the reviews. Pure string matching,
  zero invention: a chip only renders when a customer literally wrote the word.
*/
const LEXICON: { label: string; re: RegExp }[] = [
  { label: "Breakfast tacos", re: /\bbreakfast tacos?\b/i },
  { label: "Fish tacos", re: /\bfish tacos?\b/i },
  { label: "Tacos", re: /\btacos?\b/i },
  { label: "Tortas", re: /\btortas?\b/i },
  { label: "Barbacoa", re: /\bbarbacoa\b/i },
  { label: "Birria", re: /\bbirria\b/i },
  { label: "Carnitas", re: /\bcarnitas\b/i },
  { label: "Al pastor", re: /\bal pastor\b/i },
  { label: "Carne asada", re: /\basada\b/i },
  { label: "Lengua", re: /\blengua\b/i },
  { label: "Suadero", re: /\bsuadero\b/i },
  { label: "Chicharron", re: /\bchicharr[oó]n(es)?\b/i },
  { label: "Gorditas", re: /\bgorditas?\b/i },
  { label: "Quesadillas", re: /\bquesadillas?\b/i },
  { label: "Fajitas", re: /\bfajitas?\b/i },
  { label: "Menudo", re: /\bmenudo\b/i },
  { label: "Pozole", re: /\bpozole\b/i },
  { label: "Caldos", re: /\bcaldos?\b/i },
  { label: "Tamales", re: /\btamale?s?\b/i },
  { label: "Burritos", re: /\bburritos?\b/i },
  { label: "Enchiladas", re: /\benchiladas?\b/i },
  { label: "Chilaquiles", re: /\bchilaquiles\b/i },
  { label: "Migas", re: /\bmigas\b/i },
  { label: "Sopes", re: /\bsopes?\b/i },
  { label: "Huaraches", re: /\bhuaraches?\b/i },
  { label: "Tostadas", re: /\btostadas?\b/i },
  { label: "Mole", re: /\bmole\b/i },
  { label: "Queso", re: /\bqueso\b/i },
  { label: "Nachos", re: /\bnachos\b/i },
  { label: "Elote", re: /\belotes?\b/i },
  { label: "Salsas", re: /\bsalsas?\b/i },
  { label: "Guacamole", re: /\bguac(amole)?\b/i },
  { label: "Horchata", re: /\bhorchata\b/i },
  { label: "Aguas frescas", re: /\baguas? frescas?\b/i },
  { label: "Micheladas", re: /\bmicheladas?\b/i },
  { label: "Margaritas", re: /\bmargaritas?\b/i },
  { label: "Tres leches", re: /\btres leches\b/i },
  { label: "Flan", re: /\bflan\b/i },
  { label: "Churros", re: /\bchurros?\b/i },
  { label: "Pupusas", re: /\bpupusas?\b/i },
  { label: "Baleadas", re: /\bbaleadas?\b/i },
  { label: "Arepas", re: /\barepas?\b/i },
  { label: "Empanadas", re: /\bempanadas?\b/i },
  { label: "Ceviche", re: /\bcevich?es?\b/i },
  { label: "Mariscos", re: /\bmariscos\b/i },
  { label: "Pho", re: /\bpho\b/i },
  { label: "Banh mi", re: /\bbanh mi\b/i },
  { label: "Ramen", re: /\bramen\b/i },
  { label: "Sushi", re: /\bsushi\b/i },
  { label: "Dumplings", re: /\bdumplings?\b/i },
  { label: "Momos", re: /\bmomos?\b/i },
  { label: "Pad thai", re: /\bpad thai\b/i },
  { label: "Curry", re: /\bcurr(y|ies)\b/i },
  { label: "Fried rice", re: /\bfried rice\b/i },
  { label: "Noodles", re: /\bnoodles?\b/i },
  { label: "Spring rolls", re: /\bspring rolls?\b/i },
  { label: "Egg rolls", re: /\begg rolls?\b/i },
  { label: "Boba", re: /\bboba\b/i },
  { label: "Brisket", re: /\bbrisket\b/i },
  { label: "Ribs", re: /\bribs\b/i },
  { label: "Pulled pork", re: /\bpulled pork\b/i },
  { label: "Sausage", re: /\bsausages?\b/i },
  { label: "Mac and cheese", re: /\bmac (and|n|&) cheese\b/i },
  { label: "Gyros", re: /\bgyros?\b/i },
  { label: "Shawarma", re: /\bshawarma\b/i },
  { label: "Falafel", re: /\bfalafel\b/i },
  { label: "Hummus", re: /\bhummus\b/i },
  { label: "Kebabs", re: /\b(kebabs?|kabobs?)\b/i },
  { label: "Biryani", re: /\bbiryani\b/i },
  { label: "Naan", re: /\bnaan\b/i },
  { label: "Samosas", re: /\bsamosas?\b/i },
  { label: "Tikka", re: /\btikka\b/i },
  { label: "Jerk chicken", re: /\bjerk chicken\b/i },
  { label: "Oxtail", re: /\boxtails?\b/i },
  { label: "Curry goat", re: /\bcurry goat\b/i },
  { label: "Plantains", re: /\bplantains?\b/i },
  { label: "Gumbo", re: /\bgumbo\b/i },
  { label: "Po boys", re: /\bpo.?boys?\b/i },
  { label: "Etouffee", re: /\b[ée]touff[ée]e\b/i },
  { label: "Crawfish", re: /\bcrawfish\b/i },
  { label: "Catfish", re: /\bcatfish\b/i },
  { label: "Fried chicken", re: /\bfried chicken\b/i },
  { label: "Wings", re: /\bwings\b/i },
  { label: "Burgers", re: /\bburgers?\b/i },
  { label: "Fries", re: /\bfries\b/i },
  { label: "Hot dogs", re: /\bhot ?dogs?\b/i },
  { label: "Pizza", re: /\bpizzas?\b/i },
  { label: "Sandwiches", re: /\bsandwich(es)?\b/i },
  { label: "Coffee", re: /\bcoffee\b/i },
  { label: "Lattes", re: /\blattes?\b/i },
  { label: "Espresso", re: /\bespresso\b/i },
  { label: "Cold brew", re: /\bcold brew\b/i },
  { label: "Pastries", re: /\bpastr(y|ies)\b/i },
  { label: "Croissants", re: /\bcroissants?\b/i },
  { label: "Crepes", re: /\bcr[eê]pes?\b/i },
  { label: "Ice cream", re: /\bice cream\b/i },
  { label: "Smoothies", re: /\bsmoothies?\b/i },
  { label: "Pancakes", re: /\bpancakes?\b/i },
  { label: "Waffles", re: /\bwaffles?\b/i },
  { label: "Donuts", re: /\bdo(ugh)?nuts?\b/i },
  { label: "Pancit", re: /\bpancit\b/i },
  { label: "Lumpia", re: /\blumpia\b/i },
];

export function deriveMentions(reviewTexts: string[], max = 6): string[] {
  const counts: { label: string; n: number; order: number }[] = [];
  LEXICON.forEach((entry, order) => {
    let n = 0;
    for (const t of reviewTexts) if (entry.re.test(t)) n++;
    if (n > 0) counts.push({ label: entry.label, n, order });
  });
  counts.sort((a, b) => b.n - a.n || a.order - b.order);
  // Drop the generic "Tacos" chip when a more specific taco chip made the cut.
  const picked = counts.slice(0, max + 2).map((c) => c.label);
  const filtered = picked.filter(
    (l) => !(l === "Tacos" && picked.some((o) => o !== "Tacos" && /tacos$/i.test(o))),
  );
  return filtered.slice(0, max);
}

// Film-grain texture, pure CSS data URI. White speckle with alpha; sits over
// the dark hero and visit bands at low opacity.
const GRAIN =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.7 0'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)'/%3E%3C/svg%3E";

// ─── Renderer ────────────────────────────────────────────────────────────────

export function renderDemoSite(
  lead: BizLead,
  copy: SiteCopy,
  opts: RenderOptions = {},
): string {
  const t = themeFor(lead.category);
  const v = t.v;
  const tel = telHref(lead.phone);
  const dirHref = directionsHref(lead);
  const samples = opts.samples ?? {};
  const usesSamples = Boolean(samples.hero || samples.accent);
  const mentions = (opts.mentions ?? []).slice(0, 6);

  // Hero quote: the punchiest testimonial carries the proof band. Big type
  // wants few clean words, so prefer short bodies and penalize the sprawling
  // "!!!!!....." register; everything else goes to the grid.
  const ts = copy.testimonials.filter((x) => x.body && x.body.trim());
  const quoteScore = (body: string) => {
    let s = 0;
    if (body.length >= 25 && body.length <= 170) s += 3;
    else if (body.length <= 300) s += 1;
    if (/(!{3,}|\.{4,})/.test(body)) s -= 3;
    if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(body)) s -= 1;
    return s;
  };
  let heroQuoteIdx = -1;
  if (ts.length) {
    heroQuoteIdx = ts.reduce(
      (best, x, i) =>
        quoteScore(x.body) > quoteScore(ts[best].body) ||
        (quoteScore(x.body) === quoteScore(ts[best].body) &&
          x.body.length < ts[best].body.length)
          ? i
          : best,
      0,
    );
  }
  const heroQuote = heroQuoteIdx >= 0 ? ts[heroQuoteIdx] : null;
  const gridQuotes = ts.filter((_, i) => i !== heroQuoteIdx).slice(0, 3);

  const qSize = (len: number) =>
    len <= 90 ? "q-xl" : len <= 200 ? "q-lg" : "q-md";

  // Kicker: category plus place, but never parrot the headline. The fallback
  // headline already names the category, so the kicker drops to place only.
  const place = [lead.city, lead.state].filter(Boolean).join(", ");
  const headlineLower = (copy.headline || "").toLowerCase();
  const catInHeadline =
    lead.category && headlineLower.includes(lead.category.toLowerCase());
  const kicker = catInHeadline
    ? place || lead.category || ""
    : [lead.category, place].filter(Boolean).join(" · ");

  const ratingLine =
    lead.google_rating != null
      ? `<div class="rating" role="img" aria-label="Rated ${esc(String(lead.google_rating))} out of 5 on Google${lead.reviews_count ? ` across ${esc(String(lead.reviews_count))} reviews` : ""}">
        <span class="stars" aria-hidden="true">${stars(lead.google_rating)}</span>
        <span class="score">${esc(String(lead.google_rating))} on Google${lead.reviews_count ? ` · ${esc(String(lead.reviews_count))} reviews` : ""}</span>
      </div>`
      : "";

  const pinSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-5.2-7-11a7 7 0 0 1 14 0c0 5.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>`;
  const phoneSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2z"/></svg>`;

  const callBtn = lead.phone
    ? `<a class="btn btn-solid" href="tel:${esc(tel)}">${phoneSvg}Call ${esc(lead.phone)}</a>`
    : "";
  const dirBtn = `<a class="btn btn-line" href="${esc(dirHref)}" target="_blank" rel="noopener">${pinSvg}Get directions</a>`;

  // Ambient image layer: the sample image multiplied under the opaque theme
  // gradient. The result keeps the image's light and shadow but only the
  // theme's hue, and can never get brighter than the no-image background, so
  // it reads as atmosphere, never as a photo claim.
  const bgLayer = (src: string | undefined, a: string, b: string) =>
    src
      ? `<div class="bg" style="background-image: linear-gradient(168deg, ${a} 0%, ${b} 100%), url('${esc(src)}')" aria-hidden="true"></div>
    `
      : "";

  const services = copy.services
    .map(
      (s) => `
        <div class="service">
          <h3>${esc(s.title)}</h3>
          <p>${esc(s.blurb)}</p>
        </div>`,
    )
    .join("");

  const quoteCards = gridQuotes
    .map(
      (q) => `
        <figure class="q-card">
          <blockquote class="${qSize(q.body.length)}">${esc(q.body)}</blockquote>
          ${q.author ? `<figcaption>${esc(q.author)}</figcaption>` : ""}
        </figure>`,
    )
    .join("");

  const chips = mentions.map((m) => `<span class="chip">${esc(m)}</span>`).join("");

  const contactBits = [
    lead.phone ? `<a href="tel:${esc(tel)}">${esc(lead.phone)}</a>` : "",
    lead.address ? `<span>${esc(lead.address)}</span>` : "",
    place ? `<span>${esc(place)}</span>` : "",
    `<a href="${esc(mapsHref(lead))}" target="_blank" rel="noopener">View on Google</a>`,
  ]
    .filter(Boolean)
    .join('<span class="dot" aria-hidden="true">·</span>');

  const initial = (lead.name.match(/[A-Za-z0-9]/) || ["H"])[0].toUpperCase();
  const favicon = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='${encodeURIComponent(v.accent)}'/%3E%3Ctext x='32' y='44' font-family='Arial,sans-serif' font-size='34' font-weight='700' text-anchor='middle' fill='${encodeURIComponent(v.accentInk)}'%3E${encodeURIComponent(initial)}%3C/text%3E%3C/svg%3E`;

  const description = copy.subhead || copy.headline || `${lead.name}${place ? `, ${place}` : ""}`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(lead.name)}${lead.city ? ` · ${esc(lead.city)}` : ""}</title>
<meta name="description" content="${esc(description)}" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${esc(lead.name)}" />
<meta property="og:description" content="${esc(description)}" />
<link rel="icon" href="${favicon}" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="${t.fontsHref}" rel="stylesheet" />
<style>
  :root {
    --bg: ${v.bg}; --ink: ${v.ink}; --dim: ${v.dim}; --line: ${v.line}; --card: ${v.card};
    --accent: ${v.accent}; --accent-ink: ${v.accentInk}; --gold: ${v.gold};
    --tint: ${v.tint}; --band: ${v.band}; --band-ink: ${v.bandInk};
    --deep-ink: ${v.deepInk};
    --chip-bg: ${v.accent}14;
    --t-hero: ${t.heroSize};
    --maxw: 1060px;
    --shadow: 0 16px 38px -20px rgba(0,0,0,0.45);
    --ease: cubic-bezier(0.16, 1, 0.3, 1);
  }
  * { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; }
  body {
    margin: 0; background: var(--bg); color: var(--ink);
    font-family: ${t.body};
    font-size: clamp(1rem, 0.97rem + 0.2vw, 1.12rem); line-height: 1.65;
    -webkit-font-smoothing: antialiased;
  }
  a { color: var(--accent); }
  h1, h2, h3, .display {
    font-family: ${t.display};
    font-weight: ${t.key === "mexican" || t.key === "bbq" || t.key === "asian" ? "400" : "700"};
    line-height: 1.04; margin: 0;
    ${t.upper ? "text-transform: uppercase; letter-spacing: 0.015em;" : "letter-spacing: -0.01em;"}
  }
  .wrap { width: 100%; max-width: var(--maxw); margin-inline: auto; padding-inline: clamp(20px, 5vw, 48px); }
  .eyebrow {
    text-transform: uppercase; letter-spacing: 0.22em; font-size: 0.74rem;
    font-weight: 700; color: var(--accent); margin: 0 0 14px;
  }

  /* ── Buttons ─────────────────────────────────────────────────────────── */
  .btn {
    display: inline-flex; align-items: center; gap: 0.55em;
    min-height: 52px; padding: 0.75em 1.45em;
    border-radius: 999px; border: 2px solid transparent;
    font-weight: 700; font-size: 1.02rem; text-decoration: none;
    transition: transform 0.2s var(--ease), box-shadow 0.2s var(--ease);
  }
  .btn svg { width: 1.1em; height: 1.1em; flex: none; }
  .btn-solid { background: var(--accent); color: var(--accent-ink); box-shadow: var(--shadow); }
  .btn-solid:hover { transform: translateY(-2px); }
  .btn-line { border-color: currentColor; color: inherit; }
  .btn-line:hover { transform: translateY(-2px); }
  :where(a, button):focus-visible { outline: 3px solid var(--gold); outline-offset: 3px; border-radius: 8px; }

  /* ── Hero ─────────────────────────────────────────────────────────────── */
  header.hero {
    position: relative; overflow: hidden;
    background: linear-gradient(168deg, ${v.heroA} 0%, ${v.heroB} 100%);
    color: ${v.deepInk};
  }
  header.hero::before {
    content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 8px;
    background: repeating-linear-gradient(90deg, var(--gold) 0 34px, var(--accent) 34px 68px);
    z-index: 2;
  }
  header.hero::after, .visit::after {
    content: ""; position: absolute; inset: 0; pointer-events: none;
    background-image: url("${GRAIN}"); opacity: 0.07; z-index: 1;
  }
  .bg {
    position: absolute; inset: 0; z-index: 0;
    background-size: cover; background-position: center;
    background-blend-mode: multiply;
    filter: saturate(0.7) brightness(0.96);
  }
  .bg::after {
    content: ""; position: absolute; inset: 0;
    background: linear-gradient(100deg, rgba(8,4,2,0.6) 0%, rgba(8,4,2,0.22) 55%, rgba(8,4,2,0.38) 100%);
  }
  .hero-inner { position: relative; z-index: 1; padding: clamp(4.2rem, 10vw, 7.5rem) 0 clamp(3.6rem, 9vw, 6.5rem); }
  .kicker {
    display: inline-flex; align-items: center; gap: 0.7em; margin: 0 0 1.1rem;
    text-transform: uppercase; letter-spacing: 0.24em; font-size: 0.74rem;
    font-weight: 700; color: var(--gold);
  }
  .kicker::before { content: ""; width: 2.4em; height: 2px; background: var(--gold); }
  h1.biz-name { font-size: var(--t-hero); max-width: 16ch; color: #FFFDF8; text-wrap: balance; }
  .lede {
    font-size: clamp(1.12rem, 1rem + 0.9vw, 1.45rem); font-weight: 500;
    max-width: 40ch; margin: 1.1rem 0 0; color: ${v.deepInk}; opacity: 0.94;
  }
  .rating { display: inline-flex; align-items: center; gap: 0.65rem; flex-wrap: wrap; margin-top: 1.5rem; }
  .stars { color: var(--gold); font-size: 1.2rem; letter-spacing: 0.12em; line-height: 1; }
  .score { font-weight: 700; font-size: 0.98rem; letter-spacing: 0.02em; }
  .cta-row { display: flex; flex-wrap: wrap; gap: 0.85rem; margin-top: 2rem; }

  /* ── Pull-quote band ──────────────────────────────────────────────────── */
  .pull { background: var(--band); color: var(--band-ink); padding: clamp(3.2rem, 7vw, 5.5rem) 0; }
  .pull .mark { display: block; font-family: ${t.display}; font-size: 4.6rem; line-height: 0.45; color: var(--gold); height: 0.55em; }
  .pull blockquote { margin: 0.9rem 0 0; font-family: ${t.display}; line-height: 1.18; text-wrap: balance; }
  .pull blockquote.q-xl { font-size: clamp(1.7rem, 1.2rem + 2.6vw, 3rem); }
  .pull blockquote.q-lg { font-size: clamp(1.35rem, 1.05rem + 1.6vw, 2.1rem); }
  .pull blockquote.q-md { font-size: clamp(1.12rem, 1rem + 0.8vw, 1.5rem); line-height: 1.4; }
  .pull cite {
    display: block; font-style: normal; margin-top: 1.3rem;
    font-family: ${t.body}; font-weight: 700; font-size: 0.78rem;
    letter-spacing: 0.16em; text-transform: uppercase; opacity: 0.75;
  }
  .pull .proof { margin-top: 1.6rem; font-family: ${t.body}; font-weight: 600; font-size: 0.92rem; opacity: 0.85; }

  /* ── Sections ─────────────────────────────────────────────────────────── */
  section { padding: clamp(3rem, 7vw, 5.5rem) 0; }
  section h2 { font-size: clamp(1.7rem, 1.3rem + 1.8vw, 2.6rem); margin: 0 0 10px; }
  .lead-in { color: var(--dim); margin: 0 0 2.2rem; max-width: 56ch; }

  .q-grid { display: grid; gap: 18px; grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr)); }
  .q-card {
    position: relative; margin: 0; background: var(--card); border: 1px solid var(--line);
    border-radius: 16px; padding: 28px 26px 24px; box-shadow: 0 10px 28px -22px rgba(0,0,0,0.3);
  }
  .q-card::before {
    content: "\\201C"; position: absolute; top: 10px; left: 22px;
    font-family: ${t.display}; font-size: 2.6rem; color: var(--accent); opacity: 0.5; line-height: 1;
  }
  .q-card blockquote {
    margin: 14px 0 0; font-size: 1.03rem;
    display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 12; overflow: hidden;
  }
  .q-card blockquote.q-md { font-size: 0.96rem; }
  .q-card figcaption { margin-top: 14px; color: var(--dim); font-size: 0.82rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }

  .mentions { border-top: 1px solid var(--line); }
  .chips { display: flex; flex-wrap: wrap; gap: 10px; }
  .chip {
    padding: 0.5em 1.1em; border-radius: 999px; border: 1.5px solid var(--accent);
    background: var(--chip-bg); color: var(--ink); font-weight: 600; font-size: 0.97rem;
  }
  .mentions .note { margin-top: 1.2rem; color: var(--dim); font-size: 0.88rem; }

  .services-grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr)); }
  .service { background: var(--card); border: 1px solid var(--line); border-left: 4px solid var(--accent); border-radius: 12px; padding: 20px 22px; }
  .service h3 { font-size: 1.12rem; margin: 0 0 6px; }
  .service p { margin: 0; color: var(--dim); font-size: 0.97rem; }

  .about { background: var(--tint); border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
  .about p { max-width: 62ch; margin: 0; font-size: clamp(1.1rem, 1rem + 0.6vw, 1.32rem); line-height: 1.7; }

  /* ── Visit band + footer ─────────────────────────────────────────────── */
  .visit {
    position: relative; overflow: hidden;
    background: linear-gradient(168deg, ${v.deepA} 0%, ${v.deepB} 100%);
    color: var(--deep-ink); padding: clamp(3.6rem, 8vw, 6rem) 0 2rem;
  }
  .visit > .wrap { position: relative; z-index: 1; }
  .visit h2 { color: #FFFDF8; font-size: clamp(2rem, 1.5rem + 2.4vw, 3.2rem); }
  .visit address { font-style: normal; margin: 1rem 0 0; font-size: 1.1rem; opacity: 0.92; max-width: 44ch; }
  .visit .cta-row { margin-top: 1.8rem; }
  .visit .bits {
    display: flex; flex-wrap: wrap; gap: 10px 14px; align-items: center;
    margin-top: 2.6rem; padding-top: 1.6rem; border-top: 1px solid rgba(255,255,255,0.14);
    font-size: 0.92rem; opacity: 0.85;
  }
  .visit .bits a { color: var(--gold); }
  .visit .dot { opacity: 0.5; }
  .credit { margin: 2.2rem 0 0; font-size: 0.78rem; opacity: 0.55; }
  .credit a { color: inherit; }
</style>
</head>
<body>
  <header class="hero">
    ${bgLayer(samples.hero, v.heroA, v.heroB)}<div class="wrap hero-inner">
      ${kicker ? `<p class="kicker">${esc(kicker)}</p>` : ""}
      <h1 class="biz-name">${esc(lead.name)}</h1>
      ${copy.headline ? `<p class="lede">${esc(copy.headline)}</p>` : ""}
      ${ratingLine}
      <div class="cta-row">
        ${callBtn}
        ${dirBtn}
      </div>
    </div>
  </header>

  ${
    heroQuote
      ? `<section class="pull" aria-label="Customer review">
    <div class="wrap">
      <span class="mark" aria-hidden="true">“</span>
      <blockquote class="${qSize(heroQuote.body.length)}">${esc(heroQuote.body)}</blockquote>
      ${heroQuote.author ? `<cite>${esc(heroQuote.author)}, on Google</cite>` : `<cite>From our Google reviews</cite>`}
      ${
        lead.google_rating != null
          ? `<p class="proof"><span class="stars" aria-hidden="true">${stars(lead.google_rating)}</span> ${esc(String(lead.google_rating))} stars on Google${lead.reviews_count ? `, across ${esc(String(lead.reviews_count))} reviews` : ""}.</p>`
          : ""
      }
    </div>
  </section>`
      : ""
  }

  ${
    quoteCards
      ? `<section class="quotes">
    <div class="wrap">
      <p class="eyebrow">Straight from Google</p>
      <h2>What customers say</h2>
      <p class="lead-in">Real reviews, word for word.</p>
      <div class="q-grid">${quoteCards}
      </div>
    </div>
  </section>`
      : ""
  }

  ${
    chips && mentions.length >= 2
      ? `<section class="mentions">
    <div class="wrap">
      <p class="eyebrow">In their own words</p>
      <h2>What people come back for</h2>
      <p class="lead-in">Every one of these shows up in real customer reviews.</p>
      <div class="chips">${chips}</div>
    </div>
  </section>`
      : ""
  }

  ${
    services
      ? `<section class="services-section">
    <div class="wrap">
      <p class="eyebrow">What we do</p>
      <h2>Come hungry</h2>
      <div class="services-grid" style="margin-top:1.6rem">${services}
      </div>
    </div>
  </section>`
      : ""
  }

  ${
    copy.about
      ? `<section class="about">
    <div class="wrap"><p>${esc(copy.about)}</p></div>
  </section>`
      : ""
  }

  <footer class="visit">
    ${bgLayer(samples.accent, v.deepA, v.deepB)}<div class="wrap">
      <p class="kicker">${esc(place || "Find us")}</p>
      <h2>Come find us</h2>
      ${
        lead.address
          ? `<address>${esc(lead.address)}${place ? `<br />${esc(place)}` : ""}</address>`
          : place
            ? `<address>${esc(place)}</address>`
            : ""
      }
      <div class="cta-row">
        ${callBtn}
        ${dirBtn}
      </div>
      <div class="bits">${contactBits}</div>
      <p class="credit">A free preview site built by <a href="https://handprotocol.org" target="_blank" rel="noopener">HAND</a>.${usesSamples ? " Preview imagery is licensed sample art. Your real photos replace it when you claim the site." : ""}</p>
    </div>
  </footer>
  <script defer src="/assets/demo-visit.js"></script>
</body>
</html>
`;
}
