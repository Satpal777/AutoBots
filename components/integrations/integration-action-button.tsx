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
      ? "bg-zinc-950 text-white hover:bg-zinc-800"
      : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50";

  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex min-w-28 justify-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-wait disabled:opacity-60 ${className}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
