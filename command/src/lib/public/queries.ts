import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export type PublicVisit = {
  id: string;
  page_path: string;
  page_label: string;
  page_title: string | null;
  referrer: string | null;
  country: string | null;
  city: string | null;
  ua: string | null;
  created_at: string;
};

function adminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: "command" },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

function configured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

async function readClient() {
  if (!configured()) return null;
  try {
    return await createServerClient();
  } catch {
    return adminClient();
  }
}

export async function listPublicVisits(limit = 80): Promise<PublicVisit[]> {
  const client = await readClient();
  if (!client) return [];
  const { data, error } = await client
    .from("public_visits")
    .select(
      "id,page_path,page_label,page_title,referrer,country,city,ua,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as unknown as PublicVisit[];
}
