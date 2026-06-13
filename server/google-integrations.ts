import "server-only";

import { generateOAuthUrl } from "corsair/oauth";
import { and, eq, inArray } from "drizzle-orm";

import { getCorsairTenantId } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import {
  corsairAccounts,
  corsairIntegrations,
} from "@/lib/db/schema/corsair";
import { getServerEnv } from "@/lib/env/server";
import type { GoogleIntegrationPlugin } from "@/lib/integrations/google";
import { getGoogleIntegrationCallbackUrl } from "@/lib/integrations/google";

import { corsair } from "./corsair";
import {
  ensureCorsairTenant,
  getCorsairTenant,
} from "./corsair-tenant";

export type GoogleIntegrationStatus =
  | "connected"
  | "disconnected"
  | "error";

export type GoogleIntegrationStatuses = Record<
  GoogleIntegrationPlugin,
  GoogleIntegrationStatus
>;

export async function getGoogleIntegrationStatuses(): Promise<GoogleIntegrationStatuses> {
  const tenantId = await getCorsairTenantId();
  const tenant = corsair.withTenant(tenantId);
  const accountRows = await getDb()
    .select({ integrationName: corsairIntegrations.name })
    .from(corsairAccounts)
    .innerJoin(
      corsairIntegrations,
      eq(corsairAccounts.integrationId, corsairIntegrations.id),
    )
    .where(
      and(
        eq(corsairAccounts.tenantId, tenantId),
        inArray(corsairIntegrations.name, ["gmail", "googlecalendar"]),
      ),
    );
  const accountPlugins = new Set(
    accountRows.map(({ integrationName }) => integrationName),
  );

  const [gmail, googlecalendar] = await Promise.all([
    getConnectionStatus(
      accountPlugins.has("gmail"),
      () => tenant.gmail.keys.get_refresh_token(),
    ),
    getConnectionStatus(
      accountPlugins.has("googlecalendar"),
      () => tenant.googlecalendar.keys.get_refresh_token(),
    ),
  ]);

  return { gmail, googlecalendar };
}

export async function createGoogleIntegrationConnectUrl(
  plugin: GoogleIntegrationPlugin,
): Promise<string> {
  const tenantId = await getCorsairTenantId();
  await ensureCorsairTenant();
  const redirectUri = getGoogleIntegrationCallbackUrl(getServerEnv().APP_URL);
  const result = await generateOAuthUrl(corsair, plugin, {
    tenantId,
    redirectUri,
  });

  return result.url;
}

export async function disconnectGoogleIntegration(
  plugin: GoogleIntegrationPlugin,
): Promise<void> {
  const tenant = await getCorsairTenant();
  const keys =
    plugin === "gmail" ? tenant.gmail.keys : tenant.googlecalendar.keys;

  await Promise.all([
    keys.set_access_token(null),
    keys.set_refresh_token(null),
    keys.set_expires_at(null),
    keys.set_scope(null),
    keys.set_webhook_signature(null),
  ]);

  await clearIntegrationCache(tenant, plugin);
}

async function getConnectionStatus(
  accountExists: boolean,
  getRefreshToken: () => Promise<string | null>,
): Promise<GoogleIntegrationStatus> {
  if (!accountExists) {
    return "disconnected";
  }

  try {
    return (await getRefreshToken()) ? "connected" : "disconnected";
  } catch {
    return "error";
  }
}

async function clearIntegrationCache(
  tenant: Awaited<ReturnType<typeof getCorsairTenant>>,
  plugin: GoogleIntegrationPlugin,
): Promise<void> {
  const entityClients =
    plugin === "gmail"
      ? [
          tenant.gmail.db.messages,
          tenant.gmail.db.threads,
          tenant.gmail.db.drafts,
          tenant.gmail.db.labels,
        ]
      : [tenant.googlecalendar.db.events, tenant.googlecalendar.db.calendars];

  await Promise.all(
    entityClients.map(async (client) => {
      while (true) {
        const entities = await client.list({ limit: 250 });

        if (entities.length === 0) {
          break;
        }

        await Promise.all(
          entities.map((entity) => client.deleteByEntityId(entity.entity_id)),
        );
      }
    }),
  );
}
