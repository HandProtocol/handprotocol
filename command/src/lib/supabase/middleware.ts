import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/*
  Session refresh + auth gating for the command center.
  Lifted from noredFarms/reps/src/lib/supabase/middleware.ts and stripped:
  - PEA notify hook removed (no rep cross-product wiring here)
  - reps-specific onboarding redirect removed
  - dashboard route allowlist simplified to HAND's nav (Grants, Funders,
    Boilerplate, Deadlines, Settings)
  In Next.js 16 the middleware file is called proxy.ts. This helper is
  imported from /src/proxy.ts.
*/
export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({ request });

  // If env vars aren't configured yet (v1.0 scaffold), skip auth entirely so
  // the loader, dashboard preview, and login form all render. The auth code
  // is fully wired and starts running as soon as the vars are set.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return supabaseResponse;
  }

  let response = supabaseResponse;
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      db: { schema: "command" },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh the session. Critical for keeping tokens alive.
  let user = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch {
    // Network failure to Supabase, let the page render and surface the error
    // closer to the operator on the route itself.
  }

  // Public routes that don't require auth.
  const publicPaths = [
    "/auth/login",
    "/auth/callback",
    "/auth/invite",
    "/loading.html",
    "/models",
    "/api/",
  ];
  // The loader at / is public too, it handles its own redirect to /dashboard.
  if (request.nextUrl.pathname === "/") return response;

  const isPublicPath = publicPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  return response;
}
