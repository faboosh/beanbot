function _define_property(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
import db, { drizzleDB } from "../../../db.js";
import { cache } from "../../Cache.js";
import { downloadById, getVideoDetails } from "../platforms/youtube.js";
import { getLoudness } from "../util/ffmpeg.js";
import { getTitleData } from "../platforms/spotify/index.js";
import { songs } from "../../../schema.js";
import { eq } from "drizzle-orm";
import { logError, logMessage } from "../../log.js";
import AsyncTaskQueue from "../../queue.js";
import { existsSync } from "fs";
import { isMP4File } from "../../audioFormat.js";
class MoodGenreService {
    static async createGenre(name) {
        await db("genres").insert({
            name
        });
    }
    static async createMood(name) {
        await db("moods").insert({
            name
        });
    }
    static async createSongGenre(song_id, genre_id) {
        await db("song_genres").insert({
            song_id,
            genre_id
        });
    }
    static async createSongMood(song_id, mood_id) {
        await db("song_moods").insert({
            song_id,
            mood_id
        });
    }
}
const displayMetadataQueue = new AsyncTaskQueue();
const playbackMetadataQueue = new AsyncTaskQueue();
class SongMetadataService {
    static async inferGenre(filePath) {
        const response = await fetch(`${this.baseUrl}/infer-genre`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                filePath
            })
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    }
    static async alreadyDownloadedAndIsValid(fileName) {
        return existsSync(`${process.env.DOWNLOAD_FOLDER}/${fileName}`) && isMP4File(`${process.env.DOWNLOAD_FOLDER}/${fileName}`);
    }
    static async getOrCreatePlaybackMetadata(youtubeId) {
        // return playbackMetadataQueue.enqueue(youtubeId, async () => {
        const metadata = await this.getPlaybackMetadata(youtubeId);
        if (metadata) return metadata;
        return await this.createPlaybackMetadata(youtubeId);
    // });
    }
    static async createPlaybackMetadata(youtubeId) {
        try {
            logMessage(`Creating playback metadata for ${youtubeId}`);
            const existingData = await this.getPlaybackMetadata(youtubeId);
            const alreadyDownloaded = (existingData === null || existingData === void 0 ? void 0 : existingData.fileName) && await this.alreadyDownloadedAndIsValid(existingData.fileName);
            logMessage(alreadyDownloaded ? "Already downloaded" : "Downloading...");
            const fileName = alreadyDownloaded ? existingData.fileName : await downloadById(youtubeId);
            if (!fileName) {
                logError("Could not download");
                return null;
            }
            const hasLoudness = (existingData === null || existingData === void 0 ? void 0 : existingData.loudnessLufs) !== null;
            logMessage(hasLoudness ? "Using existing loudness" : "Calculating loudness");
            const lufs = hasLoudness ? existingData === null || existingData === void 0 ? void 0 : existingData.loudnessLufs : await getLoudness(fileName);
            const data = await drizzleDB.insert(songs).values({
                youtubeId,
                fileName,
                loudnessLufs: lufs
            }).onConflictDoUpdate({
                target: songs.youtubeId,
                set: {
                    fileName,
                    loudnessLufs: lufs
                }
            }).returning();
            return data[0];
        } catch (e) {
            logError(e);
            return null;
        }
    }
    static async getPlaybackMetadata(youtubeId) {
        var _metadata_, _metadata_1;
        const metadata = await drizzleDB.select({
            id: songs.id,
            loudnessLufs: songs.loudnessLufs,
            fileName: songs.fileName,
            lengthSeconds: songs.lengthSeconds
        }).from(songs).where(eq(songs.youtubeId, youtubeId)).execute();
        if ((metadata === null || metadata === void 0 ? void 0 : (_metadata_ = metadata[0]) === null || _metadata_ === void 0 ? void 0 : _metadata_.fileName) && await this.alreadyDownloadedAndIsValid(metadata === null || metadata === void 0 ? void 0 : (_metadata_1 = metadata[0]) === null || _metadata_1 === void 0 ? void 0 : _metadata_1.fileName)) return metadata === null || metadata === void 0 ? void 0 : metadata[0];
        return null;
    }
    static async getOrCreateDisplayMetadata(youtubeId) {
        // return displayMetadataQueue.enqueue(youtubeId, async () => {
        const metadata = await this.getDisplayMetadata(youtubeId);
        if (metadata) return metadata;
        return await this.createDisplayMetadata(youtubeId);
    // });
    }
    static async createDisplayMetadata(youtubeId) {
        try {
            logMessage(`Creating display metadata for ${youtubeId}`);
            const result = await getVideoDetails(youtubeId);
            if (!result) throw new Error("Could not download");
            const lengthSeconds = result.duration;
            const titleData = await getTitleData(youtubeId);
            var _titleData_youtubeTitle, _titleData_youtubeAuthor, _titleData_spotifyTitle, _titleData_spotifyAuthor, _titleData_youtubeTitle1, _titleData_youtubeAuthor1, _titleData_spotifyTitle1, _titleData_spotifyAuthor1;
            const data = await drizzleDB.insert(songs).values({
                youtubeId: youtubeId,
                lengthSeconds: lengthSeconds,
                youtubeTitle: (_titleData_youtubeTitle = titleData === null || titleData === void 0 ? void 0 : titleData.youtubeTitle) !== null && _titleData_youtubeTitle !== void 0 ? _titleData_youtubeTitle : "",
                youtubeAuthor: (_titleData_youtubeAuthor = titleData === null || titleData === void 0 ? void 0 : titleData.youtubeAuthor) !== null && _titleData_youtubeAuthor !== void 0 ? _titleData_youtubeAuthor : "",
                spotifyTitle: (_titleData_spotifyTitle = titleData === null || titleData === void 0 ? void 0 : titleData.spotifyTitle) !== null && _titleData_spotifyTitle !== void 0 ? _titleData_spotifyTitle : null,
                spotifyAuthor: (_titleData_spotifyAuthor = titleData === null || titleData === void 0 ? void 0 : titleData.spotifyAuthor) !== null && _titleData_spotifyAuthor !== void 0 ? _titleData_spotifyAuthor : null
            }).onConflictDoUpdate({
                target: songs.youtubeId,
                set: {
                    youtubeId: youtubeId,
                    lengthSeconds: lengthSeconds,
                    youtubeTitle: (_titleData_youtubeTitle1 = titleData === null || titleData === void 0 ? void 0 : titleData.youtubeTitle) !== null && _titleData_youtubeTitle1 !== void 0 ? _titleData_youtubeTitle1 : "",
                    youtubeAuthor: (_titleData_youtubeAuthor1 = titleData === null || titleData === void 0 ? void 0 : titleData.youtubeAuthor) !== null && _titleData_youtubeAuthor1 !== void 0 ? _titleData_youtubeAuthor1 : "",
                    spotifyTitle: (_titleData_spotifyTitle1 = titleData === null || titleData === void 0 ? void 0 : titleData.spotifyTitle) !== null && _titleData_spotifyTitle1 !== void 0 ? _titleData_spotifyTitle1 : null,
                    spotifyAuthor: (_titleData_spotifyAuthor1 = titleData === null || titleData === void 0 ? void 0 : titleData.spotifyAuthor) !== null && _titleData_spotifyAuthor1 !== void 0 ? _titleData_spotifyAuthor1 : null
                }
            }).returning();
            return data[0];
        } catch (e) {
            logError(e);
            return null;
        }
    }
    static async getDisplayMetadata(youtubeId) {
        try {
            const metadata = await drizzleDB.select({
                id: songs.id,
                youtubeId: songs.youtubeId,
                youtubeTitle: songs.youtubeTitle,
                youtubeAuthor: songs.youtubeAuthor,
                spotifyId: songs.spotifyId,
                spotifyTitle: songs.spotifyTitle,
                spotifyAuthor: songs.spotifyAuthor,
                lengthSeconds: songs.lengthSeconds
            }).from(songs).where(eq(songs.youtubeId, youtubeId)).execute();
            var _metadata_;
            return (_metadata_ = metadata === null || metadata === void 0 ? void 0 : metadata[0]) !== null && _metadata_ !== void 0 ? _metadata_ : null;
        } catch (e) {
            logError(e);
            return null;
        }
    }
    static async getTitleAuthor(youtubeId) {
        let metadata = await this.getOrCreateDisplayMetadata(youtubeId);
        if (!metadata) throw new Error("Could not get metadata");
        var _ref, _ref1;
        return {
            title: (_ref = metadata.spotifyTitle ? metadata.spotifyTitle : metadata.youtubeTitle) !== null && _ref !== void 0 ? _ref : "",
            author: (_ref1 = metadata.spotifyAuthor ? metadata.spotifyAuthor : metadata.youtubeAuthor) !== null && _ref1 !== void 0 ? _ref1 : ""
        };
    }
}
_define_property(SongMetadataService, "baseUrl", "http://localhost:5000");
_ts_decorate([
    cache("song-playback-metadata"),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], SongMetadataService, "getPlaybackMetadata", null);
_ts_decorate([
    cache("song-display-metadata"),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], SongMetadataService, "getDisplayMetadata", null);
_ts_decorate([
    cache("song-title-author"),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], SongMetadataService, "getTitleAuthor", null);
export default SongMetadataService;
