import { createBrowserClient } from "@supabase/ssr";

/*
  Browser Supabase client for the HAND Command Center.
  Schema is `command`, dedicated to grant pipeline data. Lifted from
  noredFarms/reps/src/lib/supabase/client.ts and reschema'd.
*/
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: "command" },
    },
  );
}
