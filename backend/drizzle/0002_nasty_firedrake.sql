CREATE TABLE IF NOT EXISTS "data-consent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"consented" boolean,
	CONSTRAINT "data-consent_user_id_unique" UNIQUE("user_id")
);
