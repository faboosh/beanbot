import db from "../../../db.js";
import Cache from "../../Cache.js";
import { getLoudness, getMetadata as ffprobeGetMetadata } from "./ffmpeg.js";
import { getTitleData } from "../platforms/spotify.js";
import { downloadById } from "../platforms/youtube.js";

export type SongMetadata = {
  yt_id: string;
  yt_title?: string;
  yt_author?: string;
  spotify_title?: string;
  spotify_author?: string;
  length_seconds?: number;
  lufs?: number;
};

const computeMetadata = async (
  youtubeId: string
): Promise<SongMetadata | null> => {
  try {
    const result = await downloadById(youtubeId);
    if (!result) throw new Error("Could not download");

    const ffmpegData = (await ffprobeGetMetadata(result.filePath)) as any;
    const lengthSeconds = ffmpegData.streams?.[0].duration as number;
    const lufs = (await getLoudness(result.filePath)) as number;
    const titleData = await getTitleData(youtubeId);

    const data: SongMetadata = {
      yt_id: youtubeId,
      length_seconds: lengthSeconds,
      lufs: lufs,
      ...titleData,
    };

    await db("song_metadata").insert(data).onConflict("yt_id").merge();
    return data;
  } catch (e) {
    console.error(e);
    return null;
  }
};

const MetadataCache = new Cache<SongMetadata>("song-metadata");

const getMetadata = async (youtubeId: string): Promise<SongMetadata | null> => {
  const cachedMetadata = MetadataCache.get(youtubeId);
  if (cachedMetadata) return cachedMetadata;
  const metadata = (await db("song_metadata")
    .select(
      "lufs",
      "length_seconds",
      "yt_title",
      "yt_author",
      "spotify_title",
      "spotify_author"
    )
    .where({ yt_id: youtubeId })
    .whereNotNull("yt_title")
    .whereNot("yt_title", "")) as SongMetadata[];
  if (metadata?.[0]) {
    MetadataCache.set(youtubeId, metadata[0]);
    return metadata[0];
  }

  return null;
};

const getOrCreateMetadata = async (youtubeId: string) => {
  const metadata = await getMetadata(youtubeId);
  if (metadata) return metadata;

  const computedMetadata = await computeMetadata(youtubeId);
  if (computedMetadata) MetadataCache.set(youtubeId, computedMetadata);

  return computedMetadata;
};

const getTitleAuthor = async (
  youtubeId: string
): Promise<{ title: string; author: string }> => {
  const metadata = await getOrCreateMetadata(youtubeId);
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
};

export { computeMetadata, getOrCreateMetadata, getMetadata, getTitleAuthor };
