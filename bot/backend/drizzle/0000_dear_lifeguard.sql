CREATE TABLE IF NOT EXISTS "plays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"song_id" uuid,
	"user_id" text,
	"guild_id" text,
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"song_id" uuid,
	"user_id" text,
	"guild_id" text,
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "songs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"youtube_id" text NOT NULL,
	"youtube_title" text,
	"youtube_author" text,
	"spotify_id" text,
	"spotify_title" text,
	"spotify_author" text,
	"file_name" text,
	"length_seconds" double precision,
	"lufs" double precision,
	CONSTRAINT "songs_youtube_id_unique" UNIQUE("youtube_id"),
	CONSTRAINT "songs_spotify_id_unique" UNIQUE("spotify_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plays" ADD CONSTRAINT "plays_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "songs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "skips" ADD CONSTRAINT "skips_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "songs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
