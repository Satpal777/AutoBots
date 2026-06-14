import { redirect } from "next/navigation";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { getSession } from "@/lib/auth/session";

export default async function SignInPage() {
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="relative grid min-h-screen place-items-center bg-canvas px-6">
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>
      <section className="product-panel w-full max-w-md p-8">
        <p className="text-sm font-medium text-muted">Autobot</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
          Sign in to your command center
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Google sign-in identifies you in Autobot. Gmail and Calendar access
          will be connected separately through Corsair.
        </p>
        <div className="mt-7">
          <GoogleSignInButton />
        </div>
      </section>
    </main>
  );
}
