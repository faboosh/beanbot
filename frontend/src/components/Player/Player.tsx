import styled from "styled-components";
import PlayerNowPlaying from "./Player.NowPlaying";
import PlayerSearch from "./Player.Search";

const PlayerWrapper = styled.div`
  display: grid;
  height: 100vh;
  width: 100vw;
  grid-template-rows: 1fr auto;
`;

const Player = () => {
  return (
    <PlayerWrapper>
      <PlayerSearch />
      <PlayerNowPlaying style={{ gridRow: 2 }} />
    </PlayerWrapper>
  );
};

export default Player;
