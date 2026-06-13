"use client";

import { useState } from "react";

import { authClient } from "@/lib/auth/client";

export function SignOutButton({
  variant = "default",
}: {
  variant?: "default" | "inverse";
}) {
  const [isPending, setIsPending] = useState(false);

  async function signOut() {
    setIsPending(true);

    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.assign("/sign-in");
        },
      },
    });

    setIsPending(false);
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={isPending}
      className={`inline-flex min-h-10 items-center justify-center rounded-xl px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
        variant === "inverse"
          ? "w-full bg-white/8 text-white/70 hover:bg-white/12 hover:text-white"
          : "bg-surface-soft text-forest hover:bg-gold-soft"
      }`}
    >
      {isPending ? "Signing out..." : "Sign out"}
    </button>
  );
}
