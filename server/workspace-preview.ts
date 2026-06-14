import "server-only";

import type {
  GoogleIntegrationStatus,
  GoogleIntegrationStatuses,
} from "./google-integrations";
import { getCalendarAgenda } from "./calendar";
import { getGmailInbox } from "./gmail";

export type GmailPreview = {
  status: "ready" | "disconnected" | "error";
  unreadCount: number;
  threads: {
    id: string;
    from: string | null;
    subject: string | null;
    snippet: string | null;
    receivedAt: string | null;
    unread: boolean;
    messageCount: number;
  }[];
};

export type CalendarPreview = {
  status: "ready" | "disconnected" | "error";
  events: {
    id: string;
    title: string | null;
    when: string | null;
    location?: string;
  }[];
};

export type WorkspacePreview = {
  gmail: GmailPreview;
  calendar: CalendarPreview;
};

export async function getWorkspacePreview(
  statuses: GoogleIntegrationStatuses,
): Promise<WorkspacePreview> {
  const [gmail, calendar] = await Promise.all([
    statuses.gmail === "connected"
      ? getGmailPreview()
      : Promise.resolve<GmailPreview>({
          status: statuses.gmail === "error" ? "error" : "disconnected",
          unreadCount: 0,
          threads: [],
        }),
    statuses.googlecalendar === "connected"
      ? getCalendarPreview()
      : Promise.resolve<CalendarPreview>({
          status:
            statuses.googlecalendar === "error" ? "error" : "disconnected",
          events: [],
        }),
  ]);

  return { gmail, calendar };
}

export async function getGmailWorkspacePreview(
  status: GoogleIntegrationStatus,
): Promise<GmailPreview> {
  if (status !== "connected") {
    return {
      status: status === "error" ? "error" : "disconnected",
      unreadCount: 0,
      threads: [],
    };
  }

  return getGmailPreview();
}

export async function getCalendarWorkspacePreview(
  status: GoogleIntegrationStatus,
): Promise<CalendarPreview> {
  if (status !== "connected") {
    return {
      status: status === "error" ? "error" : "disconnected",
      events: [],
    };
  }

  return getCalendarPreview();
}

async function getGmailPreview(): Promise<GmailPreview> {
  try {
    const inbox = await getGmailInbox();
    const threads = inbox.threads.slice(0, 8);
    return {
      status: "ready",
      unreadCount: inbox.threads.filter((thread) => thread.unread).length,
      threads,
    };
  } catch {
    return { status: "error", unreadCount: 0, threads: [] };
  }
}

async function getCalendarPreview(): Promise<CalendarPreview> {
  try {
    const agenda = await getCalendarAgenda({ days: 7 });

    return {
      status: "ready",
      events: agenda.events
        .slice(0, 8)
        .map((event) => ({
          id: event.id,
          title: event.title,
          when: formatEventTime(
            event.startDate
              ? { date: event.startDate }
              : {
                  dateTime: event.startAt ?? undefined,
                  timeZone: agenda.timeZone,
                },
          ),
          ...(event.location ? { location: event.location } : {}),
        })),
    };
  } catch {
    return { status: "error", events: [] };
  }
}

function formatEventTime(
  start:
    | {
        date?: string;
        dateTime?: string;
        timeZone?: string;
      }
    | undefined,
): string | null {
  if (start?.date) {
    return `${start.date} · All day`;
  }

  if (!start?.dateTime) {
    return null;
  }

  const date = new Date(start.dateTime);
  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...(isValidTimeZone(start.timeZone) ? { timeZone: start.timeZone } : {}),
  };

  return `${new Intl.DateTimeFormat("en-US", options).format(date)}${
    start.timeZone ? ` · ${start.timeZone}` : ""
  }`;
}

function isValidTimeZone(timeZone: string | undefined): timeZone is string {
  if (!timeZone) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}
