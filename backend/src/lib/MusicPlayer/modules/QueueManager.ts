import MusicPlayerState, { getOrCreatePlayerState } from "../state.js";
import { getOrCreateMetadata } from "../util/metadata.js";
import ShuffleManager from "./ShuffleManager.js";
import { downloadById } from "../platforms/youtube.js";
import type VoiceConnectionManager from "./VoiceConnectionManager.js";
import type { PlaylistEntry } from "@shared/types.js";
import { stringify } from "querystring";

class QueueManager {
  private shuffleManager: ShuffleManager;
  private shuffle = true;
  private playlist: PlaylistEntry[] = [];
  private currentlyPlaying: PlaylistEntry | null = null;
  private currentlyShuffling = false;
  private playHistory: PlaylistEntry[] = [];
  private playerState: MusicPlayerState;

  constructor(voiceConnectionManager: VoiceConnectionManager) {
    this.shuffleManager = new ShuffleManager(voiceConnectionManager);
    this.playerState = getOrCreatePlayerState(
      voiceConnectionManager.getGuild().id
    );
  }

  private getNextFromPlaylist() {
    const next = this.playlist.shift();
    return next;
  }

  private addHistory(entry: PlaylistEntry) {
    this.playHistory.push(entry);
    this.shuffleManager.playHistory.add(entry.id);
  }

  async getNext() {
    const nextFromPlaylist = this.getNextFromPlaylist();
    const playlistEntry =
      this.shuffle && !nextFromPlaylist
        ? await this.shuffleManager.getNext()
        : nextFromPlaylist;

    this.currentlyShuffling = nextFromPlaylist !== playlistEntry;

    if (playlistEntry) {
      this.addHistory(playlistEntry);
      this.currentlyPlaying = playlistEntry;
      this.playerState.setState("currentlyPlaying", this.currentlyPlaying);

      getOrCreateMetadata(playlistEntry.id).then(async (metadata) => {
        try {
          const youtubeData = await downloadById(playlistEntry.id);
          this.playerState.setState(
            "thumbnail",
            youtubeData?.details.thumbnail[0].url ?? ""
          );
        } catch (e) {
          console.error(e);
        }
        this.playerState.setState("currentSongMetadata", metadata);
      });
    } else {
      this.playerState.setState("currentlyPlaying", null);
      this.playerState.setState("currentSongMetadata", null);
    }

    return playlistEntry ?? null;
  }

  setShuffle(shuffle: boolean) {
    this.shuffle = shuffle;
  }

  getCurrentlyPlaying() {
    return this.currentlyPlaying;
  }

  getPlaylist() {
    return this.playlist;
  }

  addToPlaylist(entry: PlaylistEntry) {
    this.playlist.push(entry);
    this.playerState.setState("playlist", this.playlist);
  }

  removeFromPlaylist(youtubeId: string) {
    this.playlist = this.playlist.filter((entry) => entry.id !== youtubeId);
    this.playerState.setState("playlist", this.playlist);
  }

  getCurrentlyShuffling() {
    return this.currentlyShuffling;
  }

  getShuffleEnabled() {
    return this.shuffle;
  }
}

export default QueueManager;
