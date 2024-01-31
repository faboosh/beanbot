import MusicPlayerState, { getOrCreatePlayerState } from "../state.js";
import ShuffleManager from "./ShuffleManager.js";
import { getThumbnail, getTopResult } from "../platforms/youtube.js";
import type VoiceConnectionManager from "./VoiceConnectionManager.js";
import type { PlaylistEntry } from "@shared/types.js";
import SongMetadataService from "./SongMetadataService.js";
import {
  searchSpotifyAndGetYoutubeId,
  spotifyPlaylistToYoutubeIds,
} from "../platforms/spotify/playlist.js";
import { encrypt } from "../../crypto.js";

const URL_IDENTIFIERS = {
  SPOTIFY_TRACK: "Spotify Track URL",
  SPOTIFY_PLAYLIST: "Spotify Playlist URL",
  YOUTUBE: "YouTube URL",
};

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

  private getNextFromPlaylist(): PlaylistEntry | undefined {
    return this.playlist.shift();
  }

  private addHistory(entry: PlaylistEntry): void {
    this.playHistory.push(entry);
    this.shuffleManager.playHistory.add(entry.id);
  }

  async getNext(): Promise<PlaylistEntry | null> {
    const nextFromPlaylist = this.getNextFromPlaylist();
    const playlistEntry =
      this.shuffle && !nextFromPlaylist
        ? await this.shuffleManager.getNext()
        : nextFromPlaylist;

    this.currentlyShuffling = nextFromPlaylist?.id !== playlistEntry?.id;

    if (playlistEntry) {
      this.addHistory(playlistEntry);
      this.currentlyPlaying = playlistEntry;
      this.playerState.setState("currentlyPlaying", this.currentlyPlaying);

      const metadata = await SongMetadataService.getOrCreateDisplayMetadata(
        playlistEntry.id
      );
      if (!metadata)
        throw new Error("Could not get metadata for " + playlistEntry.id);
      try {
        this.playerState.setState(
          "thumbnail",
          await getThumbnail(playlistEntry.id)
        );
      } catch (e) {
        console.error(e);
      }
      this.playerState.setState("currentSongMetadata", metadata);
    } else {
      this.playerState.setState("currentlyPlaying", null);
      this.playerState.setState("currentSongMetadata", null);
    }

    return playlistEntry ?? null;
  }

  setShuffle(shuffle: boolean): void {
    this.shuffle = shuffle;
  }

  getCurrentlyPlaying(): PlaylistEntry | null {
    return this.currentlyPlaying;
  }

  getPlaylist(): PlaylistEntry[] {
    return this.playlist;
  }

  async addToPlaylist(entry: PlaylistEntry | PlaylistEntry[]): Promise<void> {
    if (Array.isArray(entry)) {
      for (const playlistEntry of entry) {
        await SongMetadataService.getOrCreateDisplayMetadata(playlistEntry.id);
        this.playlist.push(playlistEntry);
        this.playerState.setState("playlist", this.playlist);
      }
    } else {
      await SongMetadataService.getOrCreateDisplayMetadata(entry.id);
      this.playlist.push(entry);
      this.playerState.setState("playlist", this.playlist);
    }
  }

  removeFromPlaylist(youtubeId: string): void {
    this.playlist = this.playlist.filter((entry) => entry.id !== youtubeId);
    this.playerState.setState("playlist", this.playlist);
  }

  getCurrentlyShuffling(): boolean {
    return this.currentlyShuffling;
  }

  getShuffleEnabled(): boolean {
    return this.shuffle;
  }

  private identifyUrl(url: string): string {
    const spotifyTrackRegex =
      /https:\/\/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/;
    const spotifyPlaylistRegex =
      /https:\/\/open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/;
    const youtubeRegex = /(http(s)?:\/\/)?((w){3}.)?youtu(be|.be)?(\.com)?\/.+/;

    switch (true) {
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

  private extractYoutubeId(query: string): string | null {
    const youtubeIdRegex =
      /(?:https?:\/\/)?(?:www\.)?youtu(?:\.be\/|be\.com\/(?:watch\?v=|embed\/|v\/|user\/(?:[\w#]+\/)+))([^&#?\n]+)/;
    const match = query.match(youtubeIdRegex);
    return match ? match[1] : null;
  }

  async queue(query: string, userId?: string) {
    let result: string[] | null = [];
    let id: string | null = null;
    switch (this.identifyUrl(query)) {
      case URL_IDENTIFIERS.SPOTIFY_TRACK:
        id = await searchSpotifyAndGetYoutubeId(query);
        if (id) result.push(id);
        break;
      case URL_IDENTIFIERS.SPOTIFY_PLAYLIST:
        result = await spotifyPlaylistToYoutubeIds(query);
        break;
      case URL_IDENTIFIERS.YOUTUBE:
        id = this.extractYoutubeId(query);
        if (id) result.push(id);
        break;
      default:
        id = (await getTopResult(query)) ?? null;
        if (id) result.push(id);
        break;
    }
    const encryptedUserId = userId ? encrypt(userId) : null;
    if (result.length > 1) {
      const first = result.shift() as string;
      await this.addToPlaylist({ id: first, userId: encryptedUserId });
      this.addToPlaylist(result.map((id) => ({ id, userId: encryptedUserId })));
    }

    return result;
  }
}

export default QueueManager;
