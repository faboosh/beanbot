import "dotenv-esm/config";
import { writeFileSync } from "fs";
import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import { closest, distance } from "fastest-levenshtein";
import db from "../db.js";
import Cache from "../lib/Cache.js";
import { getVideoDetails } from "../lib/MusicPlayer/platforms/youtube.js";
import { logError, logMessage } from "../lib/log.js";
process.on("unhandledRejection", (reason, promise)=>{
    logError("Unhandled Rejection at:", promise, "reason:", reason);
// Application specific logging, throwing an error, or other logic here
});
process.on("uncaughtException", (error)=>{
    logError("Uncaught Exception:", error);
// Application specific logging, throwing an error, or other logic here
});
const clientID = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const SpotifyCache = new Cache("spotify-data");
const removers = [
    [
        "slowed + reverb",
        (str)=>str.replace(/[\(\[]]\s*slowed\s*([\+n]\s*)?reverb\s*[\)\]]/gim, "")
    ],
    [
        "official video/hd/hq",
        (str)=>str.replace(/[\(\[]\s*(officiell|official|full)?\s*((musi[ck]|lyrics?|hd|4k|720p)\s*)?(song|video|hd|hq|audio|version|visualizer|videoclip|remaster)?\s*[\)\]]/gim, "")
    ],
    [
        "live",
        (str)=>str.replace(/[\(\[]\s*live\s*[\)\]]/gim, "")
    ],
    [
        "audio",
        (str)=>str.replace(/[\(\[]\s*audio\s*[\)\]]/gim, "")
    ],
    [
        "music video",
        (str)=>str.replace(/(official\s)?music video/gim, "")
    ],
    [
        "napalm records",
        (str)=>str.replace(/napalm records/gim, "")
    ],
    [
        "resolution",
        (str)=>str.replace(/(hd|full\s*hd|720p|1080p|4k)/gim, "")
    ],
    [
        "hq",
        (str)=>str.replace(/[\(\[]\s*hq\s*[\)\]]/gim, "")
    ],
    [
        "nightcore",
        (str)=>str.replace(/[\(\[]\s*nightcore\s*[\)\]]/gim, "")
    ],
    [
        "cover art",
        (str)=>str.replace(/[\(\[]\s*cover\s*?art\s*[\)\]]/gim, "")
    ],
    [
        "lyrics",
        (str)=>str.replace(/[\(\[]\s*lyrics?\s*(video)?\s*[\)\]]/gim, "")
    ],
    [
        "special chars",
        (str)=>str.replace(RegExp("[^\\p{L}0-9 !-\\/\\\\:-@\\[\\]-`\\{\\}-~]", "gimu"), "")
    ],
    [
        "empty paranthesis",
        (str)=>str.replace(/[\(\[\{]\s*[\)\]\}]/gim, "")
    ]
];
let songLengths = {};
const excluders = [
    [
        "Hour",
        (str)=>/[0-9]+\s*(\.[0-9]+)?(hours?|hr?)/gim.test(str)
    ],
    [
        "Mix",
        (str)=>/\s+mix/gim.test(str)
    ],
    [
        "Top List",
        (str)=>/top\s*[0-9]+/gim.test(str)
    ],
    [
        "Compilation",
        (str)=>/compilation/gim.test(str)
    ],
    [
        "Soundtrack",
        (str)=>/soundtrack/gim.test(str)
    ],
    [
        "Meme",
        (str)=>/meme/gim.test(str)
    ],
    [
        "Banned word",
        (str)=>[
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
                /crazyrussianhacker/gim
            ].some((regex)=>regex.test(str))
    ],
    [
        "Only Numbers",
        (str)=>!isNaN(Number(str))
    ],
    [
        "Length",
        (str)=>{
            if (!(songLengths === null || songLengths === void 0 ? void 0 : songLengths[str])) return false;
            return songLengths[str] < 60 || songLengths[str] > 60 * 15;
        }
    ]
];
if (!clientID || !clientSecret) throw new Error("Spotify Client ID or Client Secret missing");
const spotify = SpotifyApi.withClientCredentials(clientID, clientSecret);
const main = async ()=>{
    const plays = await db("plays").select("title", "yt_id").groupBy("yt_id");
    (await db("song_metadata").select("plays.title", "length_seconds").join("plays", "plays.yt_id", "=", "song_metadata.yt_id")).forEach(({ title, length_seconds })=>songLengths[title] = length_seconds);
    // const title = titles[Math.round(Math.random() * (titles.length - 1))].title;
    const log = [];
    const appendLog = (...args)=>{
        log.push(args.map((data)=>String(data)).join(" "));
    };
    let unmodified = plays.map((play)=>play.title);
    const cleanedTitles = plays.filter(({ title })=>{
        const shouldStay = !excluders.some(([name, test])=>{
            const match = test(title);
            if (match) appendLog(title, "\n\texcluded by:", name);
            return match;
        });
        if (!shouldStay) {
            unmodified = unmodified.filter((str)=>str !== title);
        }
        return shouldStay;
    }).map(({ title, yt_id })=>{
        let cleanedTitle = title;
        for(let i = 0; i < removers.length; i++){
            const [name, remover] = removers[i];
            cleanedTitle = remover(cleanedTitle);
            if (cleanedTitle !== title) appendLog(title, "\n\tmodified by:", name, "\n\tmodified to:", cleanedTitle);
        }
        if (title !== cleanedTitle) {
            unmodified = unmodified.filter((str)=>str !== title);
        }
        return {
            yt_id,
            title,
            cleanedTitle: cleanedTitle
        };
    });
    writeFileSync("./log.txt", log.join("\n"));
    writeFileSync("./unmodified.txt", unmodified.join("\n"));
    writeFileSync("./cleaned.txt", cleanedTitles.join("\n"));
    for(let i = 0; i < cleanedTitles.length; i++){
        try {
            const { yt_id, title, cleanedTitle } = cleanedTitles[i];
            logMessage(`[${i + 1}/${cleanedTitles.length}]:`, title);
            const youtubeData = await getVideoDetails(yt_id);
            if (!youtubeData) {
                logError("Could not download data for video", title, "with id", yt_id);
                continue;
            }
            const result = await spotify.search(cleanedTitle, [
                "track"
            ]);
            const artistTitleList = result.tracks.items.map((track)=>{
                const name = track.name;
                const artists = track.artists.map((artist)=>artist.name);
                return `${artists.join(", ")} - ${name}`;
            });
            const distances = [
                cleanedTitle,
                `${youtubeData.author} - ${cleanedTitle}`
            ].map((title)=>{
                const bestMatch = closest(title.toLowerCase(), artistTitleList.map((word)=>word.toLowerCase()));
                const bestMatchIndex = artistTitleList.findIndex((title)=>title.toLowerCase() === bestMatch);
                if (bestMatchIndex === -1) throw new Error("Could not find index of best match, this should never happen");
                const splitBestMatch = artistTitleList[bestMatchIndex].split(" - ");
                const wordSimilarity = title.split(" ").filter((word)=>{
                    const wordsInMatch = bestMatch.split(" ").map((word)=>word.toLowerCase());
                    return wordsInMatch.includes(word.toLowerCase());
                }).length / title.split(" ").length;
                const longerStringLength = Math.max(title.length, bestMatch.length);
                const normalizedDistance = distance(title, bestMatch) / longerStringLength;
                return {
                    youtubeTitle: title,
                    bestMatch: {
                        artist: splitBestMatch[0],
                        title: splitBestMatch[1]
                    },
                    distance: normalizedDistance,
                    wordSimilarity
                };
            });
            let closeEnough;
            for(let i = 0; i < distances.length; i++){
                const entry = distances[i];
                if (entry.distance < 0.25 && entry.wordSimilarity > 0.6) {
                    if (!closeEnough) {
                        closeEnough = entry;
                    } else if (closeEnough.distance < entry.distance && closeEnough.wordSimilarity > entry.distance) {
                        closeEnough = entry;
                    }
                }
            }
            const dbData = {
                yt_id: youtubeData.id,
                yt_title: youtubeData.title,
                yt_author: youtubeData.author,
                spotify_title: closeEnough ? closeEnough.bestMatch.title : "",
                spotify_author: closeEnough ? closeEnough.bestMatch.artist : ""
            };
            await db("song_metadata").insert(dbData).onConflict("yt_id").merge();
        } catch (e) {
            logError(e);
        }
    }
    process.exit(0);
};
main();
