import MusicPlayerState, {
  PublishStateChange,
  getOrCreatePlayerState,
} from "../state.js";
import ShuffleManager from "./ShuffleManager.js";
import { getThumbnail, getTopResult } from "../platforms/youtube.js";
import type VoiceConnectionManager from "./VoiceConnectionManager.js";
import type { PlaylistEntry, SongDisplayMetadata } from "@shared/types.js";
import SongMetadataService from "./SongMetadataService.js";
import {
  searchSpotifyAndGetYoutubeId,
  spotifyPlaylistToYoutubeIds,
} from "../platforms/spotify/playlist.js";
import { encrypt } from "../../crypto.js";
import { log, logError, logMessage } from "../../log.js";

const URL_IDENTIFIERS = {
  SPOTIFY_TRACK: "Spotify Track URL",
  SPOTIFY_PLAYLIST: "Spotify Playlist URL",
  YOUTUBE: "YouTube URL",
};

class QueueManager {
  private shuffleManager: ShuffleManager;
  private shuffle = true;
  @PublishStateChange("playlist")
  private playlist: PlaylistEntry[] = [];
  @PublishStateChange("currentlyPlaying")
  private currentlyPlaying: PlaylistEntry | null = null;
  @PublishStateChange("currentSongMetadata")
  private currentSongMetadata: SongDisplayMetadata | null = null;
  @PublishStateChange("thumbnail")
  private currentSongThumbnail: string = "";
  private currentlyShuffling = false;
  private playHistory: PlaylistEntry[] = [];
  playerState: MusicPlayerState;

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

  @log
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

      const metadata = await SongMetadataService.getOrCreateDisplayMetadata(
        playlistEntry.id
      );
      if (!metadata)
        throw new Error("Could not get metadata for " + playlistEntry.id);
      try {
        this.currentSongThumbnail = await getThumbnail(playlistEntry.id);
      } catch (e) {
        logError(e);
      }
      this.currentSongMetadata = metadata;
    } else {
      this.currentSongMetadata = null;
      this.currentlyPlaying = null;
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

  @log
  async addToPlaylist(entry: PlaylistEntry | PlaylistEntry[]): Promise<void> {
    if (Array.isArray(entry)) {
      for (const playlistEntry of entry) {
        await SongMetadataService.getOrCreateDisplayMetadata(playlistEntry.id);
        this.playlist.push(playlistEntry);
        this.playlist = [...this.playlist, playlistEntry];
      }
    } else {
      await SongMetadataService.getOrCreateDisplayMetadata(entry.id);
      this.playlist = [...this.playlist, entry];
    }
  }

  removeFromPlaylist(youtubeId: string): void {
    this.playlist = this.playlist.filter((entry) => entry.id !== youtubeId);
  }

  getCurrentlyShuffling(): boolean {
    return this.currentlyShuffling;
  }

  getShuffleEnabled(): boolean {
    return this.shuffle;
  }

  getCurrentSongMetadata() {
    return this.currentSongMetadata;
  }

  getCurrentSongThumbnail() {
    return this.currentSongThumbnail;
  }

  @log
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

  @log
  private extractYoutubeId(query: string): string | null {
    const youtubeIdRegex =
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = query.match(youtubeIdRegex);
    console.log(match && [...match]);
    return match ? match[1] : null;
  }

  private async queryToYoutubeIds(query: string): Promise<string[]> {
    let result: string[] = [];
    let id: string | null = null;

    const sourceType = this.identifyUrl(query);
    switch (sourceType) {
      case URL_IDENTIFIERS.SPOTIFY_TRACK:
        id = await searchSpotifyAndGetYoutubeId(query);
        logMessage("SPOTIFY TRACK", id);
        if (id) result.push(id);
        break;
      case URL_IDENTIFIERS.SPOTIFY_PLAYLIST:
        result = await spotifyPlaylistToYoutubeIds(query);
        logMessage("SPOTIFY PLAYLIST", result);
        break;
      case URL_IDENTIFIERS.YOUTUBE:
        id = this.extractYoutubeId(query);
        logMessage("YOUTUBE", id);
        if (id) result.push(id);
        break;
      default:
        id = (await getTopResult(query)) ?? null;
        logMessage("QUERY", id);
        if (id) result.push(id);
        break;
    }

    return result;
  }

  @log
  async queue(query: string, userId?: string) {
    try {
      const result = await this.queryToYoutubeIds(query);
      const encryptedUserId = userId ? encrypt(userId) : null;
      if (result.length > 1) {
        const first = result.shift() as string;
        await this.addToPlaylist({ id: first, userId: encryptedUserId });
        this.addToPlaylist(
          result.map((id) => ({ id, userId: encryptedUserId }))
        );
      } else if (result.length) {
        await this.addToPlaylist({ id: result[0], userId: encryptedUserId });
      }
      return result;
    } catch (e) {
      logError("Error adding to queue based on query", query, e);
      return [];
    }
  }
}

export default QueueManager;
