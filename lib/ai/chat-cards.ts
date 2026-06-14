export type EmailChatCard = {
  kind: "email";
  id: string;
  threadId: string;
  from: string | null;
  subject: string | null;
  snippet: string | null;
  receivedAt: string | null;
  unread: boolean;
};

export type CalendarChatCard = {
  kind: "calendar";
  id: string;
  title: string | null;
  startAt: string | null;
  endAt: string | null;
  location: string | null;
  timeZone: string | null;
  allDay: boolean;
  attendeeCount: number;
};

export type ActionChatCard = {
  kind: "action";
  id: string;
  integration: "gmail" | "calendar" | "workspace";
  title: string;
  status: "pending" | "completed";
  approvalUrl: string | null;
  details: string[];
};

export type ChatCard = EmailChatCard | CalendarChatCard | ActionChatCard;

export type ChatStreamEvent =
  | { type: "text-delta"; delta: string }
  | { type: "cards"; cards: ChatCard[] }
  | { type: "done" };

const MAX_CARDS_PER_TOOL = 10;
const MAX_TEXT_LENGTH = 280;

export function extractChatCards(
  toolName: string,
  input: unknown,
  output: unknown,
): ChatCard[] {
  const values = unwrapToolOutput(output);
  const cards: ChatCard[] = [];

  visitValues(values, (value) => {
    const calendar = toCalendarCard(value);
    if (calendar) {
      cards.push(calendar);
      return;
    }

    const email = toEmailCard(value);
    if (email) cards.push(email);
  });

  if (isWriteTool(toolName, input) || findApprovalPath(values)) {
    cards.push(toActionCard(toolName, input, values));
  }

  return deduplicateCards(cards).slice(0, MAX_CARDS_PER_TOOL);
}

export function readChatCards(metadata: unknown): ChatCard[] {
  if (!isRecord(metadata) || !Array.isArray(metadata.cards)) return [];
  return metadata.cards.filter(isChatCard).slice(0, 50);
}

function unwrapToolOutput(output: unknown): unknown[] {
  if (!isRecord(output)) return [output];

  const values: unknown[] = [];
  if ("structuredContent" in output) values.push(output.structuredContent);
  if ("content" in output && Array.isArray(output.content)) {
    for (const part of output.content) {
      if (isRecord(part) && part.type === "text" && typeof part.text === "string") {
        values.push(parseJsonOrText(part.text));
      }
    }
  }

  return values.length > 0 ? values : [output];
}

function parseJsonOrText(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function visitValues(root: unknown[], visitor: (value: Record<string, unknown>) => void) {
  const seen = new Set<object>();

  function visit(value: unknown, depth: number) {
    if (depth > 6 || value === null || typeof value !== "object" || seen.has(value)) return;
    seen.add(value);

    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, depth + 1));
      return;
    }

    visitor(value as Record<string, unknown>);
    Object.values(value).forEach((item) => visit(item, depth + 1));
  }

  root.forEach((value) => visit(value, 0));
}

function toEmailCard(value: Record<string, unknown>): EmailChatCard | null {
  const data = isRecord(value.data) ? value.data : value;
  const id = stringValue(data.id) ?? stringValue(value.entity_id);
  const threadId = stringValue(data.threadId);
  const headers = getHeaders(data);
  const subject = stringValue(data.subject) ?? headers.subject ?? null;
  const from = stringValue(data.from) ?? headers.from ?? null;
  const snippet = cleanText(stringValue(data.snippet));

  if (!id || !threadId || !(subject || from || snippet || Array.isArray(data.labelIds))) return null;

  return {
    kind: "email",
    id,
    threadId,
    from,
    subject,
    snippet,
    receivedAt: normalizeDate(data.internalDate),
    unread: Array.isArray(data.labelIds) && data.labelIds.includes("UNREAD"),
  };
}

function toCalendarCard(value: Record<string, unknown>): CalendarChatCard | null {
  const data = isRecord(value.data) ? value.data : value;
  const id = stringValue(data.id) ?? stringValue(value.entity_id);
  const start = isRecord(data.start) ? data.start : null;
  const end = isRecord(data.end) ? data.end : null;
  const title = stringValue(data.summary);

  if (!id || !start || !(title || start.date || start.dateTime)) return null;

  return {
    kind: "calendar",
    id,
    title,
    startAt: stringValue(start.dateTime) ?? stringValue(start.date),
    endAt: stringValue(end?.dateTime) ?? stringValue(end?.date),
    location: cleanText(stringValue(data.location)),
    timeZone: stringValue(start.timeZone) ?? stringValue(end?.timeZone),
    allDay: Boolean(start.date && !start.dateTime),
    attendeeCount: typeof data.attendeeCount === "number"
      ? data.attendeeCount
      : Array.isArray(data.attendees) ? data.attendees.length : 0,
  };
}

