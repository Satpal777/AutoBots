import "server-only";

import { eq, inArray } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  account as authAccount,
  agentActions,
  aiUsage,
  chatConversations,
  chatMessages,
  corsairAccounts,
  corsairEntities,
  corsairEvents,
  corsairPermissions,
  entityIntelligence,
  integrationSyncState,
  session,
  user,
  userEntitlements,
  verification,
} from "@/lib/db/schema";

export async function deleteUserAccountAndData(input: {
  userId: string;
  email: string;
}): Promise<void> {
  const db = getDb();

  await db.transaction(async (tx) => {
    const accountRows = await tx
      .select({ id: corsairAccounts.id })
      .from(corsairAccounts)
      .where(eq(corsairAccounts.tenantId, input.userId));
    const accountIds = accountRows.map(({ id }) => id);

    await tx
      .delete(corsairPermissions)
      .where(eq(corsairPermissions.tenantId, input.userId));
    await tx
      .delete(integrationSyncState)
      .where(eq(integrationSyncState.tenantId, input.userId));
    await tx
      .delete(entityIntelligence)
      .where(eq(entityIntelligence.userId, input.userId));

    if (accountIds.length > 0) {
      await tx
        .delete(corsairEvents)
        .where(inArray(corsairEvents.accountId, accountIds));
      await tx
        .delete(corsairEntities)
        .where(inArray(corsairEntities.accountId, accountIds));
    }

    await tx
      .delete(corsairAccounts)
      .where(eq(corsairAccounts.tenantId, input.userId));

    await tx.delete(chatMessages).where(eq(chatMessages.userId, input.userId));
    await tx.delete(aiUsage).where(eq(aiUsage.userId, input.userId));
    await tx.delete(agentActions).where(eq(agentActions.userId, input.userId));
    await tx
      .delete(chatConversations)
      .where(eq(chatConversations.userId, input.userId));
    await tx
      .delete(userEntitlements)
      .where(eq(userEntitlements.userId, input.userId));

    await tx.delete(authAccount).where(eq(authAccount.userId, input.userId));
    await tx.delete(session).where(eq(session.userId, input.userId));
    await tx.delete(verification).where(eq(verification.identifier, input.email));
    await tx.delete(user).where(eq(user.id, input.userId));
  });
}
