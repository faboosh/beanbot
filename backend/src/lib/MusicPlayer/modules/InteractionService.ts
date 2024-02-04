import { drizzleDB } from "../../../db.js";
import { cache, timeConstants, type CacheKeyable } from "../../Cache.js";
import { encrypt } from "../../crypto.js";
import UserDataService from "../../UserDataService.js";
import {
  type CreatePlay,
  type SongWithPlaysAndSkips,
  plays,
  skips,
} from "../../../schema.js";
import SongMetadataService from "./SongMetadataService.js";

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

    const payload = {
      userId: encrypt(data.userId),
      timestamp: data.timestamp ?? new Date(),
      guildId: encrypt(this.guildId),
      songId: data.songId ?? "",
    };

    if (data.youtubeId) {
      const metadata = await SongMetadataService.getOrCreatePlaybackMetadata(
        data.youtubeId
      );
      if (!metadata) throw new Error("Could not get metadata");
      data.songId = metadata.id;
      await drizzleDB.insert(skips).values(payload);

      return;
    } else if (data.songId) {
      await drizzleDB.insert(skips).values(payload);

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

    const payload = {
      userId: encrypt(data.userId),
      timestamp: data.timestamp ?? new Date(),
      imported: data.imported ?? false,
      guildId: encrypt(this.guildId),
      songId: data.songId ?? "",
    };

    if (data.youtubeId) {
      const metadata = await SongMetadataService.getOrCreatePlaybackMetadata(
        data.youtubeId
      );
      if (!metadata) throw new Error("Could not get metadata");
      data.songId = metadata.id;
      await drizzleDB.insert(plays).values(payload);
    } else if (data.songId) {
      await drizzleDB.insert(plays).values(payload);
    } else {
      throw new Error("Must provide either youtubeId or songId");
    }
  }

  @cache<SongWithPlaysAndSkips[]>("plays", timeConstants.HOUR * 12)
  async getPlays() {
    const encryptedGuildId = encrypt(this.guildId);

    const plays = await drizzleDB.query.songs.findMany({
      with: {
        skips: {
          where: (skips, { eq }) => eq(skips.guildId, encryptedGuildId),
        },
        plays: {
          where: (skips, { eq }) => eq(skips.guildId, encryptedGuildId),
        },
      },
    });

    return plays;
  }

  @cache<string[]>("users-who-played", timeConstants.HOUR)
  async getUserIdsWhoPlayed(youtubeId: string) {
    const song = await drizzleDB.query.songs.findFirst({
      where: (songs, { eq }) => eq(songs.youtubeId, youtubeId),
    });
    if (!song) throw new Error("Song not found");
    const userIds = await drizzleDB.query.plays.findMany({
      columns: {
        userId: true,
      },
      where: (plays, { eq }) => eq(plays.songId, song.id),
    });

    return userIds.map((userId) => userId.userId);
  }
}

export default InteractionService;
