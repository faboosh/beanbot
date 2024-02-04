import {
  AudioPlayer,
  AudioPlayerStatus,
  AudioResource,
  VoiceConnection,
  createAudioPlayer,
} from "@discordjs/voice";
import MusicPlayerState, {
  PublishStateChange,
  getOrCreatePlayerState,
} from "../state.js";

class PlaybackController {
  guildId: string;
  player: AudioPlayer = createAudioPlayer();
  idleTimeout: any = 0;
  IDLE_TIMEOUT_WAIT_MS = 1000;
  @PublishStateChange("playing")
  playing = false;
  connected = false;
  @PublishStateChange("currentSongStartedAtTs")
  private startedPlayingAtTs: number = 0;
  playerState: MusicPlayerState;
  playingStatusChangedCallback?: (playingStatus: boolean) => void;
  longIdleCallback?: () => void;

  constructor(guildId: string) {
    this.guildId = guildId;
    this.playerState = getOrCreatePlayerState(guildId);
    this.setupPlayerEvents();
  }

  private setupPlayerEvents() {
    this.player.on(AudioPlayerStatus.Idle, () => {
      clearTimeout(this.idleTimeout);
      this.idleTimeout = setTimeout(() => {
        if (this.longIdleCallback) this.longIdleCallback();
      }, this.IDLE_TIMEOUT_WAIT_MS);
    });
    this.player.on(AudioPlayerStatus.Playing, () =>
      this.setPlayingChanged(true)
    );
    this.player.on(AudioPlayerStatus.Paused, () =>
      this.setPlayingChanged(false)
    );
    this.player.on(AudioPlayerStatus.Idle, () => this.setPlayingChanged(false));
    this.player.on(AudioPlayerStatus.AutoPaused, () =>
      this.setPlayingChanged(false)
    );
  }

  private setPlayingChanged(playingStatus: boolean) {
    this.playing = playingStatus;
    if (this.playingStatusChangedCallback)
      this.playingStatusChangedCallback(playingStatus);
  }

  onPlayingStatusChanged(callback: (playingStatus: boolean) => void) {
    this.playingStatusChangedCallback = callback;
  }

  onLongIdle(callback: () => void) {
    this.longIdleCallback = callback;
  }

  pause() {
    this.player.pause();
  }

  unpause() {
    this.player.unpause();
  }

  play(audioResource: AudioResource) {
    this.startedPlayingAtTs = Date.now();
    this.player.play(audioResource);
  }

  connect(voiceConnection?: VoiceConnection) {
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
}

export default PlaybackController;
