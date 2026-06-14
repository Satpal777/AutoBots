import "server-only";

import { tool } from "ai";
import { z } from "zod";
import { agentCorsair } from "@/server/agent-corsair";

const EmailAddress = z.string().email();

export function buildAgentTools(userId: string, conversationContext: string) {
  const tenant = agentCorsair.withTenant(userId);

  const allTools = {
    gmail_list_messages: tool({
      description: "Find recent Gmail messages as metadata and snippets.",
      inputSchema: z.object({
        q: z.string().max(500).optional(),
        maxResults: z.number().int().min(1).max(10).default(5),
      }),
      execute: async ({ q, maxResults }) => safelyExecute(async () => {
        const result = await tenant.gmail.api.messages.list({ q, maxResults });
        const details = await Promise.allSettled(
          (result.messages ?? []).flatMap((message) =>
            message.id
              ? [tenant.gmail.api.messages.get({
                  id: message.id,
                  format: "metadata",
                  metadataHeaders: ["From", "To", "Subject", "Date"],
                })]
              : [],
          ),
        );

        return details.flatMap((detail) => detail.status === "fulfilled"
          ? [{
              id: detail.value.id,
              threadId: detail.value.threadId,
              labelIds: detail.value.labelIds,
              snippet: detail.value.snippet,
              internalDate: detail.value.internalDate,
              from: getHeader(detail.value.payload?.headers, "From"),
              to: getHeader(detail.value.payload?.headers, "To"),
              subject: getHeader(detail.value.payload?.headers, "Subject"),
            }]
          : []);
      }),
    }),
    gmail_send_message: tool({
      description: "Request approval to send a complete email.",
      inputSchema: z.object({
        to: EmailAddress,
        subject: z.string().trim().min(1).max(998),
        body: z.string().trim().min(1).max(50_000),
        threadId: z.string().min(1).max(200).optional(),
      }),
      execute: async ({ to, subject, body, threadId }) => safelyExecute(() =>
        tenant.gmail.api.messages.send({
          raw: buildRawEmail({ to, subject, body }),
          ...(threadId ? { threadId } : {}),
        }),
      ),
    }),
    calendar_list_events: tool({
      description: "List calendar events in an ISO 8601 time range.",
      inputSchema: z.object({
        timeMin: z.string().datetime({ offset: true }),
        timeMax: z.string().datetime({ offset: true }),
        maxResults: z.number().int().min(1).max(20).default(10),
        timeZone: z.string().min(1).max(100).optional(),
      }),
      execute: async ({ timeMin, timeMax, maxResults, timeZone }) => safelyExecute(async () => {
        const result = await tenant.googlecalendar.api.events.getMany({
          calendarId: "primary",
          timeMin,
          timeMax,
          maxResults,
          singleEvents: true,
          orderBy: "startTime",
          ...(timeZone ? { timeZone } : {}),
        });
        return {
          timeZone: result.timeZone,
          events: (result.items ?? []).map((event) => ({
            id: event.id,
            summary: event.summary,
            location: event.location,
            start: event.start,
            end: event.end,
            status: event.status,
            attendeeCount: event.attendees?.length ?? 0,
          })),
        };
      }),
    }),
    calendar_create_event: tool({
      description: "Request approval to create a complete calendar event.",
      inputSchema: z.object({
        summary: z.string().trim().min(1).max(500),
        start: z.string().datetime({ offset: true }),
        end: z.string().datetime({ offset: true }),
        timeZone: z.string().min(1).max(100),
        description: z.string().max(10_000).optional(),
        location: z.string().max(1_000).optional(),
        attendees: z.array(EmailAddress).max(50).default([]),
      }),
      execute: async ({ summary, start, end, timeZone, description, location, attendees }) => safelyExecute(() =>
        tenant.googlecalendar.api.events.create({
          calendarId: "primary",
          sendUpdates: attendees.length > 0 ? "all" : "none",
          event: {
            summary,
            start: { dateTime: start, timeZone },
            end: { dateTime: end, timeZone },
            ...(description ? { description } : {}),
            ...(location ? { location } : {}),
            ...(attendees.length > 0 ? { attendees: attendees.map((email) => ({ email })) } : {}),
          },
        }),
      ),
    }),
  };

  const selected = selectAgentToolNames(conversationContext);
  return Object.fromEntries(
    selected.map((name) => [name, allTools[name]]),
  ) as Partial<typeof allTools>;
}

type AgentToolName =
  | "gmail_list_messages"
  | "gmail_send_message"
  | "calendar_list_events"
  | "calendar_create_event";

function selectAgentToolNames(context: string): AgentToolName[] {
  const text = context.toLowerCase();
  const gmailDomain = /\b(email|emails|gmail|inbox|mail|message|messages|unread|sender|recipient|reply)\b/.test(text);
  const calendarDomain = /\b(calendar|calender|event|events|meeting|meetings|schedule|agenda|availability|available|free time|appointment)\b/.test(text);
  const gmailWrite = /\b(send|reply|draft|compose|forward|write)\b/.test(text);
  const calendarWrite = calendarDomain && /\b(create|schedule|book|invite|add|move|reschedule|update)\b/.test(text);
  const readIntent = /\b(show|list|find|search|check|summarize|latest|recent|unread|agenda|availability|available|free time)\b/.test(text);
  const gmailRead = gmailDomain && (!gmailWrite || readIntent);
  const calendarRead = calendarDomain && (!calendarWrite || readIntent);
  const selected = new Set<AgentToolName>();

  if (gmailRead) selected.add("gmail_list_messages");
  if (calendarRead) selected.add("calendar_list_events");
  if (gmailWrite) selected.add("gmail_send_message");
  if (calendarWrite) selected.add("calendar_create_event");

  if (selected.size === 0) {
    selected.add("gmail_list_messages");
    selected.add("calendar_list_events");
  }

  return [...selected];
}

async function safelyExecute<T>(operation: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await operation();
  } catch (error) {
    return { error: getSafeErrorMessage(error) };
  }
}

function getSafeErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "The integration operation failed.";
  const approvalPath = error.message.match(/\/dashboard\/approvals\/[A-Za-z0-9_-]+/)?.[0];
  if (approvalPath) {
    return `This action is waiting for your approval. Review: ${approvalPath}`;
  }
  if (/not authorized|auth|credential|connect/i.test(error.message)) {
    return "This integration needs to be connected again.";
  }
  if (/approval/i.test(error.message)) {
    return "This action is waiting for your approval.";
  }
  return "The integration operation failed. Please try again.";
}

function buildRawEmail(input: { to: string; subject: string; body: string }): string {
  const message = [
    `To: ${sanitizeHeader(input.to)}`,
    `Subject: ${encodeHeader(input.subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    input.body,
  ].join("\r\n");

  return Buffer.from(message, "utf8").toString("base64url");
}

function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function encodeHeader(value: string): string {
  const sanitized = sanitizeHeader(value);
  return /^[\x20-\x7E]*$/.test(sanitized)
    ? sanitized
    : `=?UTF-8?B?${Buffer.from(sanitized, "utf8").toString("base64")}?=`;
}

function getHeader(
  headers: { name?: string; value?: string }[] | undefined,
  name: string,
): string | null {
  return headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())
    ?.value?.trim() || null;
}
