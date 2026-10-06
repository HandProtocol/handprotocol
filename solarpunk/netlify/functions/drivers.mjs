import { getStore } from "@netlify/blobs";
import { createHash, timingSafeEqual } from "node:crypto";
import { SLOTS } from "./lib/slots.mjs";
import { parseEntry, nameKey, newToken, hashToken, tokenMatches, publicView } from "./lib/entry.mjs";

const MAX_DRIVERS = 300;
const MAX_BODY_BYTES = 8_000;

const json = (status, data) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const keyFor = (name) => "d-" + createHash("sha256").update(nameKey(name)).digest("hex").slice(0, 20);

async function readBody(req) {
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) return null;
  try { return JSON.parse(text); } catch { return null; }
}

async function listDrivers(store) {
  const { blobs } = await store.list();
  const recs = await Promise.all(blobs.map(async ({ key }) => [key, await store.get(key, { type: "json" })]));
  return recs.filter(([, r]) => r).map(([k, r]) => publicView(k, r)).sort((a, b) => a.name.localeCompare(b.name));
}

// Access code lives in the SPS_ACCESS_CODE env var, never in the repo.
function codeOk(req) {
  const want = process.env.SPS_ACCESS_CODE || "";
  const got = req.headers.get("x-sps-code") || "";
  if (!want) return false;
  const a = Buffer.from(want), b = Buffer.from(got);
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async (req) => {
  if (!codeOk(req)) return json(401, { error: "That access code isn't right. Ask the transport team for the code." });
  const store = getStore({ name: "sps-drivers", consistency: "strong" });

  try {
    if (req.method === "GET") {
      return json(200, { slots: SLOTS, drivers: await listDrivers(store) });
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      if (!body) return json(400, { error: "That request didn't come through. Reload the page and try again." });
      if (body.website) return json(200, { ok: true }); // honeypot: bots fill every field
      const parsed = parseEntry(body);
      if (!parsed.ok) return json(400, { error: parsed.error });
      const { name, slots, seats, note } = parsed.value;

      const key = keyFor(name);
      const existing = await store.get(key, { type: "json" });
      const prevKey = typeof body.id === "string" && /^d-[0-9a-f]{20}$/.test(body.id) ? body.id : null;

      if (existing && !tokenMatches(body.token, existing.tokenHash)) {
        return json(409, { error: `"${existing.name}" already has an entry. Open this page on the phone or computer you used before, or add your last initial.` });
      }

      // Renaming from this device: carry the token over and drop the old entry.
      let tokenHash = existing?.tokenHash;
      let token = null;
      if (!existing) {
        if (prevKey && prevKey !== key) {
          const prev = await store.get(prevKey, { type: "json" });
          if (prev && tokenMatches(body.token, prev.tokenHash)) {
            tokenHash = prev.tokenHash;
            await store.delete(prevKey);
          }
        }
        if (!tokenHash) {
          const { blobs } = await store.list();
          if (blobs.length >= MAX_DRIVERS) return json(429, { error: "The sign-up list is full. Email Koh at cryptokoh@gmail.com." });
          token = newToken();
          tokenHash = hashToken(token);
        }
      }

      const rec = { name, slots, seats, note, tokenHash, createdAt: existing?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
      await store.setJSON(key, rec);
      return json(200, { ok: true, driver: publicView(key, rec), ...(token ? { token } : {}) });
    }

    if (req.method === "DELETE") {
      const body = await readBody(req);
      const id = body && typeof body.id === "string" && /^d-[0-9a-f]{20}$/.test(body.id) ? body.id : null;
      if (!id) return json(400, { error: "Nothing to remove." });
      const rec = await store.get(id, { type: "json" });
      if (!rec) return json(200, { ok: true });
      if (!tokenMatches(body.token, rec.tokenHash)) return json(403, { error: "You can only remove your own entry, from the device you signed up on." });
      await store.delete(id);
      return json(200, { ok: true });
    }

    return json(405, { error: "Method not allowed." });
  } catch (err) {
    console.error("drivers fn failed", req.method, err);
    return json(500, { error: "Something went wrong saving. Try again in a minute." });
  }
};

export const config = { path: "/api/drivers" };
