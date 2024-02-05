function _define_property(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  } else {
    obj[key] = value;
  }
  return obj;
}
import "dotenv-esm/config.js";
import { decode, encode } from "@msgpack/msgpack";
import fs from "fs";
import "reflect-metadata";
import { logError, logMessage } from "./log.js";
class Cache {
  get(key) {
    var _this_entries;
    if (!this.isValid(key)) return null;
    return (_this_entries = this.entries) === null || _this_entries === void 0
      ? void 0
      : _this_entries[key].data;
  }
  set(key, val) {
    this.entries[key] = {
      data: val,
      ts: Date.now(),
    };
    if (!process.env.disable_cache) this.saveToDisk();
  }
  isValid(key) {
    var _this_entries_key, _this_entries;
    if (process.env.disable_cache) return false;
    const now = Date.now();
    const ts =
      (_this_entries = this.entries) === null || _this_entries === void 0
        ? void 0
        : (_this_entries_key = _this_entries[key]) === null ||
          _this_entries_key === void 0
        ? void 0
        : _this_entries_key.ts;
    if (!ts) return false;
    const diff = now - ts;
    if (diff > this.INVALIDATE_AFTER_MS) return false;
    return true;
  }
  setInvalidateAfterMs(ms) {
    this.INVALIDATE_AFTER_MS = ms;
  }
  saveToDisk() {
    if (!fs.existsSync(this.CACHE_DIR)) fs.mkdirSync(this.CACHE_DIR);
    if (this.writeTimeout) clearTimeout(this.writeTimeout);
    setTimeout(() => {
      logMessage(`Writing cache "${this.name}" to disk`);
      fs.writeFile(this.path, encode(this.entries), (err) => {
        if (err) logError(err);
        logMessage(`Finished writing cache "${this.name}" to disk`);
      });
    }, this.WRITE_DEBOUNCE_MS);
  }
  restoreFromDisk() {
    if (!fs.existsSync(this.path)) return;
    logMessage(`Reading cache "${this.name}" from disk`);
    fs.readFile(this.path, (err, json) => {
      if (err) return logError(err);
      const data = decode(json);
      this.entries = data;
      logMessage(`Finished reading cache "${this.name}" from disk`);
    });
  }
  constructor(name) {
    _define_property(this, "INVALIDATE_AFTER_MS", 24 * 60 * 60 * 1000);
    _define_property(this, "CACHE_DIR", "./cache");
    _define_property(this, "WRITE_DEBOUNCE_MS", 1000);
    _define_property(this, "path", void 0);
    _define_property(this, "entries", {});
    _define_property(this, "name", void 0);
    _define_property(this, "writeTimeout", void 0);
    if (process.env.disable_cache) logMessage(`[${name}] Cache disabled `);
    this.name = name;
    this.path = `${this.CACHE_DIR}/${this.name.replace(/\//gim, "_")}.cache`;
    if (!process.env.disable_cache) this.restoreFromDisk();
  }
}
const caches = {};
// ...
function cache(name, durationMs = 24 * 60 * 60 * 1000) {
  const cacheDecorator = (target, propertyKey, descriptor) => {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args) {
      var _this;
      const dynamicCacheKey = (
        (_this = this) === null || _this === void 0 ? void 0 : _this.getCacheKey
      )
        ? this.getCacheKey()
        : null;
      const argsKey = `${args ? `-${args.join("-")}` : ""}`;
      const cacheKey = `${
        dynamicCacheKey ? `${name}-${dynamicCacheKey}` : name
      }${argsKey}`;
      if (!caches[cacheKey]) caches[cacheKey] = new Cache(cacheKey);
      const cache = caches[cacheKey];
      if (cache.isValid(cacheKey)) return cache.get(cacheKey);
      const result = await originalMethod.apply(this, args);
      cache.set(cacheKey, result);
      return result;
    };
    return descriptor;
  };
  return cacheDecorator;
}
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const timeConstants = {
  SECOND,
  MINUTE,
  HOUR,
  DAY,
};
export default Cache;
export { cache, timeConstants };
