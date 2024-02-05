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
import { AudioPlayerStatus, createAudioPlayer } from "@discordjs/voice";
import { PublishStateChange, getOrCreatePlayerState } from "../state.js";
class PlaybackController {
    setupPlayerEvents() {
        this.player.on(AudioPlayerStatus.Idle, ()=>{
            clearTimeout(this.idleTimeout);
            this.idleTimeout = setTimeout(()=>{
                if (this.longIdleCallback) this.longIdleCallback();
            }, this.IDLE_TIMEOUT_WAIT_MS);
        });
        this.player.on(AudioPlayerStatus.Playing, ()=>this.setPlayingChanged(true));
        this.player.on(AudioPlayerStatus.Paused, ()=>this.setPlayingChanged(false));
        this.player.on(AudioPlayerStatus.Idle, ()=>this.setPlayingChanged(false));
        this.player.on(AudioPlayerStatus.AutoPaused, ()=>this.setPlayingChanged(false));
    }
    setPlayingChanged(playingStatus) {
        this.playing = playingStatus;
        if (this.playingStatusChangedCallback) this.playingStatusChangedCallback(playingStatus);
    }
    onPlayingStatusChanged(callback) {
        this.playingStatusChangedCallback = callback;
    }
    onLongIdle(callback) {
        this.longIdleCallback = callback;
    }
    pause() {
        this.player.pause();
    }
    unpause() {
        this.player.unpause();
    }
    play(audioResource) {
        this.startedPlayingAtTs = Date.now();
        this.player.play(audioResource);
    }
    connect(voiceConnection) {
        if (!this.connected && voiceConnection) {
            voiceConnection.subscribe(this.player);
            this.connected = true;
        }
    }
    getStartedPlayingAt() {
        return this.startedPlayingAtTs;
    }
    getSecondsSinceStartedPlaying() {
        return Math.round((Date.now() - this.startedPlayingAtTs) / 1000);
    }
    constructor(guildId){
        _define_property(this, "guildId", void 0);
        _define_property(this, "player", createAudioPlayer());
        _define_property(this, "idleTimeout", 0);
        _define_property(this, "IDLE_TIMEOUT_WAIT_MS", 1000);
        _define_property(this, "playing", false);
        _define_property(this, "connected", false);
        _define_property(this, "startedPlayingAtTs", 0);
        _define_property(this, "playerState", void 0);
        _define_property(this, "playingStatusChangedCallback", void 0);
        _define_property(this, "longIdleCallback", void 0);
        this.guildId = guildId;
        this.playerState = getOrCreatePlayerState(guildId);
        this.setupPlayerEvents();
    }
}
_ts_decorate([
    PublishStateChange("playing")
], PlaybackController.prototype, "playing", void 0);
_ts_decorate([
    PublishStateChange("currentSongStartedAtTs"),
    _ts_metadata("design:type", Number)
], PlaybackController.prototype, "startedPlayingAtTs", void 0);
export default PlaybackController;
