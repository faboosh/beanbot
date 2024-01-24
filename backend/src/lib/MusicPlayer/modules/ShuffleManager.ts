import { Guild, VoiceChannel } from "discord.js";
import db from "../../../db.js";
import Cache from "../../Cache.js";
import PlayHistory from "./PlayHistory.js";
import { Play } from "./InteractionService.js";

type WeightedPlay = {
  play: Play;
  weight: { val: number; key: string }[];
};

class ShuffleManager {
  guild: Guild;
  channelId: string;
  playHistory: PlayHistory;
  playsCache: Cache<Play[]>;

  MIN_SONG_LEN_SECONDS = 60 * 1;
  IDEAL_SONG_LEN_SECONDS = 60 * 4.5;
  MAX_SONG_LEN_SECONDS = 60 * 15;

  NUM_MEMBERS_PLAYED_MULTIPLIER = 4;
  POPULARITY_OVER_TIME_MULTIPLIER = 4;
  IDEAL_SONG_LEN_MULTIPLIER = 10;

  constructor(guild: Guild, channelId: string) {
    this.guild = guild;
    this.channelId = channelId;
    this.playsCache = new Cache<Play[]>(`${this.guild.id}-plays`);
    this.playHistory = new PlayHistory(this.guild);

    this.getCurrentVoiceMembers();
  }

  private async getCurrentVoiceMembers() {
    const channel = (await this.guild.channels.fetch(
      this.channelId
    )) as VoiceChannel;

    const usersIds = channel.members.map((member) => member.user.id);
    return usersIds;
  }

  private async getPlays() {
    console.time("getPlays");

    const playsFromCache = this.playsCache.get(this.guild.id);
    if (playsFromCache) {
      console.timeEnd("getPlays");
      return playsFromCache;
    }
    const plays = (await db("plays")
      .select("plays.yt_id", "title", "length_seconds", "lufs")
      .select(db.raw("GROUP_CONCAT(DISTINCT user_id) as user_ids")) // Aggregate user_ids
      .select(db.raw("GROUP_CONCAT(DISTINCT timestamp) as timestamps")) // Aggregate timestamps
      .count("plays.yt_id as num_plays") // Count the number of plays for each yt_id
      .where({ guild_id: this.guild.id })
      .join("song_metadata", "plays.yt_id", "=", "song_metadata.yt_id")
      .groupBy("plays.yt_id")
      .orderBy("num_plays", "desc")) as {
      yt_id: string;
      title: string;
      length_seconds: number;
      lufs: number;
      user_ids: string;
      timestamps: string;
      num_plays: number;
    }[];

    const parsedPlays = plays.map((play) => {
      return {
        ytId: play.yt_id,
        title: play.title,
        lengthSeconds: play.length_seconds,
        lufs: play.lufs,
        userIds: play.user_ids.split(","),
        timestamps: play.timestamps.split(",").map((id) => Number(id)),
        numPlays: play.num_plays,
      } as Play;
    });

    this.playsCache.set(this.guild.id, parsedPlays);
    console.timeEnd("getPlays");
    return parsedPlays;
  }

  private filterNotRecentlyPlayed(entries: Play[]) {
    console.time("filterNotRecentlyPlayed");
    const filteredEntries = entries.filter((play) => {
      return !this.playHistory.isInHistory(play.ytId);
    });
    console.timeEnd("filterNotRecentlyPlayed");

    return filteredEntries;
  }

  private async filterNotInVoiceChannel(entries: Play[]) {
    console.time("filterNotInVoiceChannel");
    const userIds = await this.getCurrentVoiceMembers();
    const filteredEntries = entries.filter((play) => {
      return play.userIds.some((userId) => userIds.includes(userId));
    });
    console.timeEnd("filterNotInVoiceChannel");
    return filteredEntries;
  }

  private filterTooLongOrShort(entries: Play[]) {
    console.time("filterTooLongOrShort");

    const filteredEntries = entries.filter((play) => {
      if (play.lengthSeconds === null) return true;
      return (
        play.lengthSeconds > this.MIN_SONG_LEN_SECONDS &&
        play.lengthSeconds < this.MAX_SONG_LEN_SECONDS
      );
    });
    console.timeEnd("filterTooLongOrShort");
    return filteredEntries;
  }

  private weightByNumMembersPlayedCount(entries: WeightedPlay[]) {
    console.time("weightByNumMembersPlayedCount");
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      entry.weight.push({
        val: entry.play.userIds.length * this.NUM_MEMBERS_PLAYED_MULTIPLIER,
        key: "number of members played",
      });
    }
    console.timeEnd("weightByNumMembersPlayedCount");
    return entries;
  }

  private weightByPopularityOverTime(entries: WeightedPlay[]) {
    console.time("weightByPopularityOverTime");

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
    console.timeEnd("weightByPopularityOverTime");

    return entries;
  }

  private weightBySongLength(entries: WeightedPlay[]) {
    console.time("weightBySongLength");

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
    console.timeEnd("weightBySongLength");

    return entries;
  }

  async getNext() {
    try {
      console.time("total");
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

      console.time("Compute next");
      const weightsArr = weightedPlays.flatMap((entry) =>
        Array(entry.weight.reduce((acc, val) => acc + val.val, 0))
          .fill(null)
          .map(() => entry.play.ytId)
      );
      const nextId = weightsArr[Math.round(Math.random() * weightsArr.length)];
      const selected = weightedPlays.filter(
        (entry) => entry.play.ytId === nextId
      )?.[0];
      console.timeEnd("Compute next");

      if (!nextId) return null;
      const shuffleWeight = weightsArr.filter((id) => id === nextId).length;

      const percent = (shuffleWeight / weightsArr.length) * 100;
      console.log("Shuffle weight:", shuffleWeight);
      console.log(`${percent}% chance`);
      console.log("Breakdown: ");
      if (selected) {
        selected.weight.forEach((wt) => {
          console.log(`${wt.key}:`, wt.val);
        });
      }

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
