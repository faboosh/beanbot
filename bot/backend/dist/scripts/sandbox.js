import "dotenv-esm/config";
import { drizzleDB } from "../db.js";
import { genres, plays, songsToGenres } from "../schema.js";
import { eq, sql } from "drizzle-orm";
import { decrypt } from "../lib/crypto.js";
const main = async ()=>{
    // const genresForUser = await drizzleDB
    //   .select({
    //     userId: plays.userId,
    //     genreName: genres.name,
    //   })
    //   .from(plays)
    //   .leftJoin(songsToGenres, eq(plays.songId, songsToGenres.songId))
    //   .leftJoin(genres, eq(songsToGenres.genreId, genres.id))
    //   .orderBy(genres.name);
    const genreCounts = drizzleDB.$with("genre_counts").as(drizzleDB.select({
        userId: sql`${plays.userId}`.mapWith(decrypt).as("userId"),
        genreName: genres.name,
        genreCount: sql`COUNT(*)`.as("genreCount")
    }).from(plays).where(sql`${plays.userId} IS NOT NULL`).fullJoin(songsToGenres, eq(plays.songId, songsToGenres.songId)).fullJoin(genres, eq(songsToGenres.genreId, genres.id)).groupBy(plays.userId, genres.name));
    const genresForUser = await drizzleDB.with(genreCounts).select({
        userId: genreCounts.userId,
        genres: sql`STRING_AGG(${genreCounts.genreName} || ';;' || ${genreCounts.genreCount}, ', '  ORDER BY ${genreCounts.genreCount} DESC)`.mapWith((val)=>val.split(", ").map((genre)=>{
                const [name, count] = genre.split(";;");
                return {
                    name,
                    count
                };
            }))
    }).from(genreCounts).groupBy(genreCounts.userId);
    // .select({
    //   userId: plays.userId,
    //   genres:
    //     sql`STRING_AGG(${genres.name} || ' ' ${genreCounts.genreCount}, ', '  ORDER BY ${genres.name})`.mapWith(
    //       (val) => val.split(", ")
    //     ),
    // })
    // .from(plays)
    // .fullJoin(songsToGenres, eq(plays.songId, songsToGenres.songId))
    // .fullJoin(genres, eq(songsToGenres.genreId, genres.id))
    // .groupBy(plays.userId)
    // .orderBy(plays.userId);
    console.log(genresForUser);
    // writeFileSync("./genresForUser.json", JSON.stringify(genresForUser, null, 2));
    process.exit(0);
};
main();
