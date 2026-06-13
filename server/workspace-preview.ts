import "server-only";

import type { GoogleIntegrationStatuses } from "./google-integrations";
import { getCorsairTenant } from "./corsair-tenant";

export type GmailPreview = {
  status: "ready" | "disconnected" | "error";
  unreadEstimate: number;
  threads: {
    id: string;
    from: string;
    subject: string;
    snippet: string;
  }[];
};

export type CalendarPreview = {
  status: "ready" | "disconnected" | "error";
  events: {
    id: string;
    title: string;
    when: string;
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
  const tenant = await getCorsairTenant();
  const [gmail, calendar] = await Promise.all([
    statuses.gmail === "connected"
      ? getGmailPreview(tenant)
      : Promise.resolve<GmailPreview>({
          status: statuses.gmail === "error" ? "error" : "disconnected",
          unreadEstimate: 0,
          threads: [],
        }),
    statuses.googlecalendar === "connected"
      ? getCalendarPreview(tenant)
      : Promise.resolve<CalendarPreview>({
          status:
            statuses.googlecalendar === "error" ? "error" : "disconnected",
          events: [],
        }),
  ]);

  return { gmail, calendar };
}

async function getGmailPreview(
  tenant: Awaited<ReturnType<typeof getCorsairTenant>>,
): Promise<GmailPreview> {
  try {
    const [inbox, unread] = await Promise.all([
      tenant.gmail.api.threads.list({
        labelIds: ["INBOX"],
        maxResults: 3,
      }),
      tenant.gmail.api.threads.list({
        q: "is:unread in:inbox",
        maxResults: 1,
      }),
    ]);

    const threads = await Promise.all(
      (inbox.threads ?? [])
        .filter((thread): thread is typeof thread & { id: string } =>
          Boolean(thread.id),
        )
        .map(async (thread) => {
          const detail = await tenant.gmail.api.threads.get({
            id: thread.id,
            format: "metadata",
            metadataHeaders: ["From", "Subject"],
          });
          const latestMessage = detail.messages?.at(-1);

          return {
            id: thread.id,
            from: getGmailHeader(latestMessage?.payload?.headers, "From"),
            subject: getGmailHeader(
              latestMessage?.payload?.headers,
              "Subject",
              "(No subject)",
            ),
            snippet: detail.snippet ?? latestMessage?.snippet ?? "",
          };
        }),
    );

    return {
      status: "ready",
      unreadEstimate: unread.resultSizeEstimate ?? 0,
      threads,
    };
  } catch {
    return { status: "error", unreadEstimate: 0, threads: [] };
  }
}

async function getCalendarPreview(
  tenant: Awaited<ReturnType<typeof getCorsairTenant>>,
): Promise<CalendarPreview> {
  try {
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + 7);

    const result = await tenant.googlecalendar.api.events.getMany({
      calendarId: "primary",
      timeMin: now.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 5,
    });

    return {
      status: "ready",
      events: (result.items ?? [])
        .filter((event): event is typeof event & { id: string } =>
          Boolean(event.id),
        )
        .map((event) => ({
          id: event.id,
          title: event.summary ?? "(Untitled event)",
          when: formatEventTime(event.start),
          ...(event.location ? { location: event.location } : {}),
        })),
    };
  } catch {
    return { status: "error", events: [] };
  }
}

function getGmailHeader(
  headers:
    | {
        name?: string;
        value?: string;
      }[]
    | undefined,
  name: string,
  fallback = "Unknown sender",
): string {
  return (
    headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())
      ?.value ?? fallback
  );
}

function formatEventTime(
  start:
    | {
        date?: string;
        dateTime?: string;
        timeZone?: string;
      }
    | undefined,
): string {
  if (start?.date) {
    return `${start.date} · All day`;
  }

  if (!start?.dateTime) {
    return "Time not provided";
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
