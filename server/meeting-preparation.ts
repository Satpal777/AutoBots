import "server-only";

import { getCorsairTenantId } from "@/lib/auth/session";

import type { CalendarEventDetail } from "./calendar";
import { searchWorkspace } from "./intelligence";

export type MeetingPreparation = {
  event: CalendarEventDetail;
  externalAttendees: {
    email: string;
    displayName: string | null;
    responseStatus: string | null;
  }[];
  relatedItems: {
    id: string;
    title: string;
    preview: string;
    href: string;
    category: string | null;
    priority: string | null;
    needsFollowUp: boolean;
  }[];
  talkingPoints: string[];
};

export async function getMeetingPreparation(
  event: CalendarEventDetail,
): Promise<MeetingPreparation | null> {
  const userId = await getCorsairTenantId();

  const externalAttendees = event.attendees
    .filter((attendee) => !attendee.self)
    .map((attendee) => ({
      email: attendee.email,
      displayName: attendee.displayName,
      responseStatus: attendee.responseStatus,
    }));
  const queries = [
    ...externalAttendees.slice(0, 5).map((attendee) => attendee.email),
    ...(event.title ? [event.title] : []),
  ];
  const resultGroups = await Promise.all(
    queries.map((query) => searchWorkspace(userId, query, 6).catch(() => [])),
  );
  const currentEventHref = `/dashboard/calendar/event/${encodeURIComponent(event.id)}`;
  const relatedItems = [...new Map(
    resultGroups
      .flat()
      .filter((item) => item.href !== currentEventHref)
      .map((item) => [item.id, item]),
  ).values()]
    .slice(0, 8)
    .map((item) => ({
      id: item.id,
      title: item.title,
      preview: item.preview,
      href: item.href,
      category: item.category,
      priority: item.priority,
      needsFollowUp: item.needsFollowUp,
    }));

  const talkingPoints = [
    ...(event.description ? [event.description.slice(0, 240)] : []),
    ...relatedItems
      .filter((item) => item.needsFollowUp || item.priority === "high")
      .slice(0, 3)
      .map((item) => item.preview || item.title),
  ];

  return {
    event,
    externalAttendees,
    relatedItems,
    talkingPoints: [...new Set(talkingPoints)].slice(0, 4),
  };
}
