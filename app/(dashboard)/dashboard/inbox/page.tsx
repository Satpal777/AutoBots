import Link from "next/link";
import { z } from "zod";

import { refreshGmailInboxAction } from "./actions";
import {
  GmailDisconnectedState,
  GmailNotice,
  GmailSectionNav,
} from "@/components/gmail/gmail-ui";
import { GmailInboxList } from "@/components/gmail/gmail-inbox-list";
import { InboxIntelligenceNotice } from "@/components/gmail/inbox-intelligence-notice";
import { GmailSubmitButton } from "@/components/gmail/gmail-submit-button";
import { PageHeader } from "@/components/dashboard/workspace-panels";
import {
  AlertIcon,
  FlagIcon,
  MailIcon,
  PencilIcon,
  RefreshIcon,
  SearchIcon,
} from "@/components/ui/icons";
import { getGmailInbox, type GmailInboxPage } from "@/server/gmail";
import { getGoogleIntegrationStatuses } from "@/server/google-integrations";
import { requireSession } from "@/lib/auth/session";
import { getByokStorageKey } from "@/server/byok";

type InboxPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const GmailQuerySchema = z.string().trim().max(200);

export default async function InboxPage({ searchParams }: InboxPageProps) {
  const [statuses, params, session] = await Promise.all([
    getGoogleIntegrationStatuses(),
    searchParams,
    requireSession(),
  ]);
  const queryResult = GmailQuerySchema.safeParse(getStringParam(params.q) ?? "");
  const query = queryResult.success ? queryResult.data || undefined : undefined;
  const status = getStringParam(params.status);

  if (statuses.gmail !== "connected") {
    return (
      <>
        <PageHeader
          label="Inbox"
          title="Your Gmail workspace"
          description="Search, review, draft, and organize email."
        />
        <GmailDisconnectedState />
      </>
    );
  }

  let inbox: GmailInboxPage = { threads: [], nextPageToken: null };
  let loadError = false;

  try {
    inbox = await getGmailInbox(query);
  } catch {
    loadError = true;
  }

  return (
    <>
      <PageHeader
        label="Inbox"
        title={query ? "Search results" : "Your Gmail workspace"}
        description={
          query
            ? `Showing Gmail results for "${query}".`
            : "Review conversations and act without leaving your workspace."
        }
        action={
          <Link
            href="/dashboard/inbox/compose"
            className="product-button-primary inline-flex items-center gap-2 px-4"
          >
            <PencilIcon className="size-4" />
            Compose email
          </Link>
        }
      />

      <GmailNotice status={loadError ? "error" : status} />
      <InboxIntelligenceNotice />

      <div className="mt-7 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <GmailSectionNav active="inbox" />
          <p className="mt-2 text-xs font-medium text-muted">New mail is checked and organized automatically while this inbox is open.</p>
        </div>
        <div className="flex items-center gap-2">
          <InboxSearch query={query} />
          <form action={refreshGmailInboxAction}>
            <GmailSubmitButton pendingLabel="Refreshing..." variant="quiet">
              <RefreshIcon className="size-4" />
              Refresh
            </GmailSubmitButton>
          </form>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <InboxFilter href={getFilterHref(query, "priority:high")} active={hasFilter(query, "priority:high")} icon={AlertIcon}>High attention</InboxFilter>
        <InboxFilter href={getFilterHref(query, "is:followup")} active={hasFilter(query, "is:followup")} icon={FlagIcon}>Reply needed</InboxFilter>
        <InboxFilter href={getFilterHref(query, "is:unread")} active={hasFilter(query, "is:unread")} icon={MailIcon}>Unread</InboxFilter>
        {query ? <Link href="/dashboard/inbox" className="px-2 py-1 text-xs font-semibold text-muted transition hover:text-forest">Clear search</Link> : null}
      </div>

      <GmailInboxList
        key={inbox.threads.map((thread) => `${thread.id}:${thread.unread}:${thread.priority}:${thread.needsFollowUp}`).join("|")}
        initialThreads={inbox.threads}
        initialNextPageToken={inbox.nextPageToken}
        query={query}
        byokStorageKey={getByokStorageKey(session.user.id)}
      />
    </>
  );
}

function InboxSearch({ query }: { query?: string }) {
  return (
    <form action="/dashboard/inbox" className="product-input flex h-10 min-w-0 overflow-hidden sm:w-72">
      <SearchIcon className="ml-3 size-4 shrink-0 self-center text-muted" />
      <label className="sr-only" htmlFor="gmail-search">Search inbox</label>
      <input id="gmail-search" name="q" defaultValue={query} maxLength={200} placeholder="Search or combine filters" className="min-w-0 flex-1 bg-transparent px-2 text-sm text-ink outline-none placeholder:text-muted" />
      <button type="submit" aria-label="Search inbox" className="grid w-10 shrink-0 place-items-center text-xs font-semibold text-muted transition hover:bg-surface-soft hover:text-forest">Go</button>
    </form>
  );
}

function InboxFilter({ href, active, icon: Icon, children }: { href: string; active: boolean; icon: typeof SearchIcon; children: React.ReactNode }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition ${active ? "bg-surface-soft text-forest" : "text-muted hover:bg-surface-soft hover:text-forest"}`}>
      <Icon className="size-3.5" />
      {children}
    </Link>
  );
}

function getFilterHref(query: string | undefined, filter: string) {
  const nextQuery = toggleFilter(query, filter);
  return nextQuery ? `/dashboard/inbox?q=${encodeURIComponent(nextQuery)}` : "/dashboard/inbox";
}

function toggleFilter(query: string | undefined, filter: string) {
  const normalized = query?.trim() ?? "";
  const pattern = getFilterPattern(filter);
  if (pattern.test(normalized)) {
    return normalized.replace(pattern, " ").replace(/\s+/g, " ").trim();
  }
  return `${normalized} ${filter}`.trim();
}

function hasFilter(query: string | undefined, filter: string) {
  return getFilterPattern(filter).test(query ?? "");
}

function getFilterPattern(filter: string) {
  return new RegExp(`(?:^|\\s)${filter.replace(":", "\\:")}(?=\\s|$)`, "i");
}

function getStringParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
