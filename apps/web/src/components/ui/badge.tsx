import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40",
  {
    variants: {
      variant: {
        default: "border-emerald-400/40 bg-emerald-400/15 text-emerald-200",
        muted: "border-white/10 bg-white/5 text-slate-300",
        outline: "border-white/20 text-slate-200",
        success: "border-emerald-400/50 bg-emerald-400/20 text-emerald-100",
        danger: "border-rose-400/50 bg-rose-400/20 text-rose-100",
        info: "border-emerald-400/40 bg-emerald-400/15 text-emerald-100",
        scarlet: "border-red-400/50 bg-red-400/20 text-red-100",
      },
    },
    defaultVariants: {
      variant: "muted",
    },
  },
);

/**
 * Badge component for status and labels.
 */
function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return (
    <div
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
