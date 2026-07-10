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
  Mail,
  MapPin,
  Radio,
  Settings,
  UsersRound,
} from "lucide-react";

/*
  Single source of truth for the Command Center primary nav. Consumed by
  both the desktop SidebarNav and the mobile rail/drawer so the two never
  drift. The visible label is intentionally plain; hrefs can keep legacy route
  names while the interface reads like an operating desk.
*/

export type NavItem = {
  label: string;
  href: string;
  icon: ElementType;
  meta: string;
};

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutGrid, meta: "Home" },
  { label: "Grants", href: "/grants", icon: FileText, meta: "Funding" },
  { label: "Deadlines", href: "/deadlines", icon: CalendarClock, meta: "Due" },
  { label: "Funders", href: "/funders", icon: Users, meta: "Network" },
  { label: "Inbox", href: "/inbox", icon: Inbox, meta: "Capture" },
  { label: "Projects", href: "/projects", icon: Building2, meta: "Work" },
  { label: "Reciprocates", href: "/reciprocates", icon: UsersRound, meta: "Groups" },
  { label: "Feedback", href: "/feedback", icon: MapPin, meta: "Triage" },
  { label: "Site activity", href: "/public", icon: Radio, meta: "Signals" },
  { label: "Page review", href: "/review", icon: Crosshair, meta: "Review" },
  { label: "Templates", href: "/templates", icon: BookOpen, meta: "Copy" },
  { label: "Resend", href: "/resend", icon: Mail, meta: "Email" },
  { label: "Settings", href: "/settings", icon: Settings, meta: "Admin" },
];

// Dashboard matches exactly; everything else matches on prefix so detail
// routes (e.g. /grants/<slug>) keep their parent tab active.
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}
