import db from "../../../db.js";
import { getVideoDetails } from "../platforms/youtube.js";
import { cache, type CacheKeyable } from "../../Cache.js";
import { encrypt } from "../../crypto.js";
import UserDataService from "../../UserDataService.js";

type Play = {
  ytId: string;
  title: string;
  lengthSeconds: number | null;
  lufs: number | null;
  userIds: string[];
  timestamps: number[];
  numPlays: number;
};

class InteractionService implements CacheKeyable {
  guildId: string;
  constructor(guildId: string) {
    this.guildId = guildId;
  }

  getCacheKey() {
    return encrypt(this.guildId);
  }

  async logSkip(data: { yt_id: string; timestamp: number; user_id: string }) {
    if (!(await UserDataService.hasConsented(data.user_id))) return;
    await db("skips").insert({
      guild_id: encrypt(this.guildId),
      ...data,
    });
  }

  async logPlay(
    youtubeId: string,
    extra?: {
      imported?: boolean;
      timestamp?: number;
      userId?: string;
    }
  ) {
    if (extra?.userId && !(await UserDataService.hasConsented(extra.userId)))
      return;
    const result = await getVideoDetails(youtubeId);
    if (!result) {
      console.error("Could not log play for YouTube ID", youtubeId);
      return;
    }
    const data = {
      title: result.title,
      yt_id: result.id,
      guild_id: encrypt(this.guildId),
      imported: !!extra?.imported,
      timestamp: extra?.timestamp ?? Date.now(),
      user_id: extra?.userId ? encrypt(extra.userId) : null,
    };
    console.log("Logging play: ", data);
    await db("plays").insert(data);
  }

  @cache<Play[]>("plays")
  async getPlays() {
    const encryptedGuildId = encrypt(this.guildId);

    const plays = (await db("plays")
      .select("plays.yt_id", "title", "length_seconds", "lufs")
      .select(db.raw("GROUP_CONCAT(DISTINCT user_id) as user_ids")) // Aggregate user_ids
      .select(db.raw("GROUP_CONCAT(DISTINCT timestamp) as timestamps")) // Aggregate timestamps
      .count("plays.yt_id as num_plays") // Count the number of plays for each yt_id
      .where({ guild_id: encryptedGuildId })
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

    return parsedPlays;
  }

  async getUserIdsWhoPlayed(youtubeId: string) {
    const user_ids = (await db("plays")
      .select(db.raw("GROUP_CONCAT(DISTINCT user_id) as user_ids"))
      .groupBy("yt_id")
      .where({ yt_id: youtubeId })) as {
      user_ids: string;
    }[];

    if (!user_ids?.[0]) return [];

    return user_ids[0].user_ids.split(",");
  }
}

export default InteractionService;
export type { Play };
