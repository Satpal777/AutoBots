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
      ? "product-button-primary"
      : "product-button-secondary";

  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex min-w-28 items-center justify-center px-4 disabled:cursor-wait disabled:opacity-60 ${className}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
