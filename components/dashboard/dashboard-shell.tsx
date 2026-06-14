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
      <aside className="dashboard-rail fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-line lg:block">
        <div className="flex h-full flex-col p-4">
          <div className="px-2 py-2">
            <AutobotLogo />
          </div>

          <DashboardNavigation />

          <div className="mt-auto border-t border-line pt-3">
            <div className="mb-2 flex items-center gap-3 rounded-lg p-2">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gold-soft text-xs font-bold text-forest">
                {getInitials(name)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{name}</p>
                <p className="mt-0.5 truncate text-xs text-muted">{email}</p>
              </div>
            </div>
            <SignOutButton />
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-line bg-surface lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <AutobotLogo />
          <SignOutButton />
        </div>
        <DashboardNavigation mobile />
      </header>

      <main className="min-w-0 lg:pl-60">
        <div className="mx-auto max-w-[80rem] px-5 py-7 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
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
          : "mt-6 space-y-1 text-sm"
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
                      ? "dashboard-nav-active"
                      : "text-muted hover:bg-surface-soft hover:text-forest"
                  }`
            }
          >
            <Icon className={`size-4 ${active && !mobile ? "text-forest" : ""}`} />
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
