import Link from "next/link";

import { AutobotMark } from "@/components/brand/autobot-logo";
import {
  ArrowRightIcon,
  CalendarIcon,
  CommandIcon,
  MailIcon,
} from "@/components/ui/icons";
import {
  type CalendarPreview,
  type GmailPreview,
} from "@/server/workspace-preview";

export function PageHeader({
  label,
  title,
  description,
  action,
}: {
  label: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold text-gold">
          <span className="size-1.5 rounded-full bg-gold" />
          {label}
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-ink sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted">{description}</p>
      </div>
      {action}
    </header>
  );
}

export function DayRoutePanel({
  unreadCount,
  eventCount,
}: {
  unreadCount: number;
  eventCount: number;
}) {
  const routeMessage =
    unreadCount > 0 && eventCount > 0
      ? "Review the inbox first, then make room around your next events."
      : unreadCount > 0
        ? "Your inbox is the clearest place to begin."
        : eventCount > 0
          ? "Your schedule has the next useful signal."
          : "Your workspace is quiet right now.";

  return (
    <section className="dashboard-focus mt-8 overflow-hidden rounded-2xl bg-forest text-white">
      <div className="grid min-h-[25rem] lg:grid-cols-[1fr_0.9fr]">
        <div className="flex flex-col justify-between p-6 sm:p-8 lg:p-10">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl bg-white/10 text-white">
                <AutobotMark inverse />
              </span>
              <div>
                <p className="text-sm font-semibold text-gold-soft">Daily focus</p>
                <p className="mt-1 text-xs font-medium text-white/45">
                  Mail and calendar, considered together
                </p>
              </div>
            </div>
            <h2 className="text-pretty mt-10 max-w-xl text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              {routeMessage}
            </h2>
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <FocusLink
              href="/dashboard/inbox"
              icon={MailIcon}
              label="Review inbox"
              value={`${unreadCount} unread`}
              active={unreadCount > 0}
            />
            <FocusLink
              href="/dashboard/calendar"
              icon={CalendarIcon}
              label="See schedule"
              value={`${eventCount} upcoming`}
              active={eventCount > 0}
            />
          </div>
        </div>

        <div className="dashboard-focus-map relative grid min-h-80 place-items-center overflow-hidden">
          <div className="dashboard-orbit dashboard-orbit-outer absolute size-72 rounded-full border border-white/12 sm:size-80" />
          <div className="dashboard-orbit dashboard-orbit-inner absolute size-48 rounded-full border border-white/12 sm:size-56" />
          <div className="relative z-10 grid size-24 place-items-center rounded-full bg-gold-soft text-forest shadow-card">
            <CommandIcon className="size-8" />
            <span className="dashboard-status-ring absolute inset-0 rounded-full" />
          </div>
          <OrbitNode
            className="left-[12%] top-[24%]"
            icon={MailIcon}
            label="Inbox"
            value={unreadCount}
          />
          <OrbitNode
            className="bottom-[17%] right-[10%]"
            icon={CalendarIcon}
            label="Events"
            value={eventCount}
          />
          <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between border-t border-white/10 pt-4 text-xs font-medium text-white/45">
            <span>Live workspace signal</span>
            <span>{unreadCount + eventCount} items in view</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function FocusLink({
  href,
  icon: Icon,
  label,
  value,
  active,
}: {
  href: string;
  icon: typeof MailIcon;
  label: string;
  value: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className="dashboard-focus-link group flex min-w-[13rem] items-center gap-3 rounded-xl bg-white/8 p-3 transition hover:bg-white/12"
    >
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-lg ${
          active ? "bg-gold-soft text-forest" : "bg-white/10 text-white/55"
        }`}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-white/45">{label}</p>
        <p className="mt-0.5 truncate text-sm font-semibold text-white">{value}</p>
      </div>
      <ArrowRightIcon className="ml-auto size-4 text-white/35 transition group-hover:translate-x-0.5 group-hover:text-gold-soft" />
    </Link>
  );
}

function OrbitNode({
  className,
  icon: Icon,
  label,
  value,
}: {
  className: string;
  icon: typeof MailIcon;
  label: string;
  value: number;
}) {
  return (
    <div className={`dashboard-orbit-node absolute z-10 flex items-center gap-3 rounded-xl bg-surface px-3 py-2.5 text-ink shadow-card ${className}`}>
      <span className="grid size-8 place-items-center rounded-lg bg-surface-soft text-forest">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-[0.65rem] font-medium text-muted">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

export function InboxPanel({
  preview,
  compact = false,
}: {
  preview: GmailPreview;
  compact?: boolean;
}) {
  const threads = compact ? preview.threads.slice(0, 3) : preview.threads;
  const [featuredThread, ...remainingThreads] = threads;

  return (
    <article className="dashboard-data-panel rounded-2xl bg-surface p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-forest">
            <MailIcon className="size-4" />
            Inbox
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-ink">
            Message queue
          </h2>
        </div>
        {preview.status === "ready" ? (
          <span className="rounded-full bg-gold-soft px-3 py-1.5 text-xs font-semibold text-forest">
            {preview.unreadCount} unread
          </span>
        ) : null}
      </div>

      <PreviewState
        icon={MailIcon}
        status={preview.status}
        disconnectedMessage="Connect Gmail in Settings to see recent conversations."
        errorMessage="Gmail could not refresh. Review it in Settings."
        empty={threads.length === 0}
        emptyMessage="Your inbox has no recent threads."
      >
        <div className="mt-5">
          {featuredThread ? (
            <div className="dashboard-featured-thread rounded-xl bg-surface-soft p-4 sm:p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-forest">
                <span className="size-1.5 rounded-full bg-gold" />
                Next to review
              </div>
              <p className="mt-4 truncate text-sm font-semibold text-ink">
                {featuredThread.from}
              </p>
              <p className="mt-1.5 truncate text-base font-semibold text-ink">
                {featuredThread.subject}
              </p>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">
                {featuredThread.snippet}
              </p>
            </div>
          ) : null}

          <div className="mt-2 divide-y divide-line">
            {remainingThreads.map((thread) => (
              <div
                key={thread.id}
                className="dashboard-list-row flex gap-3 py-4 last:pb-0"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-canvas text-xs font-bold text-forest">
                  {getSenderInitial(thread.from)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{thread.from}</p>
                  <p className="mt-1.5 truncate text-sm font-medium text-ink/80">
                    {thread.subject}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted">
                    {thread.snippet}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </PreviewState>

      {compact && preview.status === "ready" ? (
        <Link
          href="/dashboard/inbox"
          className="mt-5 inline-flex text-sm font-semibold text-forest hover:text-forest-hover"
        >
          View inbox
        </Link>
      ) : null}
    </article>
  );
}

export function CalendarPanel({
  preview,
  compact = false,
}: {
  preview: CalendarPreview;
  compact?: boolean;
}) {
  const events = compact ? preview.events.slice(0, 4) : preview.events;
  const [nextEvent, ...laterEvents] = events;

  return (
    <article className="dashboard-data-panel rounded-2xl bg-surface p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-forest">
            <CalendarIcon className="size-4" />
            Calendar
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-ink">
            Schedule lane
          </h2>
        </div>
        {preview.status === "ready" ? (
          <span className="rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-muted">
            {events.length} upcoming
          </span>
        ) : null}
      </div>

      <PreviewState
        icon={CalendarIcon}
        status={preview.status}
        disconnectedMessage="Connect Calendar in Settings to see your schedule."
        errorMessage="Calendar could not refresh. Review it in Settings."
        empty={events.length === 0}
        emptyMessage="No upcoming events in the next seven days."
      >
        <div className="mt-5">
          {nextEvent ? (
            <div className="dashboard-next-event overflow-hidden rounded-xl bg-forest p-4 text-white sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-gold-soft">Next event</p>
                <CalendarIcon className="size-4 text-white/45" />
              </div>
              <p className="mt-5 text-lg font-semibold tracking-[-0.02em]">
                {nextEvent.title}
              </p>
              <p className="mt-2 text-xs leading-5 text-white/55">{nextEvent.when}</p>
              {nextEvent.location ? (
                <p className="mt-1 truncate text-xs text-white/45">
                  {nextEvent.location}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-2 divide-y divide-line">
            {laterEvents.map((event) => (
              <div
                key={event.id}
                className="dashboard-list-row relative flex gap-3 py-4 pl-5 last:pb-0"
              >
                <span className="absolute bottom-0 left-[0.2rem] top-0 w-px bg-line last:bottom-auto last:h-6" />
                <span className="absolute left-0 top-[1.15rem] size-2 rounded-full bg-gold ring-4 ring-surface" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{event.title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted">{event.when}</p>
                  {event.location ? (
                    <p className="mt-1 truncate text-xs text-muted/75">{event.location}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </PreviewState>

      {compact && preview.status === "ready" ? (
        <Link
          href="/dashboard/calendar"
          className="mt-5 inline-flex text-sm font-semibold text-forest hover:text-forest-hover"
        >
          View calendar
        </Link>
      ) : null}
    </article>
  );
}

function PreviewState({
  icon: Icon,
  status,
  disconnectedMessage,
  errorMessage,
  empty,
  emptyMessage,
  children,
}: {
  icon: typeof MailIcon;
  status: "ready" | "disconnected" | "error";
  disconnectedMessage: string;
  errorMessage: string;
  empty: boolean;
  emptyMessage: string;
  children: React.ReactNode;
}) {
  if (status !== "ready" || empty) {
    const message =
      status === "error"
        ? errorMessage
        : status === "disconnected"
          ? disconnectedMessage
          : emptyMessage;

    return (
      <div className="mt-5 flex items-start gap-3 rounded-xl bg-canvas px-4 py-4 text-sm leading-6 text-muted">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface text-forest">
          <Icon className="size-4" />
        </span>
        <p>{message}</p>
      </div>
    );
  }

  return children;
}

function getSenderInitial(sender: string | null): string {
  const cleaned = sender?.replace(/^["']|["']$/g, "").trim() ?? "";
  return cleaned.charAt(0).toUpperCase() || "?";
}
