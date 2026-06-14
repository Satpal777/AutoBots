import {
  CalendarPanel,
  InboxPanel,
  PageHeader,
} from "@/components/dashboard/workspace-panels";
import { DailyBriefingPanel } from "@/components/dashboard/briefing-panels";
import { requireSession } from "@/lib/auth/session";
import { getDailyBriefing } from "@/server/daily-briefing";
import { getGoogleIntegrationStatuses } from "@/server/google-integrations";
import { getWorkspacePreview } from "@/server/workspace-preview";

export default async function TodayPage() {
  const session = await requireSession();
  const statuses = await getGoogleIntegrationStatuses();
  const [preview, briefing] = await Promise.all([
    getWorkspacePreview(statuses),
    getDailyBriefing(statuses),
  ]);
  const firstName = session.user.name?.split(" ")[0] || "there";

  return (
    <>
      <PageHeader
        label="Today"
        title={`Good morning, ${firstName}.`}
        description="Start with the messages and events that need your attention."
      />

      <DailyBriefingPanel briefing={briefing} />

      <section className="mt-12">
        <div className="mb-6 flex items-end gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-ink">
              Workspace pulse
            </h2>
            <p className="mt-1 text-sm text-muted">
              The newest messages and the shape of your week.
            </p>
          </div>
          <span className="mb-2 hidden h-px flex-1 bg-line sm:block" />
        </div>
        <div className="grid items-start gap-5 xl:grid-cols-[1.25fr_0.75fr]">
          <InboxPanel preview={preview.gmail} compact />
          <CalendarPanel preview={preview.calendar} compact />
        </div>
      </section>
    </>
  );
}