function toActionCard(toolName: string, input: unknown, output: unknown[]): ActionChatCard {
  const approvalPath = findApprovalPath(output);
  const operation = getCorsairOperation(input);
  const searchableName = `${toolName} ${operation ?? ""}`.toLowerCase();
  const integration = searchableName.includes("gmail")
    ? "gmail"
    : searchableName.includes("calendar")
      ? "calendar"
      : "workspace";
  const pending = Boolean(approvalPath) || /approval|pending/i.test(JSON.stringify(output));

  return {
    kind: "action",
    id: `${toolName}:${approvalPath ?? JSON.stringify(input).slice(0, 80)}`,
    integration,
    title: humanizeToolName(operation ?? toolName),
    status: pending ? "pending" : "completed",
    approvalUrl: approvalPath,
    details: getActionDetails(input),
  };
}

function getActionDetails(input: unknown): string[] {
  if (!isRecord(input)) return [];
  const details: string[] = [];
  const event = isRecord(input.event) ? input.event : input;
  const fields: [string, unknown][] = [
    ["To", input.to],
    ["Subject", input.subject],
    ["Title", event.summary],
    ["Start", isRecord(event.start) ? event.start.dateTime ?? event.start.date : undefined],
    ["End", isRecord(event.end) ? event.end.dateTime ?? event.end.date : undefined],
    ["Location", event.location],
  ];

  for (const [label, value] of fields) {
    const text = cleanText(stringValue(value));
    if (text) details.push(`${label}: ${text}`);
  }
  return details.slice(0, 5);
}

function getHeaders(data: Record<string, unknown>) {
  const payload = isRecord(data.payload) ? data.payload : null;
  const headers = Array.isArray(payload?.headers) ? payload.headers : [];
  const result: { subject?: string; from?: string } = {};
  for (const header of headers) {
    if (!isRecord(header)) continue;
    const name = stringValue(header.name)?.toLowerCase();
    const value = cleanText(stringValue(header.value));
    if (name === "subject" && value) result.subject = value;
    if (name === "from" && value) result.from = value;
  }
  return result;
}

function isWriteTool(toolName: string, input: unknown) {
  const operation = getCorsairOperation(input);
  const name = operation ?? toolName;
  return /\.(send|create|update|modify|insert|patch)$/i.test(name)
    || /_(send|create|update|modify|insert|patch)(_|$)/i.test(name);
}

function humanizeToolName(toolName: string) {
  const action = toolName.match(/(?:^|[._])(send|create|update|modify|insert|patch)(?:[._]|$)/i)?.[1]
    ?? toolName.split(/[._]/).at(-1)
    ?? "action";
  const integration = toolName.toLowerCase().includes("gmail")
    ? "email"
    : toolName.toLowerCase().includes("calendar")
      ? "calendar event"
      : "workspace action";
  return `${action.charAt(0).toUpperCase()}${action.slice(1)} ${integration}`;
}

function getCorsairOperation(input: unknown): string | null {
  if (!isRecord(input) || typeof input.code !== "string") return null;
  return input.code.match(/corsair\.(gmail|googlecalendar)\.(?:api|db)\.([A-Za-z0-9_.]+)/)?.[0]
    ?.replace(/^corsair\./, "") ?? null;
}

function findApprovalPath(output: unknown): string | null {
  return JSON.stringify(output).match(/\/dashboard\/approvals\/([A-Za-z0-9_-]+)/)?.[0] ?? null;
}

function deduplicateCards(cards: ChatCard[]) {
  const unique = new Map<string, ChatCard>();
  for (const card of cards) unique.set(`${card.kind}:${card.id}`, card);
  return [...unique.values()];
}

function isChatCard(value: unknown): value is ChatCard {
  return isRecord(value)
    && typeof value.kind === "string"
    && typeof value.id === "string"
    && ["email", "calendar", "action"].includes(value.kind);
}

function normalizeDate(value: unknown): string | null {
  if (typeof value === "number") return new Date(value).toISOString();
  if (typeof value !== "string" || !value) return null;
  const numeric = Number(value);
  const timestamp = Number.isFinite(numeric) ? numeric : Date.parse(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? new Date(timestamp).toISOString() : null;
}

function cleanText(value: string | null): string | null {
  if (!value) return null;
  const cleaned = value.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT_LENGTH);
  return cleaned || null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
