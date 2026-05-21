"use client";

import { Bell } from "lucide-react";

/*
  Notification bell, v1 stub.
  The full implementation (noredFarms/reps/src/components/notification-bell.tsx)
  binds to Supabase realtime via server actions on a `notifications` table that
  doesn't exist in the `command` schema yet. We render a quiet, inert bell for
  now so the layout chrome reads complete. Phase 4 (Develop) wires the deadline
  digest into a notifications table and this component graduates to live data.
*/
export function NotificationBell() {
  return (
    <button
      type="button"
      aria-label="Notifications"
      title="Notifications (coming online in phase 4)"
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--ink-dim)] hover:bg-[rgba(245,239,225,0.04)] hover:text-[var(--ink)] transition-colors"
    >
      <Bell className="h-4 w-4" aria-hidden />
    </button>
  );
}
