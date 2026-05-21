// Password-only cookie gate for /mystichearts/brief/* paths.
//
// Set env var in Netlify dashboard:
//   MYSTICHEARTS_BRIEF_PASSWORD  — required. Can be the same value as
//   AIRSTREAMSTUDIO_PASSWORD if you want one shared password for both internal docs.
//
// Same pattern as airstreamstudio-auth.js: SHA-256 cookie, HttpOnly + Secure +
// SameSite=Lax, 7-day expiry, fail-closed if env var is missing.

const COOKIE_NAME = "mystichearts_brief_auth";
const COOKIE_PATH = "/mystichearts/brief";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const TOKEN_NAMESPACE = "mhb-v1";

export default async (request, context) => {
  const expected = Netlify.env.get("MYSTICHEARTS_BRIEF_PASSWORD");

  if (!expected) {
    return new Response(
      "Mystic Hearts brief is misconfigured: MYSTICHEARTS_BRIEF_PASSWORD env var is not set.",
      { status: 503, headers: { "Content-Type": "text/plain" } }
    );
  }

  const url = new URL(request.url);
  const expectedToken = await sha256(`${TOKEN_NAMESPACE}:${expected}`);

  const cookies = parseCookies(request.headers.get("Cookie") || "");
  const authCookie = cookies[COOKIE_NAME];
  if (authCookie && constantTimeEqual(authCookie, expectedToken)) {
    return context.next();
  }

  if (request.method === "POST") {
    let submitted = "";
    try {
      const form = await request.formData();
      submitted = (form.get("password") || "").toString();
    } catch {
      submitted = "";
    }

    if (constantTimeEqual(submitted, expected)) {
      const headers = new Headers();
      headers.set(
        "Set-Cookie",
        [
          `${COOKIE_NAME}=${expectedToken}`,
          `Path=${COOKIE_PATH}`,
          "HttpOnly",
          "Secure",
          "SameSite=Lax",
          `Max-Age=${COOKIE_MAX_AGE}`
        ].join("; ")
      );
      headers.set("Location", url.pathname + url.search);
      headers.set("Cache-Control", "no-store");
      return new Response("", { status: 303, headers });
    }

    return new Response(renderGate({ error: true }), {
      status: 401,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
  }

  return new Response(renderGate({ error: false }), {
    status: 401,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
};

export const config = {
  path: "/mystichearts/brief/*"
};

// ---------- helpers ----------

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx === -1) return;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) out[key] = val;
  });
  return out;
}

