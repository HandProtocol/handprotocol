/*
  Shared helpers for the Develop lead scripts (enrich / register / generate-pitch).
  Run any of them from anywhere: this module pins cwd to command/ so the develop
  lib (which resolves the repo root from cwd) and .env.local both resolve.

    npx tsx scripts/<name>.mts ...

  These use the SERVICE-ROLE Supabase key on purpose. The /develop UI and the
  generate-* API routes read through the authenticated SSR client (RLS), so an
  unauthenticated process cannot use them; these scripts are the headless path.
*/
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

process.chdir(fileURLToPath(new URL("../", import.meta.url))); // -> command/

export function loadEnv(): Record<string, string> {
  return Object.fromEntries(
    fs
      .readFileSync(".env.local", "utf8")
      .split("\n")
      .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      }),
  );
}

export function admin(env: Record<string, string> = loadEnv()) {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    db: { schema: "command" },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/*
  Retry transient Supabase read failures. Under concurrency (6+ scripts at
  once) single-row reads occasionally come back as a network error, a 5xx, or
  an empty row that plainly exists; one or two spaced retries absorb that.
  supabase-js resolves (never throws) with { data, error, status }, so we
  retry when:
    - the builder threw (pure network failure), or
    - error is set with a 5xx / no HTTP status (fetch-level failure), or
    - expectRow is set and data came back null (e.g. .single() PGRST116).
  Anything else (RLS denial, bad query, a genuinely missing row on
  .maybeSingle()) returns immediately: those are real answers, not noise.
  The query builder is one-shot, so callers pass a factory that builds a
  fresh read each attempt.
*/
const RETRY_DELAYS_MS = [500, 1500];

// Generic over the whole supabase response so the builder's inferred data
// type flows through unchanged; the catch branch unions in a null-data shape.
type DbReadFailure = { data: null; error: { message: string }; status: number };

export async function readWithRetry<
  R extends { data: unknown; error: { message: string } | null; status?: number },
>(
  read: () => PromiseLike<R>,
  opts: { label?: string; expectRow?: boolean } = {},
): Promise<R | DbReadFailure> {
  let last: R | DbReadFailure;
  for (let attempt = 0; ; attempt++) {
    let transient: boolean;
    try {
      last = await read();
      const status = last.status ?? 0;
      const networkish =
        last.error != null &&
        (status >= 500 ||
          status === 0 ||
          /fetch failed|network|socket|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN/i.test(
            last.error.message,
          ));
      // .single() reports a missing row as error PGRST116 (406), so the
      // expectRow check has to look at data, not just the no-error branch.
      transient = networkish || (Boolean(opts.expectRow) && last.data == null);
    } catch (e) {
      transient = true;
      last = { data: null, error: { message: (e as Error).message }, status: 0 };
    }
    if (!transient || attempt >= RETRY_DELAYS_MS.length) return last;
    console.error(
      `transient read failure${opts.label ? ` (${opts.label})` : ""}: ${last.error?.message ?? "empty row"}, retrying in ${RETRY_DELAYS_MS[attempt]}ms`,
    );
    await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
  }
}

export type ParsedReview = { author: string | null; rating: number | null; body: string };

/*
  Inverse of reviewsToBody in src/lib/develop/markdown.ts: read the "## Reviews"
  blockquotes back into rows. Reviews are separated by blank lines; within a
  review the body and "Author, N/5" attribution are separated by a ">" line.
*/
export function parseReviewsBody(body: string): ParsedReview[] {
  const m = body.match(/##\s*Reviews\s*\n([\s\S]*?)(?:\n##\s|\s*$)/);
  if (!m) return [];
  const section = m[1].trim();
  if (!section || /no reviews captured yet/i.test(section)) return [];

  const out: ParsedReview[] = [];
  for (const block of section.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean)) {
    const inner = block
      .split("\n")
      .map((l) => l.replace(/^>\s?/, ""))
      .join("\n");
    const parts = inner.split(/\n\s*\n/);
    let author: string | null = null;
    let rating: number | null = null;
    let text = inner.trim();
    if (parts.length >= 2) {
      text = parts.slice(0, -1).join("\n\n").trim();
      const attr = parts[parts.length - 1].trim();
      const rm = attr.match(/^(.*?)(?:,\s*([1-5])\/5)?$/);
      if (rm) {
        author = rm[1].trim() || null;
        rating = rm[2] ? Number(rm[2]) : null;
      }
    }
    if (text) out.push({ author, rating, body: text });
  }
  return out;
}
