import { Guild } from "discord.js";
import MusicPlayerState, { getOrCreatePlayerState } from "../state.js";
import { getOrCreateMetadata } from "../util/metadata.js";
import ShuffleManager from "./ShuffleManager.js";
import { downloadById } from "../platforms/youtube.js";

class QueueManager {
  private shuffleManager: ShuffleManager;
  private shuffle = true;
  private playlist: string[] = [];
  private currentlyPlaying: string | null = null;
  private currentlyShuffling = false;
  private playHistory: string[] = [];
  private playerState: MusicPlayerState;

  constructor(guild: Guild, channelId: string) {
    this.shuffleManager = new ShuffleManager(guild, channelId);
    this.playerState = getOrCreatePlayerState(guild.id);
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
      this.playerState.setState("currentlyPlaying", this.currentlyPlaying);

      getOrCreateMetadata(playlistEntry).then(async (metadata) => {
        try {
          const youtubeData = await downloadById(playlistEntry);
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

  addToPlaylist(youtubeId: string) {
    this.playlist.push(youtubeId);
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
