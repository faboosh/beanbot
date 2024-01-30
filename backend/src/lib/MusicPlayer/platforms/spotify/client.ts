import "dotenv-esm/config";
import { SpotifyApi } from "@spotify/web-api-ts-sdk";

const clientID = process.env.spotify_client_id;
const clientSecret = process.env.spotify_client_secret;

if (!clientID || !clientSecret)
  throw new Error("Spotify Client ID or Client Secret missing");

const spotify = SpotifyApi.withClientCredentials(clientID, clientSecret);

export default spotify;
