import Link from "next/link";

import {
  type CalendarAgenda,
  type CalendarAvailability,
  type CalendarEventDetail,
  type CalendarEventSummary,
} from "@/server/calendar";
import {
  ArrowRightIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  LocationIcon,
  SettingsIcon,
  UsersIcon,
} from "@/components/ui/icons";

export function CalendarSectionNav({
  active,
  startDate,
}: {
  active: "agenda" | "week" | "availability";
  startDate?: string;
}) {
  return (
    <nav aria-label="Calendar sections" className="product-tab-list">
      <Link
        href={buildCalendarHref("agenda", startDate)}
        aria-current={active === "agenda" ? "page" : undefined}
        className="product-tab"
      >
        Agenda
      </Link>
      <Link
        href={buildCalendarHref("week", startDate)}
        aria-current={active === "week" ? "page" : undefined}
        className="product-tab"
      >
        Week
      </Link>
      <Link
        href="/dashboard/calendar/availability"
        aria-current={active === "availability" ? "page" : undefined}
        className="product-tab"
      >
        Availability
      </Link>
    </nav>
  );
}

export function CalendarNotice({ status }: { status?: string }) {
  const messages: Record<string, string> = {
    created: "Event created and invitations sent.",
    error: "Calendar could not complete that action. Please try again.",
    invalid: "Check every date, time, guest, and timezone before continuing.",
    refreshed: "Calendar refreshed from Google.",
    updated: "Event updated and guests notified.",
  };
  const message = status ? messages[status] : null;

  return message ? (
    <div
      role="status"
      className="product-notice mt-5 px-4 py-3 text-sm font-medium"
    >
      {message}
    </div>
  ) : null;
}

export function CalendarDisconnectedState() {
  return (
    <div className="product-panel mt-8 max-w-3xl p-6 sm:p-8">
      <span className="grid size-11 place-items-center rounded-lg bg-surface-soft text-forest">
        <CalendarIcon className="size-5" />
      </span>
      <h2 className="mt-5 text-xl font-semibold text-ink">
        Connect Google Calendar first
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
        Connect Calendar in Settings to review your week, create events, invite
        guests, and check availability.
      </p>
      <Link
        href="/dashboard/settings"
        className="product-button-primary mt-5 inline-flex items-center gap-2 px-4"
      >
        <SettingsIcon className="size-4" />
        Open connected apps
      </Link>
    </div>
  );
}

export function CalendarRangeControls({
  agenda,
  view,
}: {
  agenda: CalendarAgenda;
  view: "agenda" | "week";
}) {
  const startDate = formatDateKey(new Date(agenda.rangeStart), agenda.timeZone);
  const days = view === "week" ? 7 : 14;
  const previous = addDays(startDate, -days);
  const next = addDays(startDate, days);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={buildCalendarHref(view, previous)}
        aria-label={`Previous ${view}`}
        className="product-icon-button grid size-10 place-items-center"
      >
        <ChevronLeftIcon className="size-4" />
      </Link>
      <Link
        href={buildCalendarHref(view)}
        className="product-button-secondary inline-flex items-center px-4"
      >
        Today
      </Link>
      <Link
        href={buildCalendarHref(view, next)}
        aria-label={`Next ${view}`}
        className="product-icon-button grid size-10 place-items-center"
      >
        <ChevronRightIcon className="size-4" />
      </Link>
      <span className="ml-1 text-xs font-medium text-muted">
        Times shown in {agenda.timeZone}
      </span>
    </div>
  );
}

export function CalendarAgendaView({ agenda }: { agenda: CalendarAgenda }) {
  const grouped = groupEventsByDate(agenda.events, agenda.timeZone);
  const days = getDateKeysInRange(agenda.rangeStart, agenda.rangeEnd, agenda.timeZone);

  if (agenda.events.length === 0) {
    return <CalendarEmptyState />;
  }

  return (
    <section className="mt-8 space-y-7">
      {days.map((dateKey) => {
        const events = grouped.get(dateKey);

        return events?.length ? (
          <div key={dateKey} className="grid gap-4 md:grid-cols-[10rem_minmax(0,1fr)]">
            <div>
              <p className="text-sm font-semibold text-ink">
                {formatDayHeading(dateKey)}
              </p>
              <p className="mt-1 text-xs text-muted">
                {formatDateHeading(dateKey)}
              </p>
            </div>
            <div className="product-panel divide-y divide-line overflow-hidden">
              {events.map((event) => (
                <CalendarEventRow
                  key={event.id}
                  event={event}
                  displayTimeZone={agenda.timeZone}
                />
              ))}
            </div>
          </div>
        ) : null;
      })}
    </section>
  );
}

