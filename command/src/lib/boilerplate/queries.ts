/*
  Boilerplate library, server-side reads. Same pattern as
  src/lib/grants/queries.ts: prefer the SSR client (RLS-honoring),
  fall back to the admin client when env vars are present but no
  session exists.
*/
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { BoilerplateRecord } from "./types";

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

const SELECT =
  "id, slug, category, title, content, word_count, version, active, tags, notes, created_at, updated_at";

export async function listBoilerplate(opts?: {
  category?: string;
  q?: string;
  activeOnly?: boolean;
}): Promise<BoilerplateRecord[]> {
  const client = await readClient();
  if (!client) return [];

  let query = client.from("boilerplate").select(SELECT);

  if (opts?.activeOnly) query = query.eq("active", true);
  if (opts?.category) query = query.eq("category", opts.category);
  if (opts?.q) {
    // pg_trgm is enabled (migration 001). Use ilike for forgiving match
    // on title or content. The trgm GIN index on title speeds the
    // common case.
    query = query.or(
      `title.ilike.%${opts.q}%,content.ilike.%${opts.q}%`,
    );
  }

  const { data, error } = await query.order("category").order("title");
  if (error || !data) return [];
  return data as BoilerplateRecord[];
}

export async function getBoilerplate(
  id: string,
): Promise<BoilerplateRecord | null> {
  const client = await readClient();
  if (!client) return null;
  const { data, error } = await client
    .from("boilerplate")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as BoilerplateRecord;
}

// Find the top-N boilerplate snippets that best match the given prompt,
// using pg_trgm similarity on title and content. Used by the drafting
// assistant to ground its answer.
export async function findRelevantBoilerplate(
  prompt: string,
  limit = 3,
): Promise<BoilerplateRecord[]> {
  if (!configured()) return [];
  const client = adminClient();

  // pg_trgm word-similarity. We hit the content via ilike on the most
  // distinctive terms, then sort by length proximity. For Phase 2 this
  // is intentionally simple. Embeddings live behind a Phase 3 flag.
  const terms = extractTerms(prompt).slice(0, 6);
  if (terms.length === 0) return [];

  const orClause = terms
    .map((t) => `title.ilike.%${t}%,content.ilike.%${t}%`)
    .join(",");

  const { data, error } = await client
    .from("boilerplate")
    .select(SELECT)
    .eq("active", true)
    .or(orClause)
    .limit(limit * 3);

  if (error || !data) return [];

  // Score each snippet by how many of the terms appear, prefer shorter
  // and higher-version snippets.
  const scored = (data as BoilerplateRecord[]).map((row) => {
    const hay = `${row.title} ${row.content}`.toLowerCase();
    const hits = terms.filter((t) => hay.includes(t.toLowerCase())).length;
    return { row, score: hits };
  });
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.row.content.length - b.row.content.length;
  });
  return scored.slice(0, limit).map((s) => s.row);
}

function extractTerms(text: string): string[] {
  // Naive term extractor. Pulls 4-character-and-up words, lowercased,
  // de-duplicated, stop-words skipped.
  const stop = new Set([
    "the",
    "and",
    "for",
    "with",
    "from",
    "this",
    "that",
    "your",
    "have",
    "will",
    "what",
    "when",
    "where",
    "which",
    "their",
    "they",
    "would",
    "could",
    "should",
    "about",
    "into",
    "than",
    "then",
    "been",
    "such",
    "more",
    "most",
    "some",
    "very",
    "also",
    "much",
    "many",
    "make",
    "made",
    "does",
    "doing",
    "done",
    "each",
    "those",
    "these",
    "describe",
    "please",
  ]);
  const tokens = text.toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) || [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tokens) {
    if (stop.has(t)) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}
