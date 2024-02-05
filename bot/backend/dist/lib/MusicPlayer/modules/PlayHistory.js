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
import Cache from "../../Cache.js";
import { encrypt } from "../../crypto.js";
class PlayHistory {
    add(youtubeId) {
        this.cache.set(youtubeId, youtubeId);
    }
    isInHistory(youtubeId) {
        return this.cache.isValid(youtubeId);
    }
    constructor(guild){
        _define_property(this, "cache", void 0);
        _define_property(this, "playHistory", []);
        _define_property(this, "guild", void 0);
        this.guild = guild;
        this.cache = new Cache(`${encrypt(guild.id)}-play-history`);
        // Invalidate after 12 hours to keep from repeating
        this.cache.setInvalidateAfterMs(12 * 60 * 60 * 1000);
    }
}
export default PlayHistory;
