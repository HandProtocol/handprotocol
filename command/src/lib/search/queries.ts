"use server";

/*
  Universal search across the command center surfaces. Returns up to
  five results per type so the palette stays scannable. Uses ilike for
  forgiving matches; the underlying tables have pg_trgm GIN indexes on
  the searched columns (slug, title, name, body) so the planner can
  pick the trigram path when the corpus is large enough to benefit.

  This file is a Server Action module ("use server"); only async
  functions are exported. The shared result types live in ./types so
  client components can import them safely.
*/

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { SearchResult, UniversalSearchResults } from "./types";

const PER_TYPE_LIMIT = 5;

export async function universalSearch(
  query: string,
): Promise<UniversalSearchResults> {
  const empty: UniversalSearchResults = {
    grants: [],
    funders: [],
    boilerplate: [],
    inbox: [],
  };

  const q = await safeForLike(query);
  if (!q || q.length < 1) return empty;

  const client = await readClient();
  if (!client) return empty;

  const like = `%${q}%`;

  const [grants, funders, boilerplate, inbox] = await Promise.all([
    searchGrants(client, like),
    searchFunders(client, like),
    searchBoilerplate(client, like),
    searchInbox(client, like),
  ]);

  return { grants, funders, boilerplate, inbox };
}

/* ─── Internals ────────────────────────────────────────────────────────
   These helpers are async even when they don't need to be, because a
   "use server" module can only export async functions. They stay
   private to this file. */

async function adminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: "command" },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

async function configured(): Promise<boolean> {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

async function readClient() {
  if (!(await configured())) return null;
  try {
    return await createServerClient();
  } catch {
    return adminClient();
  }
}

async function safeForLike(q: string): Promise<string> {
  return q.replace(/[\\%,()]/g, " ").trim();
}

type AnyClient = Awaited<ReturnType<typeof readClient>>;

async function searchGrants(
  client: NonNullable<AnyClient>,
  like: string,
): Promise<SearchResult[]> {
  const { data, error } = await client
    .from("grants")
    .select("id, slug, name, status, funders(name)")
    .or(`slug.ilike.${like},name.ilike.${like}`)
    .limit(PER_TYPE_LIMIT);
  if (error || !data) return [];
  return (
    data as unknown as Array<{
      id: string;
      slug: string;
      name: string;
      status: string | null;
      funders: { name: string | null } | null;
    }>
  ).map((row) => ({
    type: "grant" as const,
    id: row.id,
    slug: row.slug,
    title: row.name,
    subtitle:
      [row.funders?.name, row.status].filter(Boolean).join(" · ") || null,
    href: `/grants/${row.slug}`,
  }));
}

async function searchFunders(
  client: NonNullable<AnyClient>,
  like: string,
): Promise<SearchResult[]> {
  const { data, error } = await client
    .from("funders")
    .select("id, slug, name, type")
    .or(`slug.ilike.${like},name.ilike.${like}`)
    .limit(PER_TYPE_LIMIT);
  if (error || !data) return [];
  return (
    data as unknown as Array<{
      id: string;
      slug: string;
      name: string;
      type: string | null;
    }>
  ).map((row) => ({
    type: "funder" as const,
    id: row.id,
    slug: row.slug,
    title: row.name,
    subtitle: row.type ?? null,
    href: `/funders/${row.slug}`,
  }));
}

async function searchBoilerplate(
  client: NonNullable<AnyClient>,
  like: string,
): Promise<SearchResult[]> {
  const { data, error } = await client
    .from("boilerplate")
    .select("id, slug, title, category")
    .or(`slug.ilike.${like},title.ilike.${like}`)
    .eq("active", true)
    .limit(PER_TYPE_LIMIT);
  if (error || !data) return [];
  return (
    data as unknown as Array<{
      id: string;
      slug: string;
      title: string;
      category: string | null;
    }>
  ).map((row) => ({
    type: "boilerplate" as const,
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.category ?? null,
    href: `/boilerplate/${row.id}`,
  }));
}

async function searchInbox(
  client: NonNullable<AnyClient>,
  like: string,
): Promise<SearchResult[]> {
  const { data, error } = await client
    .from("inbox_items")
    .select("id, title, body, status, url")
    .or(`title.ilike.${like},body.ilike.${like}`)
    .order("captured_at", { ascending: false })
    .limit(PER_TYPE_LIMIT);
  if (error || !data) return [];
  return (
    data as unknown as Array<{
      id: string;
      title: string | null;
      body: string | null;
      status: string;
      url: string | null;
    }>
  ).map((row) => ({
    type: "inbox" as const,
    id: row.id,
    title: row.title || row.url || (row.body?.slice(0, 60) ?? "Inbox item"),
    subtitle: row.status,
    href: `/inbox?status=${row.status}`,
  }));
}
