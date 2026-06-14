import "server-only";

import type { Event, EventDateTime } from "@corsair-dev/googlecalendar";
import { and, asc, eq, sql } from "drizzle-orm";
import { getCorsairTenantId } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { corsairAccounts, corsairEntities } from "@/lib/db/schema";

import { getCorsairTenant } from "./corsair-tenant";

const PRIMARY_CALENDAR_ID = "primary";
const DEFAULT_TIME_ZONE = "UTC";
const CALENDAR_PAGE_SIZE = 250;

export type CalendarAttendee = {
  email: string;
  displayName: string | null;
  responseStatus: "needsAction" | "declined" | "tentative" | "accepted" | null;
  optional: boolean;
  self: boolean;
};

export type CalendarEventSummary = {
  id: string;
  title: string | null;
  location: string | null;
  startAt: string | null;
  endAt: string | null;
  startDate: string | null;
  endDate: string | null;
  allDay: boolean;
  timeZone: string;
  status: "confirmed" | "tentative" | "cancelled" | null;
  attendeeCount: number;
  awaitingResponse: boolean;
};

export type CalendarEventDetail = CalendarEventSummary & {
  description: string | null;
  organizer: string | null;
  attendees: CalendarAttendee[];
  htmlLink: string | null;
  hangoutLink: string | null;
  formStart: string;
  formEnd: string;
};

export type CalendarAgenda = {
  events: CalendarEventSummary[];
  rangeStart: string;
  rangeEnd: string;
  timeZone: string;
};

export type CalendarEventInput = {
  summary: string;
  description?: string;
  location?: string;
  attendees: string[];
  allDay: boolean;
  start: string;
  end: string;
  timeZone: string;
};

export type CalendarAvailability = {
  timeZone: string;
  rangeStart: string;
  rangeEnd: string;
  calendars: {
    id: string;
    busy: { start: string; end: string }[];
    error: boolean;
  }[];
};

type CalendarTenant = Awaited<ReturnType<typeof getCorsairTenant>>;
type CachedCalendarEvent = Awaited<
  ReturnType<CalendarTenant["googlecalendar"]["db"]["events"]["list"]>
>[number];

export async function getCalendarAgenda(input?: {
  startDate?: string;
  days?: number;
}): Promise<CalendarAgenda> {
  const tenant = await getCorsairTenant();
  let timeZone = await getPrimaryCalendarTimeZone(tenant);
  let range = getCalendarRange(input?.startDate, input?.days ?? 14, timeZone);
  let events = await getCachedEventsInRange(tenant, range.start, range.end);

  if (events.length === 0) {
    const refreshedTimeZone = await refreshCalendarRange(
      tenant,
      range.start,
      range.end,
    );

    if (refreshedTimeZone && refreshedTimeZone !== timeZone) {
      timeZone = refreshedTimeZone;
      range = getCalendarRange(input?.startDate, input?.days ?? 14, timeZone);
    }

    events = await getCachedEventsInRange(tenant, range.start, range.end);
  }

  return {
    events: events.map((event) => toEventSummary(event.data, event.entity_id, timeZone)),
    rangeStart: range.start.toISOString(),
    rangeEnd: range.end.toISOString(),
    timeZone,
  };
}

export async function refreshCalendarAgenda(input?: {
  startDate?: string;
  days?: number;
}): Promise<void> {
  const tenant = await getCorsairTenant();
  const timeZone = await getPrimaryCalendarTimeZone(tenant);
  const range = getCalendarRange(input?.startDate, input?.days ?? 14, timeZone);
  await refreshCalendarRange(tenant, range.start, range.end);
}

export async function getCalendarEvent(
  eventId: string,
): Promise<CalendarEventDetail | null> {
  const tenant = await getCorsairTenant();
  const timeZone = await getPrimaryCalendarTimeZone(tenant);
  const cached = await tenant.googlecalendar.db.events.findByEntityId(eventId);

  if (cached) {
    return toEventDetail(cached.data, cached.entity_id, timeZone);
  }

  try {
    const event = await tenant.googlecalendar.api.events.get({
      calendarId: PRIMARY_CALENDAR_ID,
      id: eventId,
      timeZone,
    });

    return event.id ? toEventDetail(event, event.id, timeZone) : null;
  } catch {
    return null;
  }
}

