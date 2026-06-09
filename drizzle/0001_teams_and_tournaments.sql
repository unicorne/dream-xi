CREATE TABLE "teams" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"creator" text,
	"owner" text NOT NULL,
	"formation_id" text NOT NULL,
	"xi" jsonb NOT NULL,
	"overall" integer NOT NULL,
	"quality" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournaments" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text,
	"owner" text NOT NULL,
	"entrant_slugs" jsonb NOT NULL,
	"seed" integer NOT NULL,
	"result" jsonb NOT NULL,
	"champion_label" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "teams_overall_idx" ON "teams" USING btree ("overall");--> statement-breakpoint
CREATE INDEX "teams_owner_idx" ON "teams" USING btree ("owner");