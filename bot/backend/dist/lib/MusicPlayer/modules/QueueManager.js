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
import { PublishStateChange, getOrCreatePlayerState } from "../state.js";
import ShuffleManager from "./ShuffleManager.js";
import { getThumbnail, getTopResult } from "../platforms/youtube.js";
import SongMetadataService from "./SongMetadataService.js";
import { searchSpotifyAndGetYoutubeId, spotifyPlaylistToYoutubeIds } from "../platforms/spotify/playlist.js";
import { encrypt } from "../../crypto.js";
import { log, logError, logMessage } from "../../log.js";
const URL_IDENTIFIERS = {
    SPOTIFY_TRACK: "Spotify Track URL",
    SPOTIFY_PLAYLIST: "Spotify Playlist URL",
    YOUTUBE: "YouTube URL"
};
class QueueManager {
    getNextFromPlaylist() {
        return this.playlist.shift();
    }
    addHistory(entry) {
        this.playHistory.push(entry);
        this.shuffleManager.playHistory.add(entry.id);
    }
    async getNext() {
        const nextFromPlaylist = this.getNextFromPlaylist();
        const playlistEntry = this.shuffle && !nextFromPlaylist ? await this.shuffleManager.getNext() : nextFromPlaylist;
        this.currentlyShuffling = (nextFromPlaylist === null || nextFromPlaylist === void 0 ? void 0 : nextFromPlaylist.id) !== (playlistEntry === null || playlistEntry === void 0 ? void 0 : playlistEntry.id);
        if (playlistEntry) {
            this.addHistory(playlistEntry);
            this.currentlyPlaying = playlistEntry;
            const metadata = await SongMetadataService.getOrCreateDisplayMetadata(playlistEntry.id);
            if (!metadata) throw new Error("Could not get metadata for " + playlistEntry.id);
            try {
                this.currentSongThumbnail = await getThumbnail(playlistEntry.id);
            } catch (e) {
                logError(e);
            }
            this.currentSongMetadata = metadata;
        } else {
            this.currentSongMetadata = null;
            this.currentlyPlaying = null;
        }
        return playlistEntry !== null && playlistEntry !== void 0 ? playlistEntry : null;
    }
    setShuffle(shuffle) {
        this.shuffle = shuffle;
    }
    getCurrentlyPlaying() {
        return this.currentlyPlaying;
    }
    getPlaylist() {
        return this.playlist;
    }
    async addToPlaylist(entry) {
        if (Array.isArray(entry)) {
            for (const playlistEntry of entry){
                await SongMetadataService.getOrCreateDisplayMetadata(playlistEntry.id);
                this.playlist.push(playlistEntry);
                this.playlist = [
                    ...this.playlist,
                    playlistEntry
                ];
            }
        } else {
            await SongMetadataService.getOrCreateDisplayMetadata(entry.id);
            this.playlist = [
                ...this.playlist,
                entry
            ];
        }
    }
    removeFromPlaylist(youtubeId) {
        this.playlist = this.playlist.filter((entry)=>entry.id !== youtubeId);
    }
    getCurrentlyShuffling() {
        return this.currentlyShuffling;
    }
    getShuffleEnabled() {
        return this.shuffle;
    }
    getCurrentSongMetadata() {
        return this.currentSongMetadata;
    }
    getCurrentSongThumbnail() {
        return this.currentSongThumbnail;
    }
    identifyUrl(url) {
        const spotifyTrackRegex = /https:\/\/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/;
        const spotifyPlaylistRegex = /https:\/\/open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/;
        const youtubeRegex = /(http(s)?:\/\/)?((w){3}.)?youtu(be|.be)?(\.com)?\/.+/;
        switch(true){
            case spotifyTrackRegex.test(url):
                return URL_IDENTIFIERS.SPOTIFY_TRACK;
            case spotifyPlaylistRegex.test(url):
                return URL_IDENTIFIERS.SPOTIFY_PLAYLIST;
            case youtubeRegex.test(url):
                return URL_IDENTIFIERS.YOUTUBE;
            default:
                return "Unknown URL";
        }
    }
    extractYoutubeId(query) {
        const youtubeIdRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
        const match = query.match(youtubeIdRegex);
        console.log(match && [
            ...match
        ]);
        return match ? match[1] : null;
    }
    async queryToYoutubeIds(query) {
        let result = [];
        let id = null;
        const sourceType = this.identifyUrl(query);
        switch(sourceType){
            case URL_IDENTIFIERS.SPOTIFY_TRACK:
                id = await searchSpotifyAndGetYoutubeId(query);
                logMessage("SPOTIFY TRACK", id);
                if (id) result.push(id);
                break;
            case URL_IDENTIFIERS.SPOTIFY_PLAYLIST:
                result = await spotifyPlaylistToYoutubeIds(query);
                logMessage("SPOTIFY PLAYLIST", result);
                break;
            case URL_IDENTIFIERS.YOUTUBE:
                id = this.extractYoutubeId(query);
                logMessage("YOUTUBE", id);
                if (id) result.push(id);
                break;
            default:
                var _ref;
                id = (_ref = await getTopResult(query)) !== null && _ref !== void 0 ? _ref : null;
                logMessage("QUERY", id);
                if (id) result.push(id);
                break;
        }
        return result;
    }
    async queue(query, userId) {
        try {
            const result = await this.queryToYoutubeIds(query);
            const encryptedUserId = userId ? encrypt(userId) : null;
            if (result.length > 1) {
                const first = result.shift();
                await this.addToPlaylist({
                    id: first,
                    userId: encryptedUserId
                });
                this.addToPlaylist(result.map((id)=>({
                        id,
                        userId: encryptedUserId
                    })));
            } else if (result.length) {
                await this.addToPlaylist({
                    id: result[0],
                    userId: encryptedUserId
                });
            }
            return result;
        } catch (e) {
            logError("Error adding to queue based on query", query, e);
            return [];
        }
    }
    constructor(voiceConnectionManager){
        _define_property(this, "shuffleManager", void 0);
        _define_property(this, "shuffle", true);
        _define_property(this, "playlist", []);
        _define_property(this, "currentlyPlaying", null);
        _define_property(this, "currentSongMetadata", null);
        _define_property(this, "currentSongThumbnail", "");
        _define_property(this, "currentlyShuffling", false);
        _define_property(this, "playHistory", []);
        _define_property(this, "playerState", void 0);
        this.shuffleManager = new ShuffleManager(voiceConnectionManager);
        this.playerState = getOrCreatePlayerState(voiceConnectionManager.getGuild().id);
    }
}
_ts_decorate([
    PublishStateChange("playlist"),
    _ts_metadata("design:type", Array)
], QueueManager.prototype, "playlist", void 0);
_ts_decorate([
    PublishStateChange("currentlyPlaying"),
    _ts_metadata("design:type", Object)
], QueueManager.prototype, "currentlyPlaying", void 0);
_ts_decorate([
    PublishStateChange("currentSongMetadata"),
    _ts_metadata("design:type", Object)
], QueueManager.prototype, "currentSongMetadata", void 0);
_ts_decorate([
    PublishStateChange("thumbnail"),
    _ts_metadata("design:type", String)
], QueueManager.prototype, "currentSongThumbnail", void 0);
_ts_decorate([
    log,
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], QueueManager.prototype, "getNext", null);
_ts_decorate([
    log,
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], QueueManager.prototype, "addToPlaylist", null);
_ts_decorate([
    log,
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", String)
], QueueManager.prototype, "identifyUrl", null);
_ts_decorate([
    log,
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Object)
], QueueManager.prototype, "extractYoutubeId", null);
_ts_decorate([
    log,
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], QueueManager.prototype, "queue", null);
export default QueueManager;
