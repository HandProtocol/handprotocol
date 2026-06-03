/*
  UX Inspector / feedback-pin types.
  Mirror of command.feedback_pins (migration 015). The inspector route
  writes these via server actions; the /pins kanban reads and triages
  them.
*/

export const PIN_STATUSES = ["open", "in-progress", "resolved"] as const;
export type PinStatus = (typeof PIN_STATUSES)[number];

export const PIN_PRIORITIES = ["low", "normal", "high", "critical"] as const;
export type PinPriority = (typeof PIN_PRIORITIES)[number];

export const PIN_STATUS_LABELS: Record<PinStatus, string> = {
  open: "Open",
  "in-progress": "In progress",
  resolved: "Resolved",
};

export type PinBoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PinThreadEntry = {
  author: string;
  text: string;
  time: string;
};

export type PinElementContext = {
  styles?: Record<string, string>;
  parents?: string[];
};

export type FeedbackPin = {
  id: string;
  created_at: string;
  updated_at: string;
  page_url: string;
  page_title: string | null;
  selector_primary: string;
  selector_fallback: string[] | null;
  element_tag: string | null;
  element_classes: string[] | null;
  element_text: string | null;
  bounding_box: PinBoundingBox | null;
  comment: string;
  priority: PinPriority;
  status: PinStatus;
  author_id: string | null;
  author_email: string | null;
  author_name: string | null;
  thread: PinThreadEntry[];
  element_context: PinElementContext | null;
  css_overrides: Record<string, string>;
  screenshot_url: string | null;
  viewport_width: number | null;
};

// Inspector page catalogue. The select in the inspector toolbar reads
// from this list; the kanban filters off it. Slugs match the directory
// structure of /home/koh/Documents/handprotocol/web/, with trailing slashes
// where the public site serves an index.html.
export type InspectorPage = {
  /** Path served by handprotocol.org, e.g. "/foundation-campaign/". */
  path: string;
  label: string;
  group: string;
};

export const INSPECTOR_PAGES: InspectorPage[] = [
  { path: "/", label: "Landing", group: "Primary" },
  { path: "/foundation-campaign/", label: "Foundation Campaign", group: "Primary" },
  { path: "/governance/", label: "Governance", group: "Primary" },
  { path: "/grants/", label: "Grants", group: "Primary" },
  { path: "/audio/", label: "Audio", group: "Primary" },
  { path: "/reciprocates/", label: "Reciprocates", group: "Primary" },
  { path: "/sovereign-reciprocates/", label: "Sovereign Reciprocates", group: "Primary" },
  { path: "/donate-crypto/", label: "Donate (crypto)", group: "Primary" },

  { path: "/fiscal/", label: "Fiscal", group: "Foundation" },
  { path: "/fiscal/decision/", label: "Fiscal Sponsor Decision", group: "Foundation" },

  { path: "/mystichearts/airstreamstudio/", label: "Mystic Hearts — Airstream", group: "Mystic Hearts" },
  { path: "/mystichearts/brief/", label: "Mystic Hearts — Brief", group: "Mystic Hearts" },

  { path: "/mosquitos/", label: "Mosquitos — Bucket of Doom", group: "Land" },
  { path: "/reimagineranch/compost-latrine/", label: "Reimagine Ranch — Compost Latrine", group: "Land" },

  { path: "/discovery/", label: "Discovery", group: "Research" },
  { path: "/discovery/impact-org-landscape.html", label: "Impact org landscape", group: "Research" },
  { path: "/discovery/skill-exchange-models.html", label: "Skill exchange models", group: "Research" },
  { path: "/discovery/skill-exchange-vision.html", label: "Skill exchange vision", group: "Research" },

  { path: "/legacy/", label: "Legacy Archive", group: "Misc" },
  { path: "/404.html", label: "404 (parallax)", group: "Misc" },
];

export function findInspectorPage(path: string): InspectorPage | null {
  return INSPECTOR_PAGES.find((p) => p.path === path) ?? null;
}
