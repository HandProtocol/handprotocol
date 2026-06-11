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
import type { BizLead, BizReview, SiteCopy, PitchScript } from "./types";

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

// ─── Pitch / call script ────────────────────────────────────────────────────
/*
  The script a volunteer reads on the call. It is internal, so it can name HAND
  and the offer plainly. It is grounded in the business's own reviews and the
  free demo we already built. Warm and direct, not a hard-sell telemarketer.

  Language: a large share of the food-truck leads are Spanish-speaking
  owner-operators, so the script (NOT the page chrome, which stays English
  and operator-facing) can be generated in Spanish. "es" means warm, natural
  Mexican business Spanish in the usted form, written the way a bilingual
  local rep would actually talk, never a word-for-word translation.
*/
export type PitchLang = "en" | "es";

export function buildScriptSystemPrompt(lang: PitchLang = "en"): string {
  const base = `You write a short, natural phone-call script for a friendly outreach call to a local small business owner. The caller is from HAND, a nonprofit in formation. HAND has already built the owner a free one-page website using their real Google reviews, and is calling to show it to them.

The angle: this business has great reviews but no website. We built one for free as a gift and a sample of what we do. A third of anything they pay (if they want to keep and grow it) funds HAND's community work. Lead with the gift, not the pitch.

Tone: warm, human, respectful of their time, not a hard-sell telemarketer. Short sentences a person can actually say out loud. No jargon, no em dashes, no AI tells.

Output ONLY valid minified JSON, no prose, no code fences:
{
  "opener": "1 to 2 sentences to open the call and confirm you have the owner",
  "hook": "1 to 2 sentences naming what is good about them (reviews) and the gap (no site)",
  "walkthrough": ["2 to 4 short points to say while they look at the demo"],
  "offer": "2 to 3 sentences on the offer: keep it free to look at, low cost to keep and maintain, a third funds HAND",
  "objections": [{"q":"a likely objection","a":"a short, honest response"}],
  "close": "1 to 2 sentences asking for the next step (text them the link, schedule a follow up)"
}

Give 3 to 4 objections. Keep every field short enough to say naturally.`;

  if (lang !== "es") return base;

  return `${base}

Language: write every JSON value in Spanish. Not a translation. Write it the way a warm, bilingual local rep would actually talk to the owner of a taqueria: natural Mexican business Spanish, usted form throughout, plain and respectful. Keep the JSON keys in English exactly as shown. Keep the business name, the numbers, the price, and the demo link exactly as given. Keep the same structure (opener, hook, walkthrough, offer, objections, close). No em dashes in Spanish either, use commas or periods.`;
}

export function buildScriptUserMessage(
  lead: BizLead,
  reviews: BizReview[],
  demoUrl: string,
): string {
  const top = reviews
    .slice(0, 5)
    .map((r) => `- ${r.body}`)
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
    `Demo we built for them: ${demoUrl}`,
    "",
    "A few of their reviews:",
    top || "(none)",
    "",
    "Write the JSON script now.",
  ]
    .filter((l) => l !== "")
    .join("\n");
}

export function parsePitchScript(text: string): PitchScript | null {
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

  const walkthrough = Array.isArray(o.walkthrough)
    ? o.walkthrough.map((s) => String(s).trim()).filter(Boolean)
    : [];
  const objections = Array.isArray(o.objections)
    ? o.objections
        .map((x) => {
          const xv = x as Record<string, unknown>;
          return {
            q: String(xv.q ?? "").trim(),
            a: String(xv.a ?? "").trim(),
          };
        })
        .filter((x) => x.q && x.a)
    : [];

  const opener = String(o.opener ?? "").trim();
  if (!opener && walkthrough.length === 0) return null;

  return {
    opener,
    hook: String(o.hook ?? "").trim(),
    walkthrough,
    offer: String(o.offer ?? "").trim(),
    objections,
    close: String(o.close ?? "").trim(),
  };
}

