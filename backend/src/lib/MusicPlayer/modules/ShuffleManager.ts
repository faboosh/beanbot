import { Guild, VoiceChannel } from "discord.js";
import db from "../../../db.js";
import Cache from "../../Cache.js";
import PlayHistory from "./PlayHistory.js";
import type { Play } from "./InteractionService.js";
import type VoiceConnectionManager from "./VoiceConnectionManager.js";
import AudioResourceManager from "./AudioResourceManager.js";
import type { PlaylistEntry } from "@shared/types.js";
import { decrypt, encrypt } from "../../crypto.js";
import InteractionService from "./InteractionService.js";

type WeightedPlay = {
  play: Play;
  weight: { val: number; key: string }[];
};

class ShuffleManager {
  playHistory: PlayHistory;
  playsCache: Cache<Play[]>;
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
    this.playsCache = new Cache<Play[]>(
      `${encrypt(this.voiceConnectionManager.getGuild().id)}-plays`
    );
    this.playHistory = new PlayHistory(this.voiceConnectionManager.getGuild());
    this.interactionService = new InteractionService(
      this.voiceConnectionManager.getGuild().id
    );
    this.getCurrentVoiceMembers();

    this.computeNextAndCache();
  }

  private async getCurrentVoiceMembers() {
    return (await this.voiceConnectionManager.getCurrentVoiceMembers()).map(
      encrypt
    );
  }

  private async getPlays() {
    return this.interactionService.getPlays();
  }

  private filterNotRecentlyPlayed(entries: Play[]) {
    // console.time("filterNotRecentlyPlayed");
    const filteredEntries = entries.filter((play) => {
      return !this.playHistory.isInHistory(play.ytId);
    });
    // console.timeEnd("filterNotRecentlyPlayed");

    return filteredEntries;
  }

  private async filterNotInVoiceChannel(entries: Play[]) {
    // console.time("filterNotInVoiceChannel");
    const userIds = await this.getCurrentVoiceMembers();
    console.log("userIds", userIds);
    const filteredEntries = entries.filter((play) => {
      return play.userIds.some((userId) => userIds.includes(userId));
    });
    console.log(
      "filterNotInVoiceChannel length after filter",
      filteredEntries.length
    );

    // console.timeEnd("filterNotInVoiceChannel");
    return filteredEntries;
  }

  private filterTooLongOrShort(entries: Play[]) {
    // console.time("filterTooLongOrShort");

    const filteredEntries = entries.filter((play) => {
      if (play.lengthSeconds === null) return true;
      return (
        play.lengthSeconds > this.MIN_SONG_LEN_SECONDS &&
        play.lengthSeconds < this.MAX_SONG_LEN_SECONDS
      );
    });
    // console.timeEnd("filterTooLongOrShort");
    return filteredEntries;
  }

  private weightByNumMembersPlayedCount(entries: WeightedPlay[]) {
    // console.time("weightByNumMembersPlayedCount");
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      entry.weight.push({
        val: entry.play.userIds.length * this.NUM_MEMBERS_PLAYED_MULTIPLIER,
        key: "number of members played",
      });
    }
    // console.timeEnd("weightByNumMembersPlayedCount");
    return entries;
  }

  private weightByPopularityOverTime(entries: WeightedPlay[]) {
    // console.time("weightByPopularityOverTime");

    const now = Date.now();
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    const oneMonthMs = Math.round(oneYear / 12);

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      const inMonths: number[] = [];

      for (let i = 0; i < entry.play.timestamps.length; i++) {
        const timestamp = entry.play.timestamps[i];
        const timeAgo = now - timestamp;
        const monthsAgo = Math.floor(timeAgo / oneMonthMs);
        if (!inMonths.includes(monthsAgo)) inMonths.push(monthsAgo);
      }

      entry.weight.push({
        val: inMonths.length * this.POPULARITY_OVER_TIME_MULTIPLIER,
        key: "popularity over time",
      });
    }
    // console.timeEnd("weightByPopularityOverTime");

    return entries;
  }

  private weightBySongLength(entries: WeightedPlay[]) {
    // console.time("weightBySongLength");

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
    // console.timeEnd("weightBySongLength");

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

  private async computeNext() {
    try {
      console.time("Compute next shuffle");
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

      // console.time("Compute next");
      const weightsArr = weightedPlays.flatMap((entry) =>
        Array(entry.weight.reduce((acc, val) => acc + val.val, 0))
          .fill(null)
          .map(() => entry.play.ytId)
      );
      const nextId = weightsArr[Math.round(Math.random() * weightsArr.length)];
      if (!nextId) return null;
      // const selected = weightedPlays.filter(
      //   (entry) => entry.play.ytId === nextId
      // )?.[0];
      // console.timeEnd("Compute next");

      // const shuffleWeight = weightsArr.filter((id) => id === nextId).length;

      // const percent = (shuffleWeight / weightsArr.length) * 100;
      // console.log("Shuffle weight:", shuffleWeight);
      // console.log(`${percent}% chance`);
      // console.log("Breakdown: ");
      // if (selected) {
      //   selected.weight.forEach((wt) => {
      //     console.log(`${wt.key}:`, wt.val);
      //   });
      // }
      console.timeEnd("Compute next shuffle");

      return nextId;
    } catch (e) {
      console.timeEnd("Compute next shuffle");
      console.error(e);
      return null;
    }
  }

  addHistory(youtubeId: string) {
    this.playHistory.add(youtubeId);
  }
}

export default ShuffleManager;
