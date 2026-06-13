"use client";

import { useFormStatus } from "react-dom";

export function GmailSubmitButton({
  children,
  pendingLabel,
  variant = "primary",
}: {
  children: React.ReactNode;
  pendingLabel: string;
  variant?: "primary" | "secondary" | "quiet";
}) {
  const { pending } = useFormStatus();
  const styles = {
    primary: "bg-forest text-white hover:bg-forest-hover",
    secondary: "bg-gold-soft text-forest hover:bg-gold",
    quiet: "bg-surface-soft text-forest hover:bg-gold-soft",
  } as const;

  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60 ${styles[variant]}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
