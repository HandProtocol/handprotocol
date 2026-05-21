import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/*
  Next.js 16 calls this Proxy (formerly Middleware). Convention is a single
  proxy.ts at src/ root. See node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md.
*/
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
      Match all request paths except for the ones starting with:
      - _next/static (static files)
      - _next/image (image optimization files)
      - favicon.ico
      - loading.html and the public /models/ directory (loader assets)
      Image, font, and asset extensions also skipped.
    */
    "/((?!_next/static|_next/image|favicon.ico|loading.html|models|.*\\.(?:svg|png|jpg|jpeg|gif|webp|glb|woff|woff2|ttf)$).*)",
  ],
};
