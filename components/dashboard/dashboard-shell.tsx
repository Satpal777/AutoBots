"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AutobotLogo } from "@/components/brand/autobot-logo";
import { SignOutButton } from "@/components/auth/sign-out-button";
import {
  CalendarIcon,
  CommandIcon,
  MailIcon,
  SettingsIcon,
} from "@/components/ui/icons";

const navigation = [
  { href: "/dashboard", label: "Today", icon: CommandIcon },
  { href: "/dashboard/inbox", label: "Inbox", icon: MailIcon },
  { href: "/dashboard/calendar", label: "Calendar", icon: CalendarIcon },
  { href: "/dashboard/settings", label: "Settings", icon: SettingsIcon },
] as const;

export function DashboardShell({
  children,
  email,
  name,
}: {
  children: React.ReactNode;
  email: string;
  name: string;
}) {
  return (
    <div className="dashboard-canvas min-h-screen bg-canvas text-ink">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 p-3 lg:block">
        <div className="dashboard-rail flex h-full flex-col overflow-hidden rounded-2xl bg-forest p-3 text-white">
          <div className="px-3 py-3">
            <AutobotLogo inverse />
          </div>

          <div className="mx-3 mt-4 h-px bg-white/10" />
          <div className="mt-5 px-3 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-white/35">
            Workspace
          </div>
          <DashboardNavigation />

          <div className="mt-auto">
            <div className="mb-2 flex items-center gap-3 rounded-xl p-3 transition hover:bg-white/6">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gold-soft text-xs font-bold text-forest">
                {getInitials(name)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{name}</p>
                <p className="mt-0.5 truncate text-xs text-white/45">{email}</p>
              </div>
            </div>
            <SignOutButton variant="inverse" />
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <AutobotLogo />
          <SignOutButton />
        </div>
        <DashboardNavigation mobile />
      </header>

      <main className="min-w-0 lg:pl-60">
        <div className="mx-auto max-w-[90rem] px-5 py-7 sm:px-8 sm:py-10 lg:px-10 lg:py-12 xl:px-14">
          {children}
        </div>
      </main>
    </div>
  );
}

function DashboardNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Dashboard navigation"
      className={
        mobile
          ? "flex overflow-x-auto px-3 pb-2"
          : "mt-3 space-y-1 text-sm"
      }
    >
      {navigation.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/dashboard" ? pathname === href : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={
              mobile
                ? `flex min-w-fit items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    active
                      ? "bg-surface-soft text-forest"
                      : "text-muted hover:text-forest"
                  }`
                : `flex items-center gap-3 rounded-xl px-3 py-3 font-semibold transition ${
                    active
                      ? "dashboard-nav-active bg-white/10 text-white"
                      : "text-white/55 hover:bg-white/6 hover:text-white"
                  }`
            }
          >
            <Icon className={`size-4 ${active && !mobile ? "text-gold-soft" : ""}`} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function getInitials(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "A"
  );
}
