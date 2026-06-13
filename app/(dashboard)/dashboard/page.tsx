import { SignOutButton } from "@/components/auth/sign-out-button";
import { requireSession } from "@/lib/auth/session";

export default async function DashboardPage() {
  const session = await requireSession();

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-12">
      <section className="mx-auto max-w-3xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm font-medium text-zinc-500">Autobot dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
              Welcome, {session.user.name}
            </h1>
            <p className="mt-3 text-zinc-600">{session.user.email}</p>
          </div>
          <SignOutButton />
        </div>

        <div className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-5">
          <p className="font-medium text-zinc-900">
            Google Workspace not connected
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Gmail and Calendar will be connected through your isolated Corsair
            tenant in the next step.
          </p>
        </div>
      </section>
    </main>
  );
}
