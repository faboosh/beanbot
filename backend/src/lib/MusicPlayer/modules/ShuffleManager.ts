import { Guild, VoiceChannel } from "discord.js";
import db from "../../../db.js";
import Cache, { type CacheKeyable } from "../../Cache.js";
import PlayHistory from "./PlayHistory.js";
import type { Play } from "./InteractionService.js";
import type VoiceConnectionManager from "./VoiceConnectionManager.js";
import AudioResourceManager from "./AudioResourceManager.js";
import type { PlaylistEntry } from "@shared/types.js";
import { decryptIfEncrypted, encrypt } from "../../crypto.js";
import InteractionService from "./InteractionService.js";
import perf from "../../perf.js";

type WeightedPlay = {
  play: Play;
  weight: { val: number; key: string }[];
};

class ShuffleManager implements CacheKeyable {
  playHistory: PlayHistory;
  voiceConnectionManager: VoiceConnectionManager;
  interactionService: InteractionService;

  MIN_SONG_LEN_SECONDS = 60 * 1;
  IDEAL_SONG_LEN_SECONDS = 60 * 4.5;
  MAX_SONG_LEN_SECONDS = 60 * 15;

  NUM_MEMBERS_PLAYED_MULTIPLIER = 4;
  POPULARITY_OVER_TIME_MULTIPLIER = 4;
  IDEAL_SONG_LEN_MULTIPLIER = 10;

  private nextId: string | null = null;

  constructor(voiceConnectionManager: VoiceConnectionManager) {
    this.voiceConnectionManager = voiceConnectionManager;
    this.playHistory = new PlayHistory(this.voiceConnectionManager.getGuild());
    this.interactionService = new InteractionService(
      this.voiceConnectionManager.getGuild().id
    );
    this.getCurrentVoiceMembers();

    this.computeNextAndCache();
  }

  getCacheKey() {
    return encrypt(this.voiceConnectionManager.getGuild().id);
  }

  private async getCurrentVoiceMembers() {
    return (await this.voiceConnectionManager.getCurrentVoiceMembers()).map(
      encrypt
    );
  }

  private async getPlays() {
    return this.interactionService.getPlays();
  }

  @perf
  private filterNotRecentlyPlayed(entries: Play[]) {
    const filteredEntries = entries.filter((play) => {
      return !this.playHistory.isInHistory(play.youtubeId as string);
    });

    return filteredEntries;
  }

  @perf
  private async filterNotInVoiceChannel(entries: Play[]) {
    const userIds = await this.getCurrentVoiceMembers();
    const filteredEntries = entries.filter((play) => {
      return play.playedBy.some((userId) => userIds.includes(userId));
    });

    return filteredEntries;
  }

  @perf
  private filterTooLongOrShort(entries: Play[]) {
    const filteredEntries = entries.filter((play) => {
      if (play.lengthSeconds === null) return true;
      return (
        play.lengthSeconds > this.MIN_SONG_LEN_SECONDS &&
        play.lengthSeconds < this.MAX_SONG_LEN_SECONDS
      );
    });
    return filteredEntries;
  }

  @perf
  private weightByNumMembersPlayedCount(entries: WeightedPlay[]) {
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      entry.weight.push({
        val: entry.play.playedBy.length * this.NUM_MEMBERS_PLAYED_MULTIPLIER,
        key: "number of members played",
      });
    }
    return entries;
  }

  @perf
  private weightByPopularityOverTime(entries: WeightedPlay[]) {
    const now = Date.now();
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    const oneMonthMs = Math.round(oneYear / 12);

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      const inMonths: number[] = [];

      for (let i = 0; i < entry.play.playedAt.length; i++) {
        const timestamp = entry.play.playedAt[i];
        const timeAgo = now - timestamp.getTime();
        const monthsAgo = Math.floor(timeAgo / oneMonthMs);
        if (!inMonths.includes(monthsAgo)) inMonths.push(monthsAgo);
      }

      entry.weight.push({
        val: inMonths.length * this.POPULARITY_OVER_TIME_MULTIPLIER,
        key: "popularity over time",
      });
    }

    return entries;
  }

  @perf
  private weightBySongLength(entries: WeightedPlay[]) {
    function linearFalloff(
      value: number,
      min: number,
      middle: number,
      max: number
    ) {
      if (value <= min || value >= max) {
        return 0;
      } else if (value === middle) {
        return 1;
      } else if (value < middle) {
        return (value - min) / (middle - min);
      } else {
        return (max - value) / (max - middle);
      }
    }

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (entry.play.lengthSeconds === null) continue;

      const multiplier = linearFalloff(
        entry.play.lengthSeconds,
        this.MIN_SONG_LEN_SECONDS,
        this.IDEAL_SONG_LEN_SECONDS,
        this.MAX_SONG_LEN_SECONDS
      );

      entry.weight.push({
        val: Math.round(multiplier * this.IDEAL_SONG_LEN_MULTIPLIER),
        key: "song length",
      });
    }

    return entries;
  }

  private computeNextAndCache() {
    this.computeNext().then((nextId) => {
      this.nextId = nextId;
      if (nextId) {
        AudioResourceManager.createAudioResource(nextId)
          .then(() => console.log(`Created audio resource for "${nextId}"`))
          .catch((e) =>
            console.error(`Failed to create audio resource for "${nextId}"`, e)
          );
      }
    });
  }

  async getNext(): Promise<PlaylistEntry> {
    if (this.nextId) {
      const nextId = this.nextId;
      this.nextId = null;
      this.computeNextAndCache();
      return {
        id: nextId,
        userId: null,
      };
    }

    const next = await this.computeNext();
    this.computeNextAndCache();
    return {
      id: String(next),
      userId: null,
    };
  }

  @perf
  private async computeNext() {
    try {
      const plays = await this.getPlays();
      let filteredPlays = this.filterNotRecentlyPlayed(plays);
      filteredPlays = this.filterTooLongOrShort(filteredPlays);
      filteredPlays = await this.filterNotInVoiceChannel(filteredPlays);

      let weightedPlays = filteredPlays.map((play) => {
        return {
          weight: [],
          play,
        } as WeightedPlay;
      });

      weightedPlays = this.weightByNumMembersPlayedCount(weightedPlays);
      weightedPlays = this.weightByPopularityOverTime(weightedPlays);
      weightedPlays = this.weightBySongLength(weightedPlays);
      const weightsArr = weightedPlays.flatMap((entry) =>
        Array(entry.weight.reduce((acc, val) => acc + val.val, 0))
          .fill(null)
          .map(() => entry.play.youtubeId)
      );
      const nextId = weightsArr[Math.round(Math.random() * weightsArr.length)];
      if (!nextId) return null;

      return nextId;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  addHistory(youtubeId: string) {
    this.playHistory.add(youtubeId);
  }
}

export default ShuffleManager;
