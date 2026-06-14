import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import {
  CalendarDisconnectedState,
  CalendarEventView,
  CalendarNotice,
} from "@/components/calendar/calendar-ui";
import { MeetingPreparationPanel } from "@/components/dashboard/briefing-panels";
import { PageHeader } from "@/components/dashboard/workspace-panels";
import { PencilIcon } from "@/components/ui/icons";
import { getCalendarEvent } from "@/server/calendar";
import { getGoogleIntegrationStatuses } from "@/server/google-integrations";
import { getMeetingPreparation } from "@/server/meeting-preparation";

type CalendarEventPageProps = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const CalendarIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(256)
  .regex(/^[A-Za-z0-9_-]+$/);

export default async function CalendarEventPage({
  params,
  searchParams,
}: CalendarEventPageProps) {
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
          label="Event"
          title="Calendar is not connected"
          description="Reconnect Google Calendar to open this event."
        />
        <CalendarDisconnectedState />
      </>
    );
  }

  const event = await getCalendarEvent(eventIdResult.data);

  if (!event) {
    notFound();
  }
  const preparation = await getMeetingPreparation(event);

  return (
    <>
      <PageHeader
        label="Event"
        title={event.title ?? "Untitled event"}
        description={
          event.awaitingResponse
            ? "This invitation is waiting for your response."
            : "Review the event details and guest responses."
        }
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/calendar"
              className="product-button-secondary inline-flex items-center px-4"
            >
              Back to calendar
            </Link>
            <Link
              href={`/dashboard/calendar/event/${encodeURIComponent(event.id)}/edit`}
              className="product-button-primary inline-flex items-center gap-2 px-4"
            >
              <PencilIcon className="size-4" />
              Edit event
            </Link>
          </div>
        }
      />
      <CalendarNotice status={getStringParam(queryParams.status)} />
      <CalendarEventView event={event} />
      {preparation ? <MeetingPreparationPanel preparation={preparation} /> : null}
    </>
  );
}

function getStringParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
