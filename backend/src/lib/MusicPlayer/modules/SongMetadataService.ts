import type {
  SongDisplayMetadata,
  SongMetadata,
  SongPlaybackMetadata,
} from "@shared/types.js";
import db from "../../../db.js";
import { cache } from "../../Cache.js";
import { downloadById, getVideoDetails } from "../platforms/youtube.js";
import { getLoudness } from "../util/ffmpeg.js";
import { getTitleData } from "../platforms/spotify/index.js";

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

      const lufs = await getLoudness(fileName);

      const data: SongPlaybackMetadata = {
        yt_id: youtubeId,
        lufs: lufs as number,
      };

      await db("song_metadata")
        .insert(
          Object.fromEntries(
            Object.entries(data).filter(([_key, val]) => !!val)
          )
        )
        .onConflict("yt_id")
        .merge();

      return data;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  @cache<SongPlaybackMetadata>("song-playback-metadata")
  static async getPlaybackMetadata(youtubeId: string) {
    const metadata = (await db("song_metadata")
      .select("lufs", "yt_id")
      .where({ yt_id: youtubeId })
      .whereNotNull("yt_title")
      .whereNotNull("length_seconds")) as SongPlaybackMetadata[];

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

      const data: SongDisplayMetadata = {
        yt_id: youtubeId,
        length_seconds: lengthSeconds,
        yt_title: titleData?.yt_title ?? "",
        yt_author: titleData?.yt_author ?? "",
        spotify_title: titleData?.spotify_title ?? null,
        spotify_author: titleData?.spotify_author ?? null,
      };

      await db("song_metadata")
        .insert(
          Object.fromEntries(
            Object.entries(data).filter(([_key, val]) => !!val)
          )
        )
        .onConflict("yt_id")
        .merge();

      return data;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  @cache<SongDisplayMetadata>("song-display-metadata")
  static async getDisplayMetadata(
    youtubeId: string
  ): Promise<SongDisplayMetadata | null> {
    const metadata = (await db("song_metadata")
      .select(
        "yt_id",
        "length_seconds",
        "yt_title",
        "yt_author",
        "spotify_title",
        "spotify_author"
      )
      .where({ yt_id: youtubeId })
      .whereNotNull("yt_title")
      .whereNotNull("length_seconds")) as SongDisplayMetadata[];

    return metadata?.[0] ?? null;
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
        (metadata.spotify_title ? metadata.spotify_title : metadata.yt_title) ??
        "",
      author:
        (metadata.spotify_author
          ? metadata.spotify_author
          : metadata.yt_author) ?? "",
    };
  }
}

export default SongMetadataService;
