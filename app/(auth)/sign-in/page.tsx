import { redirect } from "next/navigation";
import Link from "next/link";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { AutobotLogo } from "@/components/brand/autobot-logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { getSession } from "@/lib/auth/session";

type SignInPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const [session, params] = await Promise.all([getSession(), searchParams]);

  if (session) {
    redirect("/dashboard/chat");
  }

  const accountDeleted = params.status === "account-deleted";

  return (
    <main className="relative grid min-h-svh place-items-center bg-canvas px-5 py-16 sm:px-6">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      <section className="w-full max-w-sm">
        <div className="product-panel p-6 sm:p-8">
          <div className="flex justify-center">
            <AutobotLogo />
          </div>
          <h1 className="mt-8 text-center text-2xl font-semibold tracking-[-0.025em] text-ink">
            Sign in to Autobot
          </h1>
          {accountDeleted ? (
            <div
              role="status"
              className="mt-5 rounded-lg border border-line bg-success-soft px-3 py-2 text-sm font-medium text-forest"
            >
              Account deleted. Your Autobot data has been removed.
            </div>
          ) : null}
          <div className="mt-6">
            <GoogleSignInButton />
          </div>
        </div>

        <p className="mx-auto mt-5 max-w-xs text-center text-xs leading-5 text-muted">
          By continuing, you agree to our{" "}
          <Link className="font-semibold text-forest hover:text-forest-hover" href="/tnc">
            Terms
          </Link>{" "}
          and{" "}
          <Link className="font-semibold text-forest hover:text-forest-hover" href="/privacy">
            Privacy Policy
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
