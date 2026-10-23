// Firebase: Auth (email + password), Firestore (profiles, handles, books, follows) and
// Storage (page images, covers, avatars). Configured from VITE_FIREBASE_* env vars; when
// they're missing the app still runs, signed out and without community books.
import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported as analyticsSupported } from 'firebase/analytics';
import {
  EmailAuthProvider, connectAuthEmulator, createUserWithEmailAndPassword, deleteUser, getAuth, onAuthStateChanged,
  reauthenticateWithCredential, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signOut as fbSignOut,
  updatePassword, verifyBeforeUpdateEmail,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import {
  collection, connectFirestoreEmulator, deleteDoc, doc, getDoc, getDocs, getFirestore, limit,
  query, runTransaction, setDoc, where, writeBatch,
} from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import { connectStorageEmulator, deleteObject, getStorage, listAll, ref, uploadBytes } from 'firebase/storage';
import type { Account, Book, ShapeKey } from './data';

const env = import.meta.env;
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const enabled = !!(config.apiKey && config.projectId);

const app = enabled ? initializeApp(config) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const storage = app ? getStorage(app) : null;

if (app && env.VITE_FIREBASE_EMULATORS === '1') {
  connectAuthEmulator(auth!, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db!, '127.0.0.1', 8080);
  connectStorageEmulator(storage!, '127.0.0.1', 9199);
} else if (app && config.measurementId) {
  analyticsSupported().then(ok => { if (ok) getAnalytics(app); }).catch(() => {});
}

class NotConfigured extends Error { code = 'not-configured'; }
function need() {
  if (!auth || !db || !storage) throw new NotConfigured();
  return { auth, db, storage };
}

/** Human-readable message for an auth / Firestore / Storage error. */
export function errMsg(e: unknown): string {
  const code = (e as { code?: string })?.code || '';
  const msgs: Record<string, string> = {
    'not-configured': 'Accounts aren’t set up on this site yet.',
    'handle-taken': 'That handle is already taken.',
    'auth/invalid-credential': 'That email and password don’t match an account.',
    'auth/wrong-password': 'That email and password don’t match an account.',
    'auth/user-not-found': 'That email and password don’t match an account.',
    'auth/email-already-in-use': 'There’s already an account with that email. Try signing in.',
    'auth/invalid-email': 'That email address doesn’t look right.',
    'auth/weak-password': 'Choose a password of at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
    'auth/network-request-failed': 'Couldn’t reach the server. Check your connection.',
    'permission-denied': 'You don’t have permission to do that.',
    'storage/unauthorized': 'Upload refused. Images must be under 10 MB.',
    'auth/requires-recent-login': 'For your security, sign in again and retry.',
    'auth/missing-password': 'Enter your current password.',
  };
  return msgs[code] || 'Something went wrong. Please try again.';
}

// ---------- auth ----------

export interface AuthUser { uid: string; email: string; verified?: boolean }

export function watchAuth(cb: (u: AuthUser | null) => void): () => void {
  if (!auth) { cb(null); return () => {}; }
  return onAuthStateChanged(auth, (u: User | null) => cb(u ? { uid: u.uid, email: u.email || '', verified: u.emailVerified } : null));
}

export async function signIn(email: string, pw: string) { await signInWithEmailAndPassword(need().auth, email, pw); }
export async function signOut() { if (auth) await fbSignOut(auth); }
export async function resetPassword(email: string) { await sendPasswordResetEmail(need().auth, email); }

/** Creates the auth user, then claims the handle and writes the public profile. */
export async function signUp(email: string, pw: string, name: string, handle: string): Promise<Account> {
  const { auth: a } = need();
  if (!(await handleFree(handle))) throw Object.assign(new Error('handle taken'), { code: 'handle-taken' });
  const cred = await createUserWithEmailAndPassword(a, email, pw);
  sendEmailVerification(cred.user).catch(() => {});
  const profile: Omit<Account, 'uid' | 'email'> = { name, handle, bio: '', loc: '', web: '', accent: '#C9C3B4', av: null, joined: Date.now() };
  try {
    await writeProfile(cred.user.uid, profile, null);
  } catch (e) {
    // Lost a race for the handle between the check and the claim: fall back to a suffixed one.
    if ((e as { code?: string }).code !== 'handle-taken') throw e;
    profile.handle = (handle.slice(0, 20) + Math.floor(1000 + Math.random() * 9000)).slice(0, 24);
    await writeProfile(cred.user.uid, profile, null);
  }
  return { ...profile, uid: cred.user.uid, email };
}

// ---------- profiles ----------

type PublicProfile = Omit<Account, 'uid' | 'email'>;

const profileOf = (d: DocumentData): PublicProfile => ({
  name: d.name || '', handle: d.handle || '', bio: d.bio || '', loc: d.loc || '', web: d.web || '',
  accent: d.accent || '#C9C3B4', av: d.av || null, joined: d.joined || Date.now(),
});

export async function getProfile(uid: string): Promise<PublicProfile | null> {
  const s = await getDoc(doc(need().db, 'users', uid));
  return s.exists() ? profileOf(s.data()) : null;
}

export async function handleFree(handle: string, uid?: string): Promise<boolean> {
  const s = await getDoc(doc(need().db, 'handles', handle));
  return !s.exists() || s.data().uid === uid;
}

/** Writes the profile and moves the handle reservation atomically. */
async function writeProfile(uid: string, p: PublicProfile, prevHandle: string | null) {
  const { db: d } = need();
  await runTransaction(d, async tx => {
    const h = doc(d, 'handles', p.handle), cur = await tx.get(h);
    if (cur.exists() && cur.data().uid !== uid) throw Object.assign(new Error('handle taken'), { code: 'handle-taken' });
    if (!cur.exists()) tx.set(h, { uid });
    if (prevHandle && prevHandle !== p.handle) tx.delete(doc(d, 'handles', prevHandle));
    tx.set(doc(d, 'users', uid), p);
  });
}

/** Loads the signed-in user's profile, creating one from their email if it's missing. */
export async function ensureProfile(u: AuthUser): Promise<Account> {
  const p = await getProfile(u.uid);
  if (p) return { ...p, uid: u.uid, email: u.email };
  const local = u.email.split('@')[0] || 'artist';
  let handle = slugHandle(local) || 'artist';
  if (!(await handleFree(handle, u.uid))) handle = (handle.slice(0, 20) + Math.floor(1000 + Math.random() * 9000)).slice(0, 24);
  const np: PublicProfile = { name: local.charAt(0).toUpperCase() + local.slice(1), handle, bio: '', loc: '', web: '', accent: '#C9C3B4', av: null, joined: Date.now() };
  await writeProfile(u.uid, np, null);
  return { ...np, uid: u.uid, email: u.email };
}

const slugHandle = (v: string) => v.toLowerCase().replace(/[^a-z0-9._]+/g, '').slice(0, 24);

/** Saves profile edits: uploads a new avatar, moves the handle, and refreshes the name on the user's books. */
export async function saveProfile(acct: Account, next: PublicProfile): Promise<Account> {
  const { db: d } = need();
  let av = next.av;
  if (av?.startsWith('data:')) av = await upload(`users/${acct.uid}/avatar-${Date.now()}.jpg`, av);
  const p = { ...next, av };
  await writeProfile(acct.uid, p, acct.handle);
  if (acct.av && acct.av !== av) removeFiles([acct.av]);
  if (p.name !== acct.name || p.handle !== acct.handle) {
    const mine = await getDocs(query(collection(d, 'books'), where('ownerId', '==', acct.uid)));
    const batch = writeBatch(d);
    mine.forEach(b => batch.update(b.ref, { ownerName: p.name, ownerHandle: p.handle }));
    await batch.commit();
  }
  return { ...acct, ...p };
}

// ---------- books ----------

/** A book as stored in Firestore (`books/{id}`). */
export interface BookDoc {
  id: string; ownerId: string; ownerName: string; ownerHandle: string;
  name: string; color: string; shape: ShapeKey; cover: string | null; pages: string[]; pageCount: number;
  createdAt: number; updatedAt: number;
  /** Private books are visible only to their owner. Books saved before this field existed count as public. */
  isPublic: boolean; legacy: boolean;
  /** Small (≈480px) versions: `thumbs[i]` belongs to `pages[i]` ('' when missing). */
  thumbs: string[]; coverThumb: string | null;
}

const bookDoc = (id: string, d: DocumentData): BookDoc => ({
  id, ownerId: d.ownerId, ownerName: d.ownerName || '', ownerHandle: d.ownerHandle || '', name: d.name || 'sketchbook',
  color: d.color || '#b8243a', shape: d.shape || 'portrait', cover: d.cover || null, pages: d.pages || [], pageCount: d.pageCount || 0,
  createdAt: d.createdAt || 0, updatedAt: d.updatedAt || 0, isPublic: d.isPublic !== false, legacy: d.isPublic === undefined,
  thumbs: d.thumbs || [], coverThumb: d.coverThumb || null,
});

export const thumbMap = (b: BookDoc): Record<string, string> => {
  const m: Record<string, string> = {};
  b.pages.forEach((u, i) => { if (b.thumbs[i]) m[u] = b.thumbs[i]; });
  if (b.cover && b.coverThumb) m[b.cover] = b.coverThumb;
  return m;
};
export const toBook = (b: BookDoc): Book => ({ id: b.id, name: b.name, color: b.color, shape: b.shape, coverImg: b.cover, images: b.pages, createdAt: b.createdAt, isPublic: b.isPublic, thumbs: thumbMap(b) });

export function newBookId(): string { return doc(collection(need().db, 'books')).id; }

/** Books owned by a user, oldest first: all of them for the owner, otherwise only public ones. */
export async function userBooks(uid: string, publicOnly = false): Promise<BookDoc[]> {
  const c = collection(need().db, 'books');
  const s = await getDocs(publicOnly ? query(c, where('ownerId', '==', uid), where('isPublic', '==', true)) : query(c, where('ownerId', '==', uid)));
  return s.docs.map(x => bookDoc(x.id, x.data())).sort((a, b) => a.createdAt - b.createdAt);
}

/** Recently updated books from everyone that have at least one page. */
export async function communityBooks(): Promise<BookDoc[]> {
  if (!db) return [];
  // Equality-only filter so no composite index is needed; newest first is sorted here.
  const s = await getDocs(query(collection(db, 'books'), where('isPublic', '==', true), limit(300)));
  return s.docs.map(x => bookDoc(x.id, x.data())).filter(b => b.pageCount > 0).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 60);
}

