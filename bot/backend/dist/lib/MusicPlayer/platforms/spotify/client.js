import "dotenv-esm/config";
import { SpotifyApi } from "@spotify/web-api-ts-sdk";
const clientID = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
if (!clientID || !clientSecret) throw new Error("Spotify Client ID or Client Secret missing");
const spotify = SpotifyApi.withClientCredentials(clientID, clientSecret);
export default spotify;
