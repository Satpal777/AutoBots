"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  createCalendarEvent,
  isValidTimeZone,
  refreshCalendarAgenda,
  updateCalendarEvent,
} from "@/server/calendar";

const CalendarIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(256)
  .regex(/^[A-Za-z0-9_-]+$/);
const DateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/);
const DateTimeSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
const AttendeesSchema = z
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
      attendees.every((attendee) => z.string().email().safeParse(attendee).success),
    "Use comma-separated email addresses.",
  );
const TimeZoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .refine(isValidTimeZone);
const CalendarEventFormSchema = z
  .object({
    summary: z.string().trim().min(1).max(1_000),
    description: z.string().trim().max(50_000),
    location: z.string().trim().max(1_000),
    attendees: AttendeesSchema,
    allDay: z.enum(["true", "false"]).transform((value) => value === "true"),
    startDate: DateSchema.optional(),
    endDate: DateSchema.optional(),
    startDateTime: DateTimeSchema.optional(),
    endDateTime: DateTimeSchema.optional(),
    timeZone: TimeZoneSchema,
  })
  .superRefine((value, context) => {
    const fields = value.allDay
      ? [value.startDate, value.endDate]
      : [value.startDateTime, value.endDateTime];

    if (fields.some((field) => !field)) {
      context.addIssue({
        code: "custom",
        message: "Choose a complete start and end.",
      });
    }
  });

export async function refreshCalendarAction(formData: FormData) {
  const result = z
    .object({
      startDate: DateSchema.optional(),
      days: z.coerce.number().int().min(1).max(31).default(14),
      view: z.enum(["agenda", "week"]).default("agenda"),
    })
    .safeParse({
      startDate: formData.get("startDate") || undefined,
      days: formData.get("days") || undefined,
      view: formData.get("view") || undefined,
    });

  if (!result.success) {
    redirect("/dashboard/calendar?status=invalid");
  }

  try {
    await refreshCalendarAgenda(result.data);
    revalidateCalendar();
  } catch {
    redirect("/dashboard/calendar?status=error");
  }

  const params = new URLSearchParams({
    status: "refreshed",
    view: result.data.view,
    refreshedAt: String(Date.now()),
  });

  if (result.data.startDate) {
    params.set("start", result.data.startDate);
  }

  redirect(`/dashboard/calendar?${params.toString()}`);
}

export async function createCalendarEventAction(formData: FormData) {
  const result = parseEventForm(formData);

  if (!result.success) {
    redirect("/dashboard/calendar/new?status=invalid");
  }

  let eventId: string | null;

  try {
    eventId = await createCalendarEvent(result.data);
    revalidateCalendar();
  } catch {
    redirect("/dashboard/calendar/new?status=error");
  }

  redirect(
    eventId
      ? `/dashboard/calendar/event/${encodeURIComponent(eventId)}?status=created`
      : "/dashboard/calendar?status=created",
  );
}

export async function updateCalendarEventAction(formData: FormData) {
  const eventIdResult = CalendarIdSchema.safeParse(formData.get("eventId"));
  const result = parseEventForm(formData);

  if (!eventIdResult.success || !result.success) {
    redirect("/dashboard/calendar?status=invalid");
  }

  try {
    await updateCalendarEvent(eventIdResult.data, result.data);
    revalidateCalendar(eventIdResult.data);
  } catch {
    redirect(
      `/dashboard/calendar/event/${eventIdResult.data}/edit?status=error`,
    );
  }

  redirect(`/dashboard/calendar/event/${eventIdResult.data}?status=updated`);
}

function parseEventForm(formData: FormData) {
  const result = CalendarEventFormSchema.safeParse({
    summary: formData.get("summary"),
    description: formData.get("description") ?? "",
    location: formData.get("location") ?? "",
    attendees: formData.get("attendees") ?? "",
    allDay: formData.get("allDay") === "true" ? "true" : "false",
    startDate: formData.get("startDate") || undefined,
    endDate: formData.get("endDate") || undefined,
    startDateTime: formData.get("startDateTime") || undefined,
    endDateTime: formData.get("endDateTime") || undefined,
    timeZone: formData.get("timeZone"),
  });

  if (!result.success) {
    return result;
  }

  return {
    ...result,
    data: {
      summary: result.data.summary,
      description: result.data.description || undefined,
      location: result.data.location || undefined,
      attendees: [...new Set(result.data.attendees)],
      allDay: result.data.allDay,
      start: result.data.allDay
        ? result.data.startDate!
        : result.data.startDateTime!,
      end: result.data.allDay ? result.data.endDate! : result.data.endDateTime!,
      timeZone: result.data.timeZone,
    },
  };
}

function revalidateCalendar(eventId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/calendar");

  if (eventId) {
    revalidatePath(`/dashboard/calendar/event/${eventId}`);
    revalidatePath(`/dashboard/calendar/event/${eventId}/edit`);
  }
}
