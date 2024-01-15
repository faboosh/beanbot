import fs from "fs";

class Cache<T> {
  INVALIDATE_AFTER_MS = 24 * 60 * 60 * 1000;
  CACHE_DIR = "./cache";
  WRITE_DEBOUNCE_MS = 1000;
  entries: Record<string, { ts: number; data: T }> = {};
  name: string;
  writeTimeout?: string | number | NodeJS.Timeout | undefined;

  constructor(name: string) {
    this.name = name;
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
      fs.writeFile(
        `${this.CACHE_DIR}/${this.name}.json`,
        JSON.stringify(this.entries),
        { encoding: "utf-8" },
        (err) => {
          if (err) console.error(err);
        }
      );
    }, this.WRITE_DEBOUNCE_MS);
  }

  private restoreFromDisk() {
    const filePath = `${this.CACHE_DIR}/${this.name}.json`;
    if (!fs.existsSync(filePath)) return;
    const json = fs.readFileSync(`${this.CACHE_DIR}/${this.name}.json`, {
      encoding: "utf8",
    });
    const data = JSON.parse(json);
    this.entries = data;
  }
}

export default Cache;
