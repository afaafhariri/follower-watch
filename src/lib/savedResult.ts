import type { AnalysisResult } from "../types";

// The last analysis, kept in this browser's IndexedDB so it's there on the
// next visit. Nothing leaves the device. Every function fails quietly when
// storage is unavailable (private browsing, blocked site data); the app then
// just doesn't remember results.

export interface SavedResult {
  result: AnalysisResult;
  // Unix seconds
  savedAt: number;
}

const DB_NAME = "followerwatch";
const STORE = "results";
const KEY = "last";

const openDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const withStore = async <T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) => {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = run(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
};

export const loadSavedResult = async (): Promise<SavedResult | null> => {
  try {
    return (await withStore<SavedResult | undefined>("readonly", (s) => s.get(KEY))) ?? null;
  } catch {
    return null;
  }
};

export const saveResult = async (result: AnalysisResult): Promise<SavedResult> => {
  const saved = { result, savedAt: Math.floor(Date.now() / 1000) };
  try {
    await withStore("readwrite", (s) => s.put(saved, KEY));
  } catch {
    // Not persisted; the result still shows for this visit
  }
  return saved;
};

export const clearSavedResult = async () => {
  try {
    await withStore("readwrite", (s) => s.delete(KEY));
  } catch {
    // Nothing to clear
  }
};
