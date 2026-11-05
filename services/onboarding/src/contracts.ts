export const JOURNEY_NODE_TYPES = [
  "information", "single_choice", "multiple_choice", "short_text", "long_text",
  "email", "phone", "consent", "review", "external_action", "completion",
] as const;

export type JourneyNodeType = (typeof JOURNEY_NODE_TYPES)[number];
export type PredicateOperator = "equals" | "includes" | "exists" | "not";
export type Channel = "web" | "chat" | "sms" | "whatsapp" | "voice" | "email";
export type SubmissionStatus = "new" | "triaged" | "assigned" | "contacted" | "closed";

export type FieldDefinition = {
  key: string;
  label: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  maxLength?: number;
};

export type Predicate = {
  field: string;
  operator: PredicateOperator;
  value?: string | string[] | boolean;
};

export type JourneyNode = {
  id: string;
  type: JourneyNodeType;
  title: string;
  body?: string;
  fields?: FieldDefinition[];
  completionActions?: Array<{ label: string; href: string }>;
};

export type JourneyEdge = {
  from: string;
  to: string;
  when?: Predicate;
};

export type RoutingRule = {
  id: string;
  when: Predicate[];
  priority: "normal" | "high";
  destinationKey: string;
};

export type JourneyDefinition = {
  key: string;
  title: string;
  startNodeId: string;
  nodes: JourneyNode[];
  edges: JourneyEdge[];
  routingRules: RoutingRule[];
  privacyNoticeVersion: string;
};

export type JourneyVersion = {
  id: string;
  journeyKey: string;
  version: number;
  state: "draft" | "published" | "archived";
  definition: JourneyDefinition;
  createdAt: string;
  publishedAt?: string;
};

export type SubmissionEnvelope = {
  siteKey: string;
  journeyKey: string;
  journeyVersion: number;
  channel: Channel;
  entryPoint: string;
  idempotencyKey: string;
  answers: Record<string, string | string[] | boolean | null>;
  privacyNoticeVersion: string;
  communicationConsent: boolean;
  externalThreadId?: string;
};

export type DeliveryAttempt = {
  id: string;
  submissionId: string;
  destinationKey: string;
  kind: "receipt" | "alert" | "reminder" | "webhook";
  status: "queued" | "sending" | "delivered" | "failed";
  attemptCount: number;
  nextAttemptAt: string;
};
