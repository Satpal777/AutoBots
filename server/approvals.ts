import "server-only";

import { executePermission } from "corsair";
import { randomUUID } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agentActions, corsairPermissions } from "@/lib/db/schema";
import { agentCorsair } from "./agent-corsair";

export async function listPendingApprovals(userId: string) {
  return getDb().select().from(corsairPermissions).where(and(
    eq(corsairPermissions.tenantId, userId), eq(corsairPermissions.status, "pending"),
  )).limit(20);
}

export async function getApproval(userId: string, token: string) {
  const rows = await getDb().select().from(corsairPermissions).where(and(
    eq(corsairPermissions.token, token), eq(corsairPermissions.tenantId, userId),
  )).limit(1);
  return rows[0] ?? null;
}

export async function decideApproval(userId: string, token: string, decision: "approved" | "denied") {
  await getDb().transaction(async (tx) => {
    const claimed = await tx.update(corsairPermissions)
      .set({ status: decision, updatedAt: new Date() })
      .where(and(
        eq(corsairPermissions.token, token),
        eq(corsairPermissions.tenantId, userId),
        eq(corsairPermissions.status, "pending"),
        gt(corsairPermissions.expiresAt, new Date().toISOString()),
      ))
      .returning();
    const record = claimed[0];
    if (!record) throw new Error("Approval is not available.");

    let args: Record<string, unknown> = {};
    try { args = JSON.parse(record.args) as Record<string, unknown>; } catch {}
    await tx.insert(agentActions).values({
      id: randomUUID(), userId, permissionToken: record.token, plugin: record.plugin,
      endpoint: record.endpoint, arguments: args, status: decision,
    }).onConflictDoNothing();
    return record;
  });

  if (decision === "approved") {
    const result = await executePermission(agentCorsair, token);
    await getDb().update(agentActions).set({
      status: result.error ? "failed" : "completed", outcome: result, updatedAt: new Date(),
    }).where(eq(agentActions.permissionToken, token));
    return result;
  }
  await getDb().update(agentActions).set({ status: "denied", updatedAt: new Date() })
    .where(eq(agentActions.permissionToken, token));
  return { denied: true };
}
