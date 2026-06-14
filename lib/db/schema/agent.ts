import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, vector } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { corsairEntities } from "./corsair";

export const plans = pgTable("plans", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  dailyPremiumMessages: integer("daily_premium_messages").notNull(),
  features: jsonb("features").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userEntitlements = pgTable("user_entitlements", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  planId: text("plan_id").notNull().references(() => plans.id),
  grantedBy: text("granted_by"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chatConversations = pgTable("chat_conversations", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  preferredMode: text("preferred_mode").notNull().default("auto"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("chat_conversations_user_updated_idx").on(table.userId, table.updatedAt)]);

export const chatMessages = pgTable("chat_messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull().references(() => chatConversations.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("chat_messages_conversation_created_idx").on(table.conversationId, table.createdAt)]);

export const aiUsage = pgTable("ai_usage", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  conversationId: text("conversation_id").references(() => chatConversations.id, { onDelete: "set null" }),
  usageDate: text("usage_date").notNull(),
  mode: text("mode").notNull(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  status: text("status").notNull(),
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("ai_usage_user_date_mode_idx").on(table.userId, table.usageDate, table.mode)]);

export const agentActions = pgTable("agent_actions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  conversationId: text("conversation_id").references(() => chatConversations.id, { onDelete: "set null" }),
  permissionToken: text("permission_token"),
  plugin: text("plugin").notNull(),
  endpoint: text("endpoint").notNull(),
  arguments: jsonb("arguments").notNull().default({}),
  status: text("status").notNull(),
  outcome: jsonb("outcome"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("agent_actions_permission_token_unique").on(table.permissionToken),
  index("agent_actions_user_status_idx").on(table.userId, table.status),
]);

export const entityIntelligence = pgTable("entity_intelligence", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  entityId: text("entity_id").notNull().references(() => corsairEntities.id, { onDelete: "cascade" }),
  priority: text("priority").notNull().default("normal"),
  category: text("category").notNull().default("other"),
  needsFollowUp: integer("needs_follow_up").notNull().default(0),
  summary: text("summary"),
  source: text("source").notNull().default("model"),
  embedding: vector("embedding", { dimensions: 1536 }),
  analyzedAt: timestamp("analyzed_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("entity_intelligence_user_entity_unique").on(table.userId, table.entityId),
  index("entity_intelligence_user_priority_idx").on(table.userId, table.priority),
  index("entity_intelligence_user_follow_up_idx").on(table.userId, table.needsFollowUp),
  index("entity_intelligence_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
]);