/** Uploads data URLs for a book's pages/cover, each with a small thumbnail; returns data URL → URLs. */
export async function uploadImages(uid: string, bookId: string, dataUrls: string[]): Promise<Map<string, { full: string; thumb: string }>> {
  const out = new Map<string, { full: string; thumb: string }>();
  await Promise.all([...new Set(dataUrls)].map(async du => {
    const id = crypto.randomUUID(), base = `users/${uid}/books/${bookId}/${id}`;
    const [full, thumb] = await Promise.all([upload(`${base}.jpg`, du), makeThumb(du).then(t => upload(`${base}_t.jpg`, t))]);
    out.set(du, { full, thumb });
  }));
  return out;
}

/** Makes and uploads a thumbnail for an already-stored image (used to backfill older pages). */
export async function thumbFor(uid: string, bookId: string, url: string): Promise<string> {
  const blob = await (await fetch(url)).blob();
  const du = await new Promise<string>(res => { const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.readAsDataURL(blob); });
  return upload(`users/${uid}/books/${bookId}/${crypto.randomUUID()}_t.jpg`, await makeThumb(du));
}

/** Downscales an image to at most `maxH` px tall as a JPEG data URL. */
function makeThumb(dataUrl: string, maxH = 480): Promise<string> {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, maxH / im.naturalHeight), c = document.createElement('canvas');
      c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
      const ctx = c.getContext('2d')!; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(im, 0, 0, c.width, c.height);
      res(c.toDataURL('image/jpeg', 0.8));
    };
    im.onerror = rej; im.src = dataUrl;
  });
}

