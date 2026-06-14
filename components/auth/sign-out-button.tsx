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
      className={`inline-flex items-center justify-center px-3 disabled:cursor-not-allowed disabled:opacity-60 ${
        variant === "inverse"
          ? "product-button-secondary w-full border-white/15 bg-white/8 text-white hover:bg-white/12"
          : "product-button-secondary w-full"
      }`}
    >
      {isPending ? "Signing out..." : "Sign out"}
    </button>
  );
}
