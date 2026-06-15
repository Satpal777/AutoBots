import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { getCorsairTenantId } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import {
  corsairAccounts,
  corsairIntegrations,
} from "@/lib/db/schema/corsair";

import { corsair, setupConfiguredCorsair } from "./corsair";

const corsairPluginIds = ["gmail", "googlecalendar"] as const;

export async function getCorsairTenant() {
  const tenantId = await getCorsairTenantId();
  return corsair.withTenant(tenantId);
}

export async function ensureCorsairTenant() {
  const tenantId = await getCorsairTenantId();

  const existingAccounts = await getDb()
    .select({ integrationName: corsairIntegrations.name })
    .from(corsairAccounts)
    .innerJoin(
      corsairIntegrations,
      eq(corsairAccounts.integrationId, corsairIntegrations.id),
    )
    .where(
      and(
        eq(corsairAccounts.tenantId, tenantId),
        inArray(corsairIntegrations.name, corsairPluginIds),
      ),
    );

  const configuredPluginCount = new Set(
    existingAccounts.map(({ integrationName }) => integrationName),
  ).size;

  if (configuredPluginCount < corsairPluginIds.length) {
    try {
      await setupConfiguredCorsair({ tenantId });
    } catch (error) {
      // A concurrent first request may provision the same tenant first.
      if (!isUniqueViolation(error)) {
        throw error;
      }

      await setupConfiguredCorsair({ tenantId });
    }
  }

  return corsair.withTenant(tenantId);
}

function isUniqueViolation(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current = error;

  while (typeof current === "object" && current !== null && !seen.has(current)) {
    seen.add(current);

    if ("code" in current && current.code === "23505") {
      return true;
    }

    current = "cause" in current ? current.cause : undefined;
  }

  return false;
}
