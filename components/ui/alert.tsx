import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const variants = {
  default: "border-line bg-surface text-ink",
  warning: "border-gold/40 bg-gold-soft text-ink",
  destructive: "border-red-700/25 bg-red-700/10 text-red-700",
};

export function Alert({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  variant?: keyof typeof variants;
}) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn("relative w-full rounded-lg border p-4 text-sm", variants[variant], className)}
      {...props}
    />
  );
}
