"use client";

import { LoaderCircle, LogOut } from "lucide-react";
import { useState } from "react";

import { authClient } from "@/lib/auth/client";

export function SignOutButton({
  variant = "default",
  compact = false,
}: {
  variant?: "default" | "inverse";
  compact?: boolean;
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
      aria-label="Sign out"
      title="Sign out"
      className={`inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60 ${
        compact ? "size-10 px-0" : "w-full px-3"
      } ${
        variant === "inverse"
          ? "product-button-secondary border-white/15 bg-white/8 text-white hover:bg-white/12"
          : "product-button-secondary"
      }`}
    >
      {compact ? (
        isPending
          ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          : <LogOut aria-hidden="true" className="size-4" />
      ) : isPending ? "Signing out..." : "Sign out"}
    </button>
  );
}
