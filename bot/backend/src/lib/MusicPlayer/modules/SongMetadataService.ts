import type {
  SongDisplayMetadata,
  SongMetadata,
  SongPlaybackMetadata,
} from "@shared/types.js";
import db, { drizzleDB } from "../../../db.js";
import { cache } from "../../Cache.js";
import { downloadById, getVideoDetails } from "../platforms/youtube.js";
import { getLoudness } from "../util/ffmpeg.js";
import { getTitleData } from "../platforms/spotify/index.js";
import { songs } from "../../../schema.js";
import { eq, exists } from "drizzle-orm";
import { logError, logMessage } from "../../log.js";
import AsyncTaskQueue from "../../queue.js";
import { existsSync } from "fs";
import { isMP4File } from "../../audioFormat.js";

class MoodGenreService {
  static async createGenre(name: string): Promise<void> {
    await db("genres").insert({ name });
  }

  static async createMood(name: string): Promise<void> {
    await db("moods").insert({ name });
  }

  static async createSongGenre(
    song_id: number,
    genre_id: number
  ): Promise<void> {
    await db("song_genres").insert({ song_id, genre_id });
  }

  static async createSongMood(song_id: number, mood_id: number): Promise<void> {
    await db("song_moods").insert({ song_id, mood_id });
  }
}

const displayMetadataQueue = new AsyncTaskQueue<{
  id: string;
  youtubeId: string;
  youtubeTitle: string | null;
  youtubeAuthor: string | null;
  spotifyId: string | null;
  spotifyTitle: string | null;
  spotifyAuthor: string | null;
  lengthSeconds: number | null;
} | null>();
const playbackMetadataQueue = new AsyncTaskQueue<{
  id: string;
  loudnessLufs: number | null;
  fileName: string | null;
  lengthSeconds: number | null;
} | null>();

class SongMetadataService {
  static baseUrl = "http://localhost:5000";

  static async inferGenre(filePath: string): Promise<[string, number][]> {
    const response = await fetch(`${this.baseUrl}/infer-genre`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ filePath }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return (await response.json()) as [string, number][];
  }

  private static async alreadyDownloadedAndIsValid(fileName: string) {
    return (
      existsSync(`${process.env.DOWNLOAD_FOLDER}/${fileName}`) &&
      isMP4File(`${process.env.DOWNLOAD_FOLDER}/${fileName}`)
    );
  }

  static async getOrCreatePlaybackMetadata(youtubeId: string) {
    // return playbackMetadataQueue.enqueue(youtubeId, async () => {
    const metadata = await this.getPlaybackMetadata(youtubeId);
    if (metadata) return metadata;
    return await this.createPlaybackMetadata(youtubeId);
    // });
  }

  private static async createPlaybackMetadata(youtubeId: string) {
    try {
      logMessage(`Creating playback metadata for ${youtubeId}`);
      const existingData = await this.getPlaybackMetadata(youtubeId);
      const alreadyDownloaded =
        existingData?.fileName &&
        (await this.alreadyDownloadedAndIsValid(existingData.fileName));

      logMessage(alreadyDownloaded ? "Already downloaded" : "Downloading...");
      const fileName = alreadyDownloaded
        ? existingData.fileName
        : await downloadById(youtubeId);
      if (!fileName) {
        logError("Could not download");
        return null;
      }

      const hasLoudness = existingData?.loudnessLufs !== null;
      logMessage(
        hasLoudness ? "Using existing loudness" : "Calculating loudness"
      );
      const lufs = hasLoudness
        ? existingData?.loudnessLufs
        : ((await getLoudness(fileName)) as number);

      const data = await drizzleDB
        .insert(songs)
        .values({
          youtubeId,
          fileName,
          loudnessLufs: lufs,
        })
        .onConflictDoUpdate({
          target: songs.youtubeId,
          set: {
            fileName,
            loudnessLufs: lufs,
          },
        })
        .returning();

      return data[0];
    } catch (e) {
      logError(e);
      return null;
    }
  }

  @cache<SongPlaybackMetadata>("song-playback-metadata")
  private static async getPlaybackMetadata(youtubeId: string) {
    const metadata = await drizzleDB
      .select({
        id: songs.id,
        loudnessLufs: songs.loudnessLufs,
        fileName: songs.fileName,
        lengthSeconds: songs.lengthSeconds,
      })
      .from(songs)
      .where(eq(songs.youtubeId, youtubeId))
      .execute();

    if (
      metadata?.[0]?.fileName &&
      (await this.alreadyDownloadedAndIsValid(metadata?.[0]?.fileName))
    )
      return metadata?.[0];

    return null;
  }

  static async getOrCreateDisplayMetadata(youtubeId: string) {
    // return displayMetadataQueue.enqueue(youtubeId, async () => {
    const metadata = await this.getDisplayMetadata(youtubeId);
    if (metadata) return metadata;
    return await this.createDisplayMetadata(youtubeId);
    // });
  }

  private static async createDisplayMetadata(youtubeId: string) {
    try {
      logMessage(`Creating display metadata for ${youtubeId}`);
      const result = await getVideoDetails(youtubeId);
      if (!result) throw new Error("Could not download");
      const lengthSeconds = result.duration;
      const titleData = await getTitleData(youtubeId);

      const data = await drizzleDB
        .insert(songs)
        .values({
          youtubeId: youtubeId,
          lengthSeconds: lengthSeconds,
          youtubeTitle: titleData?.youtubeTitle ?? "",
          youtubeAuthor: titleData?.youtubeAuthor ?? "",
          spotifyTitle: titleData?.spotifyTitle ?? null,
          spotifyAuthor: titleData?.spotifyAuthor ?? null,
        })
        .onConflictDoUpdate({
          target: songs.youtubeId,
          set: {
            youtubeId: youtubeId,
            lengthSeconds: lengthSeconds,
            youtubeTitle: titleData?.youtubeTitle ?? "",
            youtubeAuthor: titleData?.youtubeAuthor ?? "",
            spotifyTitle: titleData?.spotifyTitle ?? null,
            spotifyAuthor: titleData?.spotifyAuthor ?? null,
          },
        })
        .returning();

      return data[0];
    } catch (e) {
      logError(e);
      return null;
    }
  }

  @cache<SongDisplayMetadata>("song-display-metadata")
  private static async getDisplayMetadata(youtubeId: string) {
    try {
      const metadata = await drizzleDB
        .select({
          id: songs.id,
          youtubeId: songs.youtubeId,
          youtubeTitle: songs.youtubeTitle,
          youtubeAuthor: songs.youtubeAuthor,
          spotifyId: songs.spotifyId,
          spotifyTitle: songs.spotifyTitle,
          spotifyAuthor: songs.spotifyAuthor,
          lengthSeconds: songs.lengthSeconds,
        })
        .from(songs)
        .where(eq(songs.youtubeId, youtubeId))
        .execute();

      return metadata?.[0] ?? null;
    } catch (e) {
      logError(e);
      return null;
    }
  }

  @cache<{ title: string; author: string }>("song-title-author")
  static async getTitleAuthor(
    youtubeId: string
  ): Promise<{ title: string; author: string }> {
    let metadata = await this.getOrCreateDisplayMetadata(youtubeId);
    if (!metadata) throw new Error("Could not get metadata");

    return {
      title:
        (metadata.spotifyTitle
          ? metadata.spotifyTitle
          : metadata.youtubeTitle) ?? "",
      author:
        (metadata.spotifyAuthor
          ? metadata.spotifyAuthor
          : metadata.youtubeAuthor) ?? "",
    };
  }
}

export default SongMetadataService;
