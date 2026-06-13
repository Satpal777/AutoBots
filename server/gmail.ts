import "server-only";

import type { Message, MessagePart } from "@corsair-dev/gmail";

import { getCorsairTenant } from "./corsair-tenant";

const INBOX_LABEL = "INBOX";
const UNREAD_LABEL = "UNREAD";
const GMAIL_PAGE_SIZE = 30;

export type GmailMailboxThread = {
  id: string;
  from: string | null;
  subject: string | null;
  snippet: string | null;
  receivedAt: string | null;
  unread: boolean;
  messageCount: number;
};

export type GmailMessageDetail = {
  id: string;
  from: string | null;
  to: string | null;
  subject: string | null;
  body: string | null;
  receivedAt: string | null;
  unread: boolean;
};

export type GmailThreadDetail = {
  id: string;
  subject: string | null;
  replyTo: string | null;
  unread: boolean;
  messages: GmailMessageDetail[];
};

export type GmailDraftSummary = {
  id: string;
  to: string | null;
  subject: string | null;
  body: string | null;
};

export type GmailLabelOption = {
  id: string;
  name: string;
};

type CachedGmailMessage = Awaited<
  ReturnType<
    Awaited<ReturnType<typeof getCorsairTenant>>["gmail"]["db"]["messages"]["list"]
  >
>[number];

type GmailApiMessage = {
  id?: string;
  threadId?: string;
  labelIds?: string[];
  snippet?: string;
  historyId?: string;
  internalDate?: string | number | Date | null;
  sizeEstimate?: number;
  payload?: MessagePart;
  raw?: string;
};

export async function getGmailInbox(
  query?: string,
): Promise<GmailMailboxThread[]> {
  const tenant = await getCorsairTenant();
  let messages: CachedGmailMessage[];

  if (query) {
    const messageIds = await refreshGmailMessages(tenant, { query });
    messages = await tenant.gmail.db.messages.findManyByEntityIds(messageIds);
  } else {
    messages = await tenant.gmail.db.messages.list({ limit: 200 });
    messages = messages.filter((message) =>
      message.data.labelIds?.includes(INBOX_LABEL),
    );

    if (messages.length === 0) {
      const messageIds = await refreshGmailMessages(tenant, {
        labelIds: [INBOX_LABEL],
      });
      messages = await tenant.gmail.db.messages.findManyByEntityIds(messageIds);
    }
  }

  return groupMessagesByThread(messages);
}

export async function refreshGmailInbox(): Promise<void> {
  const tenant = await getCorsairTenant();
  await Promise.all([
    refreshGmailMessages(tenant, { labelIds: [INBOX_LABEL] }),
    tenant.gmail.api.labels.list({}),
    tenant.gmail.api.drafts.list({ maxResults: GMAIL_PAGE_SIZE }),
  ]);
}

export async function getGmailThread(
  threadId: string,
): Promise<GmailThreadDetail | null> {
  const tenant = await getCorsairTenant();
  let messages = await tenant.gmail.db.messages.search({
    data: { threadId },
    limit: 100,
  });

  if (messages.length === 0) {
    await refreshGmailThread(tenant, threadId);
    messages = await tenant.gmail.db.messages.search({
      data: { threadId },
      limit: 100,
    });
  }

  if (messages.length === 0) {
    return null;
  }

  const normalized = messages
    .map(toMessageDetail)
    .sort((left, right) => compareDates(left.receivedAt, right.receivedAt));
  const latestMessage = normalized.at(-1);

  return {
    id: threadId,
    subject:
      normalized.find((message) => message.subject)?.subject ??
      latestMessage?.subject ??
      null,
    replyTo: extractEmailAddress(latestMessage?.from),
    unread: normalized.some((message) => message.unread),
    messages: normalized,
  };
}

