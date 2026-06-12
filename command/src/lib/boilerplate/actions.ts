"use server";

/*
  Boilerplate library, server actions. Create, update, deactivate.
  Updates auto-increment the version field; the table stores the latest
  row as canonical, prior versions live in git history of the mirrored
  markdown export (Phase 3 will surface the timeline).
*/
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { kebabCase } from "@/lib/grants/slug";

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

export async function createBoilerplate(formData: FormData) {
  if (!configured()) throw new Error("Supabase env vars are not set");

  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const tagsRaw = String(formData.get("tags") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!title) throw new Error("Title is required");
  if (!category) throw new Error("Category is required");
  if (!content) throw new Error("Content is required");

  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  // Make a unique slug. Append a numeric suffix if needed.
  const client = adminClient();
  const baseSlug = kebabCase(title);
  let slug = baseSlug;
  let n = 1;
  for (;;) {
    const { data } = await client
      .from("boilerplate")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) break;
    n += 1;
    slug = `${baseSlug}-${n}`;
  }

  const { error } = await client.from("boilerplate").insert({
    slug,
    category,
    title,
    content,
    tags,
    notes: notes || null,
    active: true,
    version: 1,
  });

  if (error) throw new Error(`Could not save snippet: ${error.message}`);

  revalidatePath("/boilerplate");
  redirect("/boilerplate");
}

export async function updateBoilerplate(id: string, formData: FormData) {
  if (!configured()) throw new Error("Supabase env vars are not set");

  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const tagsRaw = String(formData.get("tags") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!title) throw new Error("Title is required");
  if (!category) throw new Error("Category is required");
  if (!content) throw new Error("Content is required");

  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const client = adminClient();

  const { data: existing, error: readErr } = await client
    .from("boilerplate")
    .select("version")
    .eq("id", id)
    .maybeSingle();
  if (readErr || !existing) {
    throw new Error("Snippet not found");
  }

  const { error } = await client
    .from("boilerplate")
    .update({
      title,
      category,
      content,
      tags,
      notes: notes || null,
      version: (existing.version ?? 1) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(`Could not update snippet: ${error.message}`);

  revalidatePath("/boilerplate");
  revalidatePath(`/boilerplate/${id}`);
}

export async function deactivateBoilerplate(id: string) {
  if (!configured()) throw new Error("Supabase env vars are not set");
  const client = adminClient();
  const { error } = await client
    .from("boilerplate")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`Could not deactivate: ${error.message}`);
  revalidatePath("/boilerplate");
  revalidatePath(`/boilerplate/${id}`);
}

export async function reactivateBoilerplate(id: string) {
  if (!configured()) throw new Error("Supabase env vars are not set");
  const client = adminClient();
  const { error } = await client
    .from("boilerplate")
    .update({ active: true, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`Could not reactivate: ${error.message}`);
  revalidatePath("/boilerplate");
  revalidatePath(`/boilerplate/${id}`);
}
