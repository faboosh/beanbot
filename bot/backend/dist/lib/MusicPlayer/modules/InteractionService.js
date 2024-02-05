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
import { drizzleDB } from "../../../db.js";
import { cache, timeConstants } from "../../Cache.js";
import { encrypt } from "../../crypto.js";
import UserDataService from "../../UserDataService.js";
import { createSkip, createPlay } from "../../../schema.js";
import SongMetadataService from "./SongMetadataService.js";
class InteractionService {
    getCacheKey() {
        return encrypt(this.guildId);
    }
    async logSkip(data) {
        if (!await UserDataService.hasConsented(data.userId)) return;
        var _data_timestamp, _data_songId;
        const payload = {
            userId: encrypt(data.userId),
            timestamp: (_data_timestamp = data.timestamp) !== null && _data_timestamp !== void 0 ? _data_timestamp : new Date(),
            guildId: encrypt(this.guildId),
            songId: (_data_songId = data.songId) !== null && _data_songId !== void 0 ? _data_songId : ""
        };
        if (data.youtubeId) {
            const metadata = await SongMetadataService.getOrCreatePlaybackMetadata(data.youtubeId);
            if (!metadata) throw new Error("Could not get metadata");
            data.songId = metadata.id;
            await createSkip(payload);
            return;
        } else if (data.songId) {
            await createSkip(payload);
            return;
        } else {
            throw new Error("Must provide either youtubeId or songId");
        }
    }
    async logPlay(data) {
        if (data.userId && !await UserDataService.hasConsented(data.userId)) return;
        var _data_timestamp, _data_imported, _data_songId;
        const payload = {
            userId: encrypt(data.userId),
            timestamp: (_data_timestamp = data.timestamp) !== null && _data_timestamp !== void 0 ? _data_timestamp : new Date(),
            imported: (_data_imported = data.imported) !== null && _data_imported !== void 0 ? _data_imported : false,
            guildId: encrypt(this.guildId),
            songId: (_data_songId = data.songId) !== null && _data_songId !== void 0 ? _data_songId : ""
        };
        if (data.youtubeId) {
            const metadata = await SongMetadataService.getOrCreatePlaybackMetadata(data.youtubeId);
            if (!metadata) throw new Error("Could not get metadata");
            data.songId = metadata.id;
            await createPlay(payload);
        } else if (data.songId) {
            await createPlay(payload);
        } else {
            throw new Error("Must provide either youtubeId or songId");
        }
    }
    async getPlays() {
        const encryptedGuildId = encrypt(this.guildId);
        const plays = await drizzleDB.query.songs.findMany({
            with: {
                skips: {
                    where: (skips, { eq })=>eq(skips.guildId, encryptedGuildId)
                },
                plays: {
                    where: (skips, { eq })=>eq(skips.guildId, encryptedGuildId)
                }
            }
        });
        return plays;
    }
    async getUserIdsWhoPlayed(youtubeId) {
        const song = await drizzleDB.query.songs.findFirst({
            where: (songs, { eq })=>eq(songs.youtubeId, youtubeId)
        });
        if (!song) throw new Error("Song not found");
        const userIds = await drizzleDB.query.plays.findMany({
            columns: {
                userId: true
            },
            where: (plays, { eq })=>eq(plays.songId, song.id)
        });
        return userIds.map((userId)=>userId.userId);
    }
    constructor(guildId){
        _define_property(this, "guildId", void 0);
        this.guildId = guildId;
    }
}
_ts_decorate([
    cache("plays", timeConstants.HOUR * 12),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], InteractionService.prototype, "getPlays", null);
_ts_decorate([
    cache("users-who-played", timeConstants.HOUR),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], InteractionService.prototype, "getUserIdsWhoPlayed", null);
export default InteractionService;
