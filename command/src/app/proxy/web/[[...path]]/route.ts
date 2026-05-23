import { NextResponse } from "next/server";

/*
  Same-origin proxy for the UX inspector iframe.

  handprotocol.org responds with `x-frame-options: SAMEORIGIN`, which
  blocks command.handprotocol.org from embedding it. Next.js `rewrites`
  pass the upstream response unchanged, so we use an explicit Route
  Handler that strips the frame-blocking headers and forwards everything
  else.

  We rewrite HTML <head> to inject a <base href="https://handprotocol.org/...">
  so relative links and asset URLs resolve against the public origin
  rather than against /proxy/web. This keeps the inspector iframe
  visually identical to the live site.
*/

const TARGET = "https://handprotocol.org";

// Streamed binary responses (images, fonts, scripts) — never rewrite
// their bodies. Only HTML responses get the <base> injection.
function isHtml(contentType: string | null): boolean {
  if (!contentType) return false;
  return contentType.toLowerCase().includes("text/html");
}

async function proxy(req: Request, pathSegments: string[]): Promise<Response> {
  const url = new URL(req.url);
  const path = pathSegments.join("/");
  const upstream = `${TARGET}/${path}${url.search}`;

  const upstreamHeaders = new Headers(req.headers);
  // Strip headers that would confuse the upstream or leak our origin.
  upstreamHeaders.delete("host");
  upstreamHeaders.delete("x-forwarded-host");
  upstreamHeaders.delete("x-forwarded-proto");
  upstreamHeaders.delete("x-forwarded-for");
  upstreamHeaders.delete("content-length");

  // For non-GET requests, buffer the body. Streaming `req.body` directly
  // into fetch requires `duplex: "half"` and isn't portable across all
  // runtimes; buffering keeps the code simple and the inspector doesn't
  // proxy huge uploads.
  let body: BodyInit | undefined = undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await req.arrayBuffer();
  }

  let res: Response;
  try {
    res = await fetch(upstream, {
      method: req.method,
      headers: upstreamHeaders,
      body,
      redirect: "follow",
    });
  } catch (err) {
    return new NextResponse(
      `Inspector proxy could not reach ${TARGET}: ${err instanceof Error ? err.message : String(err)}`,
      { status: 502 },
    );
  }

  const contentType = res.headers.get("content-type");
  const outHeaders = new Headers(res.headers);
  // Allow the command center to frame the response.
  outHeaders.delete("x-frame-options");
  // Strip CSP frame-ancestors. Leave the rest of CSP intact.
  const csp = outHeaders.get("content-security-policy");
  if (csp) {
    const cleaned = csp
      .split(";")
      .map((s) => s.trim())
      .filter((s) => !s.toLowerCase().startsWith("frame-ancestors"))
      .join("; ");
    if (cleaned) outHeaders.set("content-security-policy", cleaned);
    else outHeaders.delete("content-security-policy");
  }
  // Stale cached HTML can confuse the inspector overlay; bust on every load.
  outHeaders.set("cache-control", "no-store, max-age=0");

  if (isHtml(contentType)) {
    // Inject a <base> so relative URLs in the iframe resolve to the
    // public origin. Without this, /assets/foo.css inside the iframe
    // would resolve to command.handprotocol.org/assets/foo.css.
    const dir = path.replace(/[^/]*$/, "");
    const baseHref = `${TARGET}/${dir}`;
    const html = await res.text();
    const injected = html.replace(
      /<head([^>]*)>/i,
      `<head$1><base href="${baseHref}">`,
    );
    return new NextResponse(injected, {
      status: res.status,
      statusText: res.statusText,
      headers: outHeaders,
    });
  }

  // Non-HTML: pass through as-is.
  return new NextResponse(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: outHeaders,
  });
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ path?: string[] }> },
) {
  const { path = [] } = await ctx.params;
  return proxy(req, path);
}

export async function HEAD(
  req: Request,
  ctx: { params: Promise<{ path?: string[] }> },
) {
  const { path = [] } = await ctx.params;
  return proxy(req, path);
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ path?: string[] }> },
) {
  const { path = [] } = await ctx.params;
  return proxy(req, path);
}
