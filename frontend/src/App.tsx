import Player from "./components/Player/Player";
import { PlayerContextProvider } from "./context/PlayerContext";

function App() {
  return (
    <>
      <PlayerContextProvider>
        <Player />
      </PlayerContextProvider>
    </>
  );
}

export default App;
