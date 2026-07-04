// Password-only cookie gate for /mystichearts/demo/* paths.
// Shared password: "mystic".

const COOKIE_NAME = "mystichearts_demo_auth";
const COOKIE_PATH = "/mystichearts/demo";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const TOKEN_NAMESPACE = "mh-demo-v1";
const PASSWORD = "mystic";

export default async (request, context) => {
  const url = new URL(request.url);
  const expectedToken = await sha256(`${TOKEN_NAMESPACE}:${PASSWORD}`);
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

    if (constantTimeEqual(submitted, PASSWORD)) {
      const headers = new Headers();
      headers.set(
        "Set-Cookie",
        [
          `${COOKIE_NAME}=${expectedToken}`,
          `Path=${COOKIE_PATH}`,
          "HttpOnly",
          "Secure",
          "SameSite=Lax",
          `Max-Age=${COOKIE_MAX_AGE}`,
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
        "Cache-Control": "no-store",
      },
    });
  }

  return new Response(renderGate({ error: false }), {
    status: 401,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
};

export const config = {
  path: "/mystichearts/demo/*",
};

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
    ? `<div class="gate__error" role="alert">That password is not right. Try again.</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mystic Hearts Demo | Restricted</title>
  <meta name="robots" content="noindex, nofollow">
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{
      min-height:100vh;
      display:grid;
      place-items:center;
      padding:2rem 1rem;
      font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      color:#f9f3e7;
      background:
        linear-gradient(180deg,rgba(17,14,10,.62),rgba(17,14,10,.82)),
        radial-gradient(circle at 20% 10%,rgba(217,164,65,.28),transparent 28rem),
        radial-gradient(circle at 85% 15%,rgba(143,61,69,.28),transparent 30rem),
        #15130f;
    }
    .gate{width:min(100%,440px)}
    .gate__card{
      border:1px solid rgba(255,255,255,.18);
      border-radius:24px;
      background:rgba(255,255,255,.08);
      padding:2rem;
      box-shadow:0 30px 90px rgba(0,0,0,.28);
      backdrop-filter:blur(18px);
    }
    .gate__eyebrow{
      margin-bottom:.85rem;
      color:rgba(248,227,164,.86);
      font-size:.72rem;
      font-weight:800;
      letter-spacing:.18em;
      text-transform:uppercase;
    }
    .gate__title{
      font-family:Georgia,serif;
      font-size:clamp(2.35rem,10vw,4rem);
      font-weight:400;
      line-height:.92;
      letter-spacing:0;
    }
    .gate__lede{
      margin-top:1rem;
      color:rgba(255,255,255,.72);
      font-size:.98rem;
      line-height:1.7;
    }
    .gate__form{margin-top:1.4rem;display:grid;gap:.75rem}
    .gate__label{
      color:rgba(255,255,255,.68);
      font-size:.78rem;
      font-weight:700;
      letter-spacing:.08em;
      text-transform:uppercase;
    }
    .gate__input{
      width:100%;
      border:1px solid rgba(255,255,255,.26);
      border-radius:999px;
      background:rgba(255,255,255,.1);
      color:#fff;
      font:inherit;
      padding:.95rem 1rem;
      outline:none;
    }
    .gate__input:focus{
      border-color:#f8e3a4;
      box-shadow:0 0 0 4px rgba(248,227,164,.14);
    }
    .gate__submit{
      min-height:3rem;
      border:0;
      border-radius:999px;
      background:#f8e3a4;
      color:#241b11;
      cursor:pointer;
      font:inherit;
      font-weight:800;
    }
    .gate__error{
      margin-top:1rem;
      border:1px solid rgba(252,165,165,.4);
      border-radius:14px;
      background:rgba(127,29,29,.28);
      color:#fecaca;
      padding:.75rem .9rem;
      font-size:.9rem;
    }
    .gate__foot{margin-top:1.25rem;color:rgba(255,255,255,.48);font-size:.82rem;line-height:1.5}
  </style>
</head>
<body>
  <main class="gate">
    <section class="gate__card">
      <div class="gate__eyebrow">Private preview</div>
      <h1 class="gate__title">Mystic Hearts demo</h1>
      <p class="gate__lede">Enter the shared password to view the immersive video site preview.</p>
      ${errorBlock}
      <form class="gate__form" method="POST" autocomplete="off">
        <label class="gate__label" for="password">Password</label>
        <input class="gate__input" id="password" name="password" type="password" autocomplete="current-password" autofocus required>
        <button class="gate__submit" type="submit">Open demo</button>
      </form>
      <p class="gate__foot">For HAND and Mystic Hearts review only.</p>
    </section>
  </main>
</body>
</html>`;
}
