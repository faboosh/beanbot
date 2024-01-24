import db from "../../../db.js";
import { downloadById } from "../platforms/youtube.js";
import Cache from "../../Cache.js";

type Play = {
  ytId: string;
  title: string;
  lengthSeconds: number | null;
  lufs: number | null;
  userIds: string[];
  timestamps: number[];
  numPlays: number;
};

class InteractionService {
  guildId: string;
  playsCache: Cache<Play[]>;
  constructor(guildId: string) {
    this.guildId = guildId;
    this.playsCache = new Cache<Play[]>(`${guildId}-plays`);
  }

  async logSkip(data: { yt_id: string; timestamp: number; user_id: string }) {
    await db("skips").insert({
      guild_id: this.guildId,
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
    const result = await downloadById(youtubeId);
    if (!result) {
      console.error("Could not log play for YouTube ID", youtubeId);
      return;
    }
    const data = {
      title: result.details.title,
      yt_id: result.details.id,
      filename: result.filePath,
      guild_id: this.guildId,
      imported: !!extra?.imported,
      timestamp: extra?.timestamp ?? Date.now(),
      user_id: extra?.userId ?? Date.now(),
    };
    console.log("Logging play: ", data);
    await db("plays").insert(data);
  }

  async getPlays() {
    console.time("getPlays");

    const playsFromCache = this.playsCache.get(this.guildId);
    if (playsFromCache) {
      console.timeEnd("getPlays");
      return playsFromCache;
    }
    const plays = (await db("plays")
      .select("plays.yt_id", "title", "length_seconds", "lufs")
      .select(db.raw("GROUP_CONCAT(DISTINCT user_id) as user_ids")) // Aggregate user_ids
      .select(db.raw("GROUP_CONCAT(DISTINCT timestamp) as timestamps")) // Aggregate timestamps
      .count("plays.yt_id as num_plays") // Count the number of plays for each yt_id
      .where({ guild_id: this.guildId })
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

    this.playsCache.set(this.guildId, parsedPlays);
    console.timeEnd("getPlays");
    return parsedPlays;
  }

  async getUserIdsWhoPlayed(youtubeId: string) {
    return (await db("plays")
      .select(db.raw("GROUP_CONCAT(DISTINCT user_id) as user_ids"))
      .groupBy("yt_id")
      .where({ yt_id: youtubeId })) as {
      user_ids: string;
    }[];
  }
}

export default InteractionService;
export type { Play };
