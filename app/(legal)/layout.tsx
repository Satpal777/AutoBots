import Link from "next/link";

import { AutobotLogo } from "@/components/brand/autobot-logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function LegalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
        <div className="site-shell flex min-h-16 items-center justify-between gap-4">
          <AutobotLogo />
          <nav
            aria-label="Legal page navigation"
            className="flex items-center gap-1 text-sm font-semibold"
          >
            <Link className="legal-header-link hidden sm:inline-flex" href="/">
              Home
            </Link>
            <Link className="legal-header-link" href="/privacy">
              Privacy
            </Link>
            <Link className="legal-header-link" href="/tnc">
              Terms
            </Link>
            <ThemeToggle className="ml-1" />
            <Link className="legal-sign-in hidden sm:inline-flex" href="/sign-in">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      {children}

      <footer className="border-t border-line bg-surface">
        <div className="site-shell flex flex-col gap-6 py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <AutobotLogo />
            <p className="mt-2 text-xs text-muted">
              Gmail, Calendar, and connected services arranged around your day.
            </p>
          </div>
          <nav
            aria-label="Legal footer navigation"
            className="flex flex-wrap gap-x-5 gap-y-3 font-semibold text-forest"
          >
            <Link className="hover:text-forest-hover" href="/">
              Home
            </Link>
            <Link className="hover:text-forest-hover" href="/privacy">
              Privacy
            </Link>
            <Link className="hover:text-forest-hover" href="/tnc">
              Terms
            </Link>
            <a
              className="hover:text-forest-hover"
              href="mailto:support@autobots.satpal.cloud"
            >
              Contact support
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
