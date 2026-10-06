import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEntry, nameKey, newToken, hashToken, tokenMatches, publicView } from "../netlify/functions/lib/entry.mjs";
import { SLOTS, SLOT_IDS } from "../netlify/functions/lib/slots.mjs";

test("slots have unique ids and sane time windows", () => {
  assert.equal(SLOT_IDS.size, SLOTS.length);
  for (const s of SLOTS) {
    assert.match(s.start, /^\d{2}:\d{2}$/);
    assert.ok(s.start < s.end, `${s.id} start before end`);
    assert.ok(["in", "out"].includes(s.dir));
    assert.ok(s.riders >= 1);
  }
});

test("nameKey collapses spacing and case", () => {
  assert.equal(nameKey("  Jane   DOE "), "jane doe");
});

test("parseEntry keeps only known slots and yes/maybe answers", () => {
  const r = parseEntry({ name: " Jane  Doe ", slots: { "1007-a": "yes", "1007-b": "no", bogus: "yes", "1010-a": "maybe" }, seats: "4", note: "x".repeat(400) });
  assert.ok(r.ok);
  assert.deepEqual(r.value, { name: "Jane Doe", slots: { "1007-a": "yes", "1010-a": "maybe" }, seats: 4, note: "x".repeat(300) });
});

test("parseEntry rejects missing name and bad seats", () => {
  assert.equal(parseEntry({ name: "   " }).ok, false);
  assert.equal(parseEntry({ name: "J", seats: 0 }).ok, false);
  assert.equal(parseEntry({ name: "J", seats: "lots" }).ok, false);
  assert.equal(parseEntry({ name: "x".repeat(61) }).ok, false);
  assert.equal(parseEntry(null).ok, false);
  assert.equal(parseEntry({ name: "J", seats: "" }).value.seats, null);
});

test("tokens round-trip through the hash and reject mismatches", () => {
  const t = newToken();
  const h = hashToken(t);
  assert.ok(tokenMatches(t, h));
  assert.equal(tokenMatches(newToken(), h), false);
  assert.equal(tokenMatches(undefined, h), false);
  assert.equal(tokenMatches(t, "zz"), false);
});

test("publicView never exposes the token hash", () => {
  const v = publicView("d-1", { name: "J", slots: {}, tokenHash: "secret", updatedAt: "now" });
  assert.equal("tokenHash" in v, false);
  assert.equal(v.id, "d-1");
});
