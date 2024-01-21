import ShuffleManager from "./ShuffleManager";
import { Guild } from "discord.js";

class QueueManager {
  private shuffleManager: ShuffleManager;
  private shuffle = true;
  private playlist: string[] = [];
  private currentlyPlaying: string | null = null;
  private currentlyShuffling = false;
  private playHistory: string[] = [];

  constructor(guild: Guild, channelId: string) {
    this.shuffleManager = new ShuffleManager(guild, channelId);
  }

  private getNextFromPlaylist() {
    const next = this.playlist.shift();
    return next;
  }

  private addHistory(youtubeId: string) {
    this.playHistory.push(youtubeId);
    this.shuffleManager.playHistory.add(youtubeId);
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

  addToPlaylist(youtubeId: string) {
    this.playlist.push(youtubeId);
  }

  getCurrentlyShuffling() {
    return this.currentlyShuffling;
  }

  getShuffleEnabled() {
    return this.shuffle;
  }
}

export default QueueManager;
