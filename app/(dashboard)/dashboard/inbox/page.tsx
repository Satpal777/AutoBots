import Link from "next/link";
import { z } from "zod";

import { analyzeInboxAction, refreshGmailInboxAction } from "./actions";
import {
  GmailDisconnectedState,
  GmailNotice,
  GmailSectionNav,
  GmailThreadList,
} from "@/components/gmail/gmail-ui";
import { GmailSubmitButton } from "@/components/gmail/gmail-submit-button";
import { PageHeader } from "@/components/dashboard/workspace-panels";
import {
  PencilIcon,
  RefreshIcon,
  SearchIcon,
  SparklesIcon,
} from "@/components/ui/icons";
import { getGmailInbox, type GmailMailboxThread } from "@/server/gmail";
import { getGoogleIntegrationStatuses } from "@/server/google-integrations";

type InboxPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const GmailQuerySchema = z.string().trim().max(200);

export default async function InboxPage({ searchParams }: InboxPageProps) {
  const [statuses, params] = await Promise.all([
    getGoogleIntegrationStatuses(),
    searchParams,
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

  let threads: GmailMailboxThread[] = [];
  let loadError = false;

  try {
    threads = await getGmailInbox(query);
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

      <div className="mt-7 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <GmailSectionNav active="inbox" />
        <div className="flex flex-col gap-2 sm:flex-row">
          <form
            action="/dashboard/inbox"
            className="product-input flex min-w-0 overflow-hidden sm:min-w-80"
          >
            <label className="sr-only" htmlFor="gmail-search">
              Search Gmail
            </label>
            <input
              id="gmail-search"
              name="q"
              defaultValue={query}
              maxLength={200}
              placeholder="from:person@example.com is:unread"
              className="min-w-0 flex-1 bg-transparent px-4 text-sm text-ink outline-none"
            />
            <button
              type="submit"
              aria-label="Search Gmail"
              className="grid size-11 shrink-0 place-items-center text-forest transition hover:bg-surface-soft"
            >
              <SearchIcon className="size-4" />
            </button>
          </form>
          <form action={refreshGmailInboxAction}>
            <GmailSubmitButton pendingLabel="Refreshing..." variant="quiet">
              <RefreshIcon className="size-4" />
              Refresh
            </GmailSubmitButton>
          </form>
          <form action={analyzeInboxAction}>
            <GmailSubmitButton pendingLabel="Analyzing..." variant="quiet">
              <SparklesIcon className="size-4" />
              Analyze workspace
            </GmailSubmitButton>
          </form>
        </div>
      </div>

      <GmailThreadList threads={threads} query={query} />
    </>
  );
}

function getStringParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
