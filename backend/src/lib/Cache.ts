import { decode, encode } from "@msgpack/msgpack";
import fs from "fs";

class Cache<T> {
  INVALIDATE_AFTER_MS = 24 * 60 * 60 * 1000;
  CACHE_DIR = "./cache";
  WRITE_DEBOUNCE_MS = 1000;
  path: string;
  entries: Record<string, { ts: number; data: T }> = {};
  name: string;
  writeTimeout?: string | number | NodeJS.Timeout | undefined;

  constructor(name: string) {
    this.name = name;
    this.path = `${this.CACHE_DIR}/${this.name}.cache`;
    this.restoreFromDisk();
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
    this.saveToDisk();
  }

  isValid(key: string) {
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
      console.log(`Writing cache "${this.name}" to disk`);
      fs.writeFile(this.path, encode(this.entries), (err) => {
        if (err) console.error(err);
        console.log(`Finished writing cache "${this.name}" to disk`);
      });
    }, this.WRITE_DEBOUNCE_MS);
  }

  private restoreFromDisk() {
    if (!fs.existsSync(this.path)) return;
    console.log(`Reading cache "${this.name}" from disk`);

    fs.readFile(this.path, (err, json) => {
      if (err) return console.error(err);
      const data = decode(json) as any;
      this.entries = data;
      console.log(`Finished reading cache "${this.name}" from disk`);
    });
  }
}

export default Cache;
