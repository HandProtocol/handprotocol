/*
  registry-merge: fold checked-place NDJSON (discover-leads → check-websites
  output) into the canonical registry at biz/_registry/checked-places.ndjson,
  so bulk discovery batches stop losing their results in /tmp.

    npx tsx scripts/registry-merge.mts <checked.ndjson> [more.ndjson ...] [--date=YYYY-MM-DD]

  Keyed by the place feature id (the 0x..:0x.. inside href), falling back to
  the lowercased name. Newest data wins per place (compared on checked_at);
  fields missing from the newer row keep their older value. --date stamps
  checked_at on the incoming rows (default: today). Prints total/new/updated.
  discover-leads --skip-known reads this registry to avoid re-checking places.
*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const argv = process.argv.slice(2);
const files = argv.filter((a) => !a.startsWith("--"));
const flag = (name: string, dflt = ""): string => {
  const a = argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split("=").slice(1).join("=") : dflt;
};
if (!files.length) {
  console.error("usage: npx tsx scripts/registry-merge.mts <checked.ndjson> [more.ndjson ...] [--date=YYYY-MM-DD]");
  process.exit(1);
}
const checkedAt = flag("date", new Date().toISOString().slice(0, 10));
if (!/^\d{4}-\d{2}-\d{2}$/.test(checkedAt)) {
  console.error(`--date must be YYYY-MM-DD, got "${checkedAt}"`);
  process.exit(1);
}

// Repo-relative registry path (this file lives at command/scripts/).
const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
const registryPath = path.join(repoRoot, "biz", "_registry", "checked-places.ndjson");

// The fields a registry row carries (everything else from the batch is noise).
const KEPT_FIELDS = [
  "name", "href", "category", "website_status", "website_url", "phone",
  "address", "rating", "p_rating", "reviews", "p_reviews", "lat", "lng",
] as const;

type Row = Record<string, unknown>;

function placeKey(row: Row): string {
  const m = String(row.href || "").match(/0x[0-9a-f]+:0x[0-9a-f]+/i);
  if (m) return m[0].toLowerCase();
  return String(row.name || "").trim().toLowerCase();
}

function readNdjson(file: string): Row[] {
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as Row);
}

const registry = new Map<string, Row>();
if (fs.existsSync(registryPath)) {
  for (const row of readNdjson(registryPath)) registry.set(placeKey(row), row);
}
const before = registry.size;

let added = 0;
let updated = 0;
for (const file of files) {
  for (const row of readNdjson(file)) {
    const key = placeKey(row);
    if (!key) continue; // no feature id and no name — nothing to key on
    const incoming: Row = { checked_at: checkedAt };
    for (const f of KEPT_FIELDS) {
      if (row[f] !== undefined && row[f] !== null && row[f] !== "") incoming[f] = row[f];
    }
    const prev = registry.get(key);
    if (!prev) {
      registry.set(key, incoming);
      added += 1;
      continue;
    }
    if (String(incoming.checked_at) < String(prev.checked_at || "")) continue; // older data never wins
    const merged = { ...prev, ...incoming };
    if (JSON.stringify(merged) !== JSON.stringify(prev)) {
      registry.set(key, merged);
      updated += 1;
    }
  }
}

fs.mkdirSync(path.dirname(registryPath), { recursive: true });
fs.writeFileSync(
  registryPath,
  [...registry.values()].map((r) => JSON.stringify(r)).join("\n") + "\n",
);
console.log(`registry: ${registry.size} places (${before} before) — ${added} new, ${updated} updated`);
