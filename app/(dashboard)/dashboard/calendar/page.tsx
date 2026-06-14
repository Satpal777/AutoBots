import Link from "next/link";
import { z } from "zod";

import { refreshCalendarAction } from "./actions";
import {
  CalendarAgendaView,
  CalendarDisconnectedState,
  CalendarNotice,
  CalendarRangeControls,
  CalendarSectionNav,
  CalendarWeekView,
} from "@/components/calendar/calendar-ui";
import { CalendarSubmitButton } from "@/components/calendar/calendar-submit-button";
import { PageHeader } from "@/components/dashboard/workspace-panels";
import { PlusIcon, RefreshIcon } from "@/components/ui/icons";
import { getCalendarAgenda, type CalendarAgenda } from "@/server/calendar";
import { getGoogleIntegrationStatuses } from "@/server/google-integrations";

type CalendarPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const CalendarViewSchema = z.enum(["agenda", "week"]);
const StartDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/);

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const [statuses, params] = await Promise.all([
    getGoogleIntegrationStatuses(),
    searchParams,
  ]);
  const viewResult = CalendarViewSchema.safeParse(getStringParam(params.view));
  const startResult = StartDateSchema.safeParse(getStringParam(params.start));
  const view = viewResult.success ? viewResult.data : "agenda";
  const startDate = startResult.success ? startResult.data : undefined;
  const status = getStringParam(params.status);

  if (statuses.googlecalendar !== "connected") {
    return (
      <>
        <PageHeader
          label="Calendar"
          title="Your schedule"
          description="Review your week, create events, and invite guests."
        />
        <CalendarDisconnectedState />
      </>
    );
  }

  let agenda: CalendarAgenda | null = null;
  let loadError = false;

  try {
    agenda = await getCalendarAgenda({
      startDate,
      days: view === "week" ? 7 : 14,
    });
  } catch {
    loadError = true;
  }

  return (
    <>
      <PageHeader
        label="Calendar"
        title={view === "week" ? "Your week" : "Upcoming agenda"}
        description="See commitments clearly and make changes without leaving the workspace."
        action={
          <Link
            href="/dashboard/calendar/new"
            className="product-button-primary inline-flex items-center gap-2 px-4"
          >
            <PlusIcon className="size-4" />
            Create event
          </Link>
        }
      />

      <CalendarNotice status={loadError ? "error" : status} />

      <div className="mt-7 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <CalendarSectionNav active={view} startDate={startDate} />
        {agenda ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <CalendarRangeControls agenda={agenda} view={view} />
            <form action={refreshCalendarAction}>
              <input type="hidden" name="startDate" value={startDate ?? ""} />
              <input type="hidden" name="days" value={view === "week" ? 7 : 14} />
              <input type="hidden" name="view" value={view} />
              <CalendarSubmitButton pendingLabel="Refreshing..." variant="quiet">
                <RefreshIcon className="size-4" />
                Refresh
              </CalendarSubmitButton>
            </form>
          </div>
        ) : null}
      </div>

      {agenda ? (
        view === "week" ? (
          <CalendarWeekView agenda={agenda} />
        ) : (
          <CalendarAgendaView agenda={agenda} />
        )
      ) : null}
    </>
  );
}

function getStringParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
