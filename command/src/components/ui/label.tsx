import * as React from "react";

import { cn } from "@/lib/utils";

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "text-xs font-medium uppercase tracking-[0.18em] text-[var(--ink-dim)] font-mono",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
