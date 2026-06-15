import Link from "next/link";

import { IntegrationActionButton } from "@/components/integrations/integration-action-button";
import { PageHeader } from "@/components/dashboard/workspace-panels";
import {
  CalendarIcon,
  CheckIcon,
  MailIcon,
  MusicIcon,
  ShieldIcon,
} from "@/components/ui/icons";
import {
  type GoogleIntegrationPlugin,
  GoogleIntegrationPluginSchema,
  googleIntegrationDetails,
} from "@/lib/integrations/google";
import { getGoogleIntegrationStatuses } from "@/server/google-integrations";
import { spotifyIntegrationDetails } from "@/lib/integrations/spotify";
import { getSpotifyIntegrationStatus, type SpotifyIntegrationStatus } from "@/server/spotify-integrations";

import {
  connectGoogleIntegrationAction,
  connectSpotifyIntegrationAction,
  disconnectGoogleIntegrationAction,
  disconnectSpotifyIntegrationAction,
} from "../actions";

type SettingsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const [statuses, spotifyStatus, params] = await Promise.all([
    getGoogleIntegrationStatuses(),
    getSpotifyIntegrationStatus(),
    searchParams,
  ]);
  const notice = getNotice(params);

  return (
    <>
      <PageHeader
        label="Settings"
        title="Connected apps"
        description="Choose which apps Autobot can use for your workspace."
        action={
          <Link href="/dashboard/settings/ai" className="product-button-secondary inline-flex items-center px-4">
            AI settings
          </Link>
        }
      />

      {notice ? <SettingsNotice notice={notice} /> : null}

      <div className="mt-7 grid items-start gap-5 xl:grid-cols-[1fr_20rem]">
        <section className="product-panel divide-y divide-line">
          {(Object.keys(googleIntegrationDetails) as GoogleIntegrationPlugin[]).map(
            (plugin) => (
              <IntegrationRow key={plugin} plugin={plugin} status={statuses[plugin]} />
            ),
          )}
          <SpotifyIntegrationRow status={spotifyStatus} />
        </section>

        <aside className="product-panel-muted overflow-hidden">
          <div className="dashboard-security-visual grid min-h-44 place-items-center border-b border-line p-6">
            <div className="relative grid size-20 place-items-center rounded-full bg-forest text-white">
              <span className="absolute inset-[-0.65rem] rounded-full border border-forest/20" />
              <ShieldIcon className="size-8" />
              <span className="absolute -right-1 top-1 grid size-6 place-items-center rounded-full bg-gold-soft text-forest">
                <CheckIcon className="size-3.5" />
              </span>
            </div>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium text-muted">Your privacy</p>
            <h2 className="mt-2 text-base font-semibold text-ink">
              You control every connection
            </h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-muted">
              <li className="flex gap-2">
                <CheckIcon className="mt-1 size-4 shrink-0 text-forest" />
                Every connected app has separate permissions.
              </li>
              <li className="flex gap-2">
                <CheckIcon className="mt-1 size-4 shrink-0 text-forest" />
                Disconnect an app whenever you choose.
              </li>
              <li className="flex gap-2">
                <CheckIcon className="mt-1 size-4 shrink-0 text-forest" />
                Your workspace is available only to your account.
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}

function SpotifyIntegrationRow({ status }: { status: SpotifyIntegrationStatus }) {
  const connected = status === "connected";
  const description = status === "error"
    ? "Spotify could not verify API access. In Development Mode, use a Premium app-owner account, add this user in Spotify Users Management, then reconnect."
    : spotifyIntegrationDetails.description;

  return (
    <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex min-w-0 items-center gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-success-soft text-success">
          <MusicIcon className="size-5" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-ink">{spotifyIntegrationDetails.name}</h2>
            <ConnectionStatus status={status} />
          </div>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
      </div>

      <form
        action={connected ? disconnectSpotifyIntegrationAction : connectSpotifyIntegrationAction}
        target={connected ? undefined : "_blank"}
        rel={connected ? undefined : "noopener noreferrer"}
      >
        <IntegrationActionButton
          pendingLabel={connected ? "Disconnecting..." : "Connecting..."}
          variant={connected ? "secondary" : "primary"}
          title={connected ? undefined : "Open Spotify authorization in a new tab"}
        >
          {connected ? "Disconnect" : "Connect Spotify"}
        </IntegrationActionButton>
      </form>
    </div>
  );
}

function IntegrationRow({
  plugin,
  status,
}: {
  plugin: GoogleIntegrationPlugin;
  status: "connected" | "disconnected" | "error";
}) {
  const details = googleIntegrationDetails[plugin];
  const connected = status === "connected";
  const Icon = plugin === "gmail" ? MailIcon : CalendarIcon;

  return (
    <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex min-w-0 items-center gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-surface-soft text-forest">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-ink">{details.name}</h2>
            <ConnectionStatus status={status} />
          </div>
          <p className="mt-1 text-sm text-muted">{details.description}</p>
        </div>
      </div>

      <form
        action={
          connected
            ? disconnectGoogleIntegrationAction
            : connectGoogleIntegrationAction
        }
      >
        <input type="hidden" name="plugin" value={plugin} />
        <IntegrationActionButton
          pendingLabel={connected ? "Disconnecting..." : "Connecting..."}
          variant={connected ? "secondary" : "primary"}
        >
          {connected ? "Disconnect" : `Connect ${details.name}`}
        </IntegrationActionButton>
      </form>
    </div>
  );
}

function ConnectionStatus({
  status,
}: {
  status: "connected" | "disconnected" | "error";
}) {
  const label =
    status === "connected"
      ? "Connected"
      : status === "error"
        ? "Needs attention"
        : "Not connected";

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-canvas px-2 py-1 text-[0.65rem] font-semibold text-muted">
      <span
        className={`size-1.5 rounded-full ${
          status === "connected"
            ? "bg-success"
            : status === "error"
              ? "bg-gold"
              : "bg-muted/40"
        }`}
      />
      {label}
    </span>
  );
}

function SettingsNotice({
  notice,
}: {
  notice: { kind: "success" | "warning"; message: string };
}) {
  return (
    <div
      role="status"
      className={`mt-5 flex items-start gap-3 rounded-lg border border-line px-4 py-3 text-sm ${
        notice.kind === "success"
          ? "bg-success-soft text-forest"
          : "bg-gold-soft text-ink"
      }`}
    >
      <CheckIcon className="mt-0.5 size-4 shrink-0" />
      {notice.message}
    </div>
  );
}

function getNotice(
  searchParams: Record<string, string | string[] | undefined>,
): { kind: "success" | "warning"; message: string } | null {
  const pluginResult = GoogleIntegrationPluginSchema.safeParse(
    searchParams.integration,
  );
  const integrationName = searchParams.integration === "spotify"
    ? spotifyIntegrationDetails.name
    : pluginResult.success
      ? googleIntegrationDetails[pluginResult.data].name
      : "Connected app";

  switch (searchParams.status) {
    case "connected":
      return { kind: "success", message: `${integrationName} connected.` };
    case "disconnected":
      return { kind: "success", message: `${integrationName} disconnected.` };
    case "cancelled":
      return {
        kind: "warning",
        message: `${integrationName} connection was cancelled.`,
      };
    case "error":
      return {
        kind: "warning",
        message: "The connection could not be updated. Please try again.",
      };
    default:
      return null;
  }
}
