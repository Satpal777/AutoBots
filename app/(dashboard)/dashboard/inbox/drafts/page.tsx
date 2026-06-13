import Link from "next/link";

import {
  GmailDisconnectedState,
  GmailDraftList,
  GmailNotice,
  GmailSectionNav,
} from "@/components/gmail/gmail-ui";
import { PageHeader } from "@/components/dashboard/workspace-panels";
import { PencilIcon } from "@/components/ui/icons";
import { getGmailDrafts, type GmailDraftSummary } from "@/server/gmail";
import { getGoogleIntegrationStatuses } from "@/server/google-integrations";

type DraftsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DraftsPage({ searchParams }: DraftsPageProps) {
  const [statuses, params] = await Promise.all([
    getGoogleIntegrationStatuses(),
    searchParams,
  ]);
  const status = getStringParam(params.status);

  if (statuses.gmail !== "connected") {
    return (
      <>
        <PageHeader
          label="Drafts"
          title="Gmail drafts"
          description="Connect Gmail before creating or reviewing drafts."
        />
        <GmailDisconnectedState />
      </>
    );
  }

  let drafts: GmailDraftSummary[] = [];
  let loadError = false;

  try {
    drafts = await getGmailDrafts();
  } catch {
    loadError = true;
  }

  return (
    <>
      <PageHeader
        label="Drafts"
        title="Gmail drafts"
        description="Continue unfinished messages or send them when ready."
        action={
          <Link
            href="/dashboard/inbox/compose"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-forest px-4 text-sm font-semibold text-white transition hover:bg-forest-hover"
          >
            <PencilIcon className="size-4" />
            Compose email
          </Link>
        }
      />
      <GmailNotice status={loadError ? "error" : status} />
      <div className="mt-7">
        <GmailSectionNav active="drafts" />
      </div>
      <GmailDraftList drafts={drafts} />
    </>
  );
}

function getStringParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
