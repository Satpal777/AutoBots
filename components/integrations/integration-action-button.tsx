"use client";

import { useFormStatus } from "react-dom";

type IntegrationActionButtonProps = {
  children: React.ReactNode;
  pendingLabel: string;
  variant?: "primary" | "secondary";
};

export function IntegrationActionButton({
  children,
  pendingLabel,
  variant = "primary",
}: IntegrationActionButtonProps) {
  const { pending } = useFormStatus();
  const className =
    variant === "primary"
      ? "bg-forest text-white hover:bg-forest-hover"
      : "bg-surface-soft text-forest hover:bg-gold-soft";

  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex min-h-10 min-w-28 items-center justify-center rounded-xl px-4 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60 ${className}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
