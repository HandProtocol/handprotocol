import type { ElementType } from "react";
import {
  LayoutGrid,
  FileText,
  Inbox,
  Users,
  BookOpen,
  Building2,
  CalendarClock,
  Crosshair,
  MapPin,
  Settings,
} from "lucide-react";

/*
  Single source of truth for the Command Center primary nav. Consumed by
  both the desktop SidebarNav and the mobile rail/drawer so the two never
  drift. Entries map to the H-A-N-D pillars (pillar tag is H, A, N, D, or a
  centered dot for Settings).
*/

export type NavItem = {
  label: string;
  href: string;
  icon: ElementType;
  pillar: string;
};

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutGrid, pillar: "H" },
  { label: "Grants", href: "/grants", icon: FileText, pillar: "H" },
  { label: "Inbox", href: "/inbox", icon: Inbox, pillar: "H" },
  { label: "Funders", href: "/funders", icon: Users, pillar: "N" },
  { label: "Boilerplate", href: "/boilerplate", icon: BookOpen, pillar: "A" },
  { label: "Develop", href: "/develop", icon: Building2, pillar: "D" },
  { label: "Deadlines", href: "/deadlines", icon: CalendarClock, pillar: "D" },
  { label: "Inspector", href: "/inspector", icon: Crosshair, pillar: "D" },
  { label: "Pins", href: "/pins", icon: MapPin, pillar: "D" },
  { label: "Settings", href: "/settings", icon: Settings, pillar: "·" },
];

// Dashboard matches exactly; everything else matches on prefix so detail
// routes (e.g. /grants/<slug>) keep their parent tab active.
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}
