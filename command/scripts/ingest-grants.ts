#!/usr/bin/env tsx
/*
  HAND Command Center, grant ingest CLI.
  Usage:
    npm run ingest:grants

  Reads every funding/grants/*.md (skipping _-prefixed files), parses
  frontmatter, upserts into command.funders and command.grants. Idempotent.
  Run after migrations are applied, then on demand to pick up edits made
  directly to the markdown files outside the command center.

  Env vars required:
    NEXT_PUBLIC_SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY
*/
import { config as loadEnv } from "dotenv";
import path from "node:path";
import { ingestGrants } from "../src/lib/grants/ingest";

// Load .env.local from the command/ project root.
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  console.log("HAND Command Center, grant ingest");
  console.log("─".repeat(48));
  const summary = await ingestGrants({ verbose: true });

  console.log("─".repeat(48));
  console.log("Summary:");
  console.log(`  scanned         ${summary.scanned}`);
  console.log(`  inserted        ${summary.inserted}`);
  console.log(`  updated         ${summary.updated}`);
  console.log(`  unchanged       ${summary.unchanged}`);
  console.log(`  funders created ${summary.fundersCreated}`);
  console.log(`  funders updated ${summary.fundersUpdated}`);

  if (summary.errors.length) {
    console.log("");
    console.log(`Errors: ${summary.errors.length}`);
    for (const e of summary.errors) {
      console.log(`  ! ${e.file}: ${e.message}`);
    }
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Ingest failed:");
  console.error(err);
  process.exitCode = 1;
});
