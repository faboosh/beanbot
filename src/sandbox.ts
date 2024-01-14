import "dotenv/config";
import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import db from "./db";
// const clientID = process.env.spotify_client_id;
// const clientSecret = process.env.spotify_client_secret;
// if (!clientID || !clientSecret) throw new Error("ID or secret missing");

// const spotifySDK = SpotifyApi.withClientCredentials(clientID, clientSecret);

// const trackLink =
//   "https://open.spotify.com/track/2D4D3hiOf5U0W6SvJoCQph?si=823295e99317427a";

// function extractSpotifyTrackId(url: string) {
//   const regex = /https:\/\/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/;
//   const match = url.match(regex);

//   // Check if the URL matched the regex
//   if (match) {
//     // The first capturing group contains the track ID
//     return match[1];
//   } else {
//     // Return null or an appropriate value if the URL is not a valid Spotify track link
//     return null;
//   }
// }

// const trackID = extractSpotifyTrackId(trackLink);
// if (!trackID) throw new Error("Failed to extract track ID");
// spotifySDK.tracks.get(trackID).then((res) => {
//   console.log(res);
// });
const main = async () => {
  const count = await db("plays").update({ guild_id: "555418700123996163" });
  console.log(count);
  process.exit(0);
};

main();
