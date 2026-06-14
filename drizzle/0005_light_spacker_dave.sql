CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "entity_intelligence" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"entity_id" text NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"needs_follow_up" integer DEFAULT 0 NOT NULL,
	"summary" text,
	"source" text DEFAULT 'model' NOT NULL,
	"embedding" vector(1536),
	"analyzed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entity_intelligence" ADD CONSTRAINT "entity_intelligence_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_intelligence" ADD CONSTRAINT "entity_intelligence_entity_id_corsair_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."corsair_entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "entity_intelligence_user_entity_unique" ON "entity_intelligence" USING btree ("user_id","entity_id");--> statement-breakpoint
CREATE INDEX "entity_intelligence_user_priority_idx" ON "entity_intelligence" USING btree ("user_id","priority");--> statement-breakpoint
CREATE INDEX "entity_intelligence_user_follow_up_idx" ON "entity_intelligence" USING btree ("user_id","needs_follow_up");--> statement-breakpoint
CREATE INDEX "entity_intelligence_embedding_idx" ON "entity_intelligence" USING hnsw ("embedding" vector_cosine_ops);
