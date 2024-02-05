CREATE TABLE IF NOT EXISTS "genres" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "genres_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "songs-to-genres" (
	"song_id" uuid NOT NULL,
	"genre_id" uuid NOT NULL,
	CONSTRAINT "songs-to-genres_song_id_genre_id_pk" PRIMARY KEY("song_id","genre_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "songs-to-genres" ADD CONSTRAINT "songs-to-genres_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "songs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "songs-to-genres" ADD CONSTRAINT "songs-to-genres_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "genres"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
