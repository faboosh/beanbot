import db from "../../../db.js";
import Cache from "../../Cache.js";
import { getLoudness } from "./ffmpeg.js";
import { getTitleData } from "../platforms/spotify.js";
import { downloadById } from "../platforms/youtube.js";
import type { SongMetadata } from "@shared/types.js";

const computeMetadata = async (
  youtubeId: string
): Promise<SongMetadata | null> => {
  try {
    const result = await downloadById(youtubeId);
    if (!result) throw new Error("Could not download");
    const lengthSeconds = result.details.duration;

    const [lufs, titleData] = await Promise.all([
      getLoudness(result.filePath),
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
        Object.fromEntries(Object.entries(data).filter(([_key, val]) => !!val))
      )
      .onConflict("yt_id")
      .merge();
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
  if (metadata?.[0]) {
    MetadataCache.set(youtubeId, metadata[0]);
    return metadata[0];
  }

  return null;
};

const getOrCreateMetadata = async (youtubeId: string) => {
  console.time("Get/create metadata");

  const metadata = await getMetadata(youtubeId);
  if (metadata) {
    console.timeEnd("Get/create metadata");
    return metadata;
  }

  const computedMetadata = await computeMetadata(youtubeId);
  if (computedMetadata) MetadataCache.set(youtubeId, computedMetadata);

  console.timeEnd("Get/create metadata");

  return computedMetadata;
};

const getTitleAuthor = async (
  youtubeId: string
): Promise<{ title: string; author: string }> => {
  console.time("Get title & author");
  const metadata = await getOrCreateMetadata(youtubeId);
  if (!metadata)
    return {
      title: "Could not get title",
      author: "Could not get author",
    };
  console.timeEnd("Get title & author");

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
