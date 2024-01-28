import State from "@faboosh/direct-wire-js/dist/state.js";
import type { PlayerState } from "@shared/types";

class MusicPlayerState extends State {
  state: PlayerState = {
    playing: false,
    currentlyPlaying: null,
    playlist: [],
    currentSongStartedAtTs: 0,
    currentSongMetadata: null,
    thumbnail: "",
    seek: 0,
  };

  setState<K extends keyof PlayerState>(key: K, val: PlayerState[K]) {
    this.state[key] = val;
    this.pubSub.publish("change", this.state);
  }

  onChange(callback: (state: PlayerState) => void) {
    this.subscribe("change", callback);
  }
}

const states = new Map<string, MusicPlayerState>();

const createPlayerState = (guildId: string) => {
  const state = new MusicPlayerState();
  states.set(guildId, state);
  return state;
};

const getOrCreatePlayerState = (guildId: string) => {
  if (!states.get(guildId)) return createPlayerState(guildId);

  return states.get(guildId) as MusicPlayerState;
};

const getPlayerState = (guildId: string) => {
  return states.get(guildId);
};

export { createPlayerState, getOrCreatePlayerState, getPlayerState };
export default MusicPlayerState;
