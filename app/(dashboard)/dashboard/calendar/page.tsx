import Link from "next/link";

import { CalendarPanel, PageHeader } from "@/components/dashboard/workspace-panels";
import { SettingsIcon } from "@/components/ui/icons";
import { getGoogleIntegrationStatuses } from "@/server/google-integrations";
import { getCalendarWorkspacePreview } from "@/server/workspace-preview";

export default async function CalendarPage() {
  const statuses = await getGoogleIntegrationStatuses();
  const preview = await getCalendarWorkspacePreview(statuses.googlecalendar);
  return (
    <>
      <PageHeader
        label="Calendar"
        title="Your next seven days"
        description="Keep upcoming events and invitations in one readable view."
        action={
          <Link
            href="/dashboard/settings"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-surface-soft px-4 text-sm font-semibold text-forest transition hover:bg-gold-soft"
          >
            <SettingsIcon className="size-4" />
            Calendar settings
          </Link>
        }
      />

      <div className="mt-8 max-w-5xl">
        <CalendarPanel preview={preview} />
      </div>
    </>
  );
}
