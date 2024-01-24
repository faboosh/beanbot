import { Store } from "@faboosh/direct-wire-js";
import { getToken, setToken } from "../token";
import { io } from "socket.io-client";

export type PlayerState = {
  playing: boolean;
  currentlyPlaying: string | null;
  currentSongStartedAtTs: number;
  playlist: string[];
  thumbnail: string;
  currentSongMetadata: {
    yt_id: string;
    yt_title: string;
    yt_author: string;
    spotify_title: string;
    spotify_author: string;
    length_seconds: number;
    lufs: number;
  } | null;
};

class PlayerDataStore extends Store {
  state: PlayerState = {
    playing: false,
    currentlyPlaying: null,
    currentSongStartedAtTs: 0,
    playlist: [],
    thumbnail: "",
    currentSongMetadata: null,
  };
  constructor() {
    super();
    let token = getToken();
    if (!token) {
      const currentUrl = window.location.href;
      const urlParams = new URLSearchParams(new URL(currentUrl).search);
      const token = urlParams.get("jwt");
      setToken(token as string);
    }
    const socket = io("http://localhost:3000", { query: { token } });

    socket.on("player-data", (data: PlayerState) => {
      this.setState(data);
    });
  }

  setState(newState: PlayerState) {
    this.state = newState;
    this.pubSub.publish("change", this.state);
  }

  onChange(callback: (state: PlayerState) => void) {
    return this.subscribe("change", callback);
  }
}

const playerState = new PlayerDataStore();

export default playerState;
