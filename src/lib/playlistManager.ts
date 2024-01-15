import {
  joinVoiceChannel,
  VoiceConnectionStatus,
  VoiceConnection,
  createAudioPlayer,
  AudioPlayer,
  AudioResource,
  createAudioResource,
  AudioPlayerStatus,
  entersState,
} from "@discordjs/voice";
import { Guild } from "discord.js";
import { downloadById, getTopResult } from "./youtube";
import db from "../db";
import ShuffleManager from "./shuffleManager";
import { logSkip } from "./skip";

export type PlaylistEntry = {
  filePath: string;
  audioResource: AudioResource;
  title: string;
  youtubeId: string;
};

class PlaylistManager {
  guild: Guild;
  channelId: string;
  player: AudioPlayer = createAudioPlayer();
  playlist: PlaylistEntry[] = [];
  voiceConnection?: VoiceConnection;
  playing: boolean = false;
  currentlyPlaying?: PlaylistEntry;
  shuffle: boolean = true;
  currentlyShuffling: boolean = false;
  connected: boolean = false;
  playHistory: PlaylistEntry[] = [];
  MAX_PLAY_HISTORY = 10;
  shuffleManager: ShuffleManager;
  playNextCallback?: (nextMessage: string) => void;
  idleTimeout: any = 0;
  IDLE_TIMEOUT_WAIT_MS = 1000;

  constructor(guild: Guild, channelId: string) {
    this.guild = guild;
    this.channelId = channelId;
    this.shuffleManager = new ShuffleManager(guild, channelId);

    this.player.on(AudioPlayerStatus.Idle, () => {
      clearTimeout(this.idleTimeout);
      this.idleTimeout = setTimeout(() => {
        this.playNext();
      }, this.IDLE_TIMEOUT_WAIT_MS);
    });
    this.player.on(AudioPlayerStatus.Playing, () => (this.playing = true));
    this.player.on(AudioPlayerStatus.Paused, () => (this.playing = false));
    this.player.on(AudioPlayerStatus.Idle, () => (this.playing = false));
    this.player.on(AudioPlayerStatus.AutoPaused, () => (this.playing = false));
  }

  private async tryConnect() {
    if (this.connected) return;

    this.voiceConnection = joinVoiceChannel({
      channelId: this.channelId,
      guildId: this.guild.id,
      adapterCreator: this.guild.voiceAdapterCreator,
    });

    this.voiceConnection.on(VoiceConnectionStatus.Ready, () => {
      this.connected = true;
    });

    this.voiceConnection.on(VoiceConnectionStatus.Disconnected, () => {
      this.connected = false;
      this.player.stop(true);
    });

    this.voiceConnection.subscribe(this.player);
    await entersState(this.voiceConnection, VoiceConnectionStatus.Ready, 5000);
    console.log(`Voice connection to channel ${this.channelId} ready`);
  }

  onPlayNext(callback: (nextMessage: string) => void) {
    this.playNextCallback = callback;
  }

  private async playNext() {
    if (!this.connected) await this.tryConnect();
    const nextFromPlaylist = this.getNextFromPlaylist();
    const playlistEntry =
      this.shuffle && !nextFromPlaylist
        ? await this.shuffleManager.getNext()
        : nextFromPlaylist;
    if (!playlistEntry) return this.pause();
    this.currentlyPlaying = playlistEntry;
    console.log(
      `Playing "${playlistEntry.title}" from path ${playlistEntry.filePath}`
    );

    this.shuffleManager.playHistory.add(playlistEntry.youtubeId);

    if (this.playNextCallback) this.playNextCallback(this.nowPlaying());

    this.player.play(playlistEntry.audioResource);
  }

  static async logPlay(
    playlistEntry: Omit<PlaylistEntry, "audioResource">,
    guildId: string,
    extra?: {
      imported?: boolean;
      timestamp?: number;
      userId?: string;
    }
  ) {
    const data = {
      title: playlistEntry.title,
      yt_id: playlistEntry.youtubeId,
      filename: playlistEntry.filePath,
      guild_id: guildId,
      imported: !!extra?.imported,
      timestamp: extra?.timestamp ?? Date.now(),
      user_id: extra?.userId ?? Date.now(),
    };
    console.log("Logging play: ", data);
    await db("plays").insert(data);
  }

  private getNextFromPlaylist() {
    const next = this.playlist.shift();
    this.currentlyShuffling = false;
    return next;
  }

  async queueBySearch(query: string, userId?: string) {
    const id = await getTopResult(query);
    if (!id) return "Video not found";
    const entry = await this.downloadAsEntry(id);
    if (!entry) return "Could not load video";
    this.playlist.push(entry);
    await PlaylistManager.logPlay(entry, this.guild.id, { userId });
    if (!this.playing || this.currentlyShuffling) await this.playNext();

    return `Queueing "${entry.title}" from search "${query}"`;
  }

  async skip(userId: string) {
    if (this.currentlyPlaying) {
      try {
        await logSkip({
          guild_id: this.guild.id,
          yt_id: this.currentlyPlaying.youtubeId,
          user_id: userId,
          timestamp: Date.now(),
        });
      } catch (e) {
        console.error(`Error logging skip: `, e);
      }
    }
    await this.playNext();
    return this.currentlyPlaying?.title;
  }

  pause() {
    this.player.pause();
  }

  unpause() {
    this.player.unpause();
  }

  setShuffle(shuffle: boolean) {
    this.shuffle = shuffle;
    if (this.shuffle) this.playNext();
  }

  nowPlaying() {
    if (this.currentlyPlaying) {
      return [
        `**Currently playing:** ${this.currentlyPlaying.title}`,
        ...(this.playlist.length > 0
          ? [
              "",
              "**Next up:**",
              ...this.playlist.map((entry, i) => `${i + 1}. ${entry.title}`),
            ]
          : []),
      ].join("\n");
    } else {
      return `Nothing is currently playing!`;
    }
  }

  private async getPlays() {
    const plays = (await db("plays")
      .where({ guild_id: this.guild.id })
      .select("yt_id", "title")
      .count("yt_id as num_plays")
      .groupBy("yt_id")) as {
      yt_id: string;
      num_plays: number;
      title: string;
    }[];

    return plays;
  }

  async stats() {
    const MAX_CHARS = 2000;
    const plays = await this.getPlays();

    const sorted = plays.sort((p1, p2) => p2.num_plays - p1.num_plays);

    const reply = [
      "### Top songs: \n",
      ...sorted.map((play, i) => {
        return `${i + 1}. ${play.title} (${play.num_plays} plays)`;
      }),
    ];

    for (let i = 0; i < sorted.length; i++) {
      const play = sorted[i];
      const finalString = `${i + 1}. ${play.title} (${play.num_plays} plays)\n`;
      if (
        reply.join("\n").length + reply.length + finalString.length + 1 >=
        MAX_CHARS
      )
        break;

      reply.push(finalString);
    }

    return reply.join("\n").slice(0, MAX_CHARS);
  }

  private async downloadAsEntry(id: string) {
    const result = await downloadById(id);
    if (!result) return;
    const audioResource = await createAudioResource(result.filePath, {
      inlineVolume: true,
    });
    // audioResource.volume?.setVolumeLogarithmic()
    const videoTitle = result.details.title;
    const videoId = result.details.id;
    const entry = {
      filePath: result.filePath,
      audioResource,
      title: videoTitle,
      youtubeId: videoId,
    };

    return entry;
  }

  disconnect() {
    this.voiceConnection?.destroy(true);
  }
}

export default PlaylistManager;
