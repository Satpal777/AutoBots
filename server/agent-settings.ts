import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { chatConversations } from "@/lib/db/schema";

export async function deleteAllChatHistory(userId: string) {
  await getDb().delete(chatConversations).where(eq(chatConversations.userId, userId));
}