export function buildFallbackScript(
  lead: BizLead,
  demoUrl: string,
  lang: PitchLang = "en",
): PitchScript {
  if (lang === "es") return buildFallbackScriptEs(lead, demoUrl);
  const ratingBit =
    lead.google_rating != null
      ? `${lead.google_rating} stars${lead.reviews_count ? ` from ${lead.reviews_count} reviews` : ""}`
      : "great reviews";
  return {
    opener: `Hi, is this the owner of ${lead.name}? My name is ____, I am calling from HAND, a local nonprofit. Do you have a quick minute?`,
    hook: `I was looking at ${lead.name} on Google. You have ${ratingBit}, but I noticed you do not have a website yet. So we built you one, for free.`,
    walkthrough: [
      `I can text you the link right now, it is at ${demoUrl}.`,
      "It uses your real Google reviews as the content, so it sounds like your customers.",
      "It works on a phone, and it has your hours, your number, and a map to find you.",
    ],
    offer:
      "It is yours to look at, no cost. If you want to keep it live and have us maintain it, it is a small monthly fee, and a third of that funds our community work here in town.",
    objections: [
      {
        q: "I already get enough business from Google.",
        a: "That is great. A website just gives people one more way to find and trust you, and you own it, not Google.",
      },
      {
        q: "How much does it cost?",
        a: "Looking is free. Keeping it live and maintained is a small monthly fee, we can talk about what fits.",
      },
      {
        q: "I do not have time for this.",
        a: "Totally understand. I will text you the link, take a look when you have a minute and I will follow up.",
      },
    ],
    close: `Can I text you the link to take a look? What is the best number?`,
  };
}

/*
  Spanish parallel of buildFallbackScript. Same structure, same factual slots
  (name, rating, reviews count, demo URL), written as a bilingual rep would
  actually say it: Mexican business Spanish, usted form, no em dashes.
*/
export function buildFallbackScriptEs(
  lead: BizLead,
  demoUrl: string,
): PitchScript {
  const ratingBit =
    lead.google_rating != null
      ? `${lead.google_rating} estrellas${lead.reviews_count ? ` con ${lead.reviews_count} reseñas` : ""}`
      : "muy buenas reseñas";
  return {
    opener: `Buenas, ¿hablo con el dueño o la dueña de ${lead.name}? Le habla ____, de HAND, una organización sin fines de lucro aquí de la zona. ¿Tiene un minutito?`,
    hook: `Estuve viendo ${lead.name} en Google. Tienen ${ratingBit}, pero vi que todavía no tienen página web. Así que les hicimos una, gratis.`,
    walkthrough: [
      `Le puedo mandar el enlace ahorita mismo por mensaje, está en ${demoUrl}.`,
      "Está hecha con sus reseñas reales de Google, así que habla como hablan sus propios clientes.",
      "Se ve bien en el celular, y trae su horario, su teléfono y un mapa para llegar con ustedes.",
    ],
    offer:
      "La página es suya para verla, sin ningún costo. Si quiere dejarla en línea y que nosotros se la mantengamos, es una cuota mensual pequeña, y una tercera parte de eso apoya nuestro trabajo comunitario aquí mismo.",
    objections: [
      {
        q: "Ya me llega suficiente clientela por Google.",
        a: "Qué bueno, eso habla muy bien de ustedes. La página nomás le da a la gente una manera más de encontrarlo y tenerle confianza, y es suya, no de Google.",
      },
      {
        q: "¿Cuánto cuesta?",
        a: "Verla no cuesta nada. Dejarla en línea y mantenida es una cuota mensual pequeña, podemos platicar qué le acomoda.",
      },
      {
        q: "No tengo tiempo para esto.",
        a: "Lo entiendo perfectamente. Le mando el enlace por mensaje, lo ve cuando tenga un momento y yo le marco después.",
      },
    ],
    close: `¿Le puedo mandar el enlace por mensaje para que le eche un ojo? ¿Cuál es el mejor número?`,
  };
}

