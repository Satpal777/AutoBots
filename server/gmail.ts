import "server-only";

import { randomUUID } from "node:crypto";
import type { Message, MessagePart } from "@corsair-dev/gmail";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { getCorsairTenantId } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { corsairAccounts, corsairEntities, entityIntelligence, integrationSyncState } from "@/lib/db/schema";
import { analyzeNewGmailEntities, getEntityIntelligenceMap, getUserThreadIntelligenceMap, type IntelligenceByok } from "./intelligence";

import { getCorsairTenant } from "./corsair-tenant";

const INBOX_LABEL = "INBOX";
const SENT_LABEL = "SENT";
const UNREAD_LABEL = "UNREAD";
const GMAIL_PAGE_SIZE = 30;
const GMAIL_CACHE_BATCH_SIZE = 90;
const GMAIL_SYNC_SCOPE = "inbox";
type GmailLocalCursor = { beforeDate: string; beforeId: string };

export type GmailMailboxThread = {
  id: string;
  intelligenceEntityId: string;
  from: string | null;
  subject: string | null;
  snippet: string | null;
  receivedAt: string | null;
  unread: boolean;
  messageCount: number;
  priority: string;
  category: string;
  needsFollowUp: boolean;
  intelligenceSummary: string | null;
};

export type GmailInboxPage = {
  threads: GmailMailboxThread[];
  nextPageToken: string | null;
};

export type GmailMessageDetail = {
  id: string;
  from: string | null;
  to: string | null;
  subject: string | null;
  body: string | null;
  receivedAt: string | null;
  sent: boolean;
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
  pageToken?: string,
  intelligenceByok?: IntelligenceByok,
  classifyNew = true,
): Promise<GmailInboxPage> {
  const tenant = await getCorsairTenant();
  const userId = await getCorsairTenantId();
  const cursor = decodeLocalCursor(pageToken);
  let page = await getCachedGmailPage(userId, query, cursor);

  if (page.messages.length === 0) {
    const remoteCursor = await getGmailRemoteCursor(userId);
    if (remoteCursor !== null) {
      const refreshed = await refreshGmailMessages(tenant, {
        labelIds: [INBOX_LABEL],
        ...(typeof remoteCursor === "string" ? { pageToken: remoteCursor } : {}),
      });
      await setGmailRemoteCursor(userId, refreshed.nextPageToken);
      page = await getCachedGmailPage(userId, query, cursor);
    }
  }

  const grouped = groupMessagesByThread(page.messages).slice(0, GMAIL_PAGE_SIZE);
  if (classifyNew) {
    await analyzeNewGmailEntities(userId, grouped.map((thread) => thread.id).flatMap((threadId) =>
      page.messages.filter((message) => message.data.threadId === threadId).map((message) => message.entity_id),
    ), intelligenceByok);
  }
  const [intelligence, threadOverrides] = await Promise.all([
    getEntityIntelligenceMap(userId, grouped.flatMap((thread) => thread.intelligenceEntityIds)),
    getUserThreadIntelligenceMap(userId, grouped.map((thread) => thread.id)),
  ]);
  return {
    threads: grouped.map((thread) => {
      const threadOverride = threadOverrides.get(thread.id);
      const effectiveEntityId = threadOverride?.entityId ?? thread.intelligenceEntityId;
      const latestIntelligence = intelligence.get(thread.intelligenceEntityId);
      return {
        id: thread.id,
        intelligenceEntityId: effectiveEntityId,
        from: thread.from,
        subject: thread.subject,
        snippet: thread.snippet,
        receivedAt: thread.receivedAt,
        unread: thread.unread,
        messageCount: thread.messageCount,
        priority: threadOverride?.priority ?? latestIntelligence?.priority ?? "normal",
        category: latestIntelligence?.category ?? threadOverride?.category ?? "other",
        needsFollowUp: threadOverride?.needsFollowUp ?? latestIntelligence?.needsFollowUp ?? false,
        intelligenceSummary: latestIntelligence?.summary ?? threadOverride?.summary ?? null,
      };
    }),
    nextPageToken: page.hasMore && page.nextCursor ? encodeLocalCursor(page.nextCursor) : null,
  };
}

