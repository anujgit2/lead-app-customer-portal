/**
 * Minimal browser globals for `node --test`. Import before any module that reads
 * `window`, `localStorage` or `sessionStorage` at load time (e.g. persisted stores).
 */
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }

  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}

const globals = globalThis as unknown as Record<string, unknown>;

for (const name of ["localStorage", "sessionStorage"] as const) {
  Object.defineProperty(globalThis, name, {
    value: new MemoryStorage(),
    configurable: true,
    writable: true,
  });
}

if (typeof globals.window === "undefined") {
  globals.window = globalThis;
}

export function resetBrowserStorage() {
  localStorage.clear();
  sessionStorage.clear();
}
