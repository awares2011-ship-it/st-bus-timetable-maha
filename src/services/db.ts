import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

/**
 * IndexedDB is our ONLY local store — no server, no backend. It holds:
 *   - cached JSON datasets (so the app works fully offline)
 *   - the user's favourites
 *   - recent searches
 *   - small key/value app state (last dataset version, opt-ins)
 *
 * Everything is best-effort: if IndexedDB is unavailable (private mode, etc.)
 * the app still works online, it just won't remember things.
 */

export interface FavoriteRoute {
  id: string; // `${from}__${to}`
  kind: 'route';
  from: string;
  to: string;
  fromName: string;
  toName: string;
  savedAt: number;
}

export interface FavoriteStation {
  id: string; // stationId
  kind: 'station';
  stationId: string;
  name: string;
  savedAt: number;
}

export type Favorite = FavoriteRoute | FavoriteStation;

export interface RecentSearch {
  id: string; // `${from}__${to}`
  from: string;
  to: string;
  fromName: string;
  toName: string;
  ts: number;
}

interface CacheEntry {
  path: string;
  data: unknown;
  savedAt: number;
}

interface StBusDB extends DBSchema {
  datasets: { key: string; value: CacheEntry };
  favorites: { key: string; value: Favorite; indexes: { savedAt: number } };
  recent: { key: string; value: RecentSearch; indexes: { ts: number } };
  kv: { key: string; value: unknown };
}

const DB_NAME = 'st-bus-timetable';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<StBusDB>> | null = null;

function getDB(): Promise<IDBPDatabase<StBusDB>> {
  if (!dbPromise) {
    dbPromise = openDB<StBusDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('datasets', { keyPath: 'path' });
        const fav = db.createObjectStore('favorites', { keyPath: 'id' });
        fav.createIndex('savedAt', 'savedAt');
        const rec = db.createObjectStore('recent', { keyPath: 'id' });
        rec.createIndex('ts', 'ts');
        db.createObjectStore('kv');
      },
    });
  }
  return dbPromise;
}

/** Wrap every DB op so a storage failure never breaks the UI. */
async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

// ---- Dataset cache --------------------------------------------------------
export async function cachePut(path: string, data: unknown): Promise<void> {
  await safe(async () => {
    const db = await getDB();
    await db.put('datasets', { path, data, savedAt: Date.now() });
  }, undefined);
}

export async function cacheGet<T>(path: string): Promise<T | undefined> {
  return safe(async () => {
    const db = await getDB();
    const entry = await db.get('datasets', path);
    return entry?.data as T | undefined;
  }, undefined);
}

// ---- Favorites ------------------------------------------------------------
export async function getFavorites(): Promise<Favorite[]> {
  return safe(async () => {
    const db = await getDB();
    const all = await db.getAllFromIndex('favorites', 'savedAt');
    return all.reverse();
  }, []);
}

export async function addFavorite(fav: Favorite): Promise<void> {
  await safe(async () => {
    const db = await getDB();
    await db.put('favorites', fav);
  }, undefined);
  window.dispatchEvent(new Event('favorites-changed'));
}

export async function removeFavorite(id: string): Promise<void> {
  await safe(async () => {
    const db = await getDB();
    await db.delete('favorites', id);
  }, undefined);
  window.dispatchEvent(new Event('favorites-changed'));
}

// ---- Recent searches ------------------------------------------------------
export async function getRecent(limit = 8): Promise<RecentSearch[]> {
  return safe(async () => {
    const db = await getDB();
    const all = await db.getAllFromIndex('recent', 'ts');
    return all.reverse().slice(0, limit);
  }, []);
}

export async function addRecent(entry: RecentSearch): Promise<void> {
  await safe(async () => {
    const db = await getDB();
    await db.put('recent', entry);
    // Trim to the most recent 20.
    const all = await db.getAllFromIndex('recent', 'ts');
    const excess = all.reverse().slice(20);
    for (const e of excess) await db.delete('recent', e.id);
  }, undefined);
}

export async function clearRecent(): Promise<void> {
  await safe(async () => {
    const db = await getDB();
    await db.clear('recent');
  }, undefined);
}

// ---- Key/value ------------------------------------------------------------
export async function kvGet<T>(key: string): Promise<T | undefined> {
  return safe(async () => {
    const db = await getDB();
    return (await db.get('kv', key)) as T | undefined;
  }, undefined);
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  await safe(async () => {
    const db = await getDB();
    await db.put('kv', value, key);
  }, undefined);
}