export async function refreshGmailInbox(): Promise<void> {
  const tenant = await getCorsairTenant();
  const userId = await getCorsairTenantId();
  const [page] = await Promise.all([
    refreshGmailMessages(tenant, { labelIds: [INBOX_LABEL] }),
    tenant.gmail.api.labels.list({}),
    tenant.gmail.api.drafts.list({ maxResults: GMAIL_PAGE_SIZE }),
  ]);
  await setGmailRemoteCursor(userId, page.nextPageToken);
}

export async function getGmailThread(
  threadId: string,
): Promise<GmailThreadDetail | null> {
  const tenant = await getCorsairTenant();
  let messages = await tenant.gmail.db.messages.search({
    data: { threadId },
    limit: 100,
  });

  const onlyThinMetadata = messages.length > 0 && messages.every((message) =>
    !message.data.from?.trim()
    && !message.data.to?.trim()
    && !message.data.subject?.trim()
  );

  if (messages.length === 0 || onlyThinMetadata) {
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
  options: { query?: string; labelIds?: string[]; pageToken?: string },
): Promise<{ messageIds: string[]; nextPageToken: string | null }> {
  const result = await tenant.gmail.api.messages.list({
    ...(options.query ? { q: options.query } : {}),
    ...(options.labelIds ? { labelIds: options.labelIds } : {}),
    ...(options.pageToken ? { pageToken: options.pageToken } : {}),
    maxResults: GMAIL_PAGE_SIZE,
  });
  const messageIds = (result.messages ?? []).flatMap((message) =>
    message.id ? [message.id] : [],
  );

  for (let index = 0; index < messageIds.length; index += 6) {
    await Promise.allSettled(
      messageIds.slice(index, index + 6).map(async (id) => {
        const message = await tenant.gmail.api.messages.get({ id, format: "full" });
        await cacheGmailMessage(tenant, message);
      }),
    );
  }

  return { messageIds, nextPageToken: result.nextPageToken ?? null };
}

async function getCachedGmailPage(
  userId: string,
  query: string | undefined,
  cursor: GmailLocalCursor | null,
): Promise<{ messages: CachedGmailMessage[]; hasMore: boolean; nextCursor: GmailLocalCursor | null }> {
  const filters = parseInboxQuery(query);
  const receivedAt = sql<string>`coalesce(${corsairEntities.data}->>'internalDate', '')`;
  const rows = await getDb().select({
    id: corsairEntities.id,
    entity_id: corsairEntities.entityId,
    entity_type: corsairEntities.entityType,
    version: corsairEntities.version,
    data: corsairEntities.data,
    created_at: corsairEntities.createdAt,
    updated_at: corsairEntities.updatedAt,
  }).from(corsairEntities)
    .innerJoin(corsairAccounts, eq(corsairEntities.accountId, corsairAccounts.id))
    .leftJoin(entityIntelligence, and(
      eq(entityIntelligence.entityId, corsairEntities.id),
      eq(entityIntelligence.userId, userId),
    ))
    .where(and(
      eq(corsairAccounts.tenantId, userId),
      eq(corsairEntities.entityType, "messages"),
      sql`${corsairEntities.data}->'labelIds' ? ${INBOX_LABEL}`,
      filters.searchText ? sql`${corsairEntities.data}::text ILIKE ${`%${filters.searchText}%`}` : undefined,
      filters.priority ? eq(entityIntelligence.priority, filters.priority) : undefined,
      filters.followUp ? eq(entityIntelligence.needsFollowUp, 1) : undefined,
      filters.unread ? sql`${corsairEntities.data}->'labelIds' ? ${UNREAD_LABEL}` : undefined,
      cursor ? or(
        sql`${receivedAt} < ${cursor.beforeDate}`,
        and(sql`${receivedAt} = ${cursor.beforeDate}`, sql`${corsairEntities.entityId} < ${cursor.beforeId}`),
      ) : undefined,
    ))
    .orderBy(desc(receivedAt), desc(corsairEntities.entityId))
    .limit(GMAIL_CACHE_BATCH_SIZE + 1);
  const pageRows = rows.slice(0, GMAIL_CACHE_BATCH_SIZE);
  const seenThreads = new Set<string>();
  let consumed = pageRows.length;
  for (let index = 0; index < pageRows.length; index += 1) {
    const data = pageRows[index].data as Record<string, unknown>;
    const threadId = typeof data.threadId === "string"
      ? data.threadId
      : null;
    if (threadId) seenThreads.add(threadId);
    if (seenThreads.size === GMAIL_PAGE_SIZE) {
      consumed = index + 1;
      break;
    }
  }
  const last = pageRows[consumed - 1];
  const lastData = last?.data as Record<string, unknown> | undefined;
  const nextCursor = last && typeof lastData?.internalDate === "string"
    ? { beforeDate: lastData.internalDate, beforeId: last.entity_id }
    : null;

  return {
    messages: pageRows.slice(0, consumed) as CachedGmailMessage[],
    hasMore: consumed < rows.length || await getGmailRemoteCursor(userId) !== null,
    nextCursor,
  };
}

function parseInboxQuery(query: string | undefined) {
  const normalized = query?.trim().slice(0, 200) ?? "";
  return {
    priority: normalized.match(/\bpriority:(high|normal|low)\b/i)?.[1]?.toLowerCase(),
    followUp: /\bis:followup\b/i.test(normalized),
    unread: /\bis:unread\b/i.test(normalized),
    searchText: normalized
      .replace(/\bpriority:(high|normal|low)\b/ig, "")
      .replace(/\bis:(followup|unread)\b/ig, "")
      .trim(),
  };
}

async function getGmailRemoteCursor(userId: string): Promise<string | null | undefined> {
  const row = await getDb().select({ cursor: integrationSyncState.cursor })
    .from(integrationSyncState)
    .where(and(
      eq(integrationSyncState.tenantId, userId),
      eq(integrationSyncState.integration, "gmail"),
      eq(integrationSyncState.scope, GMAIL_SYNC_SCOPE),
    ))
    .limit(1);
  return row[0] ? row[0].cursor : undefined;
}

async function setGmailRemoteCursor(userId: string, cursor: string | null) {
  await getDb().insert(integrationSyncState).values({
    id: randomUUID(),
    tenantId: userId,
    integration: "gmail",
    scope: GMAIL_SYNC_SCOPE,
    cursor,
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: [
      integrationSyncState.tenantId,
      integrationSyncState.integration,
      integrationSyncState.scope,
    ],
    set: { cursor, updatedAt: new Date() },
  });
}

function encodeLocalCursor(cursor: GmailLocalCursor) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeLocalCursor(cursor: string | undefined) {
  if (!cursor) return null;
  try {
    const value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as Partial<GmailLocalCursor>;
    return typeof value.beforeDate === "string" && value.beforeDate.length <= 100
      && typeof value.beforeId === "string" && value.beforeId.length <= 300
      ? { beforeDate: value.beforeDate, beforeId: value.beforeId }
      : null;
  } catch {
    return null;
  }
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
): (GmailMailboxThread & { intelligenceEntityIds: string[] })[] {
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
        intelligenceEntityId: latest?.id ?? "",
        intelligenceEntityIds: [...sorted].reverse().map((message) => message.id),
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
        priority: "normal",
        category: "other",
        needsFollowUp: false,
        intelligenceSummary: null,
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
    sent: message.data.labelIds?.includes(SENT_LABEL) ?? false,
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
