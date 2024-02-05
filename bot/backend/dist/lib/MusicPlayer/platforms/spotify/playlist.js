import { logError } from "../../../log.js";
import { getTopResult } from "../youtube.js";
import spotify from "./client.js";
const spotifyPlaylistToYoutubeIds = async (playlistUrl)=>{
    const playlistId = playlistUrl.split("/")[4];
    try {
        const playlist = await spotify.playlists.getPlaylist(playlistId);
        const tracks = playlist.tracks.items;
        const artistsAndTitles = tracks.map((track)=>{
            const artist = track.track.artists.map((artist)=>artist.name).join(", ");
            const title = track.track.name;
            return {
                artist,
                title
            };
        });
        const youtubeIds = (await Promise.all(artistsAndTitles.map(async (artistTitle)=>{
            const query = `${artistTitle.artist} - ${artistTitle.title}`;
            const result = await getTopResult(query);
            return result;
        }))).filter((id)=>id !== undefined);
        return youtubeIds;
    } catch (e) {
        logError(e);
        return [];
    }
};
const searchSpotifyAndGetYoutubeId = async (query)=>{
    try {
        const searchResults = await spotify.search(query, [
            "track"
        ]);
        const topResult = searchResults.tracks.items[0];
        const artist = topResult.artists.map((artist)=>artist.name).join(", ");
        const title = topResult.name;
        const concatinated = `${artist} - ${title}`;
        const youtubeId = await getTopResult(concatinated);
        return youtubeId !== null && youtubeId !== void 0 ? youtubeId : null;
    } catch (e) {
        logError(e);
        return null;
    }
};
export { spotifyPlaylistToYoutubeIds, searchSpotifyAndGetYoutubeId };
