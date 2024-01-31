import "dotenv-esm/config";
import { encrypt } from "../lib/crypto.js";
import { plays, songs } from "../schema.js";
import { desc, eq, sql } from "drizzle-orm";
import { drizzleDB } from "../db.js";

const userId = "264599423076532225";

const main = async () => {
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
    .where(eq(plays.userId, encrypt(userId)))
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

  console.log(playsRes);
  process.exit(0);
};

main();
