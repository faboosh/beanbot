import "dotenv-esm/config";
import * as schema from "../schema.js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import db from "../db.js";
import { logMessage } from "../lib/log.js";
const connectionString = process.env.POSTGRES_URL;
if (!connectionString) throw new Error("postgres_url not set in .env");
const client = postgres(connectionString, {
    max: 1
});
const drizzleDb = drizzle(client, {
    schema
});
const main = async ()=>{
    logMessage("resetting drizzle db");
    await drizzleDb.delete(schema.plays).execute();
    await drizzleDb.delete(schema.skips).execute();
    await drizzleDb.delete(schema.songs).execute();
    await drizzleDb.delete(schema.dataConsent).execute();
    const plays = await db("plays").select("yt_id", "timestamp", "user_id", "guild_id", "filename", "imported");
    logMessage("importing plays");
    for (const play of plays){
        const song = await drizzleDb.insert(schema.songs).values({
            youtubeId: play.yt_id,
            fileName: play.filename
        }).onConflictDoUpdate({
            target: schema.songs.youtubeId,
            set: {
                fileName: play.filename
            }
        }).returning();
        if (!song[0]) throw new Error("Could not insert song");
        await drizzleDb.insert(schema.plays).values({
            songId: song[0].id,
            timestamp: new Date(play.timestamp),
            imported: play.imported,
            userId: play.user_id,
            guildId: play.guild_id
        });
    }
    const skips = await db("skips").select("yt_id", "timestamp", "user_id", "guild_id");
    logMessage("importing skips");
    for (const skip of skips){
        const song = await drizzleDb.insert(schema.songs).values({
            youtubeId: skip.yt_id
        }).onConflictDoUpdate({
            target: schema.songs.youtubeId,
            set: {
                youtubeId: skip.yt_id
            }
        }).returning();
        if (!song[0]) throw new Error("Could not insert song");
        await drizzleDb.insert(schema.skips).values({
            songId: song[0].id,
            timestamp: new Date(skip.timestamp),
            userId: skip.user_id,
            guildId: skip.guild_id
        });
    }
    logMessage("importing metadata");
    const metadata = await db("song_metadata").select("yt_id", "length_seconds", "yt_title", "yt_author", "spotify_title", "spotify_author", "lufs", "length_seconds");
    for (const meta of metadata){
        const song = await drizzleDb.insert(schema.songs).values({
            youtubeId: meta.yt_id,
            youtubeTitle: meta.yt_title,
            youtubeAuthor: meta.yt_author,
            spotifyTitle: meta.spotify_title,
            spotifyAuthor: meta.spotify_author,
            lengthSeconds: meta.length_seconds,
            loudnessLufs: meta.lufs
        }).onConflictDoUpdate({
            target: schema.songs.youtubeId,
            set: {
                youtubeTitle: meta.yt_title,
                youtubeAuthor: meta.yt_author,
                spotifyTitle: meta.spotify_title,
                spotifyAuthor: meta.spotify_author,
                lengthSeconds: meta.length_seconds,
                loudnessLufs: meta.lufs
            }
        }).returning();
        if (!song[0]) throw new Error("Could not insert song");
    }
    const dataConsent = await db("data-consent").select("user_id");
    logMessage("importing data consent");
    for (const consent of dataConsent){
        await drizzleDb.insert(schema.dataConsent).values({
            userId: consent.user_id,
            consented: true
        }).onConflictDoUpdate({
            target: schema.dataConsent.userId,
            set: {
                userId: consent.user_id,
                consented: true
            }
        });
    }
    await client.end();
};
main();
