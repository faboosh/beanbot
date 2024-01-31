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
import { eq } from "drizzle-orm";

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

class SongMetadataService {
  static baseUrl = "http://localhost:5000";

  static async inferGenre(filePath: string): Promise<any> {
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

    return await response.json();
  }

  static async getOrCreatePlaybackMetadata(youtubeId: string) {
    const metadata = await this.getPlaybackMetadata(youtubeId);
    if (metadata) return metadata;
    return await this.createPlaybackMetadata(youtubeId);
  }

  static async createPlaybackMetadata(youtubeId: string) {
    try {
      const fileName = await downloadById(youtubeId);
      if (!fileName) throw new Error("Could not download");

      const lufs = (await getLoudness(fileName)) as number;

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
      console.error(e);
      return null;
    }
  }

  @cache<SongPlaybackMetadata>("song-playback-metadata")
  static async getPlaybackMetadata(youtubeId: string) {
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

    return metadata?.[0] ?? null;
  }

  static async getOrCreateDisplayMetadata(youtubeId: string) {
    const metadata = await this.getDisplayMetadata(youtubeId);
    if (metadata) return metadata;
    return await this.createDisplayMetadata(youtubeId);
  }

  static async createDisplayMetadata(youtubeId: string) {
    try {
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
      console.error(e);
      return null;
    }
  }

  @cache<SongDisplayMetadata>("song-display-metadata")
  static async getDisplayMetadata(youtubeId: string) {
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
      console.error(e);
      return null;
    }
  }

  @cache<{ title: string; author: string }>("song-title-author")
  static async getTitleAuthor(
    youtubeId: string
  ): Promise<{ title: string; author: string }> {
    let metadata = await this.getDisplayMetadata(youtubeId);
    if (!metadata) metadata = await this.createDisplayMetadata(youtubeId);
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
