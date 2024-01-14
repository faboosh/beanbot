import { createAudioResource } from "@discordjs/voice";
import { Guild, VoiceChannel } from "discord.js";
import { PlaylistEntry } from "./playlistManager";
import db from "../db";
import { downloadById } from "./youtube";
import Cache from "./cache";
import PlayHistory from "./playHistory";

type AggregatedPlay = {
  yt_id: string;
  num_plays: number;
  title: string;
};

type WeightedAggregatedPlay = AggregatedPlay & {
  weight: number;
};

class ShuffleManager {
  guild: Guild;
  channelId: string;
  playHistory: PlayHistory;
  numMembersPlayedCache: Cache<number>;
  popularityOverTimeCache: Cache<number[]>;
  playsCache: Cache<AggregatedPlay[]>;
  constructor(guild: Guild, channelId: string) {
    this.guild = guild;
    this.channelId = channelId;
    this.numMembersPlayedCache = new Cache<number>(
      `${this.guild.id}-num-members-played`
    );
    this.popularityOverTimeCache = new Cache<number[]>(
      `${this.guild.id}-popularity-over-time`
    );
    this.playsCache = new Cache<AggregatedPlay[]>(`${this.guild.id}-plays`);
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
    const userIds = await this.getCurrentVoiceMembers();
    const cacheKey = `plays-${userIds.join("-")}`;
    if (this.playsCache.isValid(cacheKey)) {
      return this.playsCache.get(cacheKey);
    }
    const plays = (await db("plays")
      .where({ guild_id: this.guild.id })
      .select("yt_id", "title")
      .whereIn("user_id", userIds)
      .count("yt_id as num_plays")
      .groupBy("yt_id")) as AggregatedPlay[];

    this.playsCache.set(cacheKey, plays);

    return plays;
  }

  private filterNotRecentlyPlayed(entries: WeightedAggregatedPlay[]) {
    return entries.filter((play) => {
      return !this.playHistory.isInHistory(play.yt_id);
    });
  }

  private async weightByNumMembersPlayedCount(
    entries: WeightedAggregatedPlay[]
  ) {
    const currentMembers = await this.getCurrentVoiceMembers();
    const entriesPromises = entries.map(async (entry) => {
      try {
        const cacheKey = `${entry.yt_id}-${currentMembers.join("-")}`;

        if (this.numMembersPlayedCache.isValid(cacheKey)) {
          entry.weight += this.numMembersPlayedCache.get(cacheKey);
          return entry;
        }

        const count = await db("plays")
          .where({ guild_id: this.guild.id })
          .where({ yt_id: entry.yt_id })
          .whereIn("user_id", currentMembers)
          .count();
        if (!count?.[0]?.["count(*)"]) return entry;

        const numMembersPlayed = Number(count[0]["count(*)"]);
        this.numMembersPlayedCache.set(cacheKey, numMembersPlayed);

        entry.weight += numMembersPlayed;
        return entry;
      } catch (e) {
        console.error(e);
        return entry;
      }
    });

    return Promise.all(entriesPromises);
  }

  private async weightByPopularityOverTime(entries: WeightedAggregatedPlay[]) {
    const getPlayedAtTimestamps = async (entry: WeightedAggregatedPlay) => {
      try {
        const cacheKey = String(entry.yt_id);
        if (this.popularityOverTimeCache.isValid(cacheKey)) {
          return this.popularityOverTimeCache.get(cacheKey);
        }

        const timestamps = (await db("plays")
          .where({ guild_id: this.guild.id })
          .where({ yt_id: entry.yt_id })
          .select("timestamp")) as number[];

        this.popularityOverTimeCache.set(cacheKey, timestamps);
        return timestamps;
      } catch (e) {
        console.error(e);
        return [];
      }
    };
    const now = Date.now();
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    const oneMonthMs = Math.round(oneYear / 12);

    const entriesPromises = entries.map(async (entry) => {
      const playedAtTimestamps = await getPlayedAtTimestamps(entry);
      const inMonths: number[] = [];

      for (let i = 0; i < playedAtTimestamps.length; i++) {
        const timestamp = playedAtTimestamps[i];
        const timeAgo = now - timestamp;
        const monthsAgo = Math.floor(timeAgo / oneMonthMs);
        if (!inMonths.includes(monthsAgo)) inMonths.push(monthsAgo);
      }

      entry.weight += inMonths.length;
      return entry;
    });

    return Promise.all(entriesPromises);
  }

  async getNext() {
    try {
      const plays = await this.getPlays();
      let weightedPlays = plays.map((play) => {
        return { ...play, weight: play.num_plays };
      });
      weightedPlays = this.filterNotRecentlyPlayed(weightedPlays);
      weightedPlays = await this.weightByNumMembersPlayedCount(weightedPlays);
      weightedPlays = await this.weightByPopularityOverTime(weightedPlays);

      const weightsArr = weightedPlays.flatMap((play) =>
        Array(play.weight)
          .fill(null)
          .map(() => play.yt_id)
      );
      const nextId = weightsArr[Math.round(Math.random() * weightsArr.length)];
      if (!nextId) return;
      const entry = await this.downloadAsEntry(nextId);
      if (!entry) return;

      console.log(
        "Shuffle weight: ",
        weightsArr.filter((id) => id === nextId).length
      );

      return entry;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  private async downloadAsEntry(id: string) {
    try {
      const result = await downloadById(id);
      if (!result) return;
      const audioResource = await createAudioResource(result.filePath);
      const videoTitle = result.details.title;
      const videoId = result.details.id;
      const entry = {
        filePath: result.filePath,
        audioResource,
        title: videoTitle,
        youtubeId: videoId,
      };
      return entry;
    } catch (e) {
      console.error(e);
      return null;
    }
  }
}

export default ShuffleManager;
