import "server-only";

import type {
  CalendarChatCard,
  ChatCard,
  EmailChatCard,
} from "@/lib/ai/chat-cards";
import { getCalendarEvent } from "@/server/calendar";
import { getGmailThread } from "@/server/gmail";

const MAX_SNIPPET_LENGTH = 280;

export async function hydrateChatCards(cards: ChatCard[]): Promise<ChatCard[]> {
  return Promise.all(cards.map(async (card) => {
    if (card.kind === "email") return hydrateEmailCard(card);
    if (card.kind === "calendar") return hydrateCalendarCard(card);
    return card;
  }));
}

async function hydrateEmailCard(card: EmailChatCard): Promise<EmailChatCard> {
  const canonical = {
    ...card,
    href: `/dashboard/inbox/thread/${encodeURIComponent(card.threadId)}`,
  };

  if (card.from && card.subject && card.snippet && card.receivedAt) {
    return canonical;
  }

  try {
    const thread = await getGmailThread(card.threadId);
    const latest = thread?.messages.at(-1);

    return {
      ...canonical,
      from: card.from ?? latest?.from ?? latest?.to ?? null,
      subject: card.subject ?? thread?.subject ?? latest?.subject ?? null,
      snippet: card.snippet ?? cleanSnippet(latest?.body),
      receivedAt: card.receivedAt ?? latest?.receivedAt ?? null,
      unread: card.unread || thread?.unread || false,
    };
  } catch {
    return canonical;
  }
}

async function hydrateCalendarCard(
  card: CalendarChatCard,
): Promise<CalendarChatCard> {
  const canonical = {
    ...card,
    href: `/dashboard/calendar/event/${encodeURIComponent(card.id)}`,
  };

  if (card.title && card.startAt && card.endAt) {
    return canonical;
  }

  try {
    const event = await getCalendarEvent(card.id);
    if (!event) return canonical;

    return {
      ...canonical,
      title: card.title ?? event.title,
      startAt: card.startAt ?? event.startAt ?? event.startDate,
      endAt: card.endAt ?? event.endAt ?? event.endDate,
      location: card.location ?? event.location,
      timeZone: card.timeZone ?? event.timeZone,
      allDay: card.allDay || event.allDay,
      attendeeCount: Math.max(card.attendeeCount, event.attendeeCount),
    };
  } catch {
    return canonical;
  }
}

function cleanSnippet(value: string | null | undefined) {
  if (!value) return null;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, MAX_SNIPPET_LENGTH) : null;
}
