/*
  Boilerplate library types. Mirrors command.boilerplate (migration 006).
*/

export const BOILERPLATE_CATEGORIES = [
  "mission",
  "theory_of_change",
  "team",
  "governance",
  "finance",
  "ai",
  "foundation",
  "voice",
] as const;

export type BoilerplateCategory = (typeof BOILERPLATE_CATEGORIES)[number];

export type BoilerplateRecord = {
  id: string;
  slug: string;
  category: string;
  title: string;
  content: string;
  word_count: number | null;
  version: number;
  active: boolean;
  tags: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export const CATEGORY_LABELS: Record<string, string> = {
  mission: "Mission",
  theory_of_change: "Theory of change",
  team: "Team",
  governance: "Governance",
  finance: "Finance",
  ai: "Sovereign Reciprocates",
  foundation: "Foundation campaign",
  voice: "Voice",
};
