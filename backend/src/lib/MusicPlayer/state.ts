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

function PublishStateChange(stateProp: string) {
  return function (target: any, propertyName: string) {
    let value: any = target[propertyName];

    const getter = () => {
      return value;
    };

    const setter = (newValue: any) => {
      value = newValue;
      // Assuming playerState has a method called `setState` to update its state
      target.playerState.setState(stateProp, newValue);
    };

    Object.defineProperty(target, propertyName, {
      get: getter,
      set: setter,
      enumerable: true,
      configurable: true,
    });
  };
}

export {
  createPlayerState,
  getOrCreatePlayerState,
  getPlayerState,
  PublishStateChange,
};
export default MusicPlayerState;
