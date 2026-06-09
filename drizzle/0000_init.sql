CREATE TABLE "runs" (
	"slug" text PRIMARY KEY NOT NULL,
	"owner" text NOT NULL,
	"formation_id" text NOT NULL,
	"seed" integer NOT NULL,
	"xi" jsonb NOT NULL,
	"result" jsonb NOT NULL,
	"stage_reached" text NOT NULL,
	"score" integer NOT NULL,
	"team_label" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "runs_score_idx" ON "runs" USING btree ("score");--> statement-breakpoint
CREATE INDEX "runs_owner_idx" ON "runs" USING btree ("owner");