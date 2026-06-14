import Link from "next/link";

import { CalendarEventForm } from "@/components/calendar/calendar-event-form";
import {
  CalendarDisconnectedState,
  CalendarNotice,
} from "@/components/calendar/calendar-ui";
import { PageHeader } from "@/components/dashboard/workspace-panels";
import {
  getPrimaryCalendarTimeZone,
  getSuggestedCalendarTimes,
} from "@/server/calendar";
import { getGoogleIntegrationStatuses } from "@/server/google-integrations";

type NewCalendarEventPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewCalendarEventPage({
  searchParams,
}: NewCalendarEventPageProps) {
  const [statuses, params] = await Promise.all([
    getGoogleIntegrationStatuses(),
    searchParams,
  ]);

  if (statuses.googlecalendar !== "connected") {
    return (
      <>
        <PageHeader
          label="New event"
          title="Create a calendar event"
          description="Connect Google Calendar before creating events."
        />
        <CalendarDisconnectedState />
      </>
    );
  }

  const timeZone = await getPrimaryCalendarTimeZone();
  const defaults = getSuggestedCalendarTimes(timeZone);

  return (
    <>
      <PageHeader
        label="New event"
        title="Create a calendar event"
        description="Choose exact times and invite guests through Google Calendar."
        action={<BackToCalendarLink />}
      />
      <CalendarNotice status={getStringParam(params.status)} />
      <CalendarEventForm
        timeZone={timeZone}
        defaultStart={defaults.start}
        defaultEnd={defaults.end}
      />
    </>
  );
}

function BackToCalendarLink() {
  return (
    <Link
      href="/dashboard/calendar"
      className="product-button-secondary inline-flex items-center px-4"
    >
      Back to calendar
    </Link>
  );
}

function getStringParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
