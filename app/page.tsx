import Link from "next/link";

export default function Home() {
  return (
    <main className="grid min-h-screen place-items-center bg-zinc-950 px-6 text-white">
      <section className="max-w-2xl text-center">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-zinc-400">
          Autobot
        </p>
        <h1 className="mt-5 text-5xl font-semibold tracking-tight">
          Your email and calendar, organized around you.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-zinc-300">
          Sign in securely now. Gmail and Calendar access will remain separate
          and tenant-isolated through Corsair.
        </p>
        <Link
          href="/sign-in"
          className="mt-8 inline-flex rounded-lg bg-white px-5 py-3 font-medium text-zinc-950 transition hover:bg-zinc-200"
        >
          Get started
        </Link>
      </section>
    </main>
  );
}
