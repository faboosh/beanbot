// import { encode } from "@msgpack/msgpack";
// import { readFileSync, readdirSync, writeFileSync } from "fs";
const spotifyUrl =
  "https://open.spotify.com/playlist/0eLy71zrghzGSXEvLvz5TC?si=ce4750728fbf4a48";
import db from "../db.js";
import { spotifyPlaylistToYoutubeIds } from "../lib/MusicPlayer/platforms/spotify/playlist.js";
const main = async () => {
  // console.log(await spotifyPlaylistToYoutubeIds(spotifyUrl));
  const recentPlays = await db("plays")
    .where("timestamp", ">", Date.now() - 1000 * 60 * 60)
    .join("song_metadata", "plays.yt_id", "=", "song_metadata.yt_id")
    .select(
      "song_metadata.yt_title",
      "song_metadata.yt_author",
      "song_metadata.spotify_title",
      "song_metadata.spotify_author",
      "plays.yt_id"
    );
  console.log(recentPlays);
  process.exit(0);
};

main();
