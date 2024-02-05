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
import PlayHistory from "./PlayHistory.js";
import AudioResourceManager from "./AudioResourceManager.js";
import { encrypt } from "../../crypto.js";
import InteractionService from "./InteractionService.js";
import perf from "../../perf.js";
import { log, logError, logMessage } from "../../log.js";
class ShuffleManager {
    getCacheKey() {
        return encrypt(this.voiceConnectionManager.getGuild().id);
    }
    async getCurrentVoiceMembers() {
        return (await this.voiceConnectionManager.getCurrentVoiceMembers()).map(encrypt);
    }
    async getPlays() {
        return this.interactionService.getPlays();
    }
    filterNotRecentlyPlayed(entries) {
        const filteredEntries = entries.filter((play)=>{
            return !this.playHistory.isInHistory(play.youtubeId);
        });
        return filteredEntries;
    }
    async filterNotInVoiceChannel(entries) {
        const userIds = await this.getCurrentVoiceMembers();
        const filteredEntries = entries.filter((song)=>{
            return song.plays.some(({ userId })=>userIds.includes(userId));
        });
        return filteredEntries;
    }
    filterTooLongOrShort(entries) {
        const filteredEntries = entries.filter((play)=>{
            if (play.lengthSeconds === null) return true;
            return play.lengthSeconds > this.MIN_SONG_LEN_SECONDS && play.lengthSeconds < this.MAX_SONG_LEN_SECONDS;
        });
        return filteredEntries;
    }
    weightByNumMembersPlayedCount(entries) {
        for(let i = 0; i < entries.length; i++){
            const entry = entries[i];
            entry.weight.push({
                val: entry.song.plays.length * this.NUM_MEMBERS_PLAYED_MULTIPLIER,
                key: "number of members played"
            });
        }
        return entries;
    }
    weightByPopularityOverTime(entries) {
        const now = Date.now();
        const oneYear = 365 * 24 * 60 * 60 * 1000;
        const oneMonthMs = Math.round(oneYear / 12);
        for(let i = 0; i < entries.length; i++){
            const entry = entries[i];
            const inMonths = [];
            for(let i = 0; i < entry.song.plays.length; i++){
                const timestamp = entry.song.plays[i].timestamp;
                const timeAgo = now - timestamp.getTime();
                const monthsAgo = Math.floor(timeAgo / oneMonthMs);
                if (!inMonths.includes(monthsAgo)) inMonths.push(monthsAgo);
            }
            entry.weight.push({
                val: inMonths.length * this.POPULARITY_OVER_TIME_MULTIPLIER,
                key: "popularity over time"
            });
        }
        return entries;
    }
    weightBySongLength(entries) {
        function linearFalloff(value, min, middle, max) {
            if (value <= min || value >= max) {
                return 0;
            } else if (value === middle) {
                return 1;
            } else if (value < middle) {
                return (value - min) / (middle - min);
            } else {
                return (max - value) / (max - middle);
            }
        }
        for(let i = 0; i < entries.length; i++){
            const entry = entries[i];
            if (entry.song.lengthSeconds === null) continue;
            const multiplier = linearFalloff(entry.song.lengthSeconds, this.MIN_SONG_LEN_SECONDS, this.IDEAL_SONG_LEN_SECONDS, this.MAX_SONG_LEN_SECONDS);
            entry.weight.push({
                val: Math.round(multiplier * this.IDEAL_SONG_LEN_MULTIPLIER),
                key: "song length"
            });
        }
        return entries;
    }
    computeNextAndCache() {
        this.computeNext().then((nextId)=>{
            this.nextId = nextId;
            if (nextId) {
                AudioResourceManager.createAudioResource(nextId).then(()=>logMessage(`Created audio resource for "${nextId}"`)).catch((e)=>logError(`Failed to create audio resource for "${nextId}"`, e));
            }
        });
    }
    async getNext() {
        if (this.nextId) {
            const nextId = this.nextId;
            this.nextId = null;
            this.computeNextAndCache();
            return {
                id: nextId,
                userId: null
            };
        }
        const next = await this.computeNext();
        this.computeNextAndCache();
        return {
            id: String(next),
            userId: null
        };
    }
    async computeNext() {
        try {
            const plays = await this.getPlays();
            let filteredPlays = this.filterNotRecentlyPlayed(plays);
            filteredPlays = this.filterTooLongOrShort(filteredPlays);
            filteredPlays = await this.filterNotInVoiceChannel(filteredPlays);
            let weightedPlays = filteredPlays.map((song)=>{
                return {
                    weight: [],
                    song
                };
            });
            weightedPlays = this.weightByNumMembersPlayedCount(weightedPlays);
            weightedPlays = this.weightByPopularityOverTime(weightedPlays);
            weightedPlays = this.weightBySongLength(weightedPlays);
            const weightsArr = weightedPlays.flatMap((entry)=>Array(entry.weight.reduce((acc, val)=>acc + val.val, 0)).fill(null).map(()=>entry.song.youtubeId));
            const nextId = weightsArr[Math.round(Math.random() * (weightsArr.length - 1))];
            if (!nextId) return null;
            return nextId;
        } catch (e) {
            logError(e);
            return null;
        }
    }
    addHistory(youtubeId) {
        this.playHistory.add(youtubeId);
    }
    constructor(voiceConnectionManager){
        _define_property(this, "playHistory", void 0);
        _define_property(this, "voiceConnectionManager", void 0);
        _define_property(this, "interactionService", void 0);
        _define_property(this, "MIN_SONG_LEN_SECONDS", 60 * 1);
        _define_property(this, "IDEAL_SONG_LEN_SECONDS", 60 * 4.5);
        _define_property(this, "MAX_SONG_LEN_SECONDS", 60 * 15);
        _define_property(this, "NUM_MEMBERS_PLAYED_MULTIPLIER", 4);
        _define_property(this, "POPULARITY_OVER_TIME_MULTIPLIER", 4);
        _define_property(this, "IDEAL_SONG_LEN_MULTIPLIER", 10);
        _define_property(this, "nextId", null);
        this.voiceConnectionManager = voiceConnectionManager;
        this.playHistory = new PlayHistory(this.voiceConnectionManager.getGuild());
        this.interactionService = new InteractionService(this.voiceConnectionManager.getGuild().id);
        this.getCurrentVoiceMembers();
        this.computeNextAndCache();
    }
}
_ts_decorate([
    perf,
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Array
    ]),
    _ts_metadata("design:returntype", void 0)
], ShuffleManager.prototype, "filterNotRecentlyPlayed", null);
_ts_decorate([
    perf,
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Array
    ]),
    _ts_metadata("design:returntype", Promise)
], ShuffleManager.prototype, "filterNotInVoiceChannel", null);
_ts_decorate([
    perf,
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Array
    ]),
    _ts_metadata("design:returntype", void 0)
], ShuffleManager.prototype, "filterTooLongOrShort", null);
_ts_decorate([
    perf,
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Array
    ]),
    _ts_metadata("design:returntype", void 0)
], ShuffleManager.prototype, "weightByNumMembersPlayedCount", null);
_ts_decorate([
    perf,
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Array
    ]),
    _ts_metadata("design:returntype", void 0)
], ShuffleManager.prototype, "weightByPopularityOverTime", null);
_ts_decorate([
    perf,
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Array
    ]),
    _ts_metadata("design:returntype", void 0)
], ShuffleManager.prototype, "weightBySongLength", null);
_ts_decorate([
    log,
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], ShuffleManager.prototype, "getNext", null);
_ts_decorate([
    log,
    perf,
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], ShuffleManager.prototype, "computeNext", null);
export default ShuffleManager;