/*
  The fallback the headless generate-pitch script uses: same bones as
  buildFallbackScript but priced, a flat one-time $price with optional
  add-ons, a third to the HAND pool. Factored out of scripts/generate-pitch.mts
  so both languages live next to each other and can be smoke-tested directly.
  The "en" output is byte-identical to the inline version it replaced.
*/
export function buildPriceFallbackScript(
  lead: BizLead,
  fullUrl: string,
  price: string,
  lang: PitchLang = "en",
): PitchScript {
  if (lang === "es") {
    const ratingBit =
      lead.google_rating != null
        ? `${lead.google_rating} estrellas${lead.reviews_count ? ` con ${lead.reviews_count} reseñas` : ""}`
        : "muy buenas reseñas";
    return {
      opener: `Buenas, ¿hablo con el dueño o la dueña de ${lead.name}? Le habla ____, de HAND, una organización sin fines de lucro aquí de la zona. ¿Tiene un minutito?`,
      hook: `Los encontré en Google. Tienen ${ratingBit}, pero vi que todavía no tienen página web. Así que les hicimos una, gratis.`,
      walkthrough: [
        `Le puedo mandar el enlace ahorita mismo por mensaje, está en ${fullUrl}.`,
        "Está hecha con sus propias fotos y sus reseñas reales de Google, así que habla como hablan sus propios clientes.",
        "Se ve bien en el celular, y el botón principal le da a la gente las direcciones para llegar directo con ustedes.",
      ],
      offer: `La página es suya para verla, sin ningún costo. Para quedársela y ponerla en línea son $${price}, un solo pago, nada mensual. Una tercera parte de eso apoya nuestro trabajo comunitario aquí mismo. Y si algún día quiere más, más páginas, su menú completo, su propio dominio, publicaciones automáticas en redes, o ayuda para salir mejor en Google, eso también se lo podemos agregar.`,
      objections: [
        {
          q: "Ya tengo suficiente clientela.",
          a: "Qué bueno, eso habla muy bien de ustedes. La página nomás le da a la gente una manera más de encontrarlo y tenerle confianza, y es suya, no de Google.",
        },
        {
          q: "¿Cuánto cuesta?",
          a: `Son $${price}, un solo pago, para quedársela y ponerla en línea. Nada mensual. Si después quiere algo más, lo cotizamos cuando usted diga.`,
        },
        {
          q: "No tengo tiempo para esto.",
          a: "Lo entiendo perfectamente. Déjeme mandarle el enlace por mensaje, lo ve cuando tenga un momento y yo le marco después.",
        },
        {
          q: "Yo no sé nada de páginas web.",
          a: "No necesita saber. Nosotros nos encargamos de todo. Usted nos dice qué cambiar y nosotros lo cambiamos.",
        },
      ],
      close: "¿Le puedo mandar el enlace por mensaje para que la vea usted mismo? ¿A qué número le marco?",
    };
  }

  const ratingBit =
    lead.google_rating != null
      ? `${lead.google_rating} stars${lead.reviews_count ? ` from ${lead.reviews_count} reviews` : ""}`
      : "great reviews";
  return {
    opener: `Hi, is this the owner of ${lead.name}? My name is ____, I am calling from HAND, a local nonprofit. Do you have a quick minute?`,
    hook: `I found you on Google. You have ${ratingBit}, but you do not have a website yet. So we built you one, for free.`,
    walkthrough: [
      `I can text you the link right now, it is at ${fullUrl}.`,
      "It is built around your own photos and your real Google reviews, so it sounds like your customers.",
      "It works on a phone, and the main button gives people directions straight to you.",
    ],
    offer: `It is yours to look at, no cost. To make it yours and put it online is a flat $${price}, one time, no monthly anything. A third of that funds our community work here in town. If you ever want more, more pages, your menu, your own web address, automatic social posting, or help getting found on Google, we can add that too.`,
    objections: [
      {
        q: "I already get plenty of business.",
        a: "That is great to hear. A website just gives people one more way to find and trust you, and you own it, not Google.",
      },
      {
        q: "How much does it cost?",
        a: `$${price}, one time, to make it yours and put it live. No monthly anything. Anything more later we price when you want it.`,
      },
      {
        q: "I do not have time for this.",
        a: "I hear you. Let me just text you the link, take a look when you have a minute and I will follow up.",
      },
      {
        q: "I do not know anything about websites.",
        a: "You do not need to. We handle all of it. You tell us what to change and we change it.",
      },
    ],
    close: "Can I text you the link so you can see it for yourself? What is the best number to reach you?",
  };
}
