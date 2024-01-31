import {
  text,
  timestamp,
  pgTable,
  uuid,
  doublePrecision,
  boolean,
} from "drizzle-orm/pg-core";

export const songs = pgTable("songs", {
  id: uuid("id").defaultRandom().primaryKey(),
  youtubeId: text("youtube_id").unique().notNull(),
  youtubeTitle: text("youtube_title"),
  youtubeAuthor: text("youtube_author"),
  spotifyId: text("spotify_id").unique(),
  spotifyTitle: text("spotify_title"),
  spotifyAuthor: text("spotify_author"),
  fileName: text("file_name"),
  lengthSeconds: doublePrecision("length_seconds"),
  loudnessLufs: doublePrecision("lufs"),
});

export const plays = pgTable("plays", {
  id: uuid("id").defaultRandom().primaryKey(),
  songId: uuid("song_id")
    .references(() => songs.id)
    .notNull(),
  userId: text("user_id"),
  guildId: text("guild_id"),
  timestamp: timestamp("created_at"),
});

export const skips = pgTable("skips", {
  id: uuid("id").defaultRandom().primaryKey(),
  songId: uuid("song_id").references(() => songs.id),
  userId: text("user_id"),
  guildId: text("guild_id"),
  timestamp: timestamp("created_at"),
});

export const dataConsent = pgTable("data-consent", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").unique().notNull(),
  consented: boolean("consented"),
});
