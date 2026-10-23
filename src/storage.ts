// Browser persistence: books live in IndexedDB (images are large data URLs),
// account/follows/explore view in localStorage. Keys match the design prototype.
import type { Account, Book } from './data';

function db(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const o = indexedDB.open('sketchbook', 1);
    o.onupgradeneeded = () => o.result.createObjectStore('s');
    o.onsuccess = () => res(o.result);
    o.onerror = rej;
  });
}

/** Loads saved books; falls back to the single-book `images` key from older versions. */
export function loadBooks(): Promise<Book[] | { images: string[] } | null> {
  return db().then(d => new Promise(res => {
    const st = d.transaction('s').objectStore('s'), r = st.get('books');
    r.onsuccess = () => {
      if (r.result?.length) return res(r.result);
      const o = st.get('images');
      o.onsuccess = () => res(o.result?.length ? { images: o.result } : null);
      o.onerror = () => res(null);
    };
    r.onerror = () => res(null);
  })).catch(() => null) as Promise<Book[] | { images: string[] } | null>;
}

let saveT: ReturnType<typeof setTimeout> | undefined;
export function saveBooks(books: Book[]) {
  clearTimeout(saveT);
  saveT = setTimeout(() => db().then(d => d.transaction('s', 'readwrite').objectStore('s').put(books, 'books')).catch(() => {}), 250);
}

function read<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v) ?? fallback; } catch { return fallback; }
}
function write(key: string, v: unknown) {
  try { v == null ? localStorage.removeItem(key) : localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage unavailable */ }
}

export const loadAccount = () => read<Account | null>('sb-account', null);
export const saveAccount = (a: Account | null) => write('sb-account', a);
export const loadSavedAccount = () => read<Account | null>('sb-account-saved', null);
export const saveSavedAccount = (a: Account | null) => write('sb-account-saved', a);
export const loadFollows = () => read<string[]>('sb-follows', []);
export const saveFollows = (f: string[]) => write('sb-follows', f);
export function loadExView(): string | null { try { return localStorage.getItem('sb-exview'); } catch { return null; } }
export function saveExView(v: string) { try { localStorage.setItem('sb-exview', v); } catch { /* storage unavailable */ } }
