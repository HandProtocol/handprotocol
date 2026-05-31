/*
  HAND Command Center, demo-site copy generation.
  The assistant turns a business's real Google reviews into structured site
  copy. The reviews are the ground truth: services and tone are drawn from what
  customers actually said, not invented. This is the cost lever, real reviews in
  means the assistant arranges rather than fabricates.

  Note: HAND's grant voice rules (Reciprocates, tier numbers, mission terms) do
  NOT apply here. This is a local business's own marketing site. We keep only
  the generic hygiene: no em dashes, no AI tells, concrete over puffy.
*/
import type { BizLead, BizReview, SiteCopy } from "./types";

export function buildSiteSystemPrompt(): string {
  return `You write short, warm, concrete copy for a local small-business website. You are given the business name, category, location, and a set of real Google reviews from its customers.

Rules:
- Ground everything in the reviews. Infer the services and the tone from what customers actually praised. Do not invent facts: no made-up years in business, no awards, no certifications, no staff names unless a review names them.
- No em dashes. Use commas, periods, or parentheses.
- No AI tells or marketing puffery. Banned: leverage, robust, ecosystem, game-changing, best-in-class, unleash, elevate, nestled, passionate, dedicated to excellence, one-stop, top-notch, state-of-the-art.
- Plain, human, specific. Short sentences. Sound like the owner talking, not an agency.
- Output ONLY valid minified JSON, no prose, no code fences.

JSON shape:
{
  "headline": "one short line, the promise (max 70 chars)",
  "subhead": "one supporting sentence (max 120 chars)",
  "about": "2 to 3 sentences about the business, grounded in the reviews",
  "services": [{"title":"short","blurb":"one sentence"}],
  "testimonials": [{"body":"verbatim or lightly trimmed review text","author":"name or null"}],
  "cta": "short call-to-action verb phrase, e.g. Call for a quote"
}

Pick 3 to 5 services and 3 to 4 of the strongest testimonials. Keep testimonial text close to the original review wording.`;
}

export function buildSiteUserMessage(
  lead: BizLead,
  reviews: BizReview[],
): string {
  const reviewLines = reviews
    .map((r) => {
      const tag = [r.author, r.rating ? `${r.rating}/5` : null]
        .filter(Boolean)
        .join(", ");
      return tag ? `- (${tag}) ${r.body}` : `- ${r.body}`;
    })
    .join("\n");

  return [
    `Business: ${lead.name}`,
    lead.category ? `Category: ${lead.category}` : "",
    [lead.city, lead.state].filter(Boolean).length
      ? `Location: ${[lead.city, lead.state].filter(Boolean).join(", ")}`
      : "",
    lead.google_rating != null
      ? `Google rating: ${lead.google_rating}${lead.reviews_count ? ` (${lead.reviews_count} reviews)` : ""}`
      : "",
    "",
    "Reviews:",
    reviewLines || "(none provided)",
    "",
    "Write the JSON now.",
  ]
    .filter((l) => l !== "")
    .join("\n");
}

// Pull the JSON object out of a model response that may be wrapped in fences
// or have stray prose, then validate and coerce into SiteCopy. Returns null
// if nothing usable is found.
export function parseSiteCopy(text: string): SiteCopy | null {
  let candidate = text.trim();
  const fence = candidate.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) candidate = fence[1].trim();
  const first = candidate.indexOf("{");
  const last = candidate.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;

  let obj: unknown;
  try {
    obj = JSON.parse(candidate.slice(first, last + 1));
  } catch {
    return null;
  }
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;

  const services = Array.isArray(o.services)
    ? o.services
        .map((s) => {
          const sv = s as Record<string, unknown>;
          return {
            title: String(sv.title ?? "").trim(),
            blurb: String(sv.blurb ?? "").trim(),
          };
        })
        .filter((s) => s.title)
    : [];

  const testimonials = Array.isArray(o.testimonials)
    ? o.testimonials
        .map((t) => {
          const tv = t as Record<string, unknown>;
          const author = tv.author == null ? null : String(tv.author).trim();
          return {
            body: String(tv.body ?? "").trim(),
            author: author && author.toLowerCase() !== "null" ? author : null,
          };
        })
        .filter((t) => t.body)
    : [];

  const headline = String(o.headline ?? "").trim();
  if (!headline && services.length === 0 && testimonials.length === 0) {
    return null;
  }

  return {
    headline,
    subhead: String(o.subhead ?? "").trim(),
    about: String(o.about ?? "").trim(),
    services,
    testimonials,
    cta: String(o.cta ?? "").trim() || "Get in touch",
  };
}

/*
  Deterministic fallback. Runs when no AI provider is configured or the model
  output fails to parse. Builds honest copy straight from the lead and reviews,
  zero fabrication: the headline names the category, the testimonials are the
  reviews verbatim, services are a light category-keyword guess.
*/
export function buildFallbackCopy(
  lead: BizLead,
  reviews: BizReview[],
): SiteCopy {
  const cat = (lead.category || "local business").toLowerCase();
  const place = lead.city ? ` in ${lead.city}` : "";

  const ranked = [...reviews].sort(
    (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.body.length - a.body.length,
  );
  const testimonials = ranked.slice(0, 4).map((r) => ({
    body: r.body,
    author: r.author,
  }));

  return {
    headline: `${capitalize(cat)}${place} our customers trust`,
    subhead:
      lead.google_rating != null
        ? `Rated ${lead.google_rating} on Google by ${lead.reviews_count ?? "our"} customers.`
        : `Reliable ${cat}${place}.`,
    about: `${lead.name} is a ${cat}${place}. The reviews below come straight from our customers on Google.`,
    services: [],
    testimonials,
    cta: lead.phone ? "Call us" : "Find us on Google",
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