export async function getPrimaryCalendarTimeZone(): Promise<string>;
export async function getPrimaryCalendarTimeZone(
  tenant: CalendarTenant,
): Promise<string>;
export async function getPrimaryCalendarTimeZone(
  providedTenant?: CalendarTenant,
): Promise<string> {
  const tenant = providedTenant ?? (await getCorsairTenant());
  const calendar = await tenant.googlecalendar.db.calendars.findByEntityId(
    PRIMARY_CALENDAR_ID,
  );

  if (isValidTimeZone(calendar?.data.timeZone)) {
    return calendar.data.timeZone;
  }

  const events = await tenant.googlecalendar.db.events.list({ limit: 50 });
  const eventTimeZone = events
    .flatMap(({ data }) => [data.start?.timeZone, data.end?.timeZone])
    .find(isValidTimeZone);

  return eventTimeZone ?? DEFAULT_TIME_ZONE;
}

export function getSuggestedCalendarTimes(timeZone: string): {
  start: string;
  end: string;
} {
  const start = new Date();
  start.setUTCMinutes(Math.ceil(start.getUTCMinutes() / 30) * 30, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1_000);

  return {
    start: formatLocalDateTime(start, timeZone),
    end: formatLocalDateTime(end, timeZone),
  };
}

export async function createCalendarEvent(
  input: CalendarEventInput,
): Promise<string | null> {
  const tenant = await getCorsairTenant();
  const result = await tenant.googlecalendar.api.events.create({
    calendarId: PRIMARY_CALENDAR_ID,
    event: buildCalendarEvent(input),
    sendUpdates: input.attendees.length > 0 ? "all" : "none",
  });

  return result.id ?? null;
}

export async function updateCalendarEvent(
  eventId: string,
  input: CalendarEventInput,
): Promise<void> {
  const tenant = await getCorsairTenant();
  const existing = await tenant.googlecalendar.api.events.get({
    calendarId: PRIMARY_CALENDAR_ID,
    id: eventId,
  });

  await tenant.googlecalendar.api.events.update({
    calendarId: PRIMARY_CALENDAR_ID,
    id: eventId,
    event: {
      ...pickPreservedEventFields(existing),
      ...buildCalendarEvent(input),
    },
    sendUpdates: input.attendees.length > 0 ? "all" : "none",
  });
}

export async function getCalendarAvailability(input: {
  attendees: string[];
  start: string;
  end: string;
  timeZone: string;
}): Promise<CalendarAvailability> {
  const tenant = await getCorsairTenant();
  const rangeStart = zonedDateTimeToIso(input.start, input.timeZone);
  const rangeEnd = zonedDateTimeToIso(input.end, input.timeZone);

  if (Date.parse(rangeEnd) <= Date.parse(rangeStart)) {
    throw new Error("Availability end time must be after its start time.");
  }

  const calendarIds = [...new Set([PRIMARY_CALENDAR_ID, ...input.attendees])];
  const result = await tenant.googlecalendar.api.calendar.getAvailability({
    timeMin: rangeStart,
    timeMax: rangeEnd,
    timeZone: input.timeZone,
    items: calendarIds.map((id) => ({ id })),
  });

  return {
    timeZone: input.timeZone,
    rangeStart,
    rangeEnd,
    calendars: calendarIds.map((id) => {
      const calendar = result.calendars?.[id];

      return {
        id,
        busy: (calendar?.busy ?? []).flatMap((slot) =>
          slot.start && slot.end ? [{ start: slot.start, end: slot.end }] : [],
        ),
        error: (calendar?.errors?.length ?? 0) > 0,
      };
    }),
  };
}

export function isValidTimeZone(value: string | null | undefined): value is string {
  if (!value) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function zonedDateTimeToIso(
  localDateTime: string,
  timeZone: string,
): string {
  if (!isValidTimeZone(timeZone)) {
    throw new Error("Use a valid IANA timezone.");
  }

  const match = localDateTime.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/,
  );

  if (!match) {
    throw new Error("Use a complete date and time.");
  }

  const [, year, month, day, hour, minute] = match;
  const desiredTimestamp = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
  );
  let timestamp = desiredTimestamp;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    timestamp = desiredTimestamp - getTimeZoneOffset(timestamp, timeZone);
  }

  if (formatLocalDateTime(new Date(timestamp), timeZone) !== localDateTime) {
    throw new Error(
      "That local time does not exist in the selected timezone. Choose another time.",
    );
  }

  if (
    [timestamp - 60 * 60 * 1_000, timestamp + 60 * 60 * 1_000].some(
      (candidate) =>
        candidate !== timestamp &&
        formatLocalDateTime(new Date(candidate), timeZone) === localDateTime,
    )
  ) {
    throw new Error(
      "That local time occurs twice in the selected timezone. Choose an unambiguous time.",
    );
  }

  return new Date(timestamp).toISOString();
}

