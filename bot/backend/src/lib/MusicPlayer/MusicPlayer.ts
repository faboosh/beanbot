import { Guild, User } from "discord.js";
import { getThumbnail } from "./platforms/youtube.js";
import type { EmbedData } from "../embed.js";
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

export interface IMusicPlayer {
  queueBySearch(query: string, userId?: string): Promise<EmbedData>;
  queueById(youtubeId: string, userId?: string): Promise<void>;
  removeFromQueue(youtubeId: string): Promise<void>;

  skip(userId: string): Promise<EmbedData>;
  pause(): void;
  unpause(): void;
  setShuffle(shuffle: boolean): void;

  nowPlaying(): Promise<EmbedData>;

  blame(): Promise<EmbedData>;

  stats(): Promise<EmbedData>;

  getPlaying(): void;

  disconnect(): void;

  getShuffleEnabled(): boolean;

  getChannelId(): string;
}

class MusicPlayer implements IMusicPlayer {
  private guild: Guild;
  private channelId: string;

  private interactionService: InteractionService;
  private playbackController: PlaybackController;
  private voiceConnectionManager: VoiceConnectionManager;
  private queueManager: QueueManager;
  private disconnectInterval;

  constructor(guild: Guild, channelId: string) {
    this.guild = guild;
    this.channelId = channelId;
    this.interactionService = new InteractionService(this.guild.id);
    this.voiceConnectionManager = new VoiceConnectionManager(
      this.guild,
      this.channelId
    );
    this.playbackController = new PlaybackController(this.guild.id);
    this.queueManager = new QueueManager(this.voiceConnectionManager);

    this.voiceConnectionManager.onConnectedStatusChanged((connected) => {
      if (connected)
        this.playbackController.connect(
          this.voiceConnectionManager.getVoiceConnection()
        );
    });

    this.playbackController.onLongIdle(() => {
      this.playNext();
    });

    this.disconnectInterval = setInterval(() => {
      this.checkMembersConnected();
    }, 60 * 1000);
  }

  private async checkMembersConnected() {
    const userIds = await this.voiceConnectionManager.getCurrentVoiceMembers();
    if (!userIds.length) {
      this.disconnect();
    }
  }

  private async playNext() {
    await this.voiceConnectionManager.ensureConnected();

    const playlistEntry = await this.queueManager.getNext();
    if (!playlistEntry) return this.pause();

    try {
      const audioResource = await AudioResourceManager.createAudioResource(
        playlistEntry.id
      );
      if (!audioResource) throw new Error("Could not create audio resource");

      this.playbackController.play(audioResource);
      return playlistEntry;
    } catch (e) {
      logError(e);
      return null;
    }
  }

  private getCurrentlyPlaying() {
    return this.queueManager.getCurrentlyPlaying();
  }

  @log
  async queueBySearch(query: string, userId?: string): Promise<EmbedData> {
    const currentlyPlaying = this.getCurrentlyPlaying();
    const currentlyShuffling = this.queueManager.getCurrentlyShuffling();

    const result = await this.queueManager.queue(query, userId);
    if (!result || (Array.isArray(result) && result.length === 0)) {
      return { title: "No results" };
    }
    if (!currentlyPlaying || currentlyShuffling) await this.playNext();

    let title: string;
    let author: string;
    let thumbnail: string;

    const firstResult = result[0];
    const metadata = await SongMetadataService.getTitleAuthor(firstResult);
    title = metadata.title;
    author = metadata.author;
    thumbnail = await getThumbnail(firstResult);

    await Promise.all(
      result.map((id) =>
        this.interactionService.logPlay({
          youtubeId: id,
          userId: userId as string,
        })
      )
    );

    return {
      title: `Queueing ${author} - ${title}`,
      description: `Searched for ${query}`,
      thumbnail: thumbnail,
    };
  }

  async queueById(youtubeId: string, userId: string) {
    AudioResourceManager.createAudioResource(youtubeId)
      .then((audioResource) =>
        logMessage(`created audio resource for "${youtubeId}"`, audioResource)
      )
      .catch((err) =>
        logError(`failed audio resource for "${youtubeId}"`, err)
      );
    await this.queueManager.addToPlaylist({
      id: youtubeId,
      userId: userId,
    });
    this.interactionService.logPlay({
      youtubeId,
      userId,
    });
  }

  async removeFromQueue(youtubeId: string) {
    this.queueManager.removeFromPlaylist(youtubeId);
  }

