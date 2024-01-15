import { createAudioResource } from "@discordjs/voice";
import { Guild, VoiceChannel } from "discord.js";
import { PlaylistEntry } from "./playlistManager";
import db from "../db";
import { downloadById } from "./youtube";
import Cache from "./cache";
import PlayHistory from "./playHistory";
import { getUniqueValues } from "./util";

type Play = { yt_id: string; user_id: string };

type WeightedPlay = {
  yt_id: string;
  weight: number;
};

class ShuffleManager {
  guild: Guild;
  channelId: string;
  playHistory: PlayHistory;
  numMembersPlayedCache: Cache<number>;
  popularityOverTimeCache: Cache<number[]>;
  playsCache: Cache<Play[]>;
  numPlaysCache: Cache<number>;
  constructor(guild: Guild, channelId: string) {
    this.guild = guild;
    this.channelId = channelId;
    this.numMembersPlayedCache = new Cache<number>(
      `${this.guild.id}-num-members-played`
    );
    this.popularityOverTimeCache = new Cache<number[]>(
      `${this.guild.id}-popularity-over-time`
    );
    this.numPlaysCache = new Cache<number>(`${this.guild.id}-num-plays`);
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

  private groupByNumPlays(plays: Play[]) {
    const uniqueIds = getUniqueValues(plays, "yt_id");

    return uniqueIds.map((yt_id: string) => {
      let numPlays = this.numPlaysCache.get(yt_id);
      if (numPlays === null) {
        numPlays = plays.filter((play) => play.yt_id === yt_id).length;
        this.numPlaysCache.set(yt_id, numPlays);
      }
      return {
        yt_id,
        weight: numPlays,
      };
    }) as WeightedPlay[];
  }

  private async getPlays() {
    const userIds = await this.getCurrentVoiceMembers();

    const plays: Play[] = (
      await Promise.all(
        userIds.map(async (userId) => {
          try {
            const cachedPlays = this.playsCache.get(userId);
            if (cachedPlays) {
              for (let j = 0; j < cachedPlays.length; j++) {
                return cachedPlays;
              }
            }

            const playsForUser: Play[] = await db("plays")
              .where({ guild_id: this.guild.id, user_id: userId })
              .select("yt_id", "user_id");

            this.playsCache.set(userId, playsForUser);

            return playsForUser;
          } catch (e) {
            console.error(`Error fetching plays for user: `, userId);
            return [];
          }
        })
      )
    ).flatMap((plays) => plays);

    return plays;
  }

  private filterNotRecentlyPlayed(entries: Play[]) {
    return entries.filter((play) => {
      return !this.playHistory.isInHistory(play.yt_id);
    });
  }

  private async weightByNumMembersPlayedCount(entries: WeightedPlay[]) {
    console.time("weightByNumMembersPlayedCount:fetch");

    const currentMembers = await this.getCurrentVoiceMembers();
    console.timeEnd("weightByNumMembersPlayedCount:fetch");

    console.time("weightByNumMembersPlayedCount:compute");
    let iters = 0;

    const alreadyCounted: Record<string, boolean> = {};

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      for (let j = 0; j < currentMembers.length; j++) {
        const userId = currentMembers[j];
        const key = `${entry.yt_id}-${userId}`;
        iters++;
        if (alreadyCounted[key]) continue;

        alreadyCounted[key] = true;
        entry.weight += 1;
      }
    }
    console.timeEnd("weightByNumMembersPlayedCount:compute");
    console.log("Ran", iters, "iterations");

    return entries;
  }

  private async weightByPopularityOverTime(entries: WeightedPlay[]) {
    const getPlayedAtTimestamps = async (entry: WeightedPlay) => {
      try {
        const cacheKey = String(entry.yt_id);
        const cachedValue = this.popularityOverTimeCache.get(cacheKey);
        if (cachedValue) return cachedValue;

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
      console.time("getNext total");
      console.time("getPlays");
      const plays = await this.getPlays();
      console.timeEnd("getPlays");
      console.time("offline operations");
      let filteredPlays = this.filterNotRecentlyPlayed(plays);
      let weightedPlays = this.groupByNumPlays(filteredPlays);
      console.timeEnd("offline operations");
      console.time("weightByNumMembersPlayedCount");
      weightedPlays = await this.weightByNumMembersPlayedCount(weightedPlays);
      console.timeEnd("weightByNumMembersPlayedCount");
      console.time("weightByPopularityOverTime");
      weightedPlays = await this.weightByPopularityOverTime(weightedPlays);
      console.timeEnd("weightByPopularityOverTime");

      const weightsArr = weightedPlays.flatMap((play) =>
        Array(play.weight)
          .fill(null)
          .map(() => play.yt_id)
      );
      const nextId = weightsArr[Math.round(Math.random() * weightsArr.length)];
      if (!nextId) return;
      const entry = await this.downloadAsEntry(nextId);
      if (!entry) return;
      const shuffleWeight = weightsArr.filter((id) => id === nextId).length;
      const percent = (shuffleWeight / weightsArr.length) * 100;
      console.log(
        "Shuffle weight:",
        weightsArr.filter((id) => id === nextId).length,
        percent,
        "% chance"
      );

      console.timeEnd("getNext total");
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
