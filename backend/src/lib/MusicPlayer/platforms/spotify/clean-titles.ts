import { closest, distance } from "fastest-levenshtein";
import type { Track } from "@spotify/web-api-ts-sdk";
import { downloadById } from "../youtube.js";
import type { SongMetadata } from "@shared/types.js";
import { cleanTitle } from "./filters.js";
import spotify from "./client.js";

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
  fileName: string;
  details: any;
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