  async skip(userId: string): Promise<EmbedData> {
    let currentlyPlaying = this.getCurrentlyPlaying();

    if (currentlyPlaying) {
      try {
        await this.interactionService.logSkip({
          youtubeId: currentlyPlaying.id,
          userId: userId,
        });
      } catch (e) {
        logError(`Error logging skip: `, e);
      }
    }
    await this.playNext();
    currentlyPlaying = this.getCurrentlyPlaying();
    if (!currentlyPlaying) return { title: "Failed to get next song" };

    const { title, author } = await SongMetadataService.getTitleAuthor(
      currentlyPlaying.id
    );
    return {
      title: "Skipping",
      fields: [
        {
          name: "Up next",
          value: `${author} - ${title}`,
        },
      ],
      thumbnail: await getThumbnail(currentlyPlaying.id),
    };
  }

  pause() {
    this.playbackController.pause();
  }

  unpause() {
    this.playbackController.unpause();
  }

  setShuffle(shuffle: boolean) {
    this.queueManager.setShuffle(shuffle);
  }

  async nowPlaying(): Promise<EmbedData> {
    const currentlyPlaying = this.getCurrentlyPlaying();

    if (!currentlyPlaying) {
      return { title: `Nothing is currently playing!` };
    }

    try {
      const secondsElapsed =
        this.playbackController.getSecondsSinceStartedPlaying();

      const playingCardPath = await generatePlayingCard(
        currentlyPlaying.id,
        secondsElapsed
      ).catch((err) => {
        throw err;
      });

      return {
        image: playingCardPath,
      };
    } catch (e: any) {
      logError(e);
      return { title: `Something went wrong: ${e.message}` };
    }
  }

  async blame(): Promise<EmbedData> {
    const currentlyPlaying = this.getCurrentlyPlaying();

    try {
      if (!currentlyPlaying)
        return {
          title: "Nothing playing right now!",
          description: "You're all to blame for the deafening silence",
        };

      const userIds = await this.interactionService.getUserIdsWhoPlayed(
        currentlyPlaying.id
      );

      if (!userIds[0]) throw new Error("No results, this should never happen");

      const { title, author } = await SongMetadataService.getTitleAuthor(
        currentlyPlaying.id
      );

      return {
        title: "How did we end up here?",
        description: `"${author} - ${title}" has been played by ${userIds
          .map((id) => `<@${id}>`)
          .join(", ")}`,
        thumbnail: await getThumbnail(currentlyPlaying.id),
      };
    } catch (e) {
      logError(e);
      return { title: "Something bwoke UwU" };
    }
  }

  @cache<User[]>("users-who-played")
  async getUsersWhoPlayed(youtubeId: string) {
    try {
      const userIds = await this.interactionService.getUserIdsWhoPlayed(
        youtubeId
      );

      if (!userIds[0]) throw new Error("No results, this should never happen");

      return await Promise.all(
        userIds.map(async (id) => {
          return await this.guild.client.users.fetch(decryptIfEncrypted(id));
        })
      );
    } catch (e) {
      logError(e);
      return [];
    }
  }

  @cache<User[]>("user-details")
  async getUserDetails(id: string) {
    try {
      return await this.guild.client.users.fetch(decryptIfEncrypted(id));
    } catch (e) {
      logError(e);
      return null;
    }
  }

  async stats(): Promise<EmbedData> {
    const MAX_CHARS = 2000;
    const plays = await this.interactionService.getPlays();

    const sorted = plays.sort((s1, s2) => s2.plays.length - s1.plays.length);

    const reply = [
      ...sorted.map((song, i) => {
        return `${i + 1}. ${song.youtubeTitle} (${song.plays.length} plays)`;
      }),
    ];

    for (let i = 0; i < sorted.length; i++) {
      const song = sorted[i];
      if (!song) continue;
      const finalString = `${i + 1}. ${song.youtubeTitle} (${
        song.plays.length
      } plays)\n`;
      if (
        reply.join("\n").length + reply.length + finalString.length + 1 >=
        MAX_CHARS
      )
        break;

      reply.push(finalString);
    }

    return {
      title: `Top songs for ${this.guild.name}`,
      description: reply.join("\n").slice(0, MAX_CHARS),
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
}

const players = new Map<string, MusicPlayer>();

const getOrCreatePlayer = (guild: Guild, voiceId: string): MusicPlayer => {
  const key = guild.id;

  if (!players.get(key)) players.set(key, new MusicPlayer(guild, voiceId));

  return players.get(key) as MusicPlayer;
};

const getPlayer = (guildId: string) => {
  const key = guildId;
  return players.get(key) as MusicPlayer;
};

const destroyPlayer = (guild: Guild) => {
  const key = guild.id;
  const player = players.get(key);
  if (player) player.disconnect();
  players.delete(key);
};

export default MusicPlayer;
export { getOrCreatePlayer, destroyPlayer, getPlayer };
