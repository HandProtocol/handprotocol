import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/*
  HUD-dark button. Vocabulary maps to PRD section 5:
  - primary: amber fill with soft glow on hover
  - secondary (outline): amber outline on dark
  - ghost: ink-dim text only
  - destructive: warning red outline, never solid
*/
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-transparent text-sm font-medium whitespace-nowrap transition-all outline-none disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 ring-amber",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--amber)] text-[#1a1208] hover:bg-[var(--amber-soft)] hover:shadow-[0_0_14px_var(--amber-glow)]",
        outline:
          "border-[rgba(217,119,6,0.45)] bg-transparent text-[var(--amber-soft)] hover:bg-[rgba(217,119,6,0.08)]",
        ghost:
          "bg-transparent text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[rgba(245,239,225,0.04)]",
        destructive:
          "border-[rgba(220,38,38,0.55)] bg-transparent text-[#fda4a4] hover:bg-[rgba(220,38,38,0.08)]",
      },
      size: {
        sm: "h-7 px-2.5 text-xs",
        md: "h-9 px-3.5",
        lg: "h-10 px-4 text-base",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

function Button({
  className,
  variant,
  size,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
