"use server";

/*
  Server actions for assistant_runs follow-up. Kept small and scoped to
  the assistant lane so it does not collide with src/lib/grants/actions.ts.

  Only one action so far: mark a run as accepted or rejected from the
  drawer.
*/
import { markAssistantRunAccepted } from "./log";
import { revalidatePath } from "next/cache";
import {
  grantMarkdownPath,
} from "@/lib/grants/paths";
import {
  readGrantFile,
  writeGrantFileAtomic,
  serializeGrant,
  replaceMarkdownSection,
} from "@/lib/grants/markdown";

export async function setAssistantRunAccepted(
  runId: string | null,
  accepted: boolean,
): Promise<void> {
  if (!runId) return;
  await markAssistantRunAccepted(runId, accepted);
}

// Saves a new section into the grant markdown. Used by the assist
// drawer's Accept flow and the RFP modal's Save flow. Mirrors the
// markdown-first contract from src/lib/grants/actions.ts but lives in
// the assistant lane so the file boundary stays clean.
//
// We intentionally do not upsert the Supabase row here. The body change
// does not alter any frontmatter field; the existing updateGrantSection
// path handles the row's checksum and last_synced_at when the next
// frontmatter or section edit fires. Phase 3 will add a reconciler.
export async function writeGrantSectionFromAssistant(
  slug: string,
  sectionHeading: string,
  newContent: string,
): Promise<void> {
  const filePath = grantMarkdownPath(slug);
  const { frontmatter, body } = readGrantFile(filePath);
  const newBody = replaceMarkdownSection(body, sectionHeading, newContent);
  const serialized = serializeGrant(frontmatter, newBody);
  await writeGrantFileAtomic(filePath, serialized);
  revalidatePath(`/grants/${slug}`);
}
