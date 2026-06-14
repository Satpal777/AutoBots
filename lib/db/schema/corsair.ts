import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const corsairIntegrations = pgTable(
  "corsair_integrations",
  {
    id: text("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    name: text("name").notNull(),
    config: jsonb("config").notNull().default({}),
    dek: text("dek"),
  },
  (table) => [
    uniqueIndex("corsair_integrations_name_unique").on(table.name),
  ],
);

export const corsairAccounts = pgTable(
  "corsair_accounts",
  {
    id: text("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    tenantId: text("tenant_id").notNull(),
    integrationId: text("integration_id")
      .notNull()
      .references(() => corsairIntegrations.id),
    config: jsonb("config").notNull().default({}),
    dek: text("dek"),
  },
  (table) => [
    uniqueIndex("corsair_accounts_tenant_integration_unique").on(
      table.tenantId,
      table.integrationId,
    ),
    index("corsair_accounts_tenant_id_idx").on(table.tenantId),
  ],
);

export const corsairEntities = pgTable(
  "corsair_entities",
  {
    id: text("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    accountId: text("account_id")
      .notNull()
      .references(() => corsairAccounts.id),
    entityId: text("entity_id").notNull(),
    entityType: text("entity_type").notNull(),
    version: text("version").notNull(),
    data: jsonb("data").notNull().default({}),
  },
  (table) => [
    index("corsair_entities_account_type_idx").on(
      table.accountId,
      table.entityType,
    ),
    index("corsair_entities_account_entity_idx").on(
      table.accountId,
      table.entityId,
    ),
    uniqueIndex("corsair_entities_account_type_entity_unique").on(
      table.accountId,
      table.entityType,
      table.entityId,
    ),
  ],
);

export const integrationSyncState = pgTable(
  "integration_sync_state",
  {
    id: text("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    tenantId: text("tenant_id").notNull(),
    integration: text("integration").notNull(),
    scope: text("scope").notNull(),
    cursor: text("cursor"),
  },
  (table) => [
    uniqueIndex("integration_sync_state_tenant_integration_scope_unique").on(
      table.tenantId,
      table.integration,
      table.scope,
    ),
    index("integration_sync_state_tenant_idx").on(table.tenantId),
  ],
);

export const corsairEvents = pgTable(
  "corsair_events",
  {
    id: text("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    accountId: text("account_id")
      .notNull()
      .references(() => corsairAccounts.id),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull().default({}),
    status: text("status"),
  },
  (table) => [
    index("corsair_events_account_created_at_idx").on(
      table.accountId,
      table.createdAt,
    ),
  ],
);

export const corsairPermissions = pgTable(
  "corsair_permissions",
  {
    id: text("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    token: text("token").notNull(),
    plugin: text("plugin").notNull(),
    endpoint: text("endpoint").notNull(),
    args: text("args").notNull(),
    tenantId: text("tenant_id").notNull().default("default"),
    status: text("status").notNull().default("pending"),
    expiresAt: text("expires_at").notNull(),
    error: text("error"),
  },
  (table) => [
    uniqueIndex("corsair_permissions_token_unique").on(table.token),
    index("corsair_permissions_tenant_status_idx").on(
      table.tenantId,
      table.status,
    ),
  ],
);