async function refreshCalendarRange(
  tenant: CalendarTenant,
  start: Date,
  end: Date,
): Promise<string | null> {
  let pageToken: string | undefined;
  let resolvedTimeZone: string | null = null;

  for (let page = 0; page < 20; page += 1) {
    const result = await tenant.googlecalendar.api.events.getMany({
      calendarId: PRIMARY_CALENDAR_ID,
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: CALENDAR_PAGE_SIZE,
      ...(pageToken ? { pageToken } : {}),
    });
    if (isValidTimeZone(result.timeZone)) resolvedTimeZone = result.timeZone;
    pageToken = result.nextPageToken;
    if (!pageToken) break;
  }

  if (resolvedTimeZone) {
    await tenant.googlecalendar.db.calendars.upsertByEntityId(
      PRIMARY_CALENDAR_ID,
      {
        id: PRIMARY_CALENDAR_ID,
        summary: "Primary calendar",
        timeZone: resolvedTimeZone,
        createdAt: new Date(),
      },
    );

    return resolvedTimeZone;
  }

  return null;
}

async function getCachedEventsInRange(
  _tenant: CalendarTenant,
  start: Date,
  end: Date,
): Promise<CachedCalendarEvent[]> {
  const userId = await getCorsairTenantId();
  const startIso = start.toISOString();
  const endIso = end.toISOString();
  const eventStart = sql<string>`coalesce(${corsairEntities.data}->'start'->>'dateTime', ${corsairEntities.data}->'start'->>'date')::timestamptz`;
  const eventEnd = sql<string>`coalesce(${corsairEntities.data}->'end'->>'dateTime', ${corsairEntities.data}->'end'->>'date', ${corsairEntities.data}->'start'->>'dateTime', ${corsairEntities.data}->'start'->>'date')::timestamptz`;
  const rows = await getDb().select({
    id: corsairEntities.id,
    entity_id: corsairEntities.entityId,
    entity_type: corsairEntities.entityType,
    version: corsairEntities.version,
    data: corsairEntities.data,
    created_at: corsairEntities.createdAt,
    updated_at: corsairEntities.updatedAt,
  }).from(corsairEntities)
    .innerJoin(corsairAccounts, eq(corsairEntities.accountId, corsairAccounts.id))
    .where(and(
      eq(corsairAccounts.tenantId, userId),
      eq(corsairEntities.entityType, "events"),
      sql`coalesce(${corsairEntities.data}->>'calendarId', ${PRIMARY_CALENDAR_ID}) = ${PRIMARY_CALENDAR_ID}`,
      sql`coalesce(${corsairEntities.data}->>'status', 'confirmed') <> 'cancelled'`,
      sql`${eventStart} < ${endIso}::timestamptz`,
      sql`${eventEnd} > ${startIso}::timestamptz`,
    ))
    .orderBy(asc(eventStart))
    .limit(1_000);

  return rows as CachedCalendarEvent[];
}

function getCalendarRange(
  startDate: string | undefined,
  days: number,
  timeZone: string,
): { start: Date; end: Date } {
  const normalizedDays = Math.min(Math.max(days, 1), 31);
  const localStart = startDate && isDateOnly(startDate)
    ? startDate
    : formatDateOnly(new Date(), timeZone);
  const start = new Date(zonedDateTimeToIso(`${localStart}T00:00`, timeZone));
  const endDate = addDays(localStart, normalizedDays);
  const end = new Date(zonedDateTimeToIso(`${endDate}T00:00`, timeZone));

  return { start, end };
}

function toEventSummary(
  event: Event,
  fallbackId: string,
  calendarTimeZone: string,
): CalendarEventSummary {
  const timeZone =
    [event.start?.timeZone, event.end?.timeZone].find(isValidTimeZone) ??
    calendarTimeZone;
  const selfAttendee = event.attendees?.find((attendee) => attendee.self);

  return {
    id: event.id ?? fallbackId,
    title: normalizeText(event.summary),
    location: normalizeText(event.location),
    startAt: normalizeText(event.start?.dateTime),
    endAt: normalizeText(event.end?.dateTime),
    startDate: normalizeText(event.start?.date),
    endDate: normalizeText(event.end?.date),
    allDay: Boolean(event.start?.date),
    timeZone,
    status: event.status ?? null,
    attendeeCount: event.attendees?.length ?? 0,
    awaitingResponse: selfAttendee?.responseStatus === "needsAction",
  };
}

