import { z } from "zod";

import {
  CalendarAvailabilityResults,
  CalendarDisconnectedState,
  CalendarNotice,
  CalendarSectionNav,
} from "@/components/calendar/calendar-ui";
import { PageHeader } from "@/components/dashboard/workspace-panels";
import { SearchIcon } from "@/components/ui/icons";
import {
  getCalendarAvailability,
  getPrimaryCalendarTimeZone,
  getSuggestedCalendarTimes,
  isValidTimeZone,
  type CalendarAvailability,
} from "@/server/calendar";
import { getGoogleIntegrationStatuses } from "@/server/google-integrations";

type CalendarAvailabilityPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const DateTimeSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
const AvailabilitySchema = z.object({
  attendees: z
    .string()
    .trim()
    .max(5_000)
    .transform((value) =>
      value
        .split(",")
        .map((attendee) => attendee.trim().toLowerCase())
        .filter(Boolean),
    )
    .refine(
      (attendees) =>
        attendees.length <= 100 &&
        attendees.every((attendee) =>
          z.string().email().safeParse(attendee).success,
        ),
    ),
  start: DateTimeSchema,
  end: DateTimeSchema,
  timeZone: z.string().trim().min(1).max(100).refine(isValidTimeZone),
});

export default async function CalendarAvailabilityPage({
  searchParams,
}: CalendarAvailabilityPageProps) {
  const [statuses, params] = await Promise.all([
    getGoogleIntegrationStatuses(),
    searchParams,
  ]);

  if (statuses.googlecalendar !== "connected") {
    return (
      <>
        <PageHeader
          label="Availability"
          title="Find a meeting window"
          description="Connect Google Calendar before checking availability."
        />
        <CalendarDisconnectedState />
      </>
    );
  }

  const calendarTimeZone = await getPrimaryCalendarTimeZone();
  const defaults = getSuggestedCalendarTimes(calendarTimeZone);
  const rawAttendees = getStringParam(params.attendees) ?? "";
  const rawStart = getStringParam(params.start) ?? defaults.start;
  const rawEnd = getStringParam(params.end) ?? defaults.end;
  const rawTimeZone = getStringParam(params.timeZone) ?? calendarTimeZone;
  const hasLookup = Boolean(getStringParam(params.start));
  const result = hasLookup
    ? AvailabilitySchema.safeParse({
        attendees: rawAttendees,
        start: rawStart,
        end: rawEnd,
        timeZone: rawTimeZone,
      })
    : null;
  let availability: CalendarAvailability | null = null;
  let status = getStringParam(params.status);

  if (result?.success) {
    try {
      availability = await getCalendarAvailability(result.data);
    } catch {
      status = "error";
    }
  } else if (result && !result.success) {
    status = "invalid";
  }

  return (
    <>
      <PageHeader
        label="Availability"
        title="Find a meeting window"
        description="Compare busy windows before sending a calendar invitation."
      />
      <CalendarNotice status={status} />

      <div className="mt-7">
        <CalendarSectionNav active="availability" />
      </div>

      <form
        action="/dashboard/calendar/availability"
        className="product-panel mt-7 max-w-5xl p-5 sm:p-7"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-ink md:col-span-2">
            People to compare
            <input
              type="text"
              name="attendees"
              maxLength={5_000}
              defaultValue={rawAttendees}
              placeholder="friend@example.com, client@example.com"
              className="product-input px-4 text-sm font-normal"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ink">
            Window starts
            <input
              type="datetime-local"
              name="start"
              required
              defaultValue={rawStart}
              className="product-input px-4 text-sm font-normal"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ink">
            Window ends
            <input
              type="datetime-local"
              name="end"
              required
              defaultValue={rawEnd}
              className="product-input px-4 text-sm font-normal"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ink md:col-span-2">
            Timezone
            <input
              type="text"
              name="timeZone"
              required
              maxLength={100}
              defaultValue={rawTimeZone}
              className="product-input px-4 text-sm font-normal"
            />
          </label>
        </div>
        <div className="mt-5 flex justify-end">
          <button
            type="submit"
            className="product-button-primary inline-flex items-center gap-2 px-4"
          >
            <SearchIcon className="size-4" />
            Check availability
          </button>
        </div>
      </form>

      {availability ? (
        <CalendarAvailabilityResults availability={availability} />
      ) : null}
    </>
  );
}

function getStringParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
