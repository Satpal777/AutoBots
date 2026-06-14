import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import {
  GmailDisconnectedState,
  GmailNotice,
  GmailThreadView,
} from "@/components/gmail/gmail-ui";
import { PageHeader } from "@/components/dashboard/workspace-panels";
import { getGmailLabels, getGmailThread } from "@/server/gmail";
import { getGoogleIntegrationStatuses } from "@/server/google-integrations";

type ThreadPageProps = {
  params: Promise<{ threadId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const ThreadIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(256)
  .regex(/^[A-Za-z0-9_-]+$/);

export default async function ThreadPage({
  params,
  searchParams,
}: ThreadPageProps) {
  const [{ threadId: rawThreadId }, queryParams, statuses] = await Promise.all([
    params,
    searchParams,
    getGoogleIntegrationStatuses(),
  ]);
  const threadIdResult = ThreadIdSchema.safeParse(rawThreadId);

  if (!threadIdResult.success) {
    notFound();
  }

  if (statuses.gmail !== "connected") {
    return (
      <>
        <PageHeader
          label="Conversation"
          title="Gmail is not connected"
          description="Reconnect Gmail to open this conversation."
        />
        <GmailDisconnectedState />
      </>
    );
  }

  const [thread, labels] = await Promise.all([
    getGmailThread(threadIdResult.data),
    getGmailLabels(),
  ]);

  if (!thread) {
    notFound();
  }

  return (
    <>
      <PageHeader
        label="Conversation"
        title={thread.subject ?? "No subject"}
        description={`${thread.messages.length} message${
          thread.messages.length === 1 ? "" : "s"
        } in this Gmail conversation.`}
        action={
          <Link
            href="/dashboard/inbox"
            className="product-button-secondary inline-flex items-center px-4"
          >
            Back to inbox
          </Link>
        }
      />
      <GmailNotice status={getStringParam(queryParams.status)} />
      <GmailThreadView thread={thread} labels={labels} />
    </>
  );
}

function getStringParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
