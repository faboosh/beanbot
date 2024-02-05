import "dotenv-esm/config";
import { genres, songsToGenres } from "../schema.js";
import { drizzleDB } from "../db.js";
import { logError, logMessage } from "../lib/log.js";
import SongMetadataService from "../lib/MusicPlayer/modules/SongMetadataService.js";
import { writeFileSync } from "fs";
const hasGenres = async (songId)=>{
    const existingGenres = await drizzleDB.query.songsToGenres.findMany({
        where: (songsToGenres, { eq })=>eq(songsToGenres.songId, songId)
    });
    return existingGenres.length > 0;
};
const processSong = async (song)=>{
    if (await hasGenres(song.id)) {
        logMessage("Song already has genres, skipping");
        return;
    }
    if (!song) {
        logMessage("Song not found");
        return;
    }
    if (!song.fileName) {
        logMessage("Song has no file name");
        return;
    }
    const songGenres = await SongMetadataService.inferGenre(song.fileName.replace(`${process.env.DOWNLOAD_FOLDER}/`, ""));
    if (!songGenres.length) {
        throw new Error("No genres infered");
    }
    await Promise.all(songGenres.map(async ([name])=>await drizzleDB.insert(genres).values({
            name
        }).onConflictDoNothing().returning()));
    const genreObjects = await drizzleDB.query.genres.findMany({
        where: (genres, { inArray })=>inArray(genres.name, songGenres.map(([name])=>name))
    });
    const relations = await Promise.all(genreObjects.map((genre)=>{
        var _songGenres_find;
        var _songGenres_find_;
        return drizzleDB.insert(songsToGenres).values({
            songId: song.id,
            genreId: genre.id,
            certainty: (_songGenres_find_ = (_songGenres_find = songGenres.find(([name])=>name === genre.name)) === null || _songGenres_find === void 0 ? void 0 : _songGenres_find[1]) !== null && _songGenres_find_ !== void 0 ? _songGenres_find_ : 0
        }).onConflictDoNothing().returning();
    }));
    logMessage("Song genres", genreObjects);
};
const main = async ()=>{
    const songs = await drizzleDB.query.songs.findMany({
        where: (songs, { gte, lte, and })=>and(gte(songs.lengthSeconds, 2 * 60), lte(songs.lengthSeconds, 15 * 60))
    });
    const failed = [];
    for(let i = 0; i < songs.length; i++){
        try {
            let song = songs[i];
            logMessage(`[${i + 1} of ${songs.length}] ${song.youtubeId}`);
            await SongMetadataService.getOrCreateDisplayMetadata(song.youtubeId);
            await SongMetadataService.getOrCreatePlaybackMetadata(song.youtubeId);
            const refreshedSong = await drizzleDB.query.songs.findFirst({
                where: (songs, { eq })=>eq(songs.youtubeId, song.youtubeId)
            });
            if (!refreshedSong) {
                logError("Song not found");
                continue;
            }
            await processSong(refreshedSong);
        } catch (e) {
            logError(e);
            failed.push(songs[i]);
        }
    }
    writeFileSync("./failed.json", JSON.stringify(failed, null, 2));
    process.exit(0);
};
main();
