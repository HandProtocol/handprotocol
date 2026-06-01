// HTTP Basic Auth gate for the business-outreach pitch pages at
// /demos/<slug>/pitch/*.
//
// The pitch page carries the call script, the business info, the demo preview,
// and a follow-up form. It is meant to be handed to any volunteer making calls,
// so it sits on the public site behind a shared password rather than the
// Command Center login.
//
// Set env vars in the Netlify dashboard:
//   DEMOS_PITCH_PASSWORD  — required. The shared password (e.g. "handme").
//   DEMOS_PITCH_USER      — optional. Defaults to "hand".
//
// The demo site itself (/demos/<slug>/) stays public; only the /pitch/ subpath
// is gated.

import { notify, describeVisitor, escapeHtml } from "./_telegram.js";

export default async (request, context) => {
  const expected = Netlify.env.get("DEMOS_PITCH_PASSWORD");
  const expectedUser = Netlify.env.get("DEMOS_PITCH_USER") || "hand";

  if (!expected) {
    return new Response(
      "Pitch page is misconfigured: DEMOS_PITCH_PASSWORD env var is not set.",
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

  // Notify once per browser session on the first HTML page load.
  const cookieHeader = request.headers.get("Cookie") || "";
  const alreadyNotified = cookieHeader.split(/;\s*/).includes("pitch_seen=1");
  const isDocument = (request.headers.get("Accept") || "").includes("text/html");

  const response = await context.next();

  if (isDocument && !alreadyNotified) {
    const { place, ip, ua } = describeVisitor(request, context);
    await notify("alerts", {
      title: "🔓 Pitch page accessed",
      lines: [
        `<code>${escapeHtml(new URL(request.url).pathname)}</code>`,
        place ? `📍 ${escapeHtml(place)}` : "",
        ip ? `<i>${escapeHtml(ip)}</i>` : "",
        ua ? `<i>${escapeHtml(ua.slice(0, 160))}</i>` : "",
      ].filter(Boolean),
    });
    response.headers.append(
      "Set-Cookie",
      "pitch_seen=1; Path=/demos; HttpOnly; Secure; SameSite=Lax; Max-Age=86400",
    );
  }

  return response;
};

function unauthorized() {
  return new Response("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="HAND Pitch", charset="UTF-8"',
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
  path: ["/demos/:slug/pitch", "/demos/:slug/pitch/*"]
};
