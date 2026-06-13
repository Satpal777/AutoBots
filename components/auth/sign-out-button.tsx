"use client";

import { useState } from "react";

import { authClient } from "@/lib/auth/client";

export function SignOutButton() {
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
      className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isPending ? "Signing out..." : "Sign out"}
    </button>
  );
}
