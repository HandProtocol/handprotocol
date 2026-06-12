import type { CommandRole } from "@/lib/supabase/profile";

/*
  Per-role first-run onboarding content. See docs/ONBOARDING.md.

  Pure data + a resolver — safe to import from server or client. Icons are
  string keys (mapped to lucide-react in the client overlay) so a Journey stays
  serializable and can cross the server→client boundary.

  Each role gets: a boot stage name (the personalized "INITIALIZING ·" line),
  an identity line (who you are here), a pillar (the one thing you own), a small
  map of the surfaces that matter to that role, and a single first move that
  blooms into the operator's highest-value first action.
*/

export const ONBOARDING_FLAG = "hand_cc_onboarded_v1";

export type MapTile = {
  label: string;
  sub: string;
  href: string;
  icon: IconKey;
};

export type IconKey =
  | "inbox"
  | "scroll"
  | "calendar"
  | "library"
  | "users"
  | "rocket"
  | "megaphone"
  | "target"
  | "message"
  | "eye"
  | "compass";

export type Journey = {
  /** Personalized stage name, e.g. "COMMANDER" or "MYSTIC HEARTS VIEW". */
  stage: string;
  /** letterCycle states for the boot eyebrow before it settles. */
  boot: string[];
  /** Beat 1 — who you are here. */
  identity: string;
  /** Beat 2 — the one thing you own. */
  pillar: string;
  /** Beat 3 — the surfaces that matter to this role. */
  map: MapTile[];
  /** Beat 4 — the single highest-value first action. */
  firstMove: { label: string; href: string };
};

export function greetName(displayName?: string | null): string {
  const n = (displayName ?? "").trim();
  if (!n) return "operator";
  return n.split(/\s+/)[0];
}

function groupStage(group?: string | null): string {
  const g = (group ?? "").trim();
  if (!g) return "FIELD VIEW";
  return `${g.replace(/[-_]+/g, " ").toUpperCase()} VIEW`;
}

export function journeyFor(
  role: CommandRole,
  ctx: { displayName?: string | null; group?: string | null } = {},
): Journey {
  switch (role) {
    case "admin":
      return {
        stage: "COMMANDER",
        boot: ["INITIALIZING", "CALIBRATING", "COMMANDER"],
        identity:
          "You hold the whole board — every pillar, the team, and the gate that decides who gets in.",
        pillar:
          "Keep the team moving. You approve who joins and what each person can touch.",
        map: [
          { label: "Review queue", sub: "Approve who gets in", href: "/settings", icon: "inbox" },
          { label: "Grants", sub: "The money-in pipeline", href: "/grants", icon: "scroll" },
          { label: "Develop", sub: "Business outreach", href: "/develop", icon: "rocket" },
          { label: "Inspector", sub: "What the team flagged", href: "/inspector", icon: "target" },
        ],
        firstMove: { label: "Open the team & review queue", href: "/settings" },
      };

    case "funding_lead":
      return {
        stage: "FUNDING LEAD",
        boot: ["INITIALIZING", "CALIBRATING", "FUNDING LEAD"],
        identity:
          "You own money-in — grants, funders, deadlines, and the boilerplate library the whole team writes from.",
        pillar:
          "Run the grants pipeline end to end. Never let a deadline pass unseen.",
        map: [
          { label: "Grants", sub: "Pipeline, discovery → awarded", href: "/grants", icon: "scroll" },
          { label: "Deadlines", sub: "What's due, soonest first", href: "/deadlines", icon: "calendar" },
          { label: "Funders", sub: "The curated library", href: "/funders", icon: "library" },
          { label: "Boilerplate", sub: "Reusable answer blocks", href: "/boilerplate", icon: "library" },
        ],
        firstMove: { label: "Open the grants pipeline", href: "/grants" },
      };

    case "develop_rep":
      return {
        stage: "DEVELOP REP",
        boot: ["INITIALIZING", "CALIBRATING", "DEVELOP REP"],
        identity:
          "You run business outreach — local businesses get a free demo site and a pitch, and 33% of what they give flows to the HAND pool.",
        pillar:
          "Work the lead pipeline: lead → demo → pitch → touchpoint. Every win feeds the pool.",
        map: [
          { label: "Develop", sub: "Your lead pipeline", href: "/develop", icon: "rocket" },
          { label: "Pitch scripts", sub: "What to say on the call", href: "/develop/scripts", icon: "megaphone" },
          { label: "Grants", sub: "Context, read-only", href: "/grants", icon: "scroll" },
        ],
        firstMove: { label: "Open your leads", href: "/develop" },
      };

    case "contributor":
      return {
        stage: "CONTRIBUTOR",
        boot: ["INITIALIZING", "CALIBRATING", "CONTRIBUTOR"],
        identity:
          "You can see all the work and shape it — read everything, leave comments and suggestions anywhere.",
        pillar: "Be the extra set of eyes. Your notes move the work forward.",
        map: [
          { label: "Grants", sub: "The pipeline", href: "/grants", icon: "scroll" },
          { label: "Funders", sub: "Who funds what", href: "/funders", icon: "library" },
          { label: "Develop", sub: "Business outreach", href: "/develop", icon: "rocket" },
        ],
        firstMove: { label: "Browse the grants pipeline", href: "/grants" },
      };

    case "viewer":
    default:
      return {
        stage: groupStage(ctx.group),
        boot: ["INITIALIZING", "SCOPING", groupStage(ctx.group)],
        identity: ctx.group
          ? `You see ${ctx.group.replace(/[-_]+/g, " ")}'s slice of the work — scoped to your community.`
          : "You see your community's slice of the work — scoped, read-only.",
        pillar: "Stay in the loop on what touches your community.",
        map: [
          { label: "Grants", sub: "Scoped to you", href: "/grants", icon: "scroll" },
          { label: "Funders", sub: "Who funds what", href: "/funders", icon: "library" },
          { label: "Develop", sub: "Outreach in motion", href: "/develop", icon: "rocket" },
        ],
        firstMove: { label: "See what's relevant", href: "/dashboard" },
      };
  }
}
