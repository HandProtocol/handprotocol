import assert from "node:assert/strict";
import test from "node:test";
import { cloneAsNextDraft, matchesPredicate, selectRoute, validateJourney } from "./engine.ts";
import type { JourneyDefinition } from "./contracts.ts";

const journey: JourneyDefinition = {
  key: "hand-start", title: "Start with HAND", startNodeId: "start", privacyNoticeVersion: "2026-07-28",
  nodes: [
    { id: "start", type: "single_choice", title: "What brings you to HAND?", fields: [{ key: "path", label: "Path" }] },
    { id: "consent", type: "consent", title: "Privacy", fields: [{ key: "privacy", label: "Privacy", required: true }] },
    { id: "done", type: "completion", title: "Received" },
  ],
  edges: [{ from: "start", to: "consent" }, { from: "consent", to: "done" }],
  routingRules: [{ id: "support", when: [{ field: "path", operator: "equals", value: "support" }], priority: "high", destinationKey: "reciprocates" }],
};

test("allowlisted predicates remain deterministic", () => {
  assert.equal(matchesPredicate({ field: "path", operator: "equals", value: "support" }, { path: "support" }), true);
  assert.equal(matchesPredicate({ field: "skills", operator: "includes", value: "design" }, { skills: ["design", "web"] }), true);
  assert.equal(matchesPredicate({ field: "phone", operator: "exists" }, { phone: "" }), false);
  assert.equal(matchesPredicate({ field: "path", operator: "not", value: "support" }, { path: "fund" }), true);
});

test("routing chooses the first matching rule", () => {
  assert.equal(selectRoute(journey.routingRules, { path: "support" })?.destinationKey, "reciprocates");
  assert.equal(selectRoute(journey.routingRules, { path: "partner" }), undefined);
});

test("publication validation detects invalid graph shapes", () => {
  assert.deepEqual(validateJourney(journey), []);
  assert.match(validateJourney({ ...journey, startNodeId: "missing" }).join(" "), /Start node/);
  assert.match(validateJourney({ ...journey, nodes: journey.nodes.filter((node) => node.id !== "consent") }).join(" "), /consent/i);
});

test("restoring creates a new draft version without altering history", () => {
  const next = cloneAsNextDraft({ version: 4, definition: journey }, "2026-07-28T00:00:00.000Z");
  assert.equal(next.version, 5);
  next.definition.title = "Changed";
  assert.equal(journey.title, "Start with HAND");
});
