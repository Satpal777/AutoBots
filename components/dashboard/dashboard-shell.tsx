"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

import { AutobotLogo } from "@/components/brand/autobot-logo";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { CommandPalette } from "@/components/dashboard/command-palette";
import {
  CalendarIcon,
  CommandIcon,
  MailIcon,
  SettingsIcon,
  SparklesIcon,
} from "@/components/ui/icons";

const navigation = [
  { href: "/dashboard/chat", label: "Autobot Chat", icon: SparklesIcon },
  { href: "/dashboard", label: "Today", icon: CommandIcon },
  { href: "/dashboard/inbox", label: "Inbox", icon: MailIcon },
  { href: "/dashboard/calendar", label: "Calendar", icon: CalendarIcon },
  { href: "/dashboard/settings", label: "Settings", icon: SettingsIcon },
] as const;

const DASHBOARD_RAIL_STORAGE_KEY = "autobot-dashboard-rail-collapsed";
const DASHBOARD_RAIL_CHANGE_EVENT = "autobot-dashboard-rail-change";

export function DashboardShell({
  children,
  email,
  name,
}: {
  children: React.ReactNode;
  email: string;
  name: string;
}) {
  const pathname = usePathname();
  const isChat = pathname.startsWith("/dashboard/chat");
  const railCollapsed = useSyncExternalStore(
    subscribeToDashboardRail,
    getDashboardRailSnapshot,
    () => false,
  );

  function toggleRail() {
    window.localStorage.setItem(
      DASHBOARD_RAIL_STORAGE_KEY,
      railCollapsed ? "expanded" : "collapsed",
    );
    window.dispatchEvent(new Event(DASHBOARD_RAIL_CHANGE_EVENT));
  }

  return (
    <div
      className={`dashboard-canvas bg-canvas text-ink ${
        isChat ? "min-h-screen lg:h-screen lg:overflow-hidden" : "min-h-screen"
      }`}
    >
      <aside className={`dashboard-rail fixed inset-y-0 left-0 z-30 hidden border-r border-line transition-[width] duration-200 lg:block ${
        railCollapsed ? "w-[4.5rem]" : "w-60"
      }`}>
        <div className={`flex h-full flex-col ${railCollapsed ? "p-3" : "p-4"}`}>
          <div className={`flex gap-2 py-2 ${railCollapsed ? "flex-col items-center" : "items-center justify-between px-2"}`}>
            <AutobotLogo showName={!railCollapsed} />
            <button
              type="button"
              onClick={toggleRail}
              aria-label={railCollapsed ? "Expand dashboard sidebar" : "Collapse dashboard sidebar"}
              title={railCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="product-icon-button grid size-9 min-h-0 shrink-0 place-items-center"
            >
              {railCollapsed
                ? <PanelLeftOpen aria-hidden="true" className="size-4" />
                : <PanelLeftClose aria-hidden="true" className="size-4" />}
            </button>
          </div>

          <DashboardNavigation collapsed={railCollapsed} />

          <div className="mt-auto border-t border-line pt-3">
            <div className={`mb-2 flex rounded-lg ${railCollapsed ? "justify-center py-1" : "items-center justify-between px-2 py-1"}`}>
              {railCollapsed ? null : <span className="text-xs font-semibold text-muted">Appearance</span>}
              <ThemeToggle />
            </div>
            <div
              title={railCollapsed ? `${name} (${email})` : undefined}
              className={`mb-2 flex rounded-lg ${railCollapsed ? "justify-center py-1" : "items-center gap-3 p-2"}`}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gold-soft text-xs font-bold text-forest">
                {getInitials(name)}
              </span>
              <div className={railCollapsed ? "hidden" : "min-w-0"}>
                <p className="truncate text-sm font-semibold text-ink">{name}</p>
                <p className="mt-0.5 truncate text-xs text-muted">{email}</p>
              </div>
            </div>
            <div className={railCollapsed ? "flex justify-center" : ""}>
              <SignOutButton compact={railCollapsed} />
            </div>
          </div>
        </div>
      </aside>

      <header className="dashboard-mobile-header sticky top-0 z-30 border-b border-line bg-surface lg:hidden">
        <div className="flex items-center justify-between px-4 py-2.5">
          <AutobotLogo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <SignOutButton compact />
          </div>
        </div>
      </header>

      <main
        className={`min-w-0 transition-[padding] duration-200 ${
          railCollapsed ? "lg:pl-[4.5rem]" : "lg:pl-60"
        } ${
          isChat ? "lg:h-screen lg:overflow-hidden" : ""
        }`}
      >
        <div
          className={
            isChat
              ? "dashboard-mobile-chat-content mx-auto max-w-[96rem] px-3 py-3 sm:px-5 sm:py-5 lg:h-full lg:px-6 lg:py-6"
              : "dashboard-mobile-content mx-auto max-w-[80rem] px-5 py-7 sm:px-8 sm:py-10 sm:pb-28 lg:px-10 lg:py-12 lg:pb-12"
          }
        >
          {children}
        </div>
      </main>
      <DashboardNavigation mobile />
      <CommandPalette />
    </div>
  );
}

function DashboardNavigation({
  mobile = false,
  collapsed = false,
}: {
  mobile?: boolean;
  collapsed?: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Dashboard navigation"
      className={
        mobile
          ? "dashboard-mobile-nav fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-surface px-2 py-2 lg:hidden"
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
            aria-label={collapsed ? label : undefined}
            title={collapsed ? label : undefined}
            className={
              mobile
                ? `dashboard-mobile-nav-link flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[0.65rem] font-semibold transition ${
                    active
                      ? "text-forest"
                      : "text-muted hover:text-forest"
                  }`
                : `flex items-center rounded-xl py-3 font-semibold transition ${
                    collapsed ? "justify-center px-0" : "gap-3 px-3"
                  } ${
                    active
                      ? "dashboard-nav-active"
                      : "text-muted hover:bg-surface-soft hover:text-forest"
                  }`
            }
          >
            <Icon className={`${mobile ? "size-5" : "size-4"} ${active && !mobile ? "text-forest" : ""}`} />
            {collapsed ? null : label}
          </Link>
        );
      })}
    </nav>
  );
}

function subscribeToDashboardRail(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(DASHBOARD_RAIL_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(DASHBOARD_RAIL_CHANGE_EVENT, onChange);
  };
}

function getDashboardRailSnapshot() {
  try {
    return window.localStorage.getItem(DASHBOARD_RAIL_STORAGE_KEY) === "collapsed";
  } catch {
    return false;
  }
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
