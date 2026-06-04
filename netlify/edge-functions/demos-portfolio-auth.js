// HTTP Basic Auth gate for the internal demo PORTFOLIO index at /demos/.
//
// /demos/ lists every generated demo site as a portfolio (with live visit
// counts) and is operator-only, so it sits behind the same shared password as
// the pitch pages. The individual demo sites (/demos/<slug>/) stay public; only
// this index and its data endpoint (/demos/portfolio.json) are gated.
//
// Reuses the pitch-gate credentials:
//   DEMOS_PITCH_PASSWORD  — required. The shared password (e.g. "handme").
//   DEMOS_PITCH_USER      — optional. Defaults to "hand".

import { notify, describeVisitor, escapeHtml } from "./lib/_telegram.js";

export default async (request, context) => {
  const expected = Netlify.env.get("DEMOS_PITCH_PASSWORD");
  const expectedUser = Netlify.env.get("DEMOS_PITCH_USER") || "hand";

  if (!expected) {
    return new Response(
      "Portfolio is misconfigured: DEMOS_PITCH_PASSWORD env var is not set.",
      { status: 503, headers: { "Content-Type": "text/plain" } }
    );
  }

  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Basic ")) {
    return unauthorized();
  }

  let user = "";
  let pass = "";
  try {
    const decoded = atob(auth.slice("Basic ".length));
    const idx = decoded.indexOf(":");
    user = idx === -1 ? decoded : decoded.slice(0, idx);
    pass = idx === -1 ? "" : decoded.slice(idx + 1);
  } catch {
    return unauthorized();
  }

  if (!constantTimeEqual(user, expectedUser) || !constantTimeEqual(pass, expected)) {
    return unauthorized();
  }

  // Data endpoint: proxy to the function directly. A redirect/rewrite is not
  // applied from inside context.next(), so we fetch it here and pass the shared
  // key the function checks, keeping the raw function path ungettable directly.
  const url = new URL(request.url);
  if (url.pathname === "/demos/portfolio.json") {
    try {
      const r = await fetch(`${url.origin}/.netlify/functions/biz-portfolio`, {
        headers: { "x-portfolio-key": expected, Accept: "application/json" },
      });
      const text = await r.text();
      return new Response(text, {
        status: r.status,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    } catch (_) {
      return new Response(JSON.stringify({ error: "upstream", demos: [] }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Notify once per browser session on the first HTML page load (not the JSON).
  const cookieHeader = request.headers.get("Cookie") || "";
  const alreadyNotified = cookieHeader.split(/;\s*/).includes("portfolio_seen=1");
  const isDocument = (request.headers.get("Accept") || "").includes("text/html");

  const response = await context.next();

  if (isDocument && !alreadyNotified) {
    const { place, ip, ua } = describeVisitor(request, context);
    await notify("alerts", {
      title: "🗂️ Demo portfolio opened",
      lines: [
        place ? `📍 ${escapeHtml(place)}` : "",
        ip ? `<i>${escapeHtml(ip)}</i>` : "",
        ua ? `<i>${escapeHtml(ua.slice(0, 160))}</i>` : "",
      ].filter(Boolean),
    });
    response.headers.append(
      "Set-Cookie",
      "portfolio_seen=1; Path=/demos; HttpOnly; Secure; SameSite=Lax; Max-Age=86400",
    );
  }

  return response;
};

function unauthorized() {
  return new Response("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="HAND Demos", charset="UTF-8"',
      "Content-Type": "text/plain"
    }
  });
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

export const config = {
  path: ["/demos", "/demos/", "/demos/index.html", "/demos/portfolio.json"]
};
