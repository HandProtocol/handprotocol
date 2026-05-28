// HTTP Basic Auth gate for /fiscal/decision/* paths.
//
// The public explainer at /fiscal/ stays open. Only the internal decision
// tool under /fiscal/decision/ is gated. Reuses the grants credentials so
// there is one internal password, not two:
//   GRANTS_PASSWORD  — required. The shared internal password.
//   GRANTS_USER      — optional. Defaults to "hand".
//
// Browsers cache Basic Auth credentials for the session, so visitors only
// see the password prompt once per browser session.

export default async (request, context) => {
  const expected = Netlify.env.get("GRANTS_PASSWORD");
  const expectedUser = Netlify.env.get("GRANTS_USER") || "hand";

  if (!expected) {
    return new Response(
      "Fiscal decision page is misconfigured: GRANTS_PASSWORD env var is not set.",
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

  return context.next();
};

function unauthorized() {
  return new Response("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="HAND Fiscal", charset="UTF-8"',
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
  path: "/fiscal/decision/*"
};
