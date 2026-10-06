import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { SLOT_IDS } from "./slots.mjs";

export const MAX_NAME = 60;
export const MAX_NOTE = 300;
export const ANSWERS = new Set(["yes", "maybe"]);

// "  Jane   Doe " -> "jane doe": one entry per name, regardless of spacing or case.
export const nameKey = (name) => name.trim().replace(/\s+/g, " ").toLowerCase();

export const newToken = () => randomBytes(24).toString("base64url");
export const hashToken = (token) => createHash("sha256").update(String(token)).digest("hex");

export function tokenMatches(token, hash) {
  if (typeof token !== "string" || typeof hash !== "string") return false;
  const a = Buffer.from(hashToken(token), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

// Validate a driver's submission. Returns { ok, value } or { ok: false, error }.
export function parseEntry(body) {
  if (!body || typeof body !== "object") return { ok: false, error: "Send your name and the runs you can drive." };
  const name = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
  if (!name) return { ok: false, error: "Add your name so the team knows who's driving." };
  if (name.length > MAX_NAME) return { ok: false, error: `Keep your name under ${MAX_NAME} characters.` };

  const slots = {};
  const raw = body.slots && typeof body.slots === "object" ? body.slots : {};
  for (const [id, v] of Object.entries(raw)) {
    if (SLOT_IDS.has(id) && ANSWERS.has(v)) slots[id] = v;
  }

  let seats = null;
  if (body.seats !== null && body.seats !== undefined && body.seats !== "") {
    const n = Number(body.seats);
    if (!Number.isInteger(n) || n < 1 || n > 12) return { ok: false, error: "Rider seats should be a number from 1 to 12." };
    seats = n;
  }

  const note = typeof body.note === "string" ? body.note.trim().slice(0, MAX_NOTE) : "";
  return { ok: true, value: { name, slots, seats, note } };
}

// What the public page gets back for one driver: never the token hash.
export const publicView = (key, rec) => ({
  id: key,
  name: rec.name,
  slots: rec.slots || {},
  seats: rec.seats ?? null,
  note: rec.note || "",
  updatedAt: rec.updatedAt,
});
