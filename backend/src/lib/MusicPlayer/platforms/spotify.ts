import "dotenv-esm/config";
import { closest, distance } from "fastest-levenshtein";
import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import type { Track } from "@spotify/web-api-ts-sdk";
import { downloadById } from "./youtube.js";
import type { SongMetadata } from "@shared/types.js";

const clientID = process.env.spotify_client_id;
const clientSecret = process.env.spotify_client_secret;

if (!clientID || !clientSecret)
  throw new Error("Spotify Client ID or Client Secret missing");

const spotify = SpotifyApi.withClientCredentials(clientID, clientSecret);

const removers: [string, (str: string) => string][] = [
  [
    "slowed + reverb",
    (str: string) =>
      str.replace(/[\(\[]]\s*slowed\s*([\+n]\s*)?reverb\s*[\)\]]/gim, ""),
  ],
  [
    "official video/hd/hq",
    (str: string) =>
      str.replace(
        /[\(\[]\s*(officiell|official|full)?\s*((musi[ck]|lyrics?|hd|4k|720p)\s*)?(song|video|hd|hq|audio|version|visualizer|videoclip|remaster)?\s*[\)\]]/gim,
        ""
      ),
  ],
  ["live", (str: string) => str.replace(/[\(\[]\s*live\s*[\)\]]/gim, "")],
  ["audio", (str: string) => str.replace(/[\(\[]\s*audio\s*[\)\]]/gim, "")],
  [
    "music video",
    (str: string) => str.replace(/(official\s)?music video/gim, ""),
  ],
  ["napalm records", (str: string) => str.replace(/napalm records/gim, "")],
  [
    "resolution",
    (str: string) => str.replace(/(hd|full\s*hd|720p|1080p|4k)/gim, ""),
  ],
  ["hq", (str: string) => str.replace(/[\(\[]\s*hq\s*[\)\]]/gim, "")],
  [
    "nightcore",
    (str: string) => str.replace(/[\(\[]\s*nightcore\s*[\)\]]/gim, ""),
  ],
  [
    "cover art",
    (str: string) => str.replace(/[\(\[]\s*cover\s*?art\s*[\)\]]/gim, ""),
  ],
  [
    "lyrics",
    (str: string) => str.replace(/[\(\[]\s*lyrics?\s*(video)?\s*[\)\]]/gim, ""),
  ],
  [
    "special chars",
    (str: string) => str.replace(/[^\p{L}0-9 !-\/\\:-@\[\]-`\{\}-~]/gimu, ""),
  ],
  [
    "empty paranthesis",
    (str: string) => str.replace(/[\(\[\{]\s*[\)\]\}]/gim, ""),
  ],
];

type SpotifyMatch = {
  youtubeTitle: string;
  bestMatch: {
    artist: string;
    title: string;
  };
  distance: number;
  wordSimilarity: number;
};

type YoutubeData = {
  filePath: string;
  details: any;
};

const excluders: [string, (str: string) => boolean][] = [
  ["Hour", (str: string) => /[0-9]+\s*(\.[0-9]+)?(hours?|hr?)/gim.test(str)],
  ["Mix", (str: string) => /\s+mix/gim.test(str)],
  ["Top List", (str: string) => /top\s*[0-9]+/gim.test(str)],
  ["Compilation", (str: string) => /compilation/gim.test(str)],
  ["Soundtrack", (str: string) => /soundtrack/gim.test(str)],
  ["Meme", (str: string) => /meme/gim.test(str)],
  [
    "Banned word",
    (str: string) =>
      [
        /Rucka Rucka Ali/gim,
        /penis/gim,
        /vagina/gim,
        /tik([\s-])?tok/gim,
        /xqc/gim,
        /Movie CLIP/gim,
        /DPRK/gim,
        /North Korea/gim,
        /rapist/gim,
        /ussr/gim,
        /mashup/gim,
        /Kids? Songs?/gim,
        /Adult Swim/gim,
        /crazyrussianhacker/gim,
      ].some((regex) => regex.test(str)),
  ],
  ["Only Numbers", (str: string) => !isNaN(Number(str))],
];

const cleanTitle = (title: string) => {
  if (shouldExcludeTitle(title)) return null;

  let cleanedTitle = title;
  for (let i = 0; i < removers.length; i++) {
    const [name, remover] = removers[i];
    cleanedTitle = remover(cleanedTitle);
  }

  return cleanedTitle;
};

const shouldExcludeTitle = (title: string) => {
  return excluders.some(([_name, test]) => {
    const match = test(title);
    return match;
  });
};

const buildSongMetadata = (
  youtubeData: YoutubeData,
  spotifyMatch?: SpotifyMatch
) => {
  const songMetadata: SongMetadata = {
    yt_id: youtubeData.details.id,
    yt_title: youtubeData.details.title,
    yt_author: youtubeData.details.author,
    spotify_author: null,
    spotify_title: null,
    length_seconds: null,
    lufs: null,
  };

  if (spotifyMatch) {
    songMetadata.spotify_title = spotifyMatch.bestMatch.title;
    songMetadata.spotify_author = spotifyMatch.bestMatch.artist;
  }

  return songMetadata;
};

const buildArtistTitleList = (tracks: Track[]) => {
  return tracks.map((track) => {
    const name = track.name;
    const artists = track.artists.map((artist) => artist.name);
    return `${artists.join(", ")} - ${name}`;
  });
};

const calculateDistances = (
  cleanedTitle: string,
  youtubeData: YoutubeData,
  artistTitleList: string[]
): SpotifyMatch[] => {
  return [cleanedTitle, `${youtubeData.details.author} - ${cleanedTitle}`].map(
    (title) => {
      const bestMatch = closest(
        title.toLowerCase(),
        artistTitleList.map((word) => word.toLowerCase())
      );
      const bestMatchIndex = artistTitleList.findIndex(
        (title) => title.toLowerCase() === bestMatch
      );

      if (bestMatchIndex === -1)
        throw new Error(
          "Could not find index of best match, this should never happen"
        );

      const splitBestMatch = artistTitleList[bestMatchIndex].split(" - ");
      const wordSimilarity =
        title.split(" ").filter((word) => {
          const wordsInMatch = bestMatch
            .split(" ")
            .map((word) => word.toLowerCase());
          return wordsInMatch.includes(word.toLowerCase());
        }).length / title.split(" ").length;

      const longerStringLength = Math.max(title.length, bestMatch.length);
      const normalizedDistance =
        distance(title, bestMatch) / longerStringLength;

      return {
        youtubeTitle: title,
        bestMatch: {
          artist: splitBestMatch[0],
          title: splitBestMatch[1],
        },
        distance: normalizedDistance,
        wordSimilarity,
      };
    }
  );
};

function findCloseEnoughMatch(distances: SpotifyMatch[]) {
  let closeEnough: SpotifyMatch | undefined;

  for (let i = 0; i < distances.length; i++) {
    const entry = distances[i];

    if (entry.distance < 0.25 && entry.wordSimilarity > 0.6) {
      if (!closeEnough) {
        closeEnough = entry;
      } else if (
        closeEnough.distance < entry.distance &&
        closeEnough.wordSimilarity > entry.distance
      ) {
        closeEnough = entry;
      }
    }
  }

  return closeEnough;
}

const getTitleData = async (
  youtubeId: string
): Promise<SongMetadata | null> => {
  try {
    const youtubeData = await downloadById(youtubeId);
    if (!youtubeData) {
      throw new Error(`Could not download data for video ${youtubeId}`);
    }

    const cleanedTitle = cleanTitle(youtubeData.details.title);
    if (!cleanedTitle) {
      return buildSongMetadata(youtubeData);
    }

    const result = await spotify.search(cleanedTitle, ["track"]);
    const artistTitleList = buildArtistTitleList(result.tracks.items);
    const distances = calculateDistances(
      cleanedTitle,
      youtubeData,
      artistTitleList
    );

    const closeEnoughMatch = findCloseEnoughMatch(distances);

    return buildSongMetadata(youtubeData, closeEnoughMatch);
  } catch (e) {
    console.error(e);
    return null;
  }
};

export { getTitleData };
