import { redirect } from "next/navigation";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { getSession } from "@/lib/auth/session";

export default async function SignInPage() {
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-zinc-50 px-6">
      <section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-zinc-500">Autobot</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
          Sign in to your command center
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
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
