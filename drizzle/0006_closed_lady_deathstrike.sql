CREATE TABLE "integration_sync_state" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"tenant_id" text NOT NULL,
	"integration" text NOT NULL,
	"scope" text NOT NULL,
	"cursor" text
);
--> statement-breakpoint
CREATE UNIQUE INDEX "integration_sync_state_tenant_integration_scope_unique" ON "integration_sync_state" USING btree ("tenant_id","integration","scope");--> statement-breakpoint
CREATE INDEX "integration_sync_state_tenant_idx" ON "integration_sync_state" USING btree ("tenant_id");--> statement-breakpoint
DELETE FROM "corsair_entities" older
USING "corsair_entities" newer
WHERE older."account_id" = newer."account_id"
  AND older."entity_type" = newer."entity_type"
  AND older."entity_id" = newer."entity_id"
  AND (
    older."updated_at" < newer."updated_at"
    OR (older."updated_at" = newer."updated_at" AND older."id" < newer."id")
  );--> statement-breakpoint
CREATE UNIQUE INDEX "corsair_entities_account_type_entity_unique" ON "corsair_entities" USING btree ("account_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "corsair_entities_gmail_received_idx" ON "corsair_entities" USING btree ("account_id","entity_type",(coalesce("data"->>'internalDate', '')) DESC);--> statement-breakpoint
CREATE INDEX "corsair_entities_calendar_start_idx" ON "corsair_entities" USING btree ("account_id","entity_type",(coalesce("data"->'start'->>'dateTime', "data"->'start'->>'date')));--> statement-breakpoint
CREATE INDEX "corsair_entities_data_gin_idx" ON "corsair_entities" USING gin ("data");
