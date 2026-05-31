/*
  HAND Command Center, demo-site renderer.
  Turns a business lead plus the assistant's (or the fallback's) structured copy
  into a single self-contained HTML page. No build step, no external assets, one
  inline stylesheet. Warm, clean, mobile-first, the kind of one-pager a local
  business would be proud to point a customer at. The testimonials are the
  business's real Google reviews, verbatim.
*/
import type { BizLead, SiteCopy } from "./types";

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

function stars(rating: number | null): string {
  if (!rating) return "";
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(Math.max(0, 5 - full));
}

export function renderDemoSite(lead: BizLead, copy: SiteCopy): string {
  const tel = telHref(lead.phone);
  const callBlock = lead.phone
    ? `<a class="cta" href="tel:${esc(tel)}">${esc(copy.cta || "Call us")} · ${esc(lead.phone)}</a>`
    : `<a class="cta" href="${esc(mapsHref(lead))}">${esc(copy.cta || "Find us on Google")}</a>`;

  const ratingLine =
    lead.google_rating != null
      ? `<p class="rating"><span class="stars" aria-hidden="true">${stars(lead.google_rating)}</span> ${esc(String(lead.google_rating))} on Google${lead.reviews_count ? ` · ${esc(String(lead.reviews_count))} reviews` : ""}</p>`
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

  const testimonials = copy.testimonials
    .map(
      (t) => `
        <figure class="quote">
          <blockquote>${esc(t.body)}</blockquote>
          ${t.author ? `<figcaption>${esc(t.author)}</figcaption>` : ""}
        </figure>`,
    )
    .join("");

  const contactBits = [
    lead.phone
      ? `<a href="tel:${esc(tel)}">${esc(lead.phone)}</a>`
      : "",
    lead.address ? `<span>${esc(lead.address)}</span>` : "",
    [lead.city, lead.state].filter(Boolean).length
      ? `<span>${esc([lead.city, lead.state].filter(Boolean).join(", "))}</span>`
      : "",
    `<a href="${esc(mapsHref(lead))}">View on Google</a>`,
  ]
    .filter(Boolean)
    .join('<span class="dot">·</span>');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(lead.name)}${lead.city ? ` · ${esc(lead.city)}` : ""}</title>
<meta name="description" content="${esc(copy.subhead)}" />
<style>
  :root {
    --ink: #211d18; --dim: #5c544a; --line: #e7e0d4;
    --bg: #faf7f1; --card: #ffffff; --accent: #b4541e; --accent-soft: #d97742;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; color: var(--ink); background: var(--bg);
    font: 17px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  h1, h2, h3 { font-family: Georgia, "Times New Roman", serif; font-weight: 600; line-height: 1.15; }
  a { color: var(--accent); }
  .wrap { max-width: 920px; margin: 0 auto; padding: 0 24px; }
  header.hero {
    padding: 88px 0 64px; text-align: center;
    background: linear-gradient(180deg, #fff8ef 0%, var(--bg) 100%);
    border-bottom: 1px solid var(--line);
  }
  header.hero h1 { font-size: clamp(2.2rem, 6vw, 3.6rem); margin: 0 0 8px; }
  header.hero .kicker {
    text-transform: uppercase; letter-spacing: 0.22em; font-size: 0.72rem;
    color: var(--accent); font-weight: 700; margin: 0 0 18px;
  }
  header.hero .subhead { font-size: 1.25rem; color: var(--dim); max-width: 36ch; margin: 0 auto 12px; }
  .rating { color: var(--dim); font-size: 0.95rem; margin: 6px 0 26px; }
  .stars { color: var(--accent-soft); letter-spacing: 2px; }
  .cta {
    display: inline-block; background: var(--accent); color: #fff; text-decoration: none;
    padding: 14px 26px; border-radius: 999px; font-weight: 600; font-size: 1.05rem;
    box-shadow: 0 6px 20px rgba(180,84,30,0.25); transition: transform .12s ease;
  }
  .cta:hover { transform: translateY(-1px); }
  section { padding: 56px 0; }
  section h2 { font-size: 1.8rem; text-align: center; margin: 0 0 8px; }
  .lead-in { text-align: center; color: var(--dim); max-width: 52ch; margin: 0 auto 36px; }
  .services { display: grid; gap: 20px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
  .service { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 22px; }
  .service h3 { margin: 0 0 8px; font-size: 1.15rem; }
  .service p { margin: 0; color: var(--dim); font-size: 0.98rem; }
  .quotes { display: grid; gap: 20px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
  .quote { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 24px; margin: 0; }
  .quote blockquote { margin: 0 0 12px; font-size: 1.05rem; }
  .quote blockquote::before { content: "\\201C"; color: var(--accent-soft); font-size: 1.6rem; margin-right: 2px; }
  .quote figcaption { color: var(--dim); font-size: 0.9rem; font-weight: 600; }
  .about { background: #fff8ef; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
  .about p { max-width: 60ch; margin: 0 auto; text-align: center; font-size: 1.1rem; color: var(--ink); }
  footer.contact { padding: 56px 0 28px; text-align: center; }
  footer.contact .bits { color: var(--dim); display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; align-items: center; }
  footer.contact .dot { color: var(--line); }
  .credit { margin-top: 40px; font-size: 0.78rem; color: #9b9285; }
  .credit a { color: #9b9285; }
</style>
</head>
<body>
  <header class="hero">
    <div class="wrap">
      ${lead.category ? `<p class="kicker">${esc(lead.category)}${lead.city ? ` · ${esc(lead.city)}, ${esc(lead.state || "")}` : ""}</p>` : ""}
      <h1>${esc(lead.name)}</h1>
      <p class="subhead">${esc(copy.headline)}</p>
      <p class="rating">${esc(copy.subhead)}</p>
      ${ratingLine}
      ${callBlock}
    </div>
  </header>

  ${
    copy.services.length
      ? `<section class="services-section">
    <div class="wrap">
      <h2>What we do</h2>
      <div class="services">${services}</div>
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

  ${
    copy.testimonials.length
      ? `<section class="testimonials">
    <div class="wrap">
      <h2>What our customers say</h2>
      <p class="lead-in">Straight from our Google reviews.</p>
      <div class="quotes">${testimonials}</div>
    </div>
  </section>`
      : ""
  }

  <footer class="contact">
    <div class="wrap">
      <h2>Come see us</h2>
      <div class="bits">${contactBits}</div>
      ${lead.phone ? `<p style="margin-top:26px">${callBlock}</p>` : ""}
      <p class="credit">A free preview site built by <a href="https://handprotocol.org">HAND</a>.</p>
    </div>
  </footer>
</body>
</html>
`;
}
