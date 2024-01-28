import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { getToken, setToken } from "../token";
import { io } from "socket.io-client";
import { PlayerState } from "@shared/types";

const SOCKET_URL = import.meta.env.VITE_API_URL;

const defaultState: PlayerState = {
  playing: false,
  currentlyPlaying: null,
  currentSongStartedAtTs: 0,
  playlist: [],
  thumbnail: "",
  currentSongMetadata: null,
  seek: 0,
};

const PlayerContext = createContext<PlayerState>(defaultState);

const PlayerContextProvider = ({ children }: { children: ReactNode }) => {
  const [playerState, setPlayerState] = useState<PlayerState>(defaultState);

  useEffect(() => {
    let token = getToken();
    if (!token) {
      const currentUrl = window.location.href;
      const urlParams = new URLSearchParams(new URL(currentUrl).search);
      const token = urlParams.get("jwt");
      setToken(token as string);
    }
    const socket = io(SOCKET_URL, { query: { token } });

    socket.on("player-data", (data: PlayerState) => {
      setPlayerState(data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <PlayerContext.Provider value={playerState}>
      {children}
    </PlayerContext.Provider>
  );
};

const usePlayerContext = () => useContext(PlayerContext);

export { PlayerContextProvider, usePlayerContext };
