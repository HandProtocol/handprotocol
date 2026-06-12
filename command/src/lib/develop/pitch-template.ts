/*
  HAND Command Center, pitch-page renderer.
  An internal, password-gated page (handed to a volunteer making calls) that
  lives on the public site at /demos/<slug>/pitch/. It carries the call script,
  the business facts, a live preview of the demo we built, and a follow-up form
  that POSTs to the biz-pitch-response Netlify function.

  Self-contained: inline CSS, a little inline JS for the form submit. No deps.
*/
import type { BizLead, PitchScript } from "./types";

// A photo pulled from the business's own Google Maps listing, written by
// scripts/scrape-photos.mts to web/demos/<slug>/pitch/img/ (the gated path;
// scraped photos NEVER render on the public demo). w/h are intrinsic pixels
// so the grid reserves space while images load.
export type PitchPhoto = { file: string; w: number; h: number };

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function tel(phone: string | null): string {
  return phone ? phone.replace(/[^\d+]/g, "") : "";
}

export function renderPitchPage(
  lead: BizLead,
  script: PitchScript,
  demoUrl: string,
  photos: PitchPhoto[] = [],
): string {
  const facts = [
    lead.google_rating != null
      ? `<strong>${esc(String(lead.google_rating))}</strong> on Google${lead.reviews_count ? ` (${esc(String(lead.reviews_count))} reviews)` : ""}`
      : "",
    lead.phone ? `<a href="tel:${esc(tel(lead.phone))}">${esc(lead.phone)}</a>` : "",
    lead.address ? esc(lead.address) : "",
    [lead.city, lead.state].filter(Boolean).length
      ? esc([lead.city, lead.state].filter(Boolean).join(", "))
      : "",
    lead.google_url
      ? `<a href="${esc(lead.google_url)}" target="_blank" rel="noreferrer">Google Maps</a>`
      : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const walkthrough = script.walkthrough
    .map((w) => `<li>${esc(w)}</li>`)
    .join("");

  const objections = script.objections
    .map(
      (o) => `
        <div class="obj">
          <p class="obj-q">“${esc(o.q)}”</p>
          <p class="obj-a">${esc(o.a)}</p>
        </div>`,
    )
    .join("");

  const photoSection = photos.length
    ? `<div class="card">
    <h2>With your photos</h2>
    <p class="rep-note">These are the photos from their Google listing. When they claim the site, these go on it with their permission.</p>
    <div class="shots">${photos
      .map(
        (p) => `
      <img src="img/${esc(p.file)}" alt="" width="${p.w}" height="${p.h}" loading="lazy" decoding="async" />`,
      )
      .join("")}
    </div>
  </div>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Pitch · ${esc(lead.name)}</title>
<style>
  :root { --ink:#1a1d23; --dim:#5b6472; --line:#e3e7ee; --bg:#f5f7fa; --card:#fff; --accent:#b4541e; --ok:#15803d; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink);
    font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
  .wrap { max-width:760px; margin:0 auto; padding:24px 18px 80px; }
  .eyebrow { text-transform:uppercase; letter-spacing:0.16em; font-size:0.7rem; color:var(--accent); font-weight:700; margin:0 0 4px; }
  h1 { font-size:1.7rem; margin:0 0 6px; }
  .facts { color:var(--dim); font-size:0.92rem; margin:0 0 18px; }
  .facts a { color:var(--accent); }
  .card { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:18px 20px; margin:0 0 16px; }
  .card h2 { font-size:0.78rem; text-transform:uppercase; letter-spacing:0.14em; color:var(--dim); margin:0 0 10px; }
  .say { font-size:1.08rem; }
  .demo-actions { display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
  .btn { display:inline-block; background:var(--accent); color:#fff; text-decoration:none; padding:11px 18px; border-radius:8px; font-weight:600; border:0; cursor:pointer; font-size:1rem; }
  .btn.secondary { background:#eef1f6; color:var(--ink); }
  iframe { width:100%; height:420px; border:1px solid var(--line); border-radius:10px; margin-top:12px; background:#fff; }
  .rep-note { color:var(--dim); font-size:0.92rem; margin:0 0 12px; }
  .shots { display:grid; gap:10px; grid-template-columns:repeat(auto-fill, minmax(160px, 1fr)); }
  .shots img { width:100%; height:auto; aspect-ratio:4/3; object-fit:cover; display:block; border-radius:8px; border:1px solid var(--line); background:#fff; }
  ul { margin:0; padding-left:20px; } li { margin:4px 0; }
  .obj { border-top:1px solid var(--line); padding:10px 0; }
  .obj:first-of-type { border-top:0; }
  .obj-q { font-weight:600; margin:0 0 2px; } .obj-a { color:var(--dim); margin:0; }
  form label { display:block; font-size:0.8rem; color:var(--dim); margin:12px 0 4px; font-weight:600; }
  input, select, textarea { width:100%; padding:9px 11px; border:1px solid var(--line); border-radius:8px; font:inherit; background:#fff; }
  .row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .hp { position:absolute; left:-9999px; }
  #msg { margin-top:12px; font-weight:600; }
  #msg.ok { color:var(--ok); } #msg.err { color:#b91c1c; }
  footer { color:#9aa3b2; font-size:0.78rem; text-align:center; margin-top:30px; }
</style>
</head>
<body>
<div class="wrap">
  <p class="eyebrow">HAND · Outreach pitch</p>
  <h1>${esc(lead.name)}</h1>
  <p class="facts">${facts}</p>

  <div class="card">
    <h2>The demo we built</h2>
    <div class="demo-actions">
      <a class="btn" href="${esc(demoUrl)}" target="_blank" rel="noreferrer">Open the site</a>
      ${lead.phone ? `<a class="btn secondary" href="tel:${esc(tel(lead.phone))}">Call ${esc(lead.phone)}</a>` : ""}
    </div>
    <iframe title="Demo preview" src="${esc(demoUrl)}" loading="lazy"></iframe>
  </div>

  ${photoSection}

  <div class="card">
    <h2>Opener</h2>
    <p class="say">${esc(script.opener)}</p>
  </div>

  <div class="card">
    <h2>The hook</h2>
    <p class="say">${esc(script.hook)}</p>
  </div>

  ${
    walkthrough
      ? `<div class="card"><h2>While they look at it</h2><ul>${walkthrough}</ul></div>`
      : ""
  }

  <div class="card">
    <h2>The offer</h2>
    <p class="say">${esc(script.offer)}</p>
  </div>

  ${objections ? `<div class="card"><h2>If they push back</h2>${objections}</div>` : ""}

  <div class="card">
    <h2>The close</h2>
    <p class="say">${esc(script.close)}</p>
  </div>

  <div class="card">
    <h2>Log the call</h2>
    <form id="followup" autocomplete="off">
      <input class="hp" type="text" name="website" tabindex="-1" aria-hidden="true" />
      <label for="caller">Your name</label>
      <input id="caller" name="caller" placeholder="Who made the call" />

      <div class="row">
        <div>
          <label for="outcome">Outcome</label>
          <select id="outcome" name="outcome">
            <option value="">Select</option>
            <option value="reached">Reached owner</option>
            <option value="no_answer">No answer</option>
            <option value="voicemail">Left voicemail</option>
            <option value="callback">Wants a callback</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label for="interest">Interest</label>
          <select id="interest" name="interest">
            <option value="">Select</option>
            <option value="interested">Interested</option>
            <option value="not_now">Not now</option>
            <option value="not_interested">Not interested</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>
      </div>

      <div class="row">
        <div>
          <label for="budget_band">Budget sense</label>
          <input id="budget_band" name="budget_band" placeholder="e.g. under $100/mo" />
        </div>
        <div>
          <label for="timeline">Timeline</label>
          <input id="timeline" name="timeline" placeholder="e.g. next month" />
        </div>
      </div>

      <div class="row">
        <div>
          <label for="best_contact">Best contact</label>
          <input id="best_contact" name="best_contact" placeholder="phone / text / email" />
        </div>
        <div>
          <label for="callback_at">Callback when</label>
          <input id="callback_at" name="callback_at" placeholder="e.g. Tue afternoon" />
        </div>
      </div>

      <label for="objections">Objections / pushback</label>
      <textarea id="objections" name="objections" rows="2"></textarea>

      <label for="other_info">Anything else worth noting</label>
      <textarea id="other_info" name="other_info" rows="3"></textarea>

      <div style="margin-top:16px"><button class="btn" type="submit">Save the call</button></div>
      <p id="msg"></p>
    </form>
  </div>

  <footer>HAND outreach. This page is internal.</footer>
</div>

<script>
  (function () {
    var form = document.getElementById('followup');
    var msg = document.getElementById('msg');
    var SLUG = ${JSON.stringify(lead.slug)};
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      msg.className = ''; msg.textContent = 'Saving...';
      var data = { slug: SLUG };
      ['website','caller','outcome','interest','budget_band','timeline','best_contact','callback_at','objections','other_info'].forEach(function (k) {
        var el = form.elements[k];
        if (el) data[k] = el.value;
      });
      fetch('/.netlify/functions/biz-pitch-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (r) {
        if (!r.ok) throw new Error('save failed');
        return r.json();
      }).then(function () {
        msg.className = 'ok'; msg.textContent = 'Saved. Thank you.';
        form.reset();
      }).catch(function () {
        msg.className = 'err'; msg.textContent = 'Could not save. Try again, or text the info to koH.';
      });
    });
  })();
</script>
</body>
</html>
`;
}
