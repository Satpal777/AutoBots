import Link from "next/link";

import {
  applyGmailLabelAction,
  archiveGmailThreadAction,
  saveGmailDraftAction,
  sendGmailDraftAction,
  sendGmailMessageAction,
  setGmailThreadUnreadAction,
} from "@/app/(dashboard)/dashboard/inbox/actions";
import {
  type GmailDraftSummary,
  type GmailLabelOption,
  type GmailMailboxThread,
  type GmailThreadDetail,
} from "@/server/gmail";
import {
  ArchiveIcon,
  ArrowRightIcon,
  LabelIcon,
  MailIcon,
  PencilIcon,
  ReplyIcon,
  SendIcon,
} from "@/components/ui/icons";

import { GmailSubmitButton } from "./gmail-submit-button";
import { GmailReplyComposer } from "./gmail-reply-composer";

export function GmailSectionNav({ active }: { active: "inbox" | "drafts" }) {
  return (
    <nav aria-label="Gmail sections" className="product-tab-list">
      <Link
        href="/dashboard/inbox"
        aria-current={active === "inbox" ? "page" : undefined}
        className="product-tab"
      >
        Inbox
      </Link>
      <Link
        href="/dashboard/inbox/drafts"
        aria-current={active === "drafts" ? "page" : undefined}
        className="product-tab"
      >
        Drafts
      </Link>
    </nav>
  );
}

export function GmailNotice({ status }: { status?: string }) {
  const messages: Record<string, string> = {
    archived: "Conversation archived.",
    error: "Gmail could not complete that action. Please try again.",
    invalid: "Check the message fields and try again.",
    labeled: "Label added.",
    read: "Conversation marked as read.",
    refreshed: "Inbox refreshed from Gmail.",
    replied: "Reply sent.",
    saved: "Draft saved.",
    sent: "Message sent.",
    unread: "Conversation marked as unread.",
  };
  const message = status ? messages[status] : null;

  return message ? (
    <div
      role="status"
      className="product-notice mt-5 px-4 py-3 text-sm font-medium"
    >
      {message}
    </div>
  ) : null;
}

export function GmailDisconnectedState() {
  return (
    <div className="product-panel mt-8 max-w-3xl p-6 sm:p-8">
      <span className="grid size-11 place-items-center rounded-lg bg-surface-soft text-forest">
        <MailIcon className="size-5" />
      </span>
      <h2 className="mt-5 text-xl font-semibold text-ink">Connect Gmail first</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
        Connect Gmail in Settings to read, search, draft, send, and organize
        messages from this workspace.
      </p>
      <Link
        href="/dashboard/settings"
        className="product-button-primary mt-5 inline-flex items-center px-4"
      >
        Open connected apps
      </Link>
    </div>
  );
}

export function GmailThreadList({
  threads,
  query,
}: {
  threads: GmailMailboxThread[];
  query?: string;
}) {
  if (threads.length === 0) {
    return (
      <div className="product-panel mt-8 p-8 text-center">
        <p className="text-sm font-semibold text-ink">
          {query ? "No Gmail results" : "Your inbox is clear"}
        </p>
        <p className="mt-2 text-sm text-muted">
          {query
            ? "Try another Gmail search query."
            : "New inbox conversations will appear here."}
        </p>
      </div>
    );
  }

  return (
    <section className="product-panel mt-8 overflow-hidden">
      {threads.map((thread) => (
        <Link
          key={thread.id}
          href={`/dashboard/inbox/thread/${encodeURIComponent(thread.id)}`}
          className="gmail-thread-row group grid gap-3 border-b border-line px-5 py-4 last:border-b-0 hover:bg-surface-soft/60 sm:grid-cols-[minmax(10rem,0.7fr)_minmax(0,1.5fr)_auto] sm:items-center"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={`size-2 shrink-0 rounded-full ${
                thread.unread ? "bg-gold" : "bg-line"
              }`}
            />
            <p
              className={`truncate text-sm ${
                thread.unread ? "font-semibold text-ink" : "font-medium text-muted"
              }`}
            >
              {thread.from ?? "Sender unavailable"}
            </p>
          </div>
          <div className="min-w-0">
            <p
              className={`truncate text-sm ${
                thread.unread ? "font-semibold text-ink" : "font-medium text-ink/80"
              }`}
            >
              {thread.subject ?? "No subject"}
              {thread.messageCount > 1 ? (
                <span className="ml-2 text-xs font-medium text-muted">
                  {thread.messageCount}
                </span>
              ) : null}
            </p>
            <p className="mt-1 truncate text-xs text-muted">
              {thread.snippet ?? "Preview unavailable"}
            </p>
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <time className="text-xs font-medium text-muted">
              {formatMailboxDate(thread.receivedAt)}
            </time>
            <ArrowRightIcon className="size-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-forest" />
          </div>
        </Link>
      ))}
    </section>
  );
}

