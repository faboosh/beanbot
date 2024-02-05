import { closest, distance } from "fastest-levenshtein";
import { getVideoDetails } from "../youtube.js";
import { cleanTitle } from "./filters.js";
import spotify from "./client.js";
import { logError } from "../../../log.js";
const buildSongMetadata = (youtubeData, spotifyMatch)=>{
    const songMetadata = {
        youtubeId: youtubeData.id,
        youtubeTitle: youtubeData.title,
        youtubeAuthor: youtubeData.author
    };
    if (spotifyMatch) {
        songMetadata.spotifyTitle = spotifyMatch.bestMatch.title;
        songMetadata.spotifyAuthor = spotifyMatch.bestMatch.artist;
        songMetadata.spotifyId = spotifyMatch.bestMatch.id;
    }
    return songMetadata;
};
const buildArtistTitleList = (tracks)=>{
    return tracks.map((track)=>{
        const name = track.name;
        const artists = track.artists.map((artist)=>artist.name);
        return {
            song: `${artists.join(", ")} - ${name}`,
            id: track.id
        };
    });
};
const calculateDistances = (cleanedTitle, youtubeData, artistTitleList)=>{
    return [
        cleanedTitle,
        `${youtubeData.author} - ${cleanedTitle}`
    ].map((title)=>{
        const bestMatch = closest(title.toLowerCase(), artistTitleList.map(({ song })=>song.toLowerCase()));
        const bestMatchIndex = artistTitleList.findIndex(({ song })=>song.toLowerCase() === bestMatch);
        if (bestMatchIndex === -1) throw new Error("Could not find index of best match, this should never happen");
        const bestMatchObj = artistTitleList[bestMatchIndex];
        const splitBestMatch = bestMatchObj.song.split(" - ");
        const wordSimilarity = title.split(" ").filter((word)=>{
            const wordsInMatch = bestMatch.split(" ").map((word)=>word.toLowerCase());
            return wordsInMatch.includes(word.toLowerCase());
        }).length / title.split(" ").length;
        const longerStringLength = Math.max(title.length, bestMatch.length);
        const normalizedDistance = distance(title, bestMatch) / longerStringLength;
        return {
            youtubeTitle: title,
            bestMatch: {
                id: bestMatchObj.id,
                artist: splitBestMatch[0],
                title: splitBestMatch[1]
            },
            distance: normalizedDistance,
            wordSimilarity
        };
    });
};
function findCloseEnoughMatch(distances) {
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
    return closeEnough;
}
const getTitleData = async (youtubeId)=>{
    try {
        const youtubeData = await getVideoDetails(youtubeId);
        if (!youtubeData) {
            throw new Error(`Could not download data for video ${youtubeId}`);
        }
        const cleanedTitle = cleanTitle(youtubeData.title);
        if (!cleanedTitle) {
            return buildSongMetadata(youtubeData);
        }
        const result = await spotify.search(cleanedTitle, [
            "track"
        ]);
        const artistTitleList = buildArtistTitleList(result.tracks.items);
        const distances = calculateDistances(cleanedTitle, youtubeData, artistTitleList);
        const closeEnoughMatch = findCloseEnoughMatch(distances);
        return buildSongMetadata(youtubeData, closeEnoughMatch);
    } catch (e) {
        logError(e);
        return null;
    }
};
export { getTitleData };
