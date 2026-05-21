import * as React from "react";

import { cn } from "@/lib/utils";

/*
  HUD-dark input. Plain HTML input element styled with tokens. We avoid the
  base-ui primitive here so server-rendered forms (auth login) work without
  hydration boundary noise.
*/
function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      className={cn(
        "flex h-9 w-full rounded-md border border-[rgba(245,239,225,0.12)] bg-[rgba(12,18,32,0.5)] px-3 py-1 text-sm text-[var(--ink)] placeholder:text-[var(--ink-faint)] outline-none transition-colors",
        "focus-visible:border-[var(--amber-soft)] focus-visible:shadow-[0_0_10px_var(--amber-glow)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
