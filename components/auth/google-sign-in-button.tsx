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
      callbackURL: "/dashboard/chat",
      newUserCallbackURL: "/dashboard/settings?onboarding=connections",
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
        className="product-button-secondary flex w-full items-center justify-center gap-3 px-4 py-3 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <GoogleLogo />
        <span>{isPending ? "Opening Google..." : "Continue with Google"}</span>
      </button>
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4 shrink-0"
    >
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.97-.9 6.63-2.36l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.39 13.93A6 6 0 0 1 6.08 12c0-.67.12-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.64.39 3.19 1.04 4.55l3.35-2.62Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"
      />
    </svg>
  );
}
