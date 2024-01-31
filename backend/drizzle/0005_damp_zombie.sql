ALTER TABLE "data-consent" ALTER COLUMN "consented" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "skips" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "skips" ALTER COLUMN "guild_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "skips" ALTER COLUMN "created_at" SET NOT NULL;