// Password gate for private previews on handprotocol.org.
//
// One shared password unlocks every path below (cookie on "/", 7 days).
// The password lives only in the Netlify env var PRIVATE_PREVIEW_PASSWORD,
// never in this public repo. Unset = 503 (fails closed).
// Changing the password signs everyone out (the cookie is derived from it).
//
// To make a page public, remove its paths from config.path.

const COOKIE_NAME = "hand_preview_auth";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const TOKEN_NAMESPACE = "hand-private-preview-v1";

const NO_STORE_HTML = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

export default async (request, context) => {
  const password = Netlify.env.get("PRIVATE_PREVIEW_PASSWORD");
  if (!password) {
    return new Response("This preview is not open yet.", {
      status: 503,
      headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" },
    });
  }

  const url = new URL(request.url);
  const expectedToken = await sha256(`${TOKEN_NAMESPACE}:${password}`);
  const cookies = parseCookies(request.headers.get("Cookie") || "");

  if (constantTimeEqual(cookies[COOKIE_NAME] || "", expectedToken)) {
    return context.next();
  }

  // The guestbook API answers scripts, not people: no form, just 401.
  if (url.pathname.startsWith("/api/")) {
    return new Response(JSON.stringify({ error: "private preview" }), {
      status: 401,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  if (request.method === "POST") {
    const submitted = await readPassword(request);
    if (constantTimeEqual(submitted, password)) {
      return new Response("", {
        status: 303,
        headers: {
          "Set-Cookie": [
            `${COOKIE_NAME}=${expectedToken}`,
            "Path=/",
            "HttpOnly",
            "Secure",
            "SameSite=Lax",
            `Max-Age=${COOKIE_MAX_AGE}`,
          ].join("; "),
          Location: url.pathname + url.search,
          "Cache-Control": "no-store",
        },
      });
    }
    return new Response(renderGate({ error: true }), { status: 401, headers: NO_STORE_HTML });
  }

  return new Response(renderGate({ error: false }), { status: 401, headers: NO_STORE_HTML });
};

export const config = {
  path: [
    "/kc-collective",
    "/kc-collective/*",
    "/kccollective",
    "/api/stars",
    "/start",
    "/start/*",
    "/onboarding-wireframe",
    "/onboarding-wireframe/*",
  ],
};

async function readPassword(request) {
  try {
    const form = await request.formData();
    return (form.get("password") || "").toString();
  } catch {
    return "";
  }
}

function parseCookies(header) {
  const out = {};
  header.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx === -1) return;
    const key = part.slice(0, idx).trim();
    if (key) out[key] = part.slice(idx + 1).trim();
  });
  return out;
}

async function sha256(str) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function renderGate({ error }) {
  const errorBlock = error
    ? `<p class="err" role="alert">That password is not right. Try again.</p>`
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Private preview · HAND Protocol</title>
  <meta name="robots" content="noindex, nofollow">
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{min-height:100vh;display:grid;place-items:center;padding:2rem 1rem;
      font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      color:#1c1917;background:#faf7f2}
    main{width:min(100%,400px)}
    .card{border:1px solid #e7e0d6;border-radius:20px;background:#fff;padding:2rem;
      box-shadow:0 20px 60px rgba(28,25,23,.08)}
    .eyebrow{color:#92400e;font-size:.72rem;font-weight:800;letter-spacing:.16em;text-transform:uppercase}
    h1{margin-top:.6rem;font-family:Georgia,serif;font-weight:400;font-size:2rem;line-height:1.1}
    p.lede{margin-top:.75rem;color:#57534e;line-height:1.6}
    form{margin-top:1.25rem;display:grid;gap:.7rem}
    label{font-size:.78rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#57534e}
    input{width:100%;border:1px solid #d6cfc4;border-radius:999px;padding:.9rem 1rem;font:inherit;outline:none}
    input:focus{border-color:#b45309;box-shadow:0 0 0 4px rgba(180,83,9,.15)}
    button{min-height:3rem;border:0;border-radius:999px;background:#b45309;color:#fff;font:inherit;font-weight:700;cursor:pointer}
    button:hover{background:#92400e}
    .err{margin-top:1rem;border:1px solid #fecaca;border-radius:12px;background:#fef2f2;color:#991b1b;padding:.7rem .9rem;font-size:.9rem}
  </style>
</head>
<body>
  <main>
    <section class="card">
      <p class="eyebrow">Private preview</p>
      <h1>This page is private</h1>
      <p class="lede">Enter the password you were given to continue.</p>
      ${errorBlock}
      <form method="POST" autocomplete="off">
        <label for="password">Password</label>
        <input id="password" name="password" type="password" autocomplete="current-password" autofocus required>
        <button type="submit">Continue</button>
      </form>
    </section>
  </main>
</body>
</html>`;
}
