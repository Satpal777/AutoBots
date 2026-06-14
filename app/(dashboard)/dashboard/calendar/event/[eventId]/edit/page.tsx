import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { CalendarEventForm } from "@/components/calendar/calendar-event-form";
import {
  CalendarDisconnectedState,
  CalendarNotice,
} from "@/components/calendar/calendar-ui";
import { PageHeader } from "@/components/dashboard/workspace-panels";
import { getCalendarEvent } from "@/server/calendar";
import { getGoogleIntegrationStatuses } from "@/server/google-integrations";

type EditCalendarEventPageProps = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const CalendarIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(256)
  .regex(/^[A-Za-z0-9_-]+$/);

export default async function EditCalendarEventPage({
  params,
  searchParams,
}: EditCalendarEventPageProps) {
  const [{ eventId: rawEventId }, queryParams, statuses] = await Promise.all([
    params,
    searchParams,
    getGoogleIntegrationStatuses(),
  ]);
  const eventIdResult = CalendarIdSchema.safeParse(rawEventId);

  if (!eventIdResult.success) {
    notFound();
  }

  if (statuses.googlecalendar !== "connected") {
    return (
      <>
        <PageHeader
          label="Edit event"
          title="Calendar is not connected"
          description="Reconnect Google Calendar before editing events."
        />
        <CalendarDisconnectedState />
      </>
    );
  }

  const event = await getCalendarEvent(eventIdResult.data);

  if (!event) {
    notFound();
  }

  return (
    <>
      <PageHeader
        label="Edit event"
        title={event.title ?? "Untitled event"}
        description="Saving changes sends updates to invited guests."
        action={
          <Link
            href={`/dashboard/calendar/event/${encodeURIComponent(event.id)}`}
            className="product-button-secondary inline-flex items-center px-4"
          >
            Back to event
          </Link>
        }
      />
      <CalendarNotice status={getStringParam(queryParams.status)} />
      <CalendarEventForm event={event} timeZone={event.timeZone} />
    </>
  );
}

function getStringParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
