import "dotenv/config";
import { getMetadata } from "./lib/ffmpeg";
import db from "./db";

const main = async () => {
  const songs = (await db("plays")
    .select("yt_id", "filename")
    .groupBy("yt_id")) as { yt_id: string; filename: string }[];

  console.log(songs);

  const promises = Promise.all(
    songs.map(async (song) => {
      try {
        const ffmpegData = (await getMetadata(song.filename)) as any;

        const lengthSeconds = ffmpegData.streams?.[0].duration;
        const data = {
          yt_id: song.yt_id,
          length_seconds: lengthSeconds,
          volume_multiplier: 1,
        };

        await db("song_metadata").insert(data);
      } catch (e) {
        console.error(e);
      }
    })
  );

  await promises;

  process.exit(0);
};

main();
