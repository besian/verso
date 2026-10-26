// Unsaved drawings, kept in the browser (IndexedDB) while you draw, so closing the tab or losing the page by
// accident doesn't lose them. One draft per page picture and shape; it's removed once the page is added.
import type { Snapshot } from './paint';

const DB = 'fletora-drafts', STORE = 'drafts';
let dbp: Promise<IDBDatabase> | null = null;
function open(): Promise<IDBDatabase> {
  if (dbp) return dbp;
  dbp = new Promise((ok, fail) => {
    if (typeof indexedDB === 'undefined') return fail(new Error('no-indexeddb'));
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => ok(r.result); r.onerror = () => fail(r.error);
  });
  dbp.catch(() => { dbp = null; });
  return dbp;
}
function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(db => new Promise<T>((ok, fail) => { const r = run(db.transaction(STORE, mode).objectStore(STORE)); r.onsuccess = () => ok(r.result); r.onerror = () => fail(r.error); }));
}
export interface Draft { snap: Snapshot; at: number }
export const saveDraft = (key: string, snap: Snapshot) => tx('readwrite', s => s.put({ snap, at: Date.now() } satisfies Draft, key)).catch(() => {});
export const loadDraft = (key: string) => tx<Draft | undefined>('readonly', s => s.get(key)).catch(() => undefined);
export const deleteDraft = (key: string) => tx('readwrite', s => s.delete(key)).catch(() => {});
