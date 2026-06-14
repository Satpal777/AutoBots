import "server-only";

import { and, eq } from "drizzle-orm";
import { generateOAuthUrl } from "corsair/oauth";

import { getCorsairTenantId } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { corsairAccounts, corsairIntegrations } from "@/lib/db/schema/corsair";
import { getServerEnv } from "@/lib/env/server";
import { getSpotifyIntegrationCallbackUrl } from "@/lib/integrations/spotify";

import { corsair } from "./corsair";
import { ensureCorsairTenant, getCorsairTenant } from "./corsair-tenant";

export type SpotifyIntegrationStatus = "connected" | "disconnected" | "error";

export async function getSpotifyIntegrationStatus(): Promise<SpotifyIntegrationStatus> {
  const tenantId = await getCorsairTenantId();
  const rows = await getDb()
    .select({ id: corsairAccounts.id })
    .from(corsairAccounts)
    .innerJoin(corsairIntegrations, eq(corsairAccounts.integrationId, corsairIntegrations.id))
    .where(and(eq(corsairAccounts.tenantId, tenantId), eq(corsairIntegrations.name, "spotify")))
    .limit(1);

  if (rows.length === 0) return "disconnected";

  try {
    const refreshToken = await corsair.withTenant(tenantId).spotify.keys.get_refresh_token();
    return refreshToken ? "connected" : "disconnected";
  } catch {
    return "error";
  }
}

export async function createSpotifyIntegrationConnectUrl(): Promise<string> {
  const env = getServerEnv();
  if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) {
    throw new Error("Spotify OAuth credentials are not configured.");
  }

  const tenantId = await getCorsairTenantId();
  await ensureCorsairTenant();
  await setupSpotifyCredentials();

  const result = await generateOAuthUrl(corsair, "spotify", {
    tenantId,
    redirectUri: getSpotifyIntegrationCallbackUrl(env.APP_URL),
  });
  return result.url;
}

export async function disconnectSpotifyIntegration(): Promise<void> {
  const tenant = await getCorsairTenant();

  await Promise.all([
    tenant.spotify.keys.set_access_token(null),
    tenant.spotify.keys.set_refresh_token(null),
    tenant.spotify.keys.set_expires_at(null),
    tenant.spotify.keys.set_scope(null),
    tenant.spotify.keys.set_webhook_signature(null),
  ]);

  const clients = [
    tenant.spotify.db.tracks,
    tenant.spotify.db.albums,
    tenant.spotify.db.artists,
    tenant.spotify.db.playlists,
    tenant.spotify.db.playlistItems,
    tenant.spotify.db.users,
  ];

  await Promise.all(clients.map(async (client) => {
    while (true) {
      const entities = await client.list({ limit: 250 });
      if (entities.length === 0) break;
      await Promise.all(entities.map((entity) => client.deleteByEntityId(entity.entity_id)));
    }
  }));
}

async function setupSpotifyCredentials(): Promise<void> {
  const env = getServerEnv();
  if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) return;

  await Promise.all([
    corsair.keys.spotify.set_client_id(env.SPOTIFY_CLIENT_ID),
    corsair.keys.spotify.set_client_secret(env.SPOTIFY_CLIENT_SECRET),
  ]);
}
