"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  archiveGmailThreadInlineAction,
  correctInboxIntelligenceAction,
  setGmailThreadUnreadInlineAction,
} from "@/app/(dashboard)/dashboard/inbox/actions";
import { AlertIcon, ArchiveIcon, ArrowDownIcon, FlagIcon, LabelIcon, MailIcon, PriorityIcon, ReplyIcon } from "@/components/ui/icons";
import type { GmailMailboxThread } from "@/server/gmail";
import { getLocalIntelligenceCredential } from "@/components/chat/byok-storage";

export function GmailInboxList({ initialThreads, initialNextPageToken, query, byokStorageKey }: {
  initialThreads: GmailMailboxThread[];
  initialNextPageToken: string | null;
  query?: string;
  byokStorageKey: string;
}) {
  const [threads, setThreads] = useState(initialThreads);
  const [nextPageToken, setNextPageToken] = useState(initialNextPageToken);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const refreshLatest = async () => {
      if (document.visibilityState !== "visible") return;
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      const response = await fetchInboxPage(params, byokStorageKey);
      if (!response.ok) return;
      const page = await response.json() as { threads: GmailMailboxThread[]; nextPageToken: string | null };
      setThreads((current) => mergeThreads(current, page.threads));
    };
    void refreshLatest();
    const timer = window.setInterval(refreshLatest, 60_000);
    return () => window.clearInterval(timer);
  }, [byokStorageKey, query]);

  async function loadOlder() {
    if (!nextPageToken || loading) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ pageToken: nextPageToken });
      if (query) params.set("q", query);
      const response = await fetchInboxPage(params, byokStorageKey);
      if (!response.ok) throw new Error("Inbox page failed.");
      const page = await response.json() as { threads: GmailMailboxThread[]; nextPageToken: string | null };
      setThreads((current) => mergeThreads(current, page.threads));
      setNextPageToken(page.nextPageToken);
    } finally {
      setLoading(false);
    }
  }

  if (threads.length === 0) {
    return <div className="product-panel mt-6 p-8 text-center text-sm text-muted">{query ? "No Gmail results." : "Your inbox is clear."}</div>;
  }

  return (
    <section className="product-panel mt-6 overflow-hidden">
      {threads.map((thread) => (
        <article key={thread.id} className="gmail-inbox-row group grid gap-2 border-b border-line px-4 py-3 last:border-b-0 hover:bg-surface-soft/60 sm:grid-cols-[minmax(8rem,0.55fr)_minmax(0,1.5fr)_auto] sm:items-center">
          <Link href={`/dashboard/inbox/thread/${encodeURIComponent(thread.id)}`} className="gmail-inbox-sender flex min-w-0 items-center gap-2">
            <span className={`size-2 shrink-0 rounded-full ${thread.unread ? "bg-gold" : "bg-line"}`} />
            <span className={`truncate text-sm ${thread.unread ? "font-semibold text-ink" : "font-medium text-muted"}`}>{thread.from ?? "Sender unavailable"}</span>
          </Link>
          <Link href={`/dashboard/inbox/thread/${encodeURIComponent(thread.id)}`} className="gmail-inbox-content min-w-0">
            <span className="block truncate text-sm font-semibold text-ink">{thread.subject ?? "No subject"}</span>
            <p className="mt-0.5 truncate text-xs text-muted">{thread.intelligenceSummary ?? thread.snippet ?? "Preview unavailable"}</p>
            <EmailSignals thread={thread} />
          </Link>
          <div className="gmail-inbox-actions flex items-center justify-between gap-1 sm:justify-end">
            <time className="mr-1 text-xs font-medium text-muted">{formatMailboxDate(thread.receivedAt)}</time>
            <PriorityAction thread={thread} />
            <InlineAction action={correctInboxIntelligenceAction} label={thread.needsFollowUp ? "Clear follow-up" : "Mark follow-up"}>
              <input type="hidden" name="entityId" value={thread.intelligenceEntityId} />
              <input type="hidden" name="priority" value={thread.priority} />
              <input type="hidden" name="needsFollowUp" value={thread.needsFollowUp ? "false" : "true"} />
              <FlagIcon className={`size-4 ${thread.needsFollowUp ? "text-gold" : ""}`} />
            </InlineAction>
            <InlineAction action={setGmailThreadUnreadInlineAction} label={thread.unread ? "Mark read" : "Mark unread"}>
              <input type="hidden" name="threadId" value={thread.id} />
              <input type="hidden" name="unread" value={thread.unread ? "false" : "true"} />
              <MailIcon className="size-4" />
            </InlineAction>
            <InlineAction action={archiveGmailThreadInlineAction} label="Archive">
              <input type="hidden" name="threadId" value={thread.id} />
              <ArchiveIcon className="size-4" />
            </InlineAction>
            <Link href={`/dashboard/inbox/thread/${encodeURIComponent(thread.id)}`} aria-label="Open and reply" className="product-icon-button grid size-9 min-h-0 place-items-center"><ReplyIcon className="size-4" /></Link>
          </div>
        </article>
      ))}
      {nextPageToken ? (
        <div className="border-t border-line p-3 text-center">
          <button type="button" disabled={loading} onClick={loadOlder} className="product-button-secondary px-4 disabled:opacity-60">{loading ? "Loading and organizing..." : "Load older email"}</button>
        </div>
      ) : null}
    </section>
  );
}

