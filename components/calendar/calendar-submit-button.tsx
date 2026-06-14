"use client";

import { useFormStatus } from "react-dom";

export function CalendarSubmitButton({
  children,
  pendingLabel,
  variant = "primary",
}: {
  children: React.ReactNode;
  pendingLabel: string;
  variant?: "primary" | "quiet";
}) {
  const { pending } = useFormStatus();
  const styles = {
    primary: "product-button-primary",
    quiet: "product-button-secondary",
  } as const;

  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex items-center justify-center gap-2 px-4 disabled:cursor-wait disabled:opacity-60 ${styles[variant]}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
