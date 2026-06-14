import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import {
  GmailComposeForm,
  GmailDisconnectedState,
  GmailNotice,
} from "@/components/gmail/gmail-ui";
import { PageHeader } from "@/components/dashboard/workspace-panels";
import { getGmailDraft } from "@/server/gmail";
import { getGoogleIntegrationStatuses } from "@/server/google-integrations";

type ComposePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const DraftIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(256)
  .regex(/^[A-Za-z0-9_-]+$/);

export default async function ComposePage({ searchParams }: ComposePageProps) {
  const [statuses, params] = await Promise.all([
    getGoogleIntegrationStatuses(),
    searchParams,
  ]);
  const rawDraftId = getStringParam(params.draftId);
  const draftIdResult = rawDraftId
    ? DraftIdSchema.safeParse(rawDraftId)
    : null;
  const status = getStringParam(params.status);

  if (draftIdResult && !draftIdResult.success) {
    notFound();
  }

  if (statuses.gmail !== "connected") {
    return (
      <>
        <PageHeader
          label="Compose"
          title="Write an email"
          description="Connect Gmail before creating messages."
        />
        <GmailDisconnectedState />
      </>
    );
  }

  const draft = draftIdResult?.success
    ? await getGmailDraft(draftIdResult.data).catch(() => null)
    : null;

  if (draftIdResult?.success && !draft) {
    notFound();
  }

  return (
    <>
      <PageHeader
        label="Compose"
        title={draft ? "Edit draft" : "Write an email"}
        description="Send immediately or keep the message as a Gmail draft."
        action={
          <Link
            href="/dashboard/inbox"
            className="product-button-secondary inline-flex items-center px-4"
          >
            Back to inbox
          </Link>
        }
      />
      <GmailNotice status={status} />
      <GmailComposeForm draft={draft} />
    </>
  );
}

function getStringParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