async function fetchInboxPage(params: URLSearchParams, storageKey: string) {
  const byok = getLocalIntelligenceCredential(storageKey);
  return fetch("/api/inbox/page", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      q: params.get("q") || undefined,
      pageToken: params.get("pageToken") || undefined,
      byok,
    }),
  });
}

function InlineAction({ action, label, children }: { action: (formData: FormData) => void | Promise<void>; label: string; children: React.ReactNode }) {
  return <form action={action}><button type="submit" aria-label={label} title={label} className="product-icon-button grid size-9 min-h-0 place-items-center">{children}</button></form>;
}

function EmailSignals({ thread }: { thread: GmailMailboxThread }) {
  const priority = getPriorityPresentation(thread.priority);
  const PrioritySignalIcon = priority.icon;
  return (
    <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[0.68rem] font-medium">
      <span className={`inline-flex items-center gap-1 ${priority.className}`} title={`AI priority: ${priority.label}`}>
        <PrioritySignalIcon aria-hidden="true" className="size-3" />
        {priority.label}
      </span>
      {thread.needsFollowUp ? (
        <span className="inline-flex items-center gap-1 text-forest" title="This email likely needs a reply or action">
          <FlagIcon aria-hidden="true" className="size-3 text-gold" />
          Reply needed
        </span>
      ) : null}
      {thread.category !== "other" ? (
        <span className="inline-flex items-center gap-1 capitalize text-muted">
          <LabelIcon aria-hidden="true" className="size-3" />
          {thread.category}
        </span>
      ) : null}
    </div>
  );
}

function PriorityAction({ thread }: { thread: GmailMailboxThread }) {
  const current = getPriorityPresentation(thread.priority);
  const next = thread.priority === "high" ? "normal" : thread.priority === "normal" ? "low" : "high";
  const CurrentIcon = current.icon;
  return (
    <InlineAction action={correctInboxIntelligenceAction} label={`Change priority from ${current.label} to ${getPriorityPresentation(next).label}`}>
      <input type="hidden" name="entityId" value={thread.intelligenceEntityId} />
      <input type="hidden" name="priority" value={next} />
      <input type="hidden" name="needsFollowUp" value={thread.needsFollowUp ? "true" : "false"} />
      <CurrentIcon className={`size-4 ${current.className}`} />
    </InlineAction>
  );
}

function getPriorityPresentation(priority: string) {
  if (priority === "high") return { label: "High attention", icon: AlertIcon, className: "text-[oklch(0.52_0.17_28)]" };
  if (priority === "low") return { label: "Low priority", icon: ArrowDownIcon, className: "text-muted" };
  return { label: "Normal priority", icon: PriorityIcon, className: "text-muted" };
}

function formatMailboxDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(value)) : "";
}

function mergeThreads(current: GmailMailboxThread[], incoming: GmailMailboxThread[]) {
  const unique = new Map(current.map((thread) => [thread.id, thread]));
  incoming.forEach((thread) => unique.set(thread.id, thread));
  return [...unique.values()].sort((left, right) => Date.parse(right.receivedAt ?? "") - Date.parse(left.receivedAt ?? ""));
}
