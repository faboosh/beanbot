import { and, desc, eq, sql } from "drizzle-orm";
import { drizzleDB } from "../db.js";
import { dataConsent, plays, skips, songs } from "../schema.js";
import { encrypt } from "./crypto.js";

class UserDataService {
  static async deleteUserData(userId: string) {
    try {
      await drizzleDB.delete(plays).where(eq(skips.userId, encrypt(userId)));
      await drizzleDB.delete(skips).where(eq(skips.userId, encrypt(userId)));
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  static async requestData(userId: string) {
    const encryptedUserId = encrypt(userId);
    const playsRes = await drizzleDB
      .select({
        numPlays: sql<number>`cast(COUNT(*) as int)`,
        youtubeId: songs.youtubeId,
        youtubeTitle: songs.youtubeTitle,
        youtubeAuthor: songs.youtubeAuthor,
        spotifyId: songs.spotifyId,
        spotifyTitle: songs.spotifyTitle,
        spotifyAuthor: songs.spotifyAuthor,
      })
      .from(plays)
      .where(eq(plays.userId, encryptedUserId))
      .groupBy(
        plays.songId,
        plays.userId,
        songs.youtubeId,
        songs.youtubeTitle,
        songs.youtubeAuthor,
        songs.spotifyId,
        songs.spotifyTitle,
        songs.spotifyAuthor
      )
      .leftJoin(songs, eq(plays.songId, songs.id))
      .orderBy(({ numPlays }) => desc(numPlays))
      .execute();

    const skipsRes = await drizzleDB
      .select({
        numPlays: sql<number>`cast(COUNT(*) as int)`,
        youtubeId: songs.youtubeId,
        youtubeTitle: songs.youtubeTitle,
        youtubeAuthor: songs.youtubeAuthor,
        spotifyId: songs.spotifyId,
        spotifyTitle: songs.spotifyTitle,
        spotifyAuthor: songs.spotifyAuthor,
      })
      .from(skips)
      .where(eq(skips.userId, encryptedUserId))
      .groupBy(
        skips.songId,
        skips.userId,
        songs.youtubeId,
        songs.youtubeTitle,
        songs.youtubeAuthor,
        songs.spotifyId,
        songs.spotifyTitle,
        songs.spotifyAuthor
      )
      .leftJoin(songs, eq(skips.songId, songs.id))
      .orderBy(({ numPlays }) => desc(numPlays))
      .execute();
    return {
      plays: playsRes,
      skips: skipsRes,
    };
  }

  static async optIn(userId: string) {
    const hasConsented = await UserDataService.hasConsented(userId);

    if (hasConsented) return;
    await drizzleDB
      .insert(dataConsent)
      .values({
        userId: encrypt(userId),
        consented: true,
      })
      .onConflictDoUpdate({
        target: dataConsent.userId,
        set: {
          consented: true,
        },
      });
  }

  static async optOut(userId: string) {
    const hasConsented = await UserDataService.hasConsented(userId);
    if (!hasConsented) return;
    await drizzleDB
      .insert(dataConsent)
      .values({
        userId: encrypt(userId),
        consented: false,
      })
      .onConflictDoUpdate({
        target: dataConsent.userId,
        set: {
          consented: false,
        },
      });
  }

  static async hasConsented(userId: string) {
    const exists = await drizzleDB
      .select()
      .from(dataConsent)
      .where(
        and(
          eq(dataConsent.consented, true),
          eq(dataConsent.userId, encrypt(userId))
        )
      )
      .execute();

    return !!exists.length;
  }
}

export default UserDataService;
