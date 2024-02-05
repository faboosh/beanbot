import "dotenv-esm/config";
import { drizzleDB } from "../db.js";
import SongMetadataService from "../lib/MusicPlayer/modules/SongMetadataService.js";
import { logMessage } from "../lib/log.js";
const main = async ()=>{
    const songsRes = await drizzleDB.query.songs.findMany({});
    for(let i = 0; i < songsRes.length; i++){
        const song = songsRes[i];
        logMessage(`Processing song ${i + 1} of ${songsRes.length}`);
        logMessage(`YouTube ID: ${song.youtubeId}`);
        logMessage(`Song name: ${song.youtubeTitle}`);
        logMessage(`File name: ${song.fileName}`);
        await SongMetadataService.getOrCreatePlaybackMetadata(song.youtubeId);
    }
    process.exit(0);
};
main();
