"use client";

import { useState } from "react";

import {
  createCalendarEventAction,
  updateCalendarEventAction,
} from "@/app/(dashboard)/dashboard/calendar/actions";
import type { CalendarEventDetail } from "@/server/calendar";
import { CalendarIcon, SendIcon } from "@/components/ui/icons";

import { CalendarSubmitButton } from "./calendar-submit-button";

export function CalendarEventForm({
  event,
  timeZone,
  defaultStart,
  defaultEnd,
}: {
  event?: CalendarEventDetail | null;
  timeZone: string;
  defaultStart?: string;
  defaultEnd?: string;
}) {
  const [allDay, setAllDay] = useState(event?.allDay ?? false);

  return (
    <form
      action={event ? updateCalendarEventAction : createCalendarEventAction}
      className="product-panel mt-8 max-w-5xl p-5 sm:p-7"
    >
      {event ? <input type="hidden" name="eventId" value={event.id} /> : null}
      <input type="hidden" name="allDay" value={allDay ? "true" : "false"} />

      <div className="grid gap-5 lg:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-ink lg:col-span-2">
          Event title
          <input
            type="text"
            name="summary"
            required
            maxLength={1_000}
            defaultValue={event?.title ?? ""}
            className="product-input px-4 text-sm font-normal"
          />
        </label>

        <label className="grid gap-2 text-sm font-semibold text-ink">
          Location
          <input
            type="text"
            name="location"
            maxLength={1_000}
            defaultValue={event?.location ?? ""}
            placeholder="Office, call link, or address"
            className="product-input px-4 text-sm font-normal"
          />
        </label>

        <label className="grid gap-2 text-sm font-semibold text-ink">
          Timezone
          <input
            type="text"
            name="timeZone"
            required
            maxLength={100}
            defaultValue={event?.timeZone ?? timeZone}
            placeholder="America/New_York"
            className="product-input px-4 text-sm font-normal"
          />
          <span className="text-xs font-normal leading-5 text-muted">
            Use an IANA timezone so invitations keep the intended local time.
          </span>
        </label>

        <label className="flex min-h-11 items-center gap-3 rounded-lg bg-surface-soft px-4 text-sm font-semibold text-forest lg:col-span-2">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(event) => setAllDay(event.target.checked)}
            className="size-4 accent-forest"
          />
          All-day event
        </label>

        {allDay ? (
          <>
            <DateField
              label="Starts on"
              name="startDate"
              defaultValue={event?.formStart}
            />
            <DateField
              label="Ends on"
              name="endDate"
              defaultValue={event?.formEnd}
            />
          </>
        ) : (
          <>
            <DateTimeField
              label="Starts"
              name="startDateTime"
              defaultValue={event?.formStart ?? defaultStart}
            />
            <DateTimeField
              label="Ends"
              name="endDateTime"
              defaultValue={event?.formEnd ?? defaultEnd}
            />
          </>
        )}

        <label className="grid gap-2 text-sm font-semibold text-ink lg:col-span-2">
          Guests
          <input
            type="text"
            name="attendees"
            maxLength={5_000}
            defaultValue={event?.attendees
              .filter((attendee) => !attendee.self)
              .map((attendee) => attendee.email)
              .join(", ")}
            placeholder="friend@example.com, client@example.com"
            className="product-input px-4 text-sm font-normal"
          />
          <span className="text-xs font-normal leading-5 text-muted">
            Guests receive Google Calendar invitation updates when you save.
          </span>
        </label>

        <label className="grid gap-2 text-sm font-semibold text-ink lg:col-span-2">
          Description
          <textarea
            name="description"
            rows={8}
            maxLength={50_000}
            defaultValue={event?.description ?? ""}
            className="product-input resize-y px-4 py-3 text-sm font-normal leading-7"
          />
        </label>
      </div>

      <div className="mt-6 flex justify-end">
        <CalendarSubmitButton
          pendingLabel={event ? "Saving changes..." : "Creating event..."}
        >
          {event ? <CalendarIcon className="size-4" /> : <SendIcon className="size-4" />}
          {event ? "Save event" : "Create event"}
        </CalendarSubmitButton>
      </div>
    </form>
  );
}

function DateField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <input
        type="date"
        name={name}
        required
        defaultValue={defaultValue}
        className="product-input px-4 text-sm font-normal"
      />
    </label>
  );
}

function DateTimeField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <input
        type="datetime-local"
        name={name}
        required
        defaultValue={defaultValue}
        className="product-input px-4 text-sm font-normal"
      />
    </label>
  );
}
