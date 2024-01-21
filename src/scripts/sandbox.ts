import { writeFileSync } from "fs";
import db from "../db";
import { generatePlayingCard } from "../lib/canvas/canvas";
import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import { downloadById } from "../lib/MusicPlayer/platforms/youtube";

const youtubeId = "o_hXGZ8NXAA";

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Application specific logging, throwing an error, or other logic here
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  // Application specific logging, throwing an error, or other logic here
});

const main = async () => {
  console.log(await downloadById(youtubeId));
  const ids = (
    await db("song_metadata")
      .select("yt_id")
      .where(function () {
        this.where("yt_title", "").orWhereNull("yt_title");
      })
  ).map(({ yt_id }) => yt_id) as string[];

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    console.log(`${i + 1}/${ids.length}`);
    try {
      const data = await downloadById(id);

      if (!data) {
        console.log("failed to download");
        continue;
      }

      await db("song_metadata")
        .insert({
          yt_id: id,
          yt_title: data.details.title,
          yt_author: data.details.author,
        })
        .onConflict("yt_id")
        .merge();
    } catch (e) {
      console.error(e);
    }
  }

  process.exit(0);
};

main();