export function CalendarWeekView({ agenda }: { agenda: CalendarAgenda }) {
  const grouped = groupEventsByDate(agenda.events, agenda.timeZone);
  const days = getDateKeysInRange(agenda.rangeStart, agenda.rangeEnd, agenda.timeZone);

  return (
    <section className="calendar-week-scroller mt-8 overflow-x-auto pb-3">
      <div className="calendar-week-grid product-panel grid min-w-[68rem] grid-cols-7 overflow-hidden">
        {days.map((dateKey) => {
          const events = grouped.get(dateKey) ?? [];

          return (
            <div key={dateKey} className="min-h-[32rem] border-r border-line p-3 last:border-r-0">
              <div className="border-b border-line pb-3">
                <p className="text-xs font-semibold text-muted">
                  {formatDayHeading(dateKey)}
                </p>
                <p className="mt-1 text-lg font-semibold text-ink">
                  {new Intl.DateTimeFormat("en-US", {
                    day: "numeric",
                    timeZone: "UTC",
                  }).format(new Date(`${dateKey}T12:00:00.000Z`))}
                </p>
              </div>
              <div className="mt-3 space-y-2">
                {events.map((event) => (
                  <Link
                    key={event.id}
                    href={`/dashboard/calendar/event/${encodeURIComponent(event.id)}`}
                    className="block rounded-lg bg-surface-soft p-3 transition hover:bg-gold-soft"
                  >
                    <p className="line-clamp-2 text-xs font-semibold leading-5 text-ink">
                      {event.title ?? "Untitled event"}
                    </p>
                    <p className="mt-1 text-[0.7rem] font-medium text-muted">
                      {formatEventTime(event, agenda.timeZone)}
                    </p>
                  </Link>
                ))}
                {events.length === 0 ? (
                  <p className="pt-2 text-xs text-muted">Open</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function CalendarEventView({ event }: { event: CalendarEventDetail }) {
  return (
    <div className="mt-8 grid max-w-6xl gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <article className="product-panel p-5 sm:p-7">
        <div className="grid gap-4 border-b border-line pb-6 sm:grid-cols-2">
          <EventMeta
            icon={ClockIcon}
            label="When"
            value={formatEventRange(event, event.timeZone)}
          />
          <EventMeta
            icon={LocationIcon}
            label="Location"
            value={event.location ?? "No location added"}
          />
        </div>

        <div className="mt-6">
          <h2 className="text-sm font-semibold text-forest">Description</h2>
          <div className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-ink/85">
            {event.description ?? "No description added."}
          </div>
        </div>

        {event.hangoutLink || event.htmlLink ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {event.hangoutLink ? (
              <a
                href={event.hangoutLink}
                target="_blank"
                rel="noreferrer"
                className="product-button-primary inline-flex items-center px-4"
              >
                Join video call
              </a>
            ) : null}
            {event.htmlLink ? (
              <a
                href={event.htmlLink}
                target="_blank"
                rel="noreferrer"
                className="product-button-secondary inline-flex items-center px-4"
              >
                Open in Google Calendar
              </a>
            ) : null}
          </div>
        ) : null}
      </article>

      <aside className="product-panel p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-forest">
          <UsersIcon className="size-4" />
          Guests
        </div>
        <p className="mt-2 text-xs leading-5 text-muted">
          Organized by {event.organizer ?? "organizer unavailable"}
        </p>
        <div className="mt-4 divide-y divide-line">
          {event.attendees.map((attendee) => (
            <div key={attendee.email} className="py-3 first:pt-0 last:pb-0">
              <p className="truncate text-sm font-semibold text-ink">
                {attendee.displayName ?? attendee.email}
              </p>
              <p className="mt-1 truncate text-xs text-muted">{attendee.email}</p>
              <p className="mt-1 text-xs font-medium text-forest">
                {formatResponseStatus(attendee.responseStatus)}
              </p>
            </div>
          ))}
          {event.attendees.length === 0 ? (
            <p className="text-sm leading-6 text-muted">No guests invited.</p>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

export function CalendarAvailabilityResults({
  availability,
}: {
  availability: CalendarAvailability;
}) {
  return (
    <section className="product-panel mt-7 max-w-5xl overflow-hidden">
      <div className="border-b border-line p-5">
        <h2 className="text-base font-semibold text-ink">Busy windows</h2>
        <p className="mt-1 text-xs text-muted">
          {formatDateTime(availability.rangeStart, availability.timeZone)} to{" "}
          {formatDateTime(availability.rangeEnd, availability.timeZone)}
        </p>
      </div>
      <div className="divide-y divide-line">
        {availability.calendars.map((calendar) => (
          <div key={calendar.id} className="grid gap-3 p-5 md:grid-cols-[15rem_minmax(0,1fr)]">
            <div>
              <p className="truncate text-sm font-semibold text-ink">
                {calendar.id === "primary" ? "Your calendar" : calendar.id}
              </p>
              <p className="mt-1 text-xs text-muted">
                {calendar.error
                  ? "Availability unavailable"
                  : `${calendar.busy.length} busy window${
                      calendar.busy.length === 1 ? "" : "s"
                    }`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {calendar.busy.map((slot) => (
                <span
                  key={`${slot.start}-${slot.end}`}
                  className="rounded-lg bg-surface-soft px-3 py-2 text-xs font-medium text-forest"
                >
                  {formatTime(slot.start, availability.timeZone)} to{" "}
                  {formatTime(slot.end, availability.timeZone)}
                </span>
              ))}
              {!calendar.error && calendar.busy.length === 0 ? (
                <span className="rounded-xl bg-success-soft px-3 py-2 text-xs font-semibold text-success">
                  Available throughout this window
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CalendarEventRow({
  event,
  displayTimeZone,
}: {
  event: CalendarEventSummary;
  displayTimeZone: string;
}) {
  return (
    <Link
      href={`/dashboard/calendar/event/${encodeURIComponent(event.id)}`}
      className="group grid gap-3 px-5 py-4 transition hover:bg-surface-soft/60 sm:grid-cols-[9rem_minmax(0,1fr)_auto] sm:items-center"
    >
      <p className="text-xs font-semibold text-forest">
        {formatEventTime(event, displayTimeZone)}
      </p>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-ink">
            {event.title ?? "Untitled event"}
          </p>
          {event.awaitingResponse ? (
            <span className="shrink-0 rounded-full bg-gold-soft px-2 py-0.5 text-[0.65rem] font-semibold text-forest">
              RSVP
            </span>
          ) : null}
        </div>
        <p className="mt-1 truncate text-xs text-muted">
          {event.location ??
            (event.attendeeCount > 0
              ? `${event.attendeeCount} attendee${event.attendeeCount === 1 ? "" : "s"}`
              : "Personal event")}
        </p>
      </div>
      <ArrowRightIcon className="size-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-forest" />
    </Link>
  );
}

function CalendarEmptyState() {
  return (
    <div className="product-panel mt-8 p-8 text-center">
      <p className="text-sm font-semibold text-ink">Your schedule is open</p>
      <p className="mt-2 text-sm text-muted">
        Create an event or move to another date range.
      </p>
    </div>
  );
}

function EventMeta({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ClockIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-soft text-forest">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-xs font-semibold text-muted">{label}</p>
        <p className="mt-1 text-sm font-semibold leading-6 text-ink">{value}</p>
      </div>
    </div>
  );
}

function groupEventsByDate(
  events: CalendarEventSummary[],
  timeZone: string,
): Map<string, CalendarEventSummary[]> {
  const grouped = new Map<string, CalendarEventSummary[]>();

  for (const event of events) {
    const key = event.startDate ?? (
      event.startAt ? formatDateKey(new Date(event.startAt), timeZone) : null
    );

    if (key) {
      grouped.set(key, [...(grouped.get(key) ?? []), event]);
    }
  }

  return grouped;
}

function getDateKeysInRange(
  rangeStart: string,
  rangeEnd: string,
  timeZone: string,
): string[] {
  const start = formatDateKey(new Date(rangeStart), timeZone);
  const end = formatDateKey(new Date(rangeEnd), timeZone);
  const dates: string[] = [];

  for (let current = start; current < end; current = addDays(current, 1)) {
    dates.push(current);
  }

  return dates;
}

function formatEventRange(event: CalendarEventSummary, timeZone: string): string {
  if (event.allDay && event.startDate) {
    const inclusiveEnd = event.endDate ? addDays(event.endDate, -1) : event.startDate;
    return inclusiveEnd === event.startDate
      ? `${formatDateHeading(event.startDate)}, all day`
      : `${formatDateHeading(event.startDate)} to ${formatDateHeading(
          inclusiveEnd,
        )}, all day`;
  }

  if (!event.startAt) {
    return "Time unavailable";
  }

  return `${formatDateTime(event.startAt, timeZone)}${
    event.endAt ? ` to ${formatTime(event.endAt, timeZone)}` : ""
  }`;
}

function formatEventTime(event: CalendarEventSummary, timeZone: string): string {
  if (event.allDay) {
    return "All day";
  }

  if (!event.startAt) {
    return "Time unavailable";
  }

  return `${formatTime(event.startAt, timeZone)}${
    event.endAt ? ` to ${formatTime(event.endAt, timeZone)}` : ""
  }`;
}

function formatDayHeading(dateKey: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: "UTC",
  }).format(new Date(`${dateKey}T12:00:00.000Z`));
}

function formatDateHeading(dateKey: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateKey}T12:00:00.000Z`));
}

function formatDateTime(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

function formatTime(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(value));
}

function formatDateKey(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

function formatResponseStatus(
  status: CalendarAttendeeStatus,
): string {
  const statuses: Record<Exclude<CalendarAttendeeStatus, null>, string> = {
    accepted: "Accepted",
    declined: "Declined",
    tentative: "Tentative",
    needsAction: "Awaiting response",
  };

  return status ? statuses[status] : "Response unavailable";
}

type CalendarAttendeeStatus =
  CalendarEventDetail["attendees"][number]["responseStatus"];

function buildCalendarHref(
  view: "agenda" | "week",
  startDate?: string,
): string {
  const params = new URLSearchParams({ view });

  if (startDate) {
    params.set("start", startDate);
  }

  return `/dashboard/calendar?${params.toString()}`;
}

function addDays(date: string, days: number): string {
  const result = new Date(`${date}T12:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}
