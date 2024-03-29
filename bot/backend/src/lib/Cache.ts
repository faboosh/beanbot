import "dotenv-esm/config";
import { decode, encode } from "@msgpack/msgpack";
import fs from "fs";
import "reflect-metadata";
import { logError, logMessage } from "./log.js";

class Cache<T> {
  INVALIDATE_AFTER_MS = 24 * 60 * 60 * 1000;
  CACHE_DIR = "./cache";
  WRITE_DEBOUNCE_MS = 1000;
  path: string;
  entries: Record<string, { ts: number; data: T }> = {};
  name: string;
  writeTimeout?: string | number | NodeJS.Timeout | undefined;

  constructor(name: string) {
    if (process.env.disable_cache) logMessage(`[${name}] Cache disabled `);
    this.name = name;
    this.path = `${this.CACHE_DIR}/${this.name.replace(/\//gim, "_")}.cache`;
    if (!process.env.disable_cache) this.restoreFromDisk();
  }

  get(key: string) {
    if (!this.isValid(key)) return null;
    return this.entries?.[key].data;
  }

  set(key: string, val: T) {
    this.entries[key] = {
      data: val,
      ts: Date.now(),
    };
    if (!process.env.disable_cache) this.saveToDisk();
  }

  isValid(key: string) {
    if (process.env.disable_cache) return false;
    const now = Date.now();
    const ts = this.entries?.[key]?.ts;
    if (!ts) return false;

    const diff = now - ts;
    if (diff > this.INVALIDATE_AFTER_MS) return false;
    return true;
  }

  setInvalidateAfterMs(ms: number) {
    this.INVALIDATE_AFTER_MS = ms;
  }

  private saveToDisk() {
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

  private restoreFromDisk() {
    if (!fs.existsSync(this.path)) return;
    logMessage(`Reading cache "${this.name}" from disk`);

    fs.readFile(this.path, (err, json) => {
      if (err) return logError(err);
      const data = decode(json) as any;
      this.entries = data;
      logMessage(`Finished reading cache "${this.name}" from disk`);
    });
  }
}

const caches: Record<string, Cache<any>> = {};

// ...

function cache<T>(name: string, durationMs: number = 24 * 60 * 60 * 1000) {
  const cacheDecorator: MethodDecorator = (
    target: Object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const dynamicCacheKey = (this as any)?.getCacheKey
        ? (this as any).getCacheKey()
        : null;

      const argsKey = `${args ? `-${args.join("-")}` : ""}`;
      const cacheKey = `${
        dynamicCacheKey ? `${name}-${dynamicCacheKey}` : name
      }${argsKey}`;
      if (!caches[cacheKey]) caches[cacheKey] = new Cache<T>(cacheKey);
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

interface CacheKeyable {
  getCacheKey(): string;
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
export type { CacheKeyable };
