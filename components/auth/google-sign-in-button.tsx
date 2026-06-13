"use client";

import { useState } from "react";

import { authClient } from "@/lib/auth/client";

export function GoogleSignInButton() {
  const [error, setError] = useState<string>();
  const [isPending, setIsPending] = useState(false);

  async function signIn() {
    setError(undefined);
    setIsPending(true);

    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
    });

    if (result.error) {
      setError("Google sign-in could not be started. Please try again.");
      setIsPending(false);
    }
  }

  return (
    <div className="grid gap-3">
      <button
        type="button"
        onClick={signIn}
        disabled={isPending}
        className="rounded-lg bg-zinc-950 px-5 py-3 font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Opening Google..." : "Continue with Google"}
      </button>
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
