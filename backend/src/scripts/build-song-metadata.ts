import "dotenv-esm/config";
import db from "../db.js";

const main = async () => {
  const songs = (await db("plays")
    .select("yt_id", "filename")
    .groupBy("yt_id")) as { yt_id: string; filename: string }[];

  let progress = 0;

  const chunkSize = 50;
  for (let i = 0; i < songs.length; i += chunkSize) {
    const chunk = songs.slice(i, i + chunkSize);
    const promises = Promise.all(chunk.map(async (song) => {}));

    await promises;
  }

  process.exit(0);
};

main();
