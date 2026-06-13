import Link from "next/link";

import { InboxPanel, PageHeader } from "@/components/dashboard/workspace-panels";
import { SettingsIcon } from "@/components/ui/icons";
import { getGoogleIntegrationStatuses } from "@/server/google-integrations";
import { getGmailWorkspacePreview } from "@/server/workspace-preview";

export default async function InboxPage() {
  const statuses = await getGoogleIntegrationStatuses();
  const preview = await getGmailWorkspacePreview(statuses.gmail);

  return (
    <>
      <PageHeader
        label="Inbox"
        title="Recent conversations"
        description="Review the latest messages in your Gmail inbox."
        action={
          <Link
            href="/dashboard/settings"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-surface-soft px-4 text-sm font-semibold text-forest transition hover:bg-gold-soft"
          >
            <SettingsIcon className="size-4" />
            Inbox settings
          </Link>
        }
      />

      <div className="mt-8 max-w-5xl">
        <InboxPanel preview={preview} />
      </div>
    </>
  );
}
