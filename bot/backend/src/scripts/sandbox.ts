import "dotenv-esm/config";
import { drizzleDB } from "../db.js";
import { fstat, readFileSync, write, writeFileSync } from "fs";
import ShuffleManager from "../lib/MusicPlayer/modules/ShuffleManager.js";
import {
  genres,
  plays,
  songs,
  songsToGenres,
  songsToGenresRelation,
} from "../schema.js";
import { eq, not, sql } from "drizzle-orm";
import { decrypt } from "../lib/crypto.js";

const main = async () => {
  const genreCounts = drizzleDB.$with("genre_counts").as(
    drizzleDB
      .select({
        userId: sql`${plays.userId}`.mapWith(decrypt).as("userId"),
        genreName: genres.name,
        genreCount: sql`COUNT(*)`.as("genreCount"),
      })
      .from(plays)
      .where(sql`${plays.userId} IS NOT NULL`)
      .fullJoin(songsToGenres, eq(plays.songId, songsToGenres.songId))
      .fullJoin(genres, eq(songsToGenres.genreId, genres.id))
      .groupBy(plays.userId, genres.name)
  );

  const genresForUser = await drizzleDB
    .with(genreCounts)
    .select({
      userId: genreCounts.userId,
      genres:
        sql`STRING_AGG(${genreCounts.genreName} || ';;' || ${genreCounts.genreCount}, ', '  ORDER BY ${genreCounts.genreCount} DESC)`.mapWith(
          (val) =>
            val.split(", ").map((genre: string) => {
              const [name, count] = genre.split(";;");
              return { name, count };
            }) as { name: string; count: number }[]
        ),
    })
    .from(genreCounts)
    .groupBy(genreCounts.userId);

  console.log(genresForUser);
  // writeFileSync("./genresForUser.json", JSON.stringify(genresForUser, null, 2));
  process.exit(0);
};

main();