export function GmailThreadView({
  thread,
  labels,
  byokStorageKey,
}: {
  thread: GmailThreadDetail;
  labels: GmailLabelOption[];
  byokStorageKey: string;
}) {
  return (
    <>
      <div className="mt-7 flex flex-wrap gap-2">
        <form action={archiveGmailThreadAction}>
          <input type="hidden" name="threadId" value={thread.id} />
          <GmailSubmitButton pendingLabel="Archiving..." variant="quiet">
            <ArchiveIcon className="size-4" />
            Archive
          </GmailSubmitButton>
        </form>
        <form action={setGmailThreadUnreadAction}>
          <input type="hidden" name="threadId" value={thread.id} />
          <input type="hidden" name="unread" value={thread.unread ? "false" : "true"} />
          <GmailSubmitButton pendingLabel="Updating..." variant="quiet">
            <MailIcon className="size-4" />
            Mark {thread.unread ? "read" : "unread"}
          </GmailSubmitButton>
        </form>
        {labels.length > 0 ? (
          <form action={applyGmailLabelAction} className="flex gap-2">
            <input type="hidden" name="threadId" value={thread.id} />
            <label className="sr-only" htmlFor="gmail-label">
              Add Gmail label
            </label>
            <select
              id="gmail-label"
              name="labelId"
              required
              className="product-input px-3 text-sm font-medium"
            >
              <option value="">Choose label</option>
              {labels.map((label) => (
                <option key={label.id} value={label.id}>
                  {label.name}
                </option>
              ))}
            </select>
            <GmailSubmitButton pendingLabel="Adding..." variant="quiet">
              <LabelIcon className="size-4" />
              Add
            </GmailSubmitButton>
          </form>
        ) : null}
      </div>

      <section className="gmail-conversation mt-6" aria-label="Email conversation">
        <div className="gmail-conversation-heading">
          <div>
            <p className="text-sm font-semibold text-ink">Conversation</p>
            <p className="mt-0.5 text-xs text-muted">Oldest message first</p>
          </div>
          <span className="rounded-lg bg-surface-soft px-2.5 py-1 text-xs font-semibold text-muted">
            {thread.messages.length} message{thread.messages.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="gmail-timeline">
          {thread.messages.map((message, index) => (
            <article
              key={message.id}
              className={`gmail-timeline-item ${
                message.sent
                  ? "gmail-timeline-item-sent"
                  : "gmail-timeline-item-received"
              }`}
              style={{ "--thread-index": index } as React.CSSProperties}
            >
              <div
                className={`gmail-timeline-marker ${
                  message.sent ? "gmail-timeline-marker-sent" : ""
                }`}
                aria-hidden="true"
              >
                {message.sent ? (
                  <SendIcon className="size-3.5" />
                ) : (
                  getSenderInitials(message.from)
                )}
              </div>
              <div
                className={`gmail-message ${
                  message.sent ? "gmail-message-sent" : "gmail-message-received"
                }`}
              >
                <header className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-ink">
                        {message.sent ? "You" : getSenderName(message.from)}
                      </p>
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[0.68rem] font-semibold ${
                          message.sent
                            ? "bg-success-soft text-success"
                            : "bg-surface-soft text-muted"
                        }`}
                      >
                        {message.sent ? "Sent" : "Received"}
                      </span>
                      {message.unread ? <span className="size-1.5 shrink-0 rounded-full bg-gold" title="Unread" /> : null}
                    </div>
                    <p className="mt-1 truncate text-xs text-muted">
                      {message.sent
                        ? `To ${message.to ?? "recipient unavailable"}`
                        : `From ${message.from ?? "sender unavailable"}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-[0.68rem] font-semibold text-muted">
                      {index + 1} of {thread.messages.length}
                    </span>
                    <time className="text-xs font-medium text-muted">
                      {formatMessageDate(message.receivedAt)}
                    </time>
                  </div>
                </header>
                <div className="mt-5 whitespace-pre-wrap break-words text-sm leading-7 text-ink/85">
                  {message.body ?? "Message body unavailable."}
                </div>
              </div>
            </article>
          ))}

          {thread.replyTo ? (
            <div className="gmail-timeline-item gmail-timeline-reply" style={{ "--thread-index": thread.messages.length } as React.CSSProperties}>
              <div className="gmail-timeline-marker gmail-timeline-marker-reply" aria-hidden="true">
                <ReplyIcon className="size-4" />
              </div>
              <section className="gmail-reply-composer">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">Continue the conversation</p>
                    <p className="mt-0.5 truncate text-xs text-muted">Reply to {thread.replyTo}</p>
                  </div>
                  <ReplyIcon className="size-4 shrink-0 text-forest" />
                </div>
                <GmailReplyComposer
                  threadId={thread.id}
                  to={thread.replyTo}
                  subject={prefixReplySubject(thread.subject)}
                  byokStorageKey={byokStorageKey}
                />
              </section>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}

export function GmailComposeForm({ draft }: { draft?: GmailDraftSummary | null }) {
  return (
    <form className="product-panel mt-8 max-w-4xl p-5 sm:p-7">
      {draft ? <input type="hidden" name="draftId" value={draft.id} /> : null}
      <div className="grid gap-5">
        <label className="grid gap-2 text-sm font-semibold text-ink">
          To
          <input
            type="text"
            name="to"
            required
            defaultValue={draft?.to ?? ""}
            placeholder="person@example.com"
            className="product-input px-4 text-sm font-normal"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Subject
          <input
            type="text"
            name="subject"
            defaultValue={draft?.subject ?? ""}
            className="product-input px-4 text-sm font-normal"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Message
          <textarea
            name="body"
            required
            rows={14}
            defaultValue={draft?.body ?? ""}
            className="product-input resize-y px-4 py-3 text-sm font-normal leading-7"
          />
        </label>
      </div>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button
          formAction={saveGmailDraftAction}
          className="product-button-secondary inline-flex items-center gap-2 px-4"
        >
          <PencilIcon className="size-4" />
          Save draft
        </button>
        <button
          formAction={sendGmailMessageAction}
          className="product-button-primary inline-flex items-center gap-2 px-4"
        >
          <SendIcon className="size-4" />
          Send email
        </button>
      </div>
    </form>
  );
}

export function GmailDraftList({ drafts }: { drafts: GmailDraftSummary[] }) {
  if (drafts.length === 0) {
    return (
      <div className="product-panel mt-8 p-8 text-center">
        <p className="text-sm font-semibold text-ink">No drafts waiting</p>
        <Link
          href="/dashboard/inbox/compose"
          className="product-button-primary mt-4 inline-flex items-center px-4"
        >
          Compose email
        </Link>
      </div>
    );
  }

  return (
    <section className="product-panel mt-8 divide-y divide-line overflow-hidden">
      {drafts.map((draft) => (
        <article key={draft.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">
              {draft.subject ?? "No subject"}
            </p>
            <p className="mt-1 truncate text-xs text-muted">
              To: {draft.to ?? "Recipient not set"}
            </p>
            <p className="mt-2 line-clamp-1 text-sm text-muted">
              {draft.body ?? "Message body is empty."}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/dashboard/inbox/compose?draftId=${encodeURIComponent(draft.id)}`}
              className="product-button-secondary inline-flex items-center px-4"
            >
              Edit
            </Link>
            <form action={sendGmailDraftAction}>
              <input type="hidden" name="draftId" value={draft.id} />
              <GmailSubmitButton pendingLabel="Sending...">
                <SendIcon className="size-4" />
                Send
              </GmailSubmitButton>
            </form>
          </div>
        </article>
      ))}
    </section>
  );
}

function formatMailboxDate(value: string | null): string {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatMessageDate(value: string | null): string {
  if (!value) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function getSenderName(value: string | null): string {
  if (!value) return "Sender unavailable";
  return value.match(/^"?([^"<]+)"?\s*</)?.[1]?.trim() || value.split("@")[0] || value;
}

function getSenderInitials(value: string | null): string {
  const name = getSenderName(value);
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "M";
}

function prefixReplySubject(subject: string | null): string {
  if (!subject) {
    return "";
  }

  return /^re:/i.test(subject) ? subject : `Re: ${subject}`;
}
