import "dotenv-esm/config";
import * as schema from "../schema.js";
import db, { drizzleDB } from "../db.js";
import { logMessage } from "../lib/log.js";

const main = async () => {
  logMessage("resetting drizzle db");
  await drizzleDB.delete(schema.plays).execute();
  await drizzleDB.delete(schema.skips).execute();
  await drizzleDB.delete(schema.songs).execute();
  await drizzleDB.delete(schema.dataConsent).execute();

  const plays = (await db("plays").select(
    "yt_id",
    "timestamp",
    "user_id",
    "guild_id",
    "filename",
    "imported"
  )) as {
    yt_id: string;
    timestamp: number;
    user_id: string;
    guild_id: string;
    filename: string;
    imported: boolean;
  }[];

  logMessage("importing plays");
  for (const play of plays) {
    const song = await drizzleDB
      .insert(schema.songs)
      .values({
        youtubeId: play.yt_id,
        fileName: play.filename,
      })
      .onConflictDoUpdate({
        target: schema.songs.youtubeId,
        set: {
          fileName: play.filename,
        },
      })
      .returning();
    if (!song[0]) throw new Error("Could not insert song");
    await drizzleDB.insert(schema.plays).values({
      songId: song[0].id,
      timestamp: new Date(play.timestamp),
      imported: play.imported,
      userId: play.user_id,
      guildId: play.guild_id,
    });
  }

  const skips = (await db("skips").select(
    "yt_id",
    "timestamp",
    "user_id",
    "guild_id"
  )) as {
    yt_id: string;
    timestamp: number;
    user_id: string;
    guild_id: string;
  }[];
  logMessage("importing skips");
  for (const skip of skips) {
    const song = await drizzleDB
      .insert(schema.songs)
      .values({
        youtubeId: skip.yt_id,
      })
      .onConflictDoUpdate({
        target: schema.songs.youtubeId,
        set: { youtubeId: skip.yt_id },
      })
      .returning();
    if (!song[0]) throw new Error("Could not insert song");
    await drizzleDB.insert(schema.skips).values({
      songId: song[0].id,
      timestamp: new Date(skip.timestamp),
      userId: skip.user_id,
      guildId: skip.guild_id,
    });
  }
  logMessage("importing metadata");
  const metadata = (await db("song_metadata").select(
    "yt_id",
    "length_seconds",
    "yt_title",
    "yt_author",
    "spotify_title",
    "spotify_author",
    "lufs",
    "length_seconds"
  )) as {
    yt_id: string;
    yt_title: string;
    yt_author: string;
    spotify_title: string | null;
    spotify_author: string | null;
    length_seconds: number | null;
    lufs: number | null;
  }[];

  for (const meta of metadata) {
    const song = await drizzleDB
      .insert(schema.songs)
      .values({
        youtubeId: meta.yt_id,
        youtubeTitle: meta.yt_title,
        youtubeAuthor: meta.yt_author,
        spotifyTitle: meta.spotify_title,
        spotifyAuthor: meta.spotify_author,
        lengthSeconds: meta.length_seconds,
        loudnessLufs: meta.lufs,
      })
      .onConflictDoUpdate({
        target: schema.songs.youtubeId,
        set: {
          youtubeTitle: meta.yt_title,
          youtubeAuthor: meta.yt_author,
          spotifyTitle: meta.spotify_title,
          spotifyAuthor: meta.spotify_author,
          lengthSeconds: meta.length_seconds,
          loudnessLufs: meta.lufs,
        },
      })
      .returning();
    if (!song[0]) throw new Error("Could not insert song");
  }

  const dataConsent = (await db("data-consent").select("user_id")) as {
    user_id: string;
  }[];
  logMessage("importing data consent");
  for (const consent of dataConsent) {
    await drizzleDB
      .insert(schema.dataConsent)
      .values({
        userId: consent.user_id,
        consented: true,
      })
      .onConflictDoUpdate({
        target: schema.dataConsent.userId,
        set: {
          userId: consent.user_id,
          consented: true,
        },
      });
  }
};

main();