export async function writeBook(owner: Account, b: Book) {
  const { db: d } = need();
  const pages = b.images.filter(u => !u.startsWith('data:')), cover = b.coverImg && !b.coverImg.startsWith('data:') ? b.coverImg : null, t = b.thumbs || {};
  await setDoc(doc(d, 'books', String(b.id)), {
    ownerId: owner.uid, ownerName: owner.name, ownerHandle: owner.handle,
    name: b.name, color: b.color, shape: b.shape || 'portrait', cover,
    pages, pageCount: pages.length, createdAt: b.createdAt || Date.now(), updatedAt: Date.now(), isPublic: b.isPublic !== false,
    thumbs: pages.map(u => t[u] || ''), coverThumb: (cover && t[cover]) || null,
  });
}

export async function deleteBook(id: string, files: string[]) {
  await deleteDoc(doc(need().db, 'books', id));
  removeFiles(files);
}

// ---------- storage ----------

async function upload(path: string, dataUrl: string): Promise<string> {
  const { storage: st } = need();
  const blob = await (await fetch(dataUrl)).blob();
  const r = ref(st, path);
  const res = await uploadBytes(r, blob, { contentType: blob.type || 'image/jpeg', cacheControl: 'public,max-age=31536000,immutable' });
  // storage.rules make users/** publicly readable, so a token-free URL works and saves a
  // getDownloadURL round trip per image.
  const host = env.VITE_FIREBASE_EMULATORS === '1' ? 'http://127.0.0.1:9199' : 'https://firebasestorage.googleapis.com';
  return `${host}/v0/b/${res.metadata.bucket}/o/${encodeURIComponent(res.metadata.fullPath)}?alt=media`;
}

