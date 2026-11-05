import type { JourneyDefinition, Predicate, RoutingRule } from "./contracts.ts";

export type Answers = Record<string, string | string[] | boolean | null | undefined>;

export function matchesPredicate(predicate: Predicate, answers: Answers): boolean {
  const actual = answers[predicate.field];
  if (predicate.operator === "exists") return actual !== undefined && actual !== null && actual !== "";
  if (predicate.operator === "not") return !matchesPredicate({ ...predicate, operator: "equals" }, answers);
  if (predicate.operator === "equals") return actual === predicate.value;
  if (predicate.operator === "includes") {
    return Array.isArray(actual)
      ? actual.some((value) => Array.isArray(predicate.value) ? predicate.value.includes(value) : value === predicate.value)
      : Array.isArray(predicate.value) ? predicate.value.includes(String(actual)) : actual === predicate.value;
  }
  return false;
}

export function selectRoute(rules: RoutingRule[], answers: Answers): RoutingRule | undefined {
  return rules.find((rule) => rule.when.every((predicate) => matchesPredicate(predicate, answers)));
}

export function validateJourney(definition: JourneyDefinition): string[] {
  const issues: string[] = [];
  const nodes = new Map(definition.nodes.map((node) => [node.id, node]));
  if (!nodes.has(definition.startNodeId)) issues.push("Start node does not exist.");
  for (const edge of definition.edges) {
    if (!nodes.has(edge.from)) issues.push(`Edge source does not exist: ${edge.from}.`);
    if (!nodes.has(edge.to)) issues.push(`Edge destination does not exist: ${edge.to}.`);
    if (edge.when && !definition.nodes.some((node) => node.fields?.some((field) => field.key === edge.when?.field))) {
      issues.push(`Edge references an unknown field: ${edge.when.field}.`);
    }
  }
  const visited = new Set<string>();
  const visit = (id: string) => {
    if (visited.has(id)) return;
    visited.add(id);
    definition.edges.filter((edge) => edge.from === id).forEach((edge) => visit(edge.to));
  };
  if (nodes.has(definition.startNodeId)) visit(definition.startNodeId);
  definition.nodes.filter((node) => !visited.has(node.id)).forEach((node) => issues.push(`Unreachable node: ${node.id}.`));
  definition.nodes.filter((node) => node.type !== "completion" && node.type !== "external_action")
    .filter((node) => !definition.edges.some((edge) => edge.from === node.id))
    .forEach((node) => issues.push(`Dead end: ${node.id}.`));
  if (!definition.nodes.some((node) => node.type === "consent")) issues.push("A consent node is required before publish.");
  return issues;
}

export function cloneAsNextDraft(version: { version: number; definition: JourneyDefinition }, now: string) {
  return { version: version.version + 1, state: "draft" as const, definition: structuredClone(version.definition), createdAt: now };
}
