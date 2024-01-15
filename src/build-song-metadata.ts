import "dotenv/config";
import { getLoudness, getMetadata } from "./lib/ffmpeg";
import db from "./db";

const main = async () => {
  const songs = (await db("plays")
    .select("yt_id", "filename")
    .groupBy("yt_id")) as { yt_id: string; filename: string }[];

  let progress = 0;

  const chunkSize = 50;
  for (let i = 0; i < songs.length; i += chunkSize) {
    const chunk = songs.slice(i, i + chunkSize);
    const promises = Promise.all(
      chunk.map(async (song) => {
        try {
          // const ffmpegData = (await getMetadata(song.filename)) as any;
          // const lengthSeconds = ffmpegData.streams?.[0].duration;
          const lufs = await getLoudness(song.filename);

          const data = {
            yt_id: song.yt_id,
            // length_seconds: lengthSeconds,
            lufs: lufs,
          };

          await db("song_metadata").insert(data).onConflict("yt_id").merge();
          progress++;
          console.log(progress, "/", songs.length, "processed");
        } catch (e) {
          console.error(e);
        }
      })
    );

    await promises;
  }

  process.exit(0);
};

main();
