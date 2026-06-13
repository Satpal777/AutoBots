import { SignOutButton } from "@/components/auth/sign-out-button";
import { IntegrationActionButton } from "@/components/integrations/integration-action-button";
import { requireSession } from "@/lib/auth/session";
import {
  type GoogleIntegrationPlugin,
  GoogleIntegrationPluginSchema,
  googleIntegrationDetails,
} from "@/lib/integrations/google";
import { getGoogleIntegrationStatuses } from "@/server/google-integrations";
import {
  type CalendarPreview,
  type GmailPreview,
  getWorkspacePreview,
} from "@/server/workspace-preview";

import {
  connectGoogleIntegrationAction,
  disconnectGoogleIntegrationAction,
} from "./actions";

type DashboardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const session = await requireSession();
  const statuses = await getGoogleIntegrationStatuses();
  const [preview, params] = await Promise.all([
    getWorkspacePreview(statuses),
    searchParams,
  ]);
  const notice = getNotice(params);

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10">
      <section className="mx-auto max-w-5xl">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm font-medium text-zinc-500">Autobot dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
              Welcome, {session.user.name}
            </h1>
            <p className="mt-3 text-zinc-600">{session.user.email}</p>
          </div>
          <SignOutButton />
        </div>

        {notice ? (
          <div
            className={`mt-8 rounded-xl border p-4 text-sm ${
              notice.kind === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-900"
            }`}
          >
            {notice.message}
          </div>
        ) : null}

        <div className="mt-10">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-500">
            Google Workspace
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
            Connect the tools Autobot can manage
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            Each connection is encrypted by Corsair and isolated to your
            authenticated Autobot account.
          </p>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {(Object.keys(googleIntegrationDetails) as GoogleIntegrationPlugin[]).map(
            (plugin) => (
              <IntegrationCard
                key={plugin}
                plugin={plugin}
                status={statuses[plugin]}
              />
            ),
          )}
        </div>

        <div className="mt-12">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-500">
            Live workspace preview
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
            Mail and schedule at a glance
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            This refreshes a small amount of data through Corsair and confirms
            that each connected Google integration is working.
          </p>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <GmailPreviewCard preview={preview.gmail} />
          <CalendarPreviewCard preview={preview.calendar} />
        </div>
      </section>
    </main>
  );
}

function IntegrationCard({
  plugin,
  status,
}: {
  plugin: GoogleIntegrationPlugin;
  status: "connected" | "disconnected" | "error";
}) {
  const details = googleIntegrationDetails[plugin];
  const connected = status === "connected";

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="grid size-11 place-items-center rounded-xl bg-zinc-950 text-sm font-semibold text-white">
          {plugin === "gmail" ? "G" : "31"}
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            connected
              ? "bg-emerald-100 text-emerald-800"
              : status === "error"
                ? "bg-amber-100 text-amber-900"
                : "bg-zinc-100 text-zinc-600"
          }`}
        >
          {connected ? "Connected" : status === "error" ? "Check setup" : "Not connected"}
        </span>
      </div>

      <h3 className="mt-5 text-lg font-semibold text-zinc-950">
        {details.name}
      </h3>
      <p className="mt-2 min-h-12 text-sm leading-6 text-zinc-600">
        {details.description}
      </p>

      <form
        action={
          connected
            ? disconnectGoogleIntegrationAction
            : connectGoogleIntegrationAction
        }
        className="mt-6"
      >
        <input type="hidden" name="plugin" value={plugin} />
        <IntegrationActionButton
          pendingLabel={connected ? "Disconnecting..." : "Connecting..."}
          variant={connected ? "secondary" : "primary"}
        >
          {connected ? "Disconnect" : `Connect ${details.name}`}
        </IntegrationActionButton>
      </form>
    </article>
  );
}

function GmailPreviewCard({ preview }: { preview: GmailPreview }) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-zinc-950">Inbox</h3>
        {preview.status === "ready" ? (
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            About {preview.unreadEstimate} unread
          </span>
        ) : null}
      </div>

      <PreviewState
        status={preview.status}
        disconnectedMessage="Connect Gmail to preview your inbox."
        errorMessage="Gmail could not be refreshed. Reconnect it and try again."
        empty={preview.threads.length === 0}
        emptyMessage="No inbox threads found."
      >
        <div className="mt-5 divide-y divide-zinc-100">
          {preview.threads.map((thread) => (
            <div key={thread.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-4">
                <p className="truncate text-sm font-medium text-zinc-900">
                  {thread.from}
                </p>
                <span className="shrink-0 text-xs text-zinc-400">Inbox</span>
              </div>
              <p className="mt-1 truncate text-sm font-medium text-zinc-700">
                {thread.subject}
              </p>
              <p className="mt-1 line-clamp-2 text-sm leading-5 text-zinc-500">
                {thread.snippet}
              </p>
            </div>
          ))}
        </div>
      </PreviewState>
    </article>
  );
}

function CalendarPreviewCard({ preview }: { preview: CalendarPreview }) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-zinc-950">
          Upcoming events
        </h3>
        {preview.status === "ready" ? (
          <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
            Next 7 days
          </span>
        ) : null}
      </div>

      <PreviewState
        status={preview.status}
        disconnectedMessage="Connect Google Calendar to preview your schedule."
        errorMessage="Calendar could not be refreshed. Reconnect it and try again."
        empty={preview.events.length === 0}
        emptyMessage="No upcoming events in the next seven days."
      >
        <div className="mt-5 space-y-3">
          {preview.events.map((event) => (
            <div
              key={event.id}
              className="rounded-xl border border-zinc-100 bg-zinc-50 p-4"
            >
              <p className="text-sm font-medium text-zinc-900">{event.title}</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                {event.when}
              </p>
              {event.location ? (
                <p className="mt-1 truncate text-xs text-zinc-400">
                  {event.location}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </PreviewState>
    </article>
  );
}

function PreviewState({
  status,
  disconnectedMessage,
  errorMessage,
  empty,
  emptyMessage,
  children,
}: {
  status: "ready" | "disconnected" | "error";
  disconnectedMessage: string;
  errorMessage: string;
  empty: boolean;
  emptyMessage: string;
  children: React.ReactNode;
}) {
  if (status !== "ready" || empty) {
    const message =
      status === "error"
        ? errorMessage
        : status === "disconnected"
          ? disconnectedMessage
          : emptyMessage;

    return (
      <div className="mt-5 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-5 text-sm leading-6 text-zinc-500">
        {message}
      </div>
    );
  }

  return children;
}

function getNotice(
  searchParams: Record<string, string | string[] | undefined>,
): { kind: "success" | "warning"; message: string } | null {
  const pluginResult = GoogleIntegrationPluginSchema.safeParse(
    searchParams.integration,
  );
  const integrationName = pluginResult.success
    ? googleIntegrationDetails[pluginResult.data].name
    : "Google integration";

  switch (searchParams.status) {
    case "connected":
      return {
        kind: "success",
        message: `${integrationName} connected securely.`,
      };
    case "disconnected":
      return {
        kind: "success",
        message: `${integrationName} disconnected.`,
      };
    case "cancelled":
      return {
        kind: "warning",
        message: `${integrationName} connection was cancelled.`,
      };
    case "error":
      return {
        kind: "warning",
        message:
          "The integration could not be updated. Check Corsair and Google OAuth configuration, then try again.",
      };
    default:
      return null;
  }
}