export async function getGmailLabels(): Promise<GmailLabelOption[]> {
  const tenant = await getCorsairTenant();
  let labels = await tenant.gmail.db.labels.list({ limit: 200 });

  if (labels.length === 0) {
    await tenant.gmail.api.labels.list({});
    labels = await tenant.gmail.db.labels.list({ limit: 200 });
  }

  return labels
    .flatMap(({ data }) =>
      data.id && data.name && isAssignableLabel(data.id)
        ? [{ id: data.id, name: data.name }]
        : [],
    )
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function getGmailDrafts(): Promise<GmailDraftSummary[]> {
  const tenant = await getCorsairTenant();
  const result = await tenant.gmail.api.drafts.list({
    maxResults: GMAIL_PAGE_SIZE,
  });
  const drafts = await Promise.allSettled(
    (result.drafts ?? [])
      .filter((draft): draft is typeof draft & { id: string } =>
        Boolean(draft.id),
      )
      .map((draft) => getGmailDraftFromTenant(tenant, draft.id)),
  );

  return drafts.flatMap((draft) =>
    draft.status === "fulfilled" && draft.value ? [draft.value] : [],
  );
}

export async function getGmailDraft(
  draftId: string,
): Promise<GmailDraftSummary | null> {
  return getGmailDraftFromTenant(await getCorsairTenant(), draftId);
}

export async function archiveGmailThread(threadId: string): Promise<void> {
  const tenant = await getCorsairTenant();
  await tenant.gmail.api.threads.modify({
    id: threadId,
    removeLabelIds: [INBOX_LABEL],
  });
  await refreshGmailThread(tenant, threadId);
}

export async function setGmailThreadUnread(
  threadId: string,
  unread: boolean,
): Promise<void> {
  const tenant = await getCorsairTenant();
  await tenant.gmail.api.threads.modify({
    id: threadId,
    ...(unread
      ? { addLabelIds: [UNREAD_LABEL] }
      : { removeLabelIds: [UNREAD_LABEL] }),
  });
  await refreshGmailThread(tenant, threadId);
}

export async function applyGmailLabel(
  threadId: string,
  labelId: string,
): Promise<void> {
  const tenant = await getCorsairTenant();
  const allowedLabels = await getGmailLabels();

  if (!allowedLabels.some((label) => label.id === labelId)) {
    throw new Error("The selected Gmail label is not available.");
  }

  await tenant.gmail.api.threads.modify({
    id: threadId,
    addLabelIds: [labelId],
  });
  await refreshGmailThread(tenant, threadId);
}

export async function sendGmailMessage(input: {
  to: string;
  subject: string;
  body: string;
  threadId?: string;
}): Promise<void> {
  const tenant = await getCorsairTenant();
  await tenant.gmail.api.messages.send({
    raw: buildRawGmailMessage(input),
    ...(input.threadId ? { threadId: input.threadId } : {}),
  });
}

export async function saveGmailDraft(input: {
  draftId?: string;
  to: string;
  subject: string;
  body: string;
}): Promise<string | null> {
  const tenant = await getCorsairTenant();
  const draft = { message: { raw: buildRawGmailMessage(input) } };
  const result = input.draftId
    ? await tenant.gmail.api.drafts.update({ id: input.draftId, draft })
    : await tenant.gmail.api.drafts.create({ draft });

  return result.id ?? null;
}

export async function sendGmailDraft(draftId: string): Promise<void> {
  const tenant = await getCorsairTenant();
  await tenant.gmail.api.drafts.send({ id: draftId });
}

async function refreshGmailMessages(
  tenant: Awaited<ReturnType<typeof getCorsairTenant>>,
  options: { query?: string; labelIds?: string[] },
): Promise<string[]> {
  const result = await tenant.gmail.api.messages.list({
    ...(options.query ? { q: options.query } : {}),
    ...(options.labelIds ? { labelIds: options.labelIds } : {}),
    maxResults: GMAIL_PAGE_SIZE,
  });
  const messageIds = (result.messages ?? []).flatMap((message) =>
    message.id ? [message.id] : [],
  );

  await Promise.allSettled(
    messageIds.map(async (id) => {
      const message = await tenant.gmail.api.messages.get({ id, format: "full" });
      await cacheGmailMessage(tenant, message);
    }),
  );

  return messageIds;
}

async function refreshGmailThread(
  tenant: Awaited<ReturnType<typeof getCorsairTenant>>,
  threadId: string,
): Promise<void> {
  const thread = await tenant.gmail.api.threads.get({
    id: threadId,
    format: "minimal",
  });
  const messageIds = (thread.messages ?? []).flatMap((message) =>
    message.id ? [message.id] : [],
  );

  await Promise.allSettled(
    messageIds.map(async (id) => {
      const message = await tenant.gmail.api.messages.get({ id, format: "full" });
      await cacheGmailMessage(tenant, message);
    }),
  );
}

async function cacheGmailMessage(
  tenant: Awaited<ReturnType<typeof getCorsairTenant>>,
  message: GmailApiMessage,
): Promise<void> {
  if (!message.id) {
    return;
  }

  const internalDate = formatApiInternalDate(message.internalDate);
  const subject = getHeader(message, "Subject");
  const body = extractMessageBody(message);
  const from = getHeader(message, "From");
  const to = getHeader(message, "To");

  await tenant.gmail.db.messages.upsertByEntityId(message.id, {
    id: message.id,
    ...(message.threadId ? { threadId: message.threadId } : {}),
    ...(message.labelIds ? { labelIds: message.labelIds } : {}),
    ...(message.snippet ? { snippet: message.snippet } : {}),
    ...(message.historyId ? { historyId: message.historyId } : {}),
    ...(internalDate ? { internalDate } : {}),
    ...(message.sizeEstimate ? { sizeEstimate: message.sizeEstimate } : {}),
    ...(message.payload ? { payload: message.payload } : {}),
    ...(message.raw ? { raw: message.raw } : {}),
    ...(subject ? { subject } : {}),
    ...(body ? { body } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    createdAt: new Date(),
  });
}

async function getGmailDraftFromTenant(
  tenant: Awaited<ReturnType<typeof getCorsairTenant>>,
  draftId: string,
): Promise<GmailDraftSummary | null> {
  const draft = await tenant.gmail.api.drafts.get({
    id: draftId,
    format: "full",
  });

  if (!draft.id || !draft.message) {
    return null;
  }

  return {
    id: draft.id,
    to: getHeader(draft.message, "To"),
    subject: getHeader(draft.message, "Subject"),
    body: extractMessageBody(draft.message),
  };
}

function groupMessagesByThread(
  messages: CachedGmailMessage[],
): GmailMailboxThread[] {
  const grouped = new Map<string, CachedGmailMessage[]>();

  for (const message of messages) {
    const threadId = message.data.threadId;

    if (!threadId) {
      continue;
    }

    grouped.set(threadId, [...(grouped.get(threadId) ?? []), message]);
  }

  return [...grouped.entries()]
    .map(([id, threadMessages]) => {
      const sorted = threadMessages.sort(
        (left, right) =>
          getMessageTimestamp(left) - getMessageTimestamp(right),
      );
      const latest = sorted.at(-1);

      return {
        id,
        from: latest?.data.from?.trim() || null,
        subject:
          sorted.find((message) => message.data.subject?.trim())?.data.subject?.trim() ??
          null,
        snippet: latest?.data.snippet?.trim() || null,
        receivedAt: formatInternalDate(latest?.data.internalDate),
        unread: sorted.some((message) =>
          message.data.labelIds?.includes(UNREAD_LABEL),
        ),
        messageCount: sorted.length,
      };
    })
    .sort((left, right) => compareDates(right.receivedAt, left.receivedAt));
}

function toMessageDetail(message: CachedGmailMessage): GmailMessageDetail {
  return {
    id: message.entity_id,
    from: message.data.from?.trim() || null,
    to: message.data.to?.trim() || null,
    subject: message.data.subject?.trim() || null,
    body: normalizeBody(message.data.body),
    receivedAt: formatInternalDate(message.data.internalDate),
    unread: message.data.labelIds?.includes(UNREAD_LABEL) ?? false,
  };
}

function buildRawGmailMessage(input: {
  to: string;
  subject: string;
  body: string;
}): string {
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

function extractMessageBody(
  message: Pick<Message, "payload" | "snippet">,
): string | null {
  return normalizeBody(extractPartBody(message.payload) ?? message.snippet);
}

function extractPartBody(part: MessagePart | undefined): string | null {
  if (!part) {
    return null;
  }

  if (part.mimeType === "text/plain" && part.body?.data) {
    return decodeBase64Url(part.body.data);
  }

  for (const child of part.parts ?? []) {
    const body = extractPartBody(child);

    if (body) {
      return body;
    }
  }

  if (part.mimeType === "text/html" && part.body?.data) {
    return decodeBase64Url(part.body.data);
  }

  return null;
}

function decodeBase64Url(value: string): string | null {
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

function getHeader(message: Pick<Message, "payload">, name: string): string | null {
  return (
    message.payload?.headers
      ?.find((header) => header.name?.toLowerCase() === name.toLowerCase())
      ?.value?.trim() || null
  );
}

function normalizeBody(value: string | null | undefined): string | null {
  const normalized = value
    ?.replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return normalized || null;
}

function extractEmailAddress(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return (
    value.match(/<([^<>@\s]+@[^<>@\s]+)>/)?.[1] ??
    value.match(/[\w.!#$%&'*+/=?^`{|}~-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0] ??
    null
  );
}

function isAssignableLabel(id: string): boolean {
  return ![
    "INBOX",
    "SENT",
    "DRAFT",
    "TRASH",
    "SPAM",
    "UNREAD",
    "CHAT",
  ].includes(id);
}

function getMessageTimestamp(message: CachedGmailMessage): number {
  return getDateTimestamp(message.data.internalDate ?? message.updated_at);
}

function formatApiInternalDate(
  value: GmailApiMessage["internalDate"],
): string | null {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "number") {
    return new Date(value).toISOString();
  }

  if (typeof value === "string") {
    const timestamp = getDateTimestamp(value);
    return timestamp > 0 ? new Date(timestamp).toISOString() : null;
  }

  return null;
}

function formatInternalDate(value: string | null | undefined): string | null {
  const timestamp = getDateTimestamp(value);
  return timestamp > 0 ? new Date(timestamp).toISOString() : null;
}

function getDateTimestamp(value: string | Date | null | undefined): number {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (!value) {
    return 0;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : Date.parse(value) || 0;
}

function compareDates(left: string | null, right: string | null): number {
  return getDateTimestamp(left) - getDateTimestamp(right);
}
