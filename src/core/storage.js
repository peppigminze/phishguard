/**
 * Storage-Layer.
 *
 * Alle Persistenz läuft über einen StorageAdapter mit asynchroner API.
 * Dadurch kann später z. B. ein FirebaseAdapter eingesetzt werden,
 * ohne dass Aufrufer (Progress, Kampagnen, Profile) angepasst werden müssen.
 *
 * Vertrag eines Adapters:
 *   get(key)            -> Promise<any|null>   (JSON-deserialisiert)
 *   set(key, value)     -> Promise<void>       (JSON-serialisiert)
 *   remove(key)         -> Promise<void>
 *   keys(prefix = '')   -> Promise<string[]>   (ohne Namespace)
 */

const NAMESPACE = 'phishguard:';

/** Basisklasse – dokumentiert das Interface. */
export class StorageAdapter {
  async get(_key) { throw new Error('not implemented'); }
  async set(_key, _value) { throw new Error('not implemented'); }
  async remove(_key) { throw new Error('not implemented'); }
  async keys(_prefix = '') { throw new Error('not implemented'); }
}

/** Persistenz im Browser via localStorage. */
export class LocalStorageAdapter extends StorageAdapter {
  constructor(storage = globalThis.localStorage) {
    super();
    this.storage = storage;
  }

  async get(key) {
    const raw = this.storage.getItem(NAMESPACE + key);
    if (raw == null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      // Korrupter Eintrag: lieber verwerfen als die App crashen lassen.
      console.warn(`[storage] Ungültiges JSON unter "${key}" verworfen`);
      return null;
    }
  }

  async set(key, value) {
    this.storage.setItem(NAMESPACE + key, JSON.stringify(value));
  }

  async remove(key) {
    this.storage.removeItem(NAMESPACE + key);
  }

  async keys(prefix = '') {
    const out = [];
    for (let i = 0; i < this.storage.length; i++) {
      const k = this.storage.key(i);
      if (k && k.startsWith(NAMESPACE + prefix)) out.push(k.slice(NAMESPACE.length));
    }
    return out;
  }
}

/** Flüchtiger Speicher – für Tests und als Fallback (z. B. privater Modus ohne localStorage). */
export class MemoryStorageAdapter extends StorageAdapter {
  constructor() {
    super();
    this.map = new Map();
  }
  async get(key) {
    return this.map.has(key) ? structuredClone(this.map.get(key)) : null;
  }
  async set(key, value) {
    this.map.set(key, structuredClone(value));
  }
  async remove(key) {
    this.map.delete(key);
  }
  async keys(prefix = '') {
    return [...this.map.keys()].filter((k) => k.startsWith(prefix));
  }
}

/** Wählt den passenden Adapter für die aktuelle Umgebung. */
export function createDefaultStorage() {
  try {
    const probe = '__pg_probe__';
    globalThis.localStorage.setItem(probe, '1');
    globalThis.localStorage.removeItem(probe);
    return new LocalStorageAdapter();
  } catch {
    console.warn('[storage] localStorage nicht verfügbar – Daten gehen beim Schliessen verloren.');
    return new MemoryStorageAdapter();
  }
}
