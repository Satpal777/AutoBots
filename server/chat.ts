import "server-only";

import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { chatConversations, chatMessages } from "@/lib/db/schema";

export async function listConversations(userId: string) {
  return getDb().select().from(chatConversations).where(eq(chatConversations.userId, userId))
    .orderBy(desc(chatConversations.updatedAt)).limit(50);
}

export async function createConversation(userId: string, title = "New conversation") {
  const id = randomUUID();
  await getDb().insert(chatConversations).values({ id, userId, title });
  return id;
}

export async function requireConversation(userId: string, conversationId: string) {
  const rows = await getDb().select().from(chatConversations).where(and(
    eq(chatConversations.id, conversationId), eq(chatConversations.userId, userId),
  )).limit(1);
  if (!rows[0]) throw new Error("Conversation not found.");
  return rows[0];
}

export async function getConversationMessages(userId: string, conversationId: string) {
  await requireConversation(userId, conversationId);
  const messages = await getDb().select().from(chatMessages).where(and(
    eq(chatMessages.conversationId, conversationId), eq(chatMessages.userId, userId),
  )).orderBy(desc(chatMessages.createdAt)).limit(100);
  return messages.reverse();
}

export async function addChatMessage(userId: string, conversationId: string, role: "user" | "assistant", content: string, metadata = {}) {
  const conversation = await requireConversation(userId, conversationId);
  await getDb().insert(chatMessages).values({ id: randomUUID(), userId, conversationId, role, content, metadata });
  await getDb().update(chatConversations).set({
    updatedAt: new Date(),
    ...(role === "user" && conversation.title === "New conversation"
      ? { title: content.trim().slice(0, 60) || "New conversation" }
      : {}),
  }).where(and(eq(chatConversations.id, conversationId), eq(chatConversations.userId, userId)));
}

export async function deleteConversation(userId: string, conversationId: string) {
  await getDb().delete(chatConversations).where(and(
    eq(chatConversations.id, conversationId), eq(chatConversations.userId, userId),
  ));
}

export async function renameConversation(userId: string, conversationId: string, title: string) {
  await getDb().update(chatConversations).set({ title, updatedAt: new Date() }).where(and(
    eq(chatConversations.id, conversationId), eq(chatConversations.userId, userId),
  ));
}
