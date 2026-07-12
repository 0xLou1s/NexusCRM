CREATE TABLE "app_meta" (
	"id" smallint PRIMARY KEY NOT NULL,
	"version" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "app_meta" ("id", "version") VALUES (1, '0.1.0') ON CONFLICT ("id") DO NOTHING;