/** Best-effort removal of files that are no longer referenced. */
export function removeFiles(urls: string[]) {
  if (!storage) return;
  for (const u of urls) {
    if (!/^https?:/.test(u)) continue;
    try { deleteObject(ref(storage, u)).catch(() => {}); } catch { /* not a Storage URL */ }
  }
}

// ---------- people ----------

export interface Person { uid: string; name: string; handle: string; av: string | null }

/** Public profiles for Explore search. Firestore has no text search, so this loads a page of
 *  profiles and the caller filters them; fine while the community is small. */
export async function people(): Promise<Person[]> {
  if (!db) return [];
  const s = await getDocs(query(collection(db, 'users'), limit(500)));
  return s.docs.map(d => ({ uid: d.id, name: d.data().name || '', handle: d.data().handle || '', av: d.data().av || null }));
}

// ---------- follows ----------

export async function following(uid: string): Promise<string[]> {
  const s = await getDocs(collection(need().db, 'users', uid, 'following'));
  return s.docs.map(x => x.id);
}

export async function setFollow(uid: string, target: string, on: boolean) {
  const r = doc(need().db, 'users', uid, 'following', target);
  if (on) await setDoc(r, { at: Date.now() }); else await deleteDoc(r);
}

// ---------- links ----------

export async function uidForHandle(handle: string): Promise<string | null> {
  const s = await getDoc(doc(need().db, 'handles', handle.toLowerCase()));
  return s.exists() ? s.data().uid : null;
}

/** One book by id, or null if it's missing or private to someone else. */
export async function getBook(id: string): Promise<BookDoc | null> {
  try { const s = await getDoc(doc(need().db, 'books', id)); return s.exists() ? bookDoc(s.id, s.data()) : null; } catch { return null; }
}

// ---------- account ----------

async function reauth(pw: string) {
  const u = need().auth.currentUser; if (!u?.email) throw Object.assign(new Error('signed out'), { code: 'auth/no-current-user' });
  await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, pw));
  return u;
}

export async function resendVerification() { const u = need().auth.currentUser; if (u) await sendEmailVerification(u); }

/** Reloads the signed-in user and reports whether their email is confirmed. */
export async function refreshVerified(): Promise<boolean> { const u = need().auth.currentUser; if (!u) return false; await u.reload(); return u.emailVerified; }

/** Sends a confirmation link to the new address; the email changes once it's clicked. */
export async function changeEmail(pw: string, next: string) { await verifyBeforeUpdateEmail(await reauth(pw), next); }

export async function changePassword(pw: string, next: string) { await updatePassword(await reauth(pw), next); }

async function removeFolder(path: string) {
  const r = await listAll(ref(need().storage, path));
  await Promise.all([...r.items.map(i => deleteObject(i).catch(() => {})), ...r.prefixes.map(p => removeFolder(p.fullPath))]);
}

/** Deletes everything the user owns (books, images, follows, handle, profile), then the account itself. */
export async function deleteAccount(pw: string, acct: Account) {
  const u = await reauth(pw), { db: d } = need();
  const books = await getDocs(query(collection(d, 'books'), where('ownerId', '==', acct.uid)));
  const follows = await getDocs(collection(d, 'users', acct.uid, 'following'));
  const batch = writeBatch(d);
  books.forEach(b => batch.delete(b.ref)); follows.forEach(f => batch.delete(f.ref));
  batch.delete(doc(d, 'handles', acct.handle)); batch.delete(doc(d, 'users', acct.uid));
  await batch.commit();
  await removeFolder(`users/${acct.uid}`).catch(() => {});
  await deleteUser(u);
}
