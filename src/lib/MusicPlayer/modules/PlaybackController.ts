import {
  AudioPlayer,
  AudioPlayerStatus,
  AudioResource,
  VoiceConnection,
  createAudioPlayer,
} from "@discordjs/voice";

class PlaybackController {
  player: AudioPlayer = createAudioPlayer();
  idleTimeout: any = 0;
  IDLE_TIMEOUT_WAIT_MS = 1000;
  playing = false;
  connected = false;
  private startedPlayingAtTs: number = 0;
  playingStatusChangedCallback?: (playingStatus: boolean) => void;
  longIdleCallback?: () => void;

  constructor() {
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
}

export default PlaybackController;
