/**
 * IndexedDB mirror.
 *
 * A sales call happens in somebody's basement. When the API is unreachable the
 * repository writes here instead, the app keeps working, and everything created
 * offline is pushed the next time the Worker answers.
 */
import type { Project } from '@shared/types';

const DB_NAME = 'mwd';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export interface LocalRecord {
  id: string;
  project: Project;
  dirty: boolean;
  savedAt: string;
}

export const localDb = {
  async put(project: Project, dirty: boolean) {
    await tx('projects', 'readwrite', (s) => s.put({ id: project.id, project, dirty, savedAt: new Date().toISOString() }));
  },
  async get(id: string): Promise<LocalRecord | undefined> {
    return tx('projects', 'readonly', (s) => s.get(id) as IDBRequest<LocalRecord>);
  },
  async all(): Promise<LocalRecord[]> {
    return tx('projects', 'readonly', (s) => s.getAll() as IDBRequest<LocalRecord[]>);
  },
  async remove(id: string) {
    await tx('projects', 'readwrite', (s) => s.delete(id) as unknown as IDBRequest<undefined>);
  },
  async dirty(): Promise<LocalRecord[]> {
    return (await localDb.all()).filter((r) => r.dirty);
  },
  /** Photos taken offline live here as blobs until they can be uploaded. */
  async putPhoto(id: string, projectId: string, blob: Blob, meta: { kind: string; width: number; height: number; caption: string }) {
    await tx('photos', 'readwrite', (s) => s.put({ id, projectId, blob, ...meta, pending: true }));
  },
  async getPhoto(id: string): Promise<{ id: string; projectId: string; blob: Blob; kind: string; width: number; height: number; caption: string; pending: boolean } | undefined> {
    return tx('photos', 'readonly', (s) => s.get(id) as IDBRequest<any>);
  },
  async pendingPhotos(): Promise<any[]> {
    const all = await tx('photos', 'readonly', (s) => s.getAll() as IDBRequest<any[]>);
    return all.filter((p) => p.pending);
  },
  async markPhotoSynced(id: string) {
    const rec = await localDb.getPhoto(id);
    if (rec) await tx('photos', 'readwrite', (s) => s.put({ ...rec, pending: false }));
  },
};
