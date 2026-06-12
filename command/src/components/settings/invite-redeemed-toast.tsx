"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

/*
  Fires a one-shot success toast when the dashboard is reached with ?invited=1
  (set by the invite-redemption redirect), then strips the param from the URL so
  a refresh doesn't re-toast. Renders nothing.
*/
export function InviteRedeemedToast() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (searchParams.get("invited") !== "1") return;
    fired.current = true;
    toast.success("Invite accepted — welcome to the Command Center");
    router.replace(pathname);
  }, [searchParams, pathname, router]);

  return null;
}