function toEventDetail(
  event: Event,
  fallbackId: string,
  calendarTimeZone: string,
): CalendarEventDetail {
  const summary = toEventSummary(event, fallbackId, calendarTimeZone);
  const attendees = (event.attendees ?? []).flatMap((attendee) =>
    attendee.email
      ? [
          {
            email: attendee.email,
            displayName: normalizeText(attendee.displayName),
            responseStatus: attendee.responseStatus ?? null,
            optional: attendee.optional ?? false,
            self: attendee.self ?? false,
          },
        ]
      : [],
  );

  return {
    ...summary,
    description: normalizeText(event.description),
    organizer: normalizeText(
      event.organizer?.displayName ?? event.organizer?.email,
    ),
    attendees,
    htmlLink: safeHttpsUrl(event.htmlLink),
    hangoutLink: safeHttpsUrl(event.hangoutLink),
    formStart: getFormDateTime(event.start, summary.timeZone, false),
    formEnd: getFormDateTime(event.end, summary.timeZone, summary.allDay),
  };
}

function buildCalendarEvent(input: CalendarEventInput): Event {
  if (!isValidTimeZone(input.timeZone)) {
    throw new Error("Use a valid IANA timezone.");
  }

  if (
    input.allDay &&
    (!isDateOnly(input.start) || !isDateOnly(input.end))
  ) {
    throw new Error("Use complete calendar dates.");
  }

  const start = input.allDay
    ? { date: input.start }
    : {
        dateTime: zonedDateTimeToIso(input.start, input.timeZone),
        timeZone: input.timeZone,
      };
  const end = input.allDay
    ? { date: addDays(input.end, 1) }
    : {
        dateTime: zonedDateTimeToIso(input.end, input.timeZone),
        timeZone: input.timeZone,
      };
  const startTimestamp = getEventTimestamp(start, "start");
  const endTimestamp = getEventTimestamp(end, "end");

  if (endTimestamp <= startTimestamp) {
    throw new Error("Event end time must be after its start time.");
  }

  return {
    summary: input.summary,
    ...(input.description ? { description: input.description } : {}),
    ...(input.location ? { location: input.location } : {}),
    start,
    end,
    attendees: input.attendees.map((email) => ({ email })),
  };
}

function pickPreservedEventFields(event: Event): Event {
  return {
    ...(event.recurrence ? { recurrence: event.recurrence } : {}),
    ...(event.colorId ? { colorId: event.colorId } : {}),
    ...(event.transparency ? { transparency: event.transparency } : {}),
    ...(event.visibility ? { visibility: event.visibility } : {}),
    ...(event.eventType ? { eventType: event.eventType } : {}),
    ...(event.status ? { status: event.status } : {}),
    ...(event.sequence !== undefined ? { sequence: event.sequence } : {}),
    ...(event.originalStartTime
      ? { originalStartTime: event.originalStartTime }
      : {}),
    ...(event.recurringEventId
      ? { recurringEventId: event.recurringEventId }
      : {}),
    ...(event.reminders ? { reminders: event.reminders } : {}),
    ...(event.guestsCanModify !== undefined
      ? { guestsCanModify: event.guestsCanModify }
      : {}),
    ...(event.guestsCanInviteOthers !== undefined
      ? { guestsCanInviteOthers: event.guestsCanInviteOthers }
      : {}),
    ...(event.guestsCanSeeOtherGuests !== undefined
      ? { guestsCanSeeOtherGuests: event.guestsCanSeeOtherGuests }
      : {}),
  };
}

function getFormDateTime(
  value: EventDateTime | undefined,
  timeZone: string,
  allDayEnd: boolean,
): string {
  if (value?.date) {
    return allDayEnd ? addDays(value.date, -1) : value.date;
  }

  if (!value?.dateTime) {
    return "";
  }

  return formatLocalDateTime(new Date(value.dateTime), timeZone);
}

function getEventTimestamp(
  value: EventDateTime | undefined,
  boundary: "start" | "end",
): number {
  if (value?.dateTime) {
    return Date.parse(value.dateTime) || 0;
  }

  if (value?.date) {
    const timestamp = Date.parse(`${value.date}T00:00:00.000Z`);
    return timestamp || (boundary === "end" ? Number.MAX_SAFE_INTEGER : 0);
  }

  return boundary === "end" ? Number.MAX_SAFE_INTEGER : 0;
}

function getTimeZoneOffset(timestamp: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );

  return asUtc - timestamp;
}

function formatLocalDateTime(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

function formatDateOnly(date: Date, timeZone: string): string {
  return formatLocalDateTime(date, timeZone).slice(0, 10);
}

function addDays(date: string, days: number): string {
  if (!isDateOnly(date)) {
    throw new Error("Use a complete calendar date.");
  }

  const result = new Date(`${date}T12:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

function isDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function normalizeText(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

function safeHttpsUrl(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
