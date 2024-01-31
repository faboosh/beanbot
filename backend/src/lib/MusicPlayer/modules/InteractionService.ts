import { drizzleDB } from "../../../db.js";
import { cache, type CacheKeyable } from "../../Cache.js";
import { encrypt } from "../../crypto.js";
import UserDataService from "../../UserDataService.js";
import { plays, skips, songs, type CreatePlay } from "../../../schema.js";
import { desc, eq, sql } from "drizzle-orm";
import SongMetadataService from "./SongMetadataService.js";

type Play = {
  songId: string | null;
  numPlays: number;
  playedAt: Date[];
  playedBy: string[];
  lengthSeconds: number | null;
  youtubeId: string | null;
  youtubeTitle: string | null;
};

class InteractionService implements CacheKeyable {
  guildId: string;
  constructor(guildId: string) {
    this.guildId = guildId;
  }

  getCacheKey() {
    return encrypt(this.guildId);
  }

  async logSkip(data: {
    userId: string;
    youtubeId?: string;
    songId?: string;
    timestamp?: Date;
  }) {
    if (!(await UserDataService.hasConsented(data.userId))) return;

    if (data.youtubeId) {
      const metadata = await SongMetadataService.getPlaybackMetadata(
        data.youtubeId
      );
      await drizzleDB
        .insert(skips)
        .values({
          userId: encrypt(data.userId),
          songId: metadata.id,
          timestamp: data.timestamp ?? new Date(),
          guildId: encrypt(this.guildId),
        })
        .execute();
      return;
    } else if (data.songId) {
      await drizzleDB
        .insert(skips)
        .values({
          userId: encrypt(data.userId),
          songId: data.songId,
          timestamp: data.timestamp ?? new Date(),
          guildId: encrypt(this.guildId),
        })
        .execute();
      return;
    } else {
      throw new Error("Must provide either youtubeId or songId");
    }
  }

  async logPlay(
    data: Pick<CreatePlay, "userId"> & {
      timestamp?: Date;
      songId?: string;
      youtubeId?: string;
      imported?: boolean;
    }
  ) {
    if (data.userId && !(await UserDataService.hasConsented(data.userId)))
      return;

    if (data.youtubeId) {
      const metadata = await SongMetadataService.getPlaybackMetadata(
        data.youtubeId
      );
      await drizzleDB
        .insert(plays)
        .values({
          userId: encrypt(data.userId),
          songId: metadata.id,
          timestamp: data.timestamp ?? new Date(),
          imported: data.imported ?? false,
          guildId: encrypt(this.guildId),
        })
        .execute();
      return;
    } else if (data.songId) {
      await drizzleDB
        .insert(plays)
        .values({
          userId: encrypt(data.userId),
          songId: data.songId,
          timestamp: data.timestamp ?? new Date(),
          imported: data.imported ?? false,
          guildId: encrypt(this.guildId),
        })
        .execute();
      return;
    } else {
      throw new Error("Must provide either youtubeId or songId");
    }
  }

  @cache<Play[]>("plays")
  async getPlays() {
    const encryptedGuildId = encrypt(this.guildId);

    const playsRes = await drizzleDB
      .select({
        songId: plays.songId,
        numPlays: sql<number>`cast(COUNT(${plays.songId}) as int)`,
        playedAt: sql<string>`string_agg(DISTINCT ${plays.timestamp}::text, ',')`,
        playedBy: sql<string>`string_agg(DISTINCT ${plays.userId}::text, ',')`,
        lengthSeconds: songs.lengthSeconds,
        youtubeTitle: songs.youtubeTitle,
        youtubeId: songs.youtubeId,
      })
      .from(plays)
      .where(eq(plays.guildId, encryptedGuildId))
      .fullJoin(songs, eq(plays.songId, songs.id))
      .orderBy(({ numPlays }) => desc(numPlays))
      .groupBy(
        plays.songId,
        songs.lengthSeconds,
        songs.youtubeId,
        songs.youtubeTitle
      );

    const parsedPlays = playsRes.map((play) => {
      (play as any).playedAt = play.playedAt
        .split(",")
        .map((data) => new Date(data));
      (play as any).playedBy = play.playedBy.split(",");
      return play as unknown as Play;
    });

    return parsedPlays;
  }

  async getUserIdsWhoPlayed(youtubeId: string) {
    const userIds = await drizzleDB
      .select({
        userIds: sql<string>`string_agg(DISTINCT ${plays.userId}::text, ',')`,
      })
      .from(plays)
      .where(eq(plays.songId, youtubeId))
      .groupBy(plays.songId)
      .execute();

    if (!userIds?.[0]) return [];

    return userIds[0].userIds.split(",");
  }
}

export default InteractionService;
export type { Play };
