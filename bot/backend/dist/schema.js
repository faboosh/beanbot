import { relations } from "drizzle-orm";
import { text, timestamp, pgTable, uuid, doublePrecision, boolean, primaryKey, unique } from "drizzle-orm/pg-core";
// import { drizzleDB } from "./db.js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
const connectionString = process.env.POSTGRES_URL;
if (!connectionString) throw new Error("postgres_url not set in .env");
const client = postgres(connectionString, {
    max: 1
});
const drizzleDB = drizzle(client);
export { drizzleDB };
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
    loudnessLufs: doublePrecision("lufs")
});
export const songsRelation = relations(songs, ({ many })=>({
        plays: many(plays),
        skips: many(skips),
        genres: many(songsToGenres)
    }));
export const plays = pgTable("plays", {
    id: uuid("id").defaultRandom().primaryKey(),
    songId: uuid("song_id").references(()=>songs.id).notNull(),
    userId: text("user_id").notNull(),
    guildId: text("guild_id").notNull(),
    timestamp: timestamp("timestamp").notNull(),
    imported: boolean("imported").notNull().default(false)
});
export const playsRelation = relations(plays, ({ one })=>({
        song: one(songs, {
            fields: [
                plays.songId
            ],
            references: [
                songs.id
            ],
            relationName: "song"
        })
    }));
export function createPlay(play) {
    return drizzleDB.insert(plays).values(play);
}
export const skips = pgTable("skips", {
    id: uuid("id").defaultRandom().primaryKey(),
    songId: uuid("song_id").references(()=>songs.id),
    userId: text("user_id").notNull(),
    guildId: text("guild_id").notNull(),
    timestamp: timestamp("created_at").notNull()
});
export const skipsRelation = relations(skips, ({ one })=>({
        song: one(songs, {
            fields: [
                skips.songId
            ],
            references: [
                songs.id
            ],
            relationName: "song"
        })
    }));
export function createSkip(skip) {
    return drizzleDB.insert(skips).values(skip);
}
export const dataConsent = pgTable("data-consent", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").unique().notNull(),
    consented: boolean("consented").notNull()
});
export const genres = pgTable("genres", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").unique().notNull()
});
export const genresRelation = relations(genres, ({ many })=>({
        songs: many(songsToGenres)
    }));
export const songsToGenres = pgTable("songs-to-genres", {
    songId: uuid("song_id").references(()=>songs.id).notNull(),
    genreId: uuid("genre_id").references(()=>genres.id).notNull(),
    certainty: doublePrecision("certainty").notNull()
}, (t)=>({
        pk: primaryKey({
            columns: [
                t.songId,
                t.genreId
            ]
        }),
        unq: unique().on(t.songId, t.genreId)
    }));
export const songsToGenresRelation = relations(songsToGenres, ({ one })=>({
        genre: one(genres, {
            fields: [
                songsToGenres.genreId
            ],
            references: [
                genres.id
            ],
            relationName: "genre"
        }),
        song: one(songs, {
            fields: [
                songsToGenres.songId
            ],
            references: [
                songs.id
            ],
            relationName: "song"
        })
    }));
