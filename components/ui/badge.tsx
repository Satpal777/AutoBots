import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const variants = {
  default: "bg-[var(--forest-solid)] text-white",
  secondary: "bg-surface-soft text-forest",
  success: "bg-success-soft text-success",
  warning: "bg-gold-soft text-forest",
  destructive: "bg-red-700/10 text-red-700",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  variant?: keyof typeof variants;
}) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex min-h-6 items-center justify-center rounded-full px-2.5 text-xs font-semibold",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
