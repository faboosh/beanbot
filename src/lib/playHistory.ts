import { Guild } from "discord.js";
import Cache from "./cache";

class PlayHistory {
  cache: Cache<string>;
  playHistory: [] = [];
  guild: Guild;

  constructor(guild: Guild) {
    this.guild = guild;
    this.cache = new Cache<string>(`${guild.id}-play-history`);
    // Invalidate after 12 hours to keep from repeating
    this.cache.setInvalidateAfterMs(12 * 60 * 60 * 1000);
  }

  add(youtubeId: string) {
    this.cache.set(youtubeId, youtubeId);
  }

  isInHistory(youtubeId: string) {
    return this.cache.isValid(youtubeId);
  }
}

export default PlayHistory;
