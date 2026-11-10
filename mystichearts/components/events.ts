// Gatherings that have their own page on this site. Kohsi lists the gathering (it glows on the
// calendar and shows in Happening soon); a gathering named here opens its page instead of
// Kohsi's request form, and the page sends people to the host's own ticketing (Partiful for now).
// Match by title so the same entry works against a local Kohsi and production.

export type EventPage = {
  slug: string;
  href: string;
  match: RegExp;
};

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const FAIRY_BALL = {
  slug: "fairy-ball",
  title: "The 1111 Immaculate Fairy Ball",
  dateLine: "Wednesday, November 11, 2026",
  shortDate: { month: "Nov", day: "11", weekday: "Wed" },
  tagline: "A high vibe bass-ecstatic dance party with Yawéi & Friends.",
  motto: "Where bass meets cosplay.",
  features: ["Conscious bass DJs", "Flow arts", "Sound healing", "Cacao", "Costumes encouraged"],
  presenters: "A Basstatic event series by Yawéi, with Star Seed Family Foundation and Mystic Hearts Healing Collective.",
  // The Partiful event page. Empty until the host shares it: the ticket button then says so.
  partifulUrl: process.env.NEXT_PUBLIC_FAIRY_BALL_PARTIFUL_URL || "",
  poster: `${basePath}/assets/images/fairy-ball-poster.jpg`,
  waiverHref: `${basePath}/waiver/`,
} as const;

export const EVENT_PAGES: readonly EventPage[] = [{ slug: FAIRY_BALL.slug, href: `${basePath}/fairy-ball/`, match: /fairy\s*ball/i }];

export function eventPageFor(title: string | null | undefined): string | null {
  if (!title) return null;
  return EVENT_PAGES.find((page) => page.match.test(title))?.href ?? null;
}
