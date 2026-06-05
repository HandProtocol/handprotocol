import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";

/*
  OAuth and magic-link callback. Mirrors
  noredFarms/reps/src/app/auth/callback/route.ts, default redirect target is
  /dashboard not /. Used when Supabase Auth completes an external flow.

  Invite hook: if a `pending_invite` cookie is set (an unauth'd visitor hit
  /auth/invite/<code> and went through sign-in), send them back to the invite
  page after the session is established so redemption runs while authenticated.
  An explicit `next` param still wins.
*/
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const explicitNext = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      let next = explicitNext ?? "/dashboard";
      if (!explicitNext) {
        const jar = await cookies();
        const pending = jar.get("pending_invite")?.value;
        if (pending) next = `/auth/invite/${pending}`;
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth`);
}
