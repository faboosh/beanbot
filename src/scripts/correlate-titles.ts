import "dotenv/config";
import { writeFileSync } from "fs";
import db from "../db";
import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import Cache from "../lib/Cache";
import { downloadById } from "../lib/MusicPlayer/platforms/youtube";
import { closest, distance } from "fastest-levenshtein";

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Application specific logging, throwing an error, or other logic here
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  // Application specific logging, throwing an error, or other logic here
});

const clientID = process.env.spotify_client_id;
const clientSecret = process.env.spotify_client_secret;

const SpotifyCache = new Cache("spotify-data");

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

let songLengths: Record<string, number> = {};

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
  [
    "Length",
    (str: string) => {
      if (!songLengths?.[str]) return false;
      return songLengths[str] < 60 || songLengths[str] > 60 * 15;
    },
  ],
];

if (!clientID || !clientSecret)
  throw new Error("Spotify Client ID or Client Secret missing");

const spotify = SpotifyApi.withClientCredentials(clientID, clientSecret);

const main = async () => {
  const plays = (await db("plays")
    .select("title", "yt_id")
    .groupBy("yt_id")) as { title: string; yt_id: string }[];

  (
    await db("song_metadata")
      .select("plays.title", "length_seconds")
      .join("plays", "plays.yt_id", "=", "song_metadata.yt_id")
  ).forEach(
    ({ title, length_seconds }) => (songLengths[title] = length_seconds)
  );

  // const title = titles[Math.round(Math.random() * (titles.length - 1))].title;
  const log: string[] = [];
  const appendLog = (...args: any[]) => {
    log.push(args.map((data) => String(data)).join(" "));
  };
  let unmodified: string[] = plays.map((play) => play.title);
  const cleanedTitles = plays
    .filter(({ title }) => {
      const shouldStay = !excluders.some(([name, test]) => {
        const match = test(title);
        if (match) appendLog(title, "\n\texcluded by:", name);
        return match;
      });

      if (!shouldStay) {
        unmodified = unmodified.filter((str) => str !== title);
      }
      return shouldStay;
    })
    .map(({ title, yt_id }) => {
      let cleanedTitle = title;
      for (let i = 0; i < removers.length; i++) {
        const [name, remover] = removers[i];
        cleanedTitle = remover(cleanedTitle);
        if (cleanedTitle !== title)
          appendLog(
            title,
            "\n\tmodified by:",
            name,
            "\n\tmodified to:",
            cleanedTitle
          );
      }
      if (title !== cleanedTitle) {
        unmodified = unmodified.filter((str) => str !== title);
      }
      return {
        yt_id,
        title,
        cleanedTitle: cleanedTitle,
      };
    });

  writeFileSync("./log.txt", log.join("\n"));
  writeFileSync("./unmodified.txt", unmodified.join("\n"));
  writeFileSync("./cleaned.txt", cleanedTitles.join("\n"));

  for (let i = 0; i < cleanedTitles.length; i++) {
    try {
      const { yt_id, title, cleanedTitle } = cleanedTitles[i];
      console.log(`[${i + 1}/${cleanedTitles.length}]:`, title);
      const youtubeData = await downloadById(yt_id);
      if (!youtubeData) {
        console.error(
          "Could not download data for video",
          title,
          "with id",
          yt_id
        );
        continue;
      }
      const result = await spotify.search(cleanedTitle, ["track"]);

      const artistTitleList = result.tracks.items.map((track) => {
        const name = track.name;
        const artists = track.artists.map((artist) => artist.name);
        return `${artists.join(", ")} - ${name}`;
      });
      const distances = [
        cleanedTitle,
        `${youtubeData.details.author} - ${cleanedTitle}`,
      ].map((title) => {
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
      });

      let closeEnough:
        | {
            youtubeTitle: string;
            bestMatch: {
              artist: string;
              title: string;
            };
            distance: number;
            wordSimilarity: number;
          }
        | undefined;

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

      const dbData: {
        yt_id: string;
        yt_title: string;
        yt_author: string;
        spotify_title: string;
        spotify_author: string;
      } = {
        yt_id: youtubeData.details.id,
        yt_title: youtubeData.details.title,
        yt_author: youtubeData.details.author,
        spotify_title: closeEnough ? closeEnough.bestMatch.title : "",
        spotify_author: closeEnough ? closeEnough.bestMatch.artist : "",
      };

      await db("song_metadata").insert(dbData).onConflict("yt_id").merge();
    } catch (e) {
      console.error(e);
    }
  }

  process.exit(0);
};

main();
