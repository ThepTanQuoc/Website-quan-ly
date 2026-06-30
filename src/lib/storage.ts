// Shim cho `window.storage` mà Module 1 (Báo giá) sử dụng.
// Module gốc được viết cho môi trường Artifacts với API window.storage bất đồng bộ.
// Ở đây ta backing bằng localStorage để chạy như web tĩnh bình thường.

type StorageRecord = { value: string } | null;

export interface TQStorage {
  get(key: string): Promise<StorageRecord>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

const PREFIX = "tq:";

const shim: TQStorage = {
  async get(key) {
    try {
      const v = localStorage.getItem(PREFIX + key);
      return v == null ? null : { value: v };
    } catch {
      return null;
    }
  },
  async set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, value);
    } catch {
      /* quota / private mode — bỏ qua */
    }
  },
  async delete(key) {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {
      /* bỏ qua */
    }
  },
};

export function installStorageShim() {
  const w = window as unknown as { storage?: TQStorage };
  if (!w.storage) w.storage = shim;
}
