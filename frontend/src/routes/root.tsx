import React, { useEffect } from "react";
import { PlayerContextProvider } from "../context/PlayerContext";
import Player from "../components/Player/Player";

const Root = () => {
  useEffect(() => {
    document.title = "BeanBot WebUI";
  }, []);

  return (
    <PlayerContextProvider>
      <Player />
    </PlayerContextProvider>
  );
};

export default Root;
