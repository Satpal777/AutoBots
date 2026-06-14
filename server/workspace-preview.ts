import "server-only";

import type {
  GoogleIntegrationStatus,
  GoogleIntegrationStatuses,
} from "./google-integrations";
import { getCalendarAgenda } from "./calendar";
import { getCorsairTenant } from "./corsair-tenant";

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

const GMAIL_PREVIEW_HEADERS = {
  from: "From",
  subject: "Subject",
} as const;

type GmailHeader = {
  name?: string;
  value?: string;
};

type GmailMessageSource = {
  labelIds?: string[];
  snippet?: string;
  internalDate?: string | number | Date | null;
  payload?: {
    headers?: GmailHeader[];
  };
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

  return getGmailPreview(await getCorsairTenant());
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

async function getGmailPreview(
  tenant: Awaited<ReturnType<typeof getCorsairTenant>>,
): Promise<GmailPreview> {
  try {
    const [inbox, inboxLabel] = await Promise.all([
      tenant.gmail.api.threads.list({
        labelIds: ["INBOX"],
        maxResults: 8,
      }),
      tenant.gmail.api.labels.get({ id: "INBOX" }),
    ]);

    const threadResults = await Promise.allSettled(
      (inbox.threads ?? [])
        .filter((thread): thread is typeof thread & { id: string } =>
          Boolean(thread.id),
        )
        .map((thread) => getGmailThreadPreview(tenant, thread.id)),
    );
    const threads = threadResults.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    );

    if ((inbox.threads?.length ?? 0) > 0 && threads.length === 0) {
      return { status: "error", unreadCount: 0, threads: [] };
    }

    return {
      status: "ready",
      unreadCount: inboxLabel.threadsUnread ?? 0,
      threads,
    };
  } catch {
    return { status: "error", unreadCount: 0, threads: [] };
  }
}

async function getGmailThreadPreview(
  tenant: Awaited<ReturnType<typeof getCorsairTenant>>,
  threadId: string,
): Promise<GmailPreview["threads"][number]> {
  const detail = await tenant.gmail.api.threads.get({
    id: threadId,
    format: "metadata",
  });
  const messages = [...(detail.messages ?? [])].sort(
    (left, right) =>
      getDateTimestamp(left.internalDate) - getDateTimestamp(right.internalDate),
  );
  const latestMessage = getLatestGmailMessage(messages);
  const receivedAt = formatGmailReceivedAt(latestMessage?.internalDate);

  return {
    id: threadId,
    from: getFirstGmailHeader(messages, GMAIL_PREVIEW_HEADERS.from, "newest"),
    subject: getFirstGmailHeader(
      messages,
      GMAIL_PREVIEW_HEADERS.subject,
      "oldest",
    ),
    snippet: firstNonEmpty(latestMessage?.snippet, detail.snippet),
    receivedAt,
    unread: messages.some((message) => message.labelIds?.includes("UNREAD")),
    messageCount: messages.length,
  };
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

function getGmailHeader(
  headers: GmailHeader[] | undefined,
  name: string,
): string | null {
  return firstNonEmpty(
    headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())
      ?.value,
  );
}

function getFirstGmailHeader(
  messages: GmailMessageSource[],
  name: string,
  order: "oldest" | "newest",
): string | null {
  const start = order === "oldest" ? 0 : messages.length - 1;
  const end = order === "oldest" ? messages.length : -1;
  const step = order === "oldest" ? 1 : -1;

  for (let index = start; index !== end; index += step) {
    const value = getGmailHeader(messages[index]?.payload?.headers, name);

    if (value) {
      return value;
    }
  }

  return null;
}

function getLatestGmailMessage(
  messages: GmailMessageSource[],
): GmailMessageSource | undefined {
  return messages.reduce<GmailMessageSource | undefined>((latest, message) => {
    if (!latest) {
      return message;
    }

    return getDateTimestamp(message.internalDate) >=
      getDateTimestamp(latest.internalDate)
      ? message
      : latest;
  }, undefined);
}

function formatGmailReceivedAt(
  value: GmailMessageSource["internalDate"],
): string | null {
  const timestamp = getDateTimestamp(value);

  return timestamp > 0 ? new Date(timestamp).toISOString() : null;
}

function getDateTimestamp(
  value: GmailMessageSource["internalDate"],
): number {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const numericTimestamp = Number(value);

    return Number.isFinite(numericTimestamp)
      ? numericTimestamp
      : Date.parse(value);
  }

  return 0;
}

function firstNonEmpty(...values: (string | null | undefined)[]): string | null {
  for (const value of values) {
    const normalized = value?.trim();

    if (normalized) {
      return normalized;
    }
  }

  return null;
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
