import { component, styled } from "@faboosh/direct-wire-js";
import PlayerBottomBar from "./Player.BottomBar";
import PlayerSearch from "./Player.Search";
import PlayerQueue from "./Player.Queue";

const Wrapper = styled.div`
  display: grid;
  grid-template-rows: 1fr auto;
  height: 100vh;
  width: 100vw;
`();

const TopHalf = styled.div`
  display: grid;
  height: 100%;
  width: 100%;
  max-height: 100%;
  min-height: 0;
  grid-template-columns: 1fr clamp(200px, 25vw, 400px);
`();

const Player = component(() => {
  return {
    root: Wrapper([
      TopHalf([PlayerSearch(), PlayerQueue()]),
      PlayerBottomBar(),
    ]),
    cleanup() {},
  };
});

export default Player;
