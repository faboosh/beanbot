import type { SongMetadata } from "@shared/types.js";
import db from "../../../db.js";
import { cache } from "../../Cache.js";
import { downloadById } from "../platforms/youtube.js";
import { getLoudness } from "../util/ffmpeg.js";
import { getTitleData } from "../platforms/spotify/index.js";

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

  private static async computeMetadata(
    youtubeId: string
  ): Promise<SongMetadata | null> {
    try {
      const result = await downloadById(youtubeId);
      if (!result) throw new Error("Could not download");
      const lengthSeconds = result.details.duration;

      const [lufs, titleData] = await Promise.all([
        getLoudness(result.fileName),
        getTitleData(youtubeId),
      ]);

      const data: SongMetadata = {
        yt_id: youtubeId,
        length_seconds: lengthSeconds,
        lufs: lufs as number,
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

  // @cache<SongMetadata>("song-metadata")
  private static async getMetadata(
    youtubeId: string
  ): Promise<SongMetadata | null> {
    const metadata = (await db("song_metadata")
      .select(
        "yt_id",
        "lufs",
        "length_seconds",
        "yt_title",
        "yt_author",
        "spotify_title",
        "spotify_author"
      )
      .where({ yt_id: youtubeId })
      .whereNotNull("yt_title")
      .whereNotNull("lufs")
      .whereNotNull("length_seconds")
      .whereNot("yt_title", "")) as SongMetadata[];

    return metadata?.[0] ?? null;
  }

  // @cache<SongMetadata>("song-metadata")
  static async getOrCreateMetadata(youtubeId: string) {
    console.log(youtubeId);

    await downloadById(youtubeId);

    const metadata = await this.getMetadata(youtubeId);
    if (metadata) {
      return metadata;
    }

    const computedMetadata = await this.computeMetadata(youtubeId);

    return computedMetadata;
  }

  // @cache<string>("song-title-author")
  static async getTitleAuthor(
    youtubeId: string
  ): Promise<{ title: string; author: string }> {
    const metadata = await this.getOrCreateMetadata(youtubeId);
    if (!metadata)
      return {
        title: "Could not get title",
        author: "Could not get author",
      };

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
