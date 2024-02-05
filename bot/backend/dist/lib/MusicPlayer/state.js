function _define_property(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
import State from "@faboosh/direct-wire-js/dist/state.js";
class MusicPlayerState extends State {
    setState(key, val) {
        this.state[key] = val;
        this.pubSub.publish("change", this.state);
    }
    onChange(callback) {
        this.subscribe("change", callback);
    }
    constructor(...args){
        super(...args);
        _define_property(this, "state", {
            playing: false,
            currentlyPlaying: null,
            playlist: [],
            currentSongStartedAtTs: 0,
            currentSongMetadata: null,
            thumbnail: "",
            seek: 0
        });
    }
}
const states = new Map();
const createPlayerState = (guildId)=>{
    const state = new MusicPlayerState();
    states.set(guildId, state);
    return state;
};
const getOrCreatePlayerState = (guildId)=>{
    if (!states.get(guildId)) return createPlayerState(guildId);
    return states.get(guildId);
};
const getPlayerState = (guildId)=>{
    return states.get(guildId);
};
function PublishStateChange(stateProp) {
    return function(target, propertyName) {
        let value = target[propertyName];
        const getter = ()=>{
            return value;
        };
        const setter = (newValue)=>{
            value = newValue;
            // Assuming playerState has a method called `setState` to update its state
            target.playerState.setState(stateProp, newValue);
        };
        Object.defineProperty(target, propertyName, {
            get: getter,
            set: setter,
            enumerable: true,
            configurable: true
        });
    };
}
export { createPlayerState, getOrCreatePlayerState, getPlayerState, PublishStateChange };
export default MusicPlayerState;