async function sha256(str) {
  const data = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function renderGate({ error }) {
  const errorBlock = error
    ? `<div class="gate__error" role="alert">That password isn't right. Try again.</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restricted | HAND Protocol</title>
  <meta name="robots" content="noindex, nofollow">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:ital,wght@0,400;1,400&display=swap" rel="stylesheet">
  <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
  <meta name="theme-color" content="#D97706">
  <style>
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    html,body{height:100%}
    body{
      font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      color:#111827;
      background:
        radial-gradient(1100px 600px at 80% -10%, rgba(217,119,6,0.10), transparent 60%),
        radial-gradient(800px 500px at -10% 110%, rgba(13,148,136,0.08), transparent 65%),
        #FBF8F1;
      min-height:100%;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:2rem 1rem;
      -webkit-font-smoothing:antialiased;
    }
    .gate{width:100%;max-width:440px}
    .gate__brand{
      display:flex;align-items:center;gap:.6rem;justify-content:center;
      color:#0C1220;margin-bottom:2rem;font-weight:600;letter-spacing:-0.01em;
    }
    .gate__brand svg{color:#D97706}
    .gate__card{
      background:#FFFFFF;border:1px solid #E5E7EB;border-radius:16px;
      padding:2.25rem 2rem;
      box-shadow:0 10px 40px -10px rgba(15,23,42,0.10), 0 2px 6px rgba(15,23,42,0.04);
    }
    .gate__eyebrow{
      display:inline-flex;align-items:center;gap:.5rem;font-size:.7rem;
      text-transform:uppercase;letter-spacing:.12em;color:#D97706;font-weight:600;
      margin-bottom:.75rem;
    }
    .gate__eyebrow-dot{width:6px;height:6px;border-radius:99px;background:#D97706}
    .gate__title{
      font-family:'Source Serif 4','Source Serif Pro',Georgia,serif;
      font-size:1.65rem;line-height:1.2;letter-spacing:-0.015em;color:#111827;
      margin-bottom:.5rem;
    }
    .gate__lede{color:#4B5563;font-size:.95rem;line-height:1.55;margin-bottom:1.5rem}
    .gate__access{
      margin-top:-.5rem;margin-bottom:1.25rem;
      padding:.6rem .85rem;background:#FBF8F1;border:1px dashed #D8CAB0;border-radius:8px;
      font-size:.78rem;color:#6B5D4F;text-align:center;letter-spacing:.01em;
    }
    .gate__form{display:flex;flex-direction:column;gap:.75rem}
    .gate__label{font-size:.78rem;font-weight:500;color:#4B5563;letter-spacing:.02em}
    .gate__input{
      width:100%;padding:.85rem 1rem;border:1px solid #D1D5DB;border-radius:10px;
      font:inherit;font-size:1rem;color:#111827;background:#FFFFFF;
      transition:border-color 150ms ease, box-shadow 150ms ease;
    }
    .gate__input::placeholder{color:#9CA3AF}
    .gate__input:focus{outline:none;border-color:#D97706;box-shadow:0 0 0 4px rgba(217,119,6,0.12)}
    .gate__error{
      margin-top:-.25rem;padding:.65rem .85rem;background:#FEF2F2;border:1px solid #FECACA;
      color:#B91C1C;border-radius:8px;font-size:.85rem;
    }
    .gate__submit{
      margin-top:.5rem;padding:.9rem 1rem;background:#0C1220;color:#F9FAFB;border:none;
      border-radius:10px;font:inherit;font-weight:600;font-size:.95rem;cursor:pointer;
      transition:background 150ms ease, transform 80ms ease;
    }
    .gate__submit:hover{background:#1E293B}
    .gate__submit:active{transform:translateY(1px)}
    .gate__foot{margin-top:1.5rem;font-size:.78rem;color:#6B7280;text-align:center;line-height:1.55}
    .gate__foot a{color:#D97706;text-decoration:none}
    .gate__foot a:hover{text-decoration:underline}
    .gate__benediction{
      margin-top:1.25rem;font-family:'Source Serif 4','Source Serif Pro',Georgia,serif;
      font-style:italic;font-size:.78rem;color:#94724A;text-align:center;line-height:1.55;
    }
    .gate__benediction strong{font-style:normal;font-weight:600;letter-spacing:.06em;color:#D97706}
  </style>
</head>
<body>
  <main class="gate">
    <div class="gate__brand">
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" width="22" height="22" aria-hidden="true">
        <circle cx="16" cy="16" r="15" stroke="currentColor" stroke-width="1.5"/>
        <path d="M16 8v5m0 6v5m-5-13v10a3 3 0 003 3h4a3 3 0 003-3V11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="16" cy="11" r="2" fill="currentColor"/>
      </svg>
      <span>HAND Protocol</span>
    </div>
    <div class="gate__card">
      <div class="gate__eyebrow"><span class="gate__eyebrow-dot"></span>Internal brief</div>
      <h1 class="gate__title">Mystic Hearts &middot; v1 product brief</h1>
      <p class="gate__lede">Working product brief for Mystic Hearts v1: scope, data model, mindmap, flows. Shared with reviewers only.</p>
      <div class="gate__access" role="note">For internal HAND and Mystic Hearts use only.</div>
      ${errorBlock}
      <form class="gate__form" method="POST" autocomplete="off" novalidate>
        <label class="gate__label" for="password">Password</label>
        <input
          class="gate__input"
          id="password"
          name="password"
          type="password"
          autocomplete="current-password"
          autofocus
          required
          aria-label="Access password"
          placeholder="••••••••••"
        >
        <button class="gate__submit" type="submit">Open brief</button>
      </form>
      <p class="gate__foot">Don't have access? <a href="mailto:hand@handprotocol.org">Email hand@handprotocol.org</a></p>
      <p class="gate__benediction"><strong>M.A.S.S.</strong> &middot; companion to the Mystic Airstream Studio brief &middot; bring your own coffee</p>
    </div>
  </main>
</body>
</html>`;
}
