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
import { getThumbnail } from "./platforms/youtube.js";
import InteractionService from "./modules/InteractionService.js";
import PlaybackController from "./modules/PlaybackController.js";
import VoiceConnectionManager from "./modules/VoiceConnectionManager.js";
import AudioResourceManager from "./modules/AudioResourceManager.js";
import QueueManager from "./modules/QueueManager.js";
import { generatePlayingCard } from "./util/canvas/canvas.js";
import { decryptIfEncrypted } from "../crypto.js";
import SongMetadataService from "./modules/SongMetadataService.js";
import { cache } from "../Cache.js";
import { log, logError, logMessage } from "../log.js";
class MusicPlayer {
    async checkMembersConnected() {
        const userIds = await this.voiceConnectionManager.getCurrentVoiceMembers();
        if (!userIds.length) {
            this.disconnect();
        }
    }
    async playNext() {
        await this.voiceConnectionManager.ensureConnected();
        const playlistEntry = await this.queueManager.getNext();
        if (!playlistEntry) return this.pause();
        try {
            const audioResource = await AudioResourceManager.createAudioResource(playlistEntry.id);
            if (!audioResource) throw new Error("Could not create audio resource");
            this.playbackController.play(audioResource);
            return playlistEntry;
        } catch (e) {
            logError(e);
            return null;
        }
    }
    getCurrentlyPlaying() {
        return this.queueManager.getCurrentlyPlaying();
    }
    async queueBySearch(query, userId) {
        const currentlyPlaying = this.getCurrentlyPlaying();
        const currentlyShuffling = this.queueManager.getCurrentlyShuffling();
        const result = await this.queueManager.queue(query, userId);
        if (!result || Array.isArray(result) && result.length === 0) {
            return {
                title: "No results"
            };
        }
        if (!currentlyPlaying || currentlyShuffling) await this.playNext();
        let title;
        let author;
        let thumbnail;
        const firstResult = result[0];
        const metadata = await SongMetadataService.getTitleAuthor(firstResult);
        title = metadata.title;
        author = metadata.author;
        thumbnail = await getThumbnail(firstResult);
        await Promise.all(result.map((id)=>this.interactionService.logPlay({
                youtubeId: id,
                userId: userId
            })));
        return {
            title: `Queueing ${author} - ${title}`,
            description: `Searched for ${query}`,
            thumbnail: thumbnail
        };
    }
    async queueById(youtubeId, userId) {
        AudioResourceManager.createAudioResource(youtubeId).then((audioResource)=>logMessage(`created audio resource for "${youtubeId}"`, audioResource)).catch((err)=>logError(`failed audio resource for "${youtubeId}"`, err));
        await this.queueManager.addToPlaylist({
            id: youtubeId,
            userId: userId
        });
        this.interactionService.logPlay({
            youtubeId,
            userId
        });
    }
    async removeFromQueue(youtubeId) {
        this.queueManager.removeFromPlaylist(youtubeId);
    }
    async skip(userId) {
        let currentlyPlaying = this.getCurrentlyPlaying();
        if (currentlyPlaying) {
            try {
                await this.interactionService.logSkip({
                    youtubeId: currentlyPlaying.id,
                    userId: userId
                });
            } catch (e) {
                logError(`Error logging skip: `, e);
            }
        }
        await this.playNext();
        currentlyPlaying = this.getCurrentlyPlaying();
        if (!currentlyPlaying) return {
            title: "Failed to get next song"
        };
        const { title, author } = await SongMetadataService.getTitleAuthor(currentlyPlaying.id);
        return {
            title: "Skipping",
            fields: [
                {
                    name: "Up next",
                    value: `${author} - ${title}`
                }
            ],
            thumbnail: await getThumbnail(currentlyPlaying.id)
        };
    }
    pause() {
        this.playbackController.pause();
    }
    unpause() {
        this.playbackController.unpause();
    }
    setShuffle(shuffle) {
        this.queueManager.setShuffle(shuffle);
    }
    async nowPlaying() {
        const currentlyPlaying = this.getCurrentlyPlaying();
        if (!currentlyPlaying) {
            return {
                title: `Nothing is currently playing!`
            };
        }
        try {
            const secondsElapsed = this.playbackController.getSecondsSinceStartedPlaying();
            const playingCardPath = await generatePlayingCard(currentlyPlaying.id, secondsElapsed).catch((err)=>{
                throw err;
            });
            return {
                image: playingCardPath
            };
        } catch (e) {
            logError(e);
            return {
                title: `Something went wrong: ${e.message}`
            };
        }
    }
    async blame() {
        const currentlyPlaying = this.getCurrentlyPlaying();
        try {
            if (!currentlyPlaying) return {
                title: "Nothing playing right now!",
                description: "You're all to blame for the deafening silence"
            };
            const userIds = await this.interactionService.getUserIdsWhoPlayed(currentlyPlaying.id);
            if (!userIds[0]) throw new Error("No results, this should never happen");
            const { title, author } = await SongMetadataService.getTitleAuthor(currentlyPlaying.id);
            return {
                title: "How did we end up here?",
                description: `"${author} - ${title}" has been played by ${userIds.map((id)=>`<@${id}>`).join(", ")}`,
                thumbnail: await getThumbnail(currentlyPlaying.id)
            };
        } catch (e) {
            logError(e);
            return {
                title: "Something bwoke UwU"
            };
        }
    }
    async getUsersWhoPlayed(youtubeId) {
        try {
            const userIds = await this.interactionService.getUserIdsWhoPlayed(youtubeId);
            if (!userIds[0]) throw new Error("No results, this should never happen");
            return await Promise.all(userIds.map(async (id)=>{
                return await this.guild.client.users.fetch(decryptIfEncrypted(id));
            }));
        } catch (e) {
            logError(e);
            return [];
        }
    }
    async getUserDetails(id) {
        try {
            return await this.guild.client.users.fetch(decryptIfEncrypted(id));
        } catch (e) {
            logError(e);
            return null;
        }
    }
    async stats() {
        const MAX_CHARS = 2000;
        const plays = await this.interactionService.getPlays();
        const sorted = plays.sort((s1, s2)=>s2.plays.length - s1.plays.length);
        const reply = [
            ...sorted.map((song, i)=>{
                return `${i + 1}. ${song.youtubeTitle} (${song.plays.length} plays)`;
            })
        ];
        for(let i = 0; i < sorted.length; i++){
            const song = sorted[i];
            if (!song) continue;
            const finalString = `${i + 1}. ${song.youtubeTitle} (${song.plays.length} plays)\n`;
            if (reply.join("\n").length + reply.length + finalString.length + 1 >= MAX_CHARS) break;
            reply.push(finalString);
        }
        return {
            title: `Top songs for ${this.guild.name}`,
            description: reply.join("\n").slice(0, MAX_CHARS)
        };
    }
    getPlaying() {
        return this.playbackController.playing;
    }
    disconnect() {
        try {
            clearInterval(this.disconnectInterval);
            destroyPlayer(this.voiceConnectionManager.getGuild());
        } catch (e) {
            logError(e);
        }
    }
    getShuffleEnabled() {
        return this.queueManager.getShuffleEnabled();
    }
    getChannelId() {
        return this.channelId;
    }
    constructor(guild, channelId){
        _define_property(this, "guild", void 0);
        _define_property(this, "channelId", void 0);
        _define_property(this, "interactionService", void 0);
        _define_property(this, "playbackController", void 0);
        _define_property(this, "voiceConnectionManager", void 0);
        _define_property(this, "queueManager", void 0);
        _define_property(this, "disconnectInterval", void 0);
        this.guild = guild;
        this.channelId = channelId;
        this.interactionService = new InteractionService(this.guild.id);
        this.voiceConnectionManager = new VoiceConnectionManager(this.guild, this.channelId);
        this.playbackController = new PlaybackController(this.guild.id);
        this.queueManager = new QueueManager(this.voiceConnectionManager);
        this.voiceConnectionManager.onConnectedStatusChanged((connected)=>{
            if (connected) this.playbackController.connect(this.voiceConnectionManager.getVoiceConnection());
        });
        this.playbackController.onLongIdle(()=>{
            this.playNext();
        });
        this.disconnectInterval = setInterval(()=>{
            this.checkMembersConnected();
        }, 60 * 1000);
    }
}
_ts_decorate([
    log,
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], MusicPlayer.prototype, "queueBySearch", null);
_ts_decorate([
    cache("users-who-played"),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], MusicPlayer.prototype, "getUsersWhoPlayed", null);
_ts_decorate([
    cache("user-details"),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], MusicPlayer.prototype, "getUserDetails", null);
const players = new Map();
const getOrCreatePlayer = (guild, voiceId)=>{
    const key = guild.id;
    if (!players.get(key)) players.set(key, new MusicPlayer(guild, voiceId));
    return players.get(key);
};
const getPlayer = (guildId)=>{
    const key = guildId;
    return players.get(key);
};
const destroyPlayer = (guild)=>{
    const key = guild.id;
    const player = players.get(key);
    if (player) player.disconnect();
    players.delete(key);
};
export default MusicPlayer;
export { getOrCreatePlayer, destroyPlayer, getPlayer };
