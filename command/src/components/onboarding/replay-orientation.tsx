"use client";

import { useRouter } from "next/navigation";
import { Compass } from "lucide-react";
import { ONBOARDING_FLAG } from "@/lib/onboarding/journeys";

/*
  Clears the first-run flag and sends the operator back to the dashboard, where
  the role-aware onboarding re-runs. Lives in Settings → Build. See
  docs/ONBOARDING.md.
*/
export function ReplayOrientation() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        try {
          localStorage.removeItem(ONBOARDING_FLAG);
        } catch {
          /* ignore */
        }
        router.push("/dashboard");
      }}
      className="inline-flex items-center gap-1.5 text-xs text-[var(--ink-dim)] hover:text-[var(--amber-soft)]"
    >
      <Compass className="h-3 w-3" aria-hidden />
      Replay orientation
    </button>
  );
}
