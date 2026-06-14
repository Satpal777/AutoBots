import "server-only";

import { getCalendarAgenda } from "./calendar";
import { getGmailInbox } from "./gmail";
import type { GoogleIntegrationStatuses } from "./google-integrations";

export type DailyBriefing = {
  highPriorityCount: number;
  followUpCount: number;
  unreadCount: number;
  todayEventCount: number;
  attentionItems: {
    id: string;
    title: string;
    detail: string;
    href: string;
    kind: "priority" | "follow-up";
  }[];
  nextEvent: {
    id: string;
    title: string;
    startsAt: string | null;
    allDay: boolean;
    attendeeCount: number;
  } | null;
};

export async function getDailyBriefing(
  statuses: GoogleIntegrationStatuses,
): Promise<DailyBriefing> {
  const [inbox, agenda] = await Promise.all([
    statuses.gmail === "connected" ? getGmailInbox().catch(() => null) : null,
    statuses.googlecalendar === "connected"
      ? getCalendarAgenda({ days: 1 }).catch(() => null)
      : null,
  ]);
  const threads = inbox?.threads ?? [];
  const events = agenda?.events ?? [];
  const now = Date.now();
  const nextEvent = events.find((event) => {
    if (event.allDay) return true;
    const boundary = event.endAt ?? event.startAt;
    return boundary ? Date.parse(boundary) >= now : false;
  });
  const attentionThreads = threads
    .filter((thread) => thread.priority === "high" || thread.needsFollowUp)
    .sort((left, right) => {
      const leftScore = Number(left.priority === "high") * 2 + Number(left.needsFollowUp);
      const rightScore = Number(right.priority === "high") * 2 + Number(right.needsFollowUp);
      return rightScore - leftScore;
    })
    .slice(0, 4);

  return {
    highPriorityCount: threads.filter((thread) => thread.priority === "high").length,
    followUpCount: threads.filter((thread) => thread.needsFollowUp).length,
    unreadCount: threads.filter((thread) => thread.unread).length,
    todayEventCount: events.length,
    attentionItems: attentionThreads.map((thread) => ({
      id: thread.id,
      title: thread.subject ?? "Untitled conversation",
      detail: thread.intelligenceSummary ?? thread.snippet ?? thread.from ?? "Open conversation",
      href: `/dashboard/inbox/thread/${encodeURIComponent(thread.id)}`,
      kind: thread.priority === "high" ? "priority" : "follow-up",
    })),
    nextEvent: nextEvent
      ? {
          id: nextEvent.id,
          title: nextEvent.title ?? "Untitled event",
          startsAt: nextEvent.startAt ?? nextEvent.startDate,
          allDay: nextEvent.allDay,
          attendeeCount: nextEvent.attendeeCount,
        }
      : null,
  };
}
