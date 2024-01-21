import { Guild } from "discord.js";
import { getThumbnail, getTopResult } from "./platforms/youtube";
import { getOrCreateMetadata, getTitleAuthor } from "./util/metadata";
import { secondsToTimestamp } from "../util";
import { EmbedData } from "../embed";
import InteractionService from "./modules/InteractionService";
import PlaybackController from "./modules/PlaybackController";
import VoiceConnectionManager from "./modules/VoiceConnectionManager";
import AudioResourceManager from "./modules/AudioResourceManager";
import QueueManager from "./modules/QueueManager";

class MusicPlayer {
  private guild: Guild;
  private channelId: string;

  private interactionService: InteractionService;
  private playbackController: PlaybackController = new PlaybackController();
  private voiceConnectionManager: VoiceConnectionManager;
  private queueManager: QueueManager;

  constructor(guild: Guild, channelId: string) {
    this.guild = guild;
    this.channelId = channelId;
    this.interactionService = new InteractionService(this.guild.id);
    this.voiceConnectionManager = new VoiceConnectionManager(guild, channelId);
    this.queueManager = new QueueManager(guild, channelId);

    this.voiceConnectionManager.onConnectedStatusChanged((connected) => {
      if (connected)
        this.playbackController.connect(
          this.voiceConnectionManager.voiceConnection
        );
    });

    this.playbackController.onLongIdle(() => {
      this.playNext();
    });
  }

  private async playNext() {
    await this.voiceConnectionManager.ensureConnected();

    const playlistEntry = await this.queueManager.getNext();
    if (!playlistEntry) return this.pause();

    try {
      const audioResource = await AudioResourceManager.createAudioResource(
        playlistEntry
      );
      if (!audioResource) throw new Error("Could not create audio resource");

      this.playbackController.play(audioResource);
      return playlistEntry;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  async queueBySearch(query: string, userId?: string): Promise<EmbedData> {
    const currentlyPlaying = this.getCurrentlyPlaying();
    const currentlyShuffling = this.queueManager.getCurrentlyShuffling();

    const id = await getTopResult(query);
    if (!id) return { title: "Video not found" };
    this.queueManager.addToPlaylist(id);
    if (!currentlyPlaying || currentlyShuffling) await this.playNext();
    this.interactionService.logPlay(id, { userId });
    const { title, author } = await getTitleAuthor(id);
    return {
      title: `Queueing ${author} - ${title}`,
      description: `Searched for ${query}`,
      thumbnail: await getThumbnail(id),
    };
  }

  async skip(userId: string): Promise<EmbedData> {
    let currentlyPlaying = this.getCurrentlyPlaying();

    if (currentlyPlaying) {
      try {
        await this.interactionService.logSkip({
          yt_id: currentlyPlaying,
          user_id: userId,
          timestamp: Date.now(),
        });
      } catch (e) {
        console.error(`Error logging skip: `, e);
      }
    }
    await this.playNext();
    currentlyPlaying = this.getCurrentlyPlaying();
    if (!currentlyPlaying) return { title: "Failed to get next song" };

    const { title, author } = await getTitleAuthor(currentlyPlaying);
    return {
      title: "Skipping",
      fields: [
        {
          name: "Up next",
          value: `${author} - ${title}`,
        },
      ],
      thumbnail: await getThumbnail(currentlyPlaying),
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

  private getCurrentlyPlaying() {
    return this.queueManager.getCurrentlyPlaying();
  }

  private async getPlayBar() {
    const currentlyPlaying = this.getCurrentlyPlaying();
    const startedPlayingAt = this.playbackController.getStartedPlayingAt();
    if (!currentlyPlaying) return "";

    const metadata = await getOrCreateMetadata(currentlyPlaying);
    if (!metadata || !metadata.length_seconds) return "";

    const playbar = Array(30).fill("─");
    const currentPlaybackPosition = (Date.now() - startedPlayingAt) / 1000;
    const position = Math.round(
      (currentPlaybackPosition / metadata.length_seconds) * (playbar.length - 1)
    );
    playbar[position] = "■";

    return [
      `\` ${playbar.join("")}\` `,
      `${secondsToTimestamp(currentPlaybackPosition)}/${secondsToTimestamp(
        metadata.length_seconds
      )}`,
    ].join("\n");
  }

  async nowPlaying(): Promise<EmbedData> {
    const currentlyPlaying = this.getCurrentlyPlaying();

    if (currentlyPlaying) {
      const { author, title } = await getTitleAuthor(currentlyPlaying);
      const playBar = await this.getPlayBar();
      const playlist = this.queueManager.getPlaylist();
      const nextUp =
        playlist.length > 0
          ? [
              "",
              "**Next up:**",
              ...(await Promise.all(
                playlist.map(async (id) => {
                  const { title, author } = await getTitleAuthor(id);
                  return `${author} - ${title}`;
                })
              )),
            ]
          : [];
      return {
        title,
        description: [author, "", playBar, ...nextUp].join("\n"),
        thumbnail: await getThumbnail(currentlyPlaying),
      };
    } else {
      return { title: `Nothing is currently playing!` };
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
        currentlyPlaying
      );

      if (!userIds[0]) throw new Error("No results, this should never happen");

      const { title, author } = await getTitleAuthor(currentlyPlaying);

      return {
        title: "How did we end up here?",
        description: `"${author} - ${title}" has been played by ${userIds[0].user_ids
          .split(",")
          .map((id) => `<@${id}>`)
          .join(", ")}`,
        thumbnail: await getThumbnail(currentlyPlaying),
      };
    } catch (e) {
      console.error(e);
      return { title: "Something bwoke UwU" };
    }
  }

  async stats(): Promise<EmbedData> {
    const MAX_CHARS = 2000;
    const plays = await this.interactionService.getPlays();

    const sorted = plays.sort((p1, p2) => p2.numPlays - p1.numPlays);

    const reply = [
      ...sorted.map((play, i) => {
        return `${i + 1}. ${play.title} (${play.numPlays} plays)`;
      }),
    ];

    for (let i = 0; i < sorted.length; i++) {
      const play = sorted[i];
      const finalString = `${i + 1}. ${play.title} (${play.numPlays} plays)\n`;
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
    this.voiceConnectionManager.destroy();
  }

  getShuffleEnabled() {
    return this.queueManager.getShuffleEnabled();
  }

  getChannelId() {
    return this.channelId;
  }
}

export default MusicPlayer;
