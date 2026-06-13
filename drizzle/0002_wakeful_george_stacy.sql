CREATE TABLE IF NOT EXISTS "corsair_permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"token" text NOT NULL,
	"plugin" text NOT NULL,
	"endpoint" text NOT NULL,
	"args" text NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" text NOT NULL,
	"error" text
);
--> statement-breakpoint
CREATE UNIQUE INDEX "corsair_accounts_tenant_integration_unique" ON "corsair_accounts" USING btree ("tenant_id","integration_id");--> statement-breakpoint
CREATE INDEX "corsair_accounts_tenant_id_idx" ON "corsair_accounts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "corsair_entities_account_type_idx" ON "corsair_entities" USING btree ("account_id","entity_type");--> statement-breakpoint
CREATE INDEX "corsair_entities_account_entity_idx" ON "corsair_entities" USING btree ("account_id","entity_id");--> statement-breakpoint
CREATE INDEX "corsair_events_account_created_at_idx" ON "corsair_events" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "corsair_integrations_name_unique" ON "corsair_integrations" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "corsair_permissions_token_unique" ON "corsair_permissions" USING btree ("token");--> statement-breakpoint
CREATE INDEX "corsair_permissions_tenant_status_idx" ON "corsair_permissions" USING btree ("tenant_id","status");
