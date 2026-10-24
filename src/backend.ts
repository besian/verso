// Firebase: Auth (email + password), Firestore (profiles, handles, books, follows) and
// Storage (page images, covers, avatars). Configured from VITE_FIREBASE_* env vars; when
// they're missing the app still runs, signed out and without community books.
import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { getAnalytics, isSupported as analyticsSupported } from 'firebase/analytics';
import {
  EmailAuthProvider, applyActionCode, checkActionCode, confirmPasswordReset, connectAuthEmulator, verifyPasswordResetCode, createUserWithEmailAndPassword, deleteUser, getAuth, onAuthStateChanged,
  reauthenticateWithCredential, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signOut as fbSignOut,
  updatePassword, verifyBeforeUpdateEmail,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import {
  collection, connectFirestoreEmulator, deleteDoc, doc, getDoc, getDocs, getFirestore, increment, limit, onSnapshot,
  orderBy, query, runTransaction, setDoc, startAfter, updateDoc, where, writeBatch,
} from 'firebase/firestore';
import type { DocumentData, QueryConstraint, QueryDocumentSnapshot } from 'firebase/firestore';
import { connectStorageEmulator, deleteObject, getStorage, listAll, ref, uploadBytes } from 'firebase/storage';
import type { Account, Book, Member, PageNote, ShapeKey } from './data';
import { mediumKey } from './data';

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
} else if (app) {
  // App Check proves requests come from this site (set VITE_FIREBASE_APPCHECK_KEY to a reCAPTCHA v3 site key).
  if (env.VITE_FIREBASE_APPCHECK_KEY) {
    try { initializeAppCheck(app, { provider: new ReCaptchaV3Provider(env.VITE_FIREBASE_APPCHECK_KEY), isTokenAutoRefreshEnabled: true }); } catch (e) { console.warn('App Check', e); }
  }
  if (config.measurementId) analyticsSupported().then(ok => { if (ok) getAnalytics(app); }).catch(() => {});
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
    'auth/invalid-action-code': 'This link has expired or has already been used.',
    'auth/expired-action-code': 'This link has expired. Ask for a new one below.',
    'verify-wait': 'We just sent one. Firebase allows one email a minute, so try again shortly.',
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
export async function resetPassword(email: string) { if (!await ourEmail('reset', { email })) await withLink(s => sendPasswordResetEmail(need().auth, email, s)); }

/** Creates the auth user, then claims the handle and writes the public profile. */
export async function signUp(email: string, pw: string, name: string, handle: string): Promise<Account> {
  const { auth: a } = need();
  if (!(await handleFree(handle))) throw Object.assign(new Error('handle taken'), { code: 'handle-taken' });
  const cred = await createUserWithEmailAndPassword(a, email, pw);
  sendVerification(cred.user).catch(e => console.warn('verification email', e));
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
  /** Margin notes per page, aligned with `pages` like thumbs. */
  captions: string[]; dates: string[];
  mediums: string[]; tags: string[]; hidden: boolean;
  /** The one other person who can add pages, and a pending invitation. */
  collab: Member | null; invite: Member | null;
}
const member = (d: DocumentData, k: 'collab' | 'invite'): Member | null => d[k] ? { uid: d[k], name: d[k + 'Name'] || '', handle: d[k + 'Handle'] || '' } : null;

const bookDoc = (id: string, d: DocumentData): BookDoc => ({
  id, ownerId: d.ownerId, ownerName: d.ownerName || '', ownerHandle: d.ownerHandle || '', name: d.name || 'sketchbook',
  color: d.color || '#b8243a', shape: d.shape || 'portrait', cover: d.cover || null, pages: d.pages || [], pageCount: d.pageCount || 0,
  createdAt: d.createdAt || 0, updatedAt: d.updatedAt || 0, isPublic: d.isPublic !== false, legacy: d.isPublic === undefined,
  thumbs: d.thumbs || [], coverThumb: d.coverThumb || null,
  captions: d.captions || [], dates: d.dates || [], mediums: d.mediums || [], tags: d.tags || [], hidden: d.hidden === true,
  collab: member(d, 'collab'), invite: member(d, 'invite'),
});

export const thumbMap = (b: BookDoc): Record<string, string> => {
  const m: Record<string, string> = {};
  b.pages.forEach((u, i) => { if (b.thumbs[i]) m[u] = b.thumbs[i]; });
  if (b.cover && b.coverThumb) m[b.cover] = b.coverThumb;
  return m;
};
export const noteMap = (b: BookDoc): Record<string, PageNote> => {
  const m: Record<string, PageNote> = {};
  b.pages.forEach((u, i) => { const c = b.captions[i] || '', d = b.dates[i] || ''; if (c || d) m[u] = { c, d }; });
  return m;
};
/** A book as the signed-in user's own: they own it, or draw in it with its owner. */
export const toBook = (b: BookDoc, me?: string): Book => ({
  id: b.id, name: b.name, color: b.color, shape: b.shape, coverImg: b.cover, images: b.pages, createdAt: b.createdAt, isPublic: b.isPublic,
  thumbs: thumbMap(b), notes: noteMap(b), mediums: b.mediums, tags: b.tags, hidden: b.hidden,
  role: me && b.ownerId !== me ? 'collab' : 'owner', owner: { uid: b.ownerId, name: b.ownerName, handle: b.ownerHandle }, collab: b.collab, invite: b.invite,
});

export function newBookId(): string { return doc(collection(need().db, 'books')).id; }

/** A user's books, oldest first, including ones shared with them: all of them for the user
 *  themselves, otherwise only public ones. */
export async function userBooks(uid: string, publicOnly = false): Promise<BookDoc[]> {
  const c = collection(need().db, 'books'), pub = publicOnly ? [where('isPublic', '==', true)] : [];
  const [own, shared] = await Promise.all([getDocs(query(c, where('ownerId', '==', uid), ...pub)), getDocs(query(c, where('collab', '==', uid), ...pub)).catch(() => null)]);
  return [...own.docs, ...(shared?.docs || [])].map(x => bookDoc(x.id, x.data())).sort((a, b) => a.createdAt - b.createdAt);
}

export type Cursor = QueryDocumentSnapshot | null;
export const PAGE_SIZE = 24;
let indexMissing = false;

/** One page of public books: most pages first ('trending') or most recently updated ('new').
 *  `next` is null once there are no more. Needs the composite indexes in firestore.indexes.json;
 *  until they exist it falls back to one unpaged batch sorted here. */
export async function communityPage(sort: 'trending' | 'new', after: Cursor): Promise<{ books: BookDoc[]; next: Cursor }> {
  if (!db) return { books: [], next: null };
  const c = collection(db, 'books');
  if (!indexMissing) {
    try {
      const s = await getDocs(query(c, where('isPublic', '==', true), orderBy(sort === 'new' ? 'updatedAt' : 'pageCount', 'desc'), ...(after ? [startAfter(after)] : []), limit(PAGE_SIZE)));
      return { books: s.docs.map(x => bookDoc(x.id, x.data())).filter(b => b.pageCount > 0), next: s.docs.length === PAGE_SIZE ? s.docs[s.docs.length - 1] : null };
    } catch (e) {
      if ((e as { code?: string }).code !== 'failed-precondition') throw e;
      console.warn('Explore is unpaged until the Firestore indexes in firestore.indexes.json are created.', e);
      indexMissing = true;
    }
  }
  if (after) return { books: [], next: null };
  const s = await getDocs(query(c, where('isPublic', '==', true), limit(300)));
  const all = s.docs.map(x => bookDoc(x.id, x.data())).filter(b => b.pageCount > 0);
  return { books: all.sort((a, b) => sort === 'new' ? b.updatedAt - a.updatedAt : b.pageCount - a.pageCount), next: null };
}

/** Public books with a medium ('m:ink') or tag ('t:lisbon'), newest first. */
export async function labelBooks(lbl: string): Promise<BookDoc[]> {
  if (!db) return [];
  const s = await getDocs(query(collection(db, 'books'), where('isPublic', '==', true), where('labels', 'array-contains', lbl), limit(120)));
  return s.docs.map(x => bookDoc(x.id, x.data())).filter(b => b.pageCount > 0).sort((a, b) => b.updatedAt - a.updatedAt);
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
  if (b.role === 'collab') return writePages(b);
  const pages = b.images.filter(u => !u.startsWith('data:')), cover = b.coverImg && !b.coverImg.startsWith('data:') ? b.coverImg : null, t = b.thumbs || {}, n = b.notes || {};
  const mediums = (b.mediums || []).slice(0, 4), tags = (b.tags || []).slice(0, 8);
  // Merged so sharing fields (collab, invite), which change on their own, are left alone.
  await setDoc(doc(d, 'books', String(b.id)), {
    ownerId: owner.uid, ownerName: owner.name, ownerHandle: owner.handle,
    name: b.name, color: b.color, shape: b.shape || 'portrait', cover,
    pages, pageCount: pages.length, createdAt: b.createdAt || Date.now(), updatedAt: Date.now(), isPublic: !b.hidden && b.isPublic !== false,
    thumbs: pages.map(u => t[u] || ''), coverThumb: (cover && t[cover]) || null,
    captions: pages.map(u => (n[u]?.c || '').slice(0, 140)), dates: pages.map(u => n[u]?.d || ''),
    // `labels` lets Explore filter by medium or tag with a single array-contains query.
    mediums, tags, labels: [...mediums.map(m => 'm:' + mediumKey(m)), ...tags.map(x => 't:' + x)], hidden: !!b.hidden,
  }, { merge: true });
}

/** What someone drawing in another person's sketchbook can change: its pages and their notes. */
async function writePages(b: Book) {
  const pages = b.images.filter(u => !u.startsWith('data:')), t = b.thumbs || {}, n = b.notes || {};
  await updateDoc(doc(need().db, 'books', b.id), {
    pages, pageCount: pages.length, thumbs: pages.map(u => t[u] || ''),
    captions: pages.map(u => (n[u]?.c || '').slice(0, 140)), dates: pages.map(u => n[u]?.d || ''), updatedAt: Date.now(),
  });
}

// ---------- shared sketchbooks ----------

const NO_INVITE = { invite: null, inviteName: null, inviteHandle: null };
/** Invites someone (by handle) to add pages; they accept from their notifications. Returns who. */
export async function invite(me: Account, book: { id: string; name: string }, handle: string): Promise<Member> {
  const uid = await uidForHandle(handle.replace(/^@/, ''));
  if (!uid) throw Object.assign(new Error('no such handle'), { code: 'no-handle' });
  if (uid === me.uid) throw Object.assign(new Error('self'), { code: 'self-invite' });
  const p = await getProfile(uid), m = { uid, name: p?.name || handle, handle: p?.handle || handle };
  await updateDoc(doc(need().db, 'books', book.id), { invite: m.uid, inviteName: m.name, inviteHandle: m.handle });
  notifyOnce(uid, `invite_${book.id}_${me.uid}`, { ...note(me, 'like', book), type: 'invite' });
  return m;
}
export async function cancelInvite(bookId: string) { await updateDoc(doc(need().db, 'books', bookId), NO_INVITE); }
export async function acceptInvite(me: Account, bookId: string) {
  await updateDoc(doc(need().db, 'books', bookId), { collab: me.uid, collabName: me.name, collabHandle: me.handle, ...NO_INVITE });
}
export async function declineInvite(bookId: string) { await updateDoc(doc(need().db, 'books', bookId), NO_INVITE); }
/** The owner removing the other person, or that person leaving. */
export async function endShare(bookId: string) { await updateDoc(doc(need().db, 'books', bookId), { collab: null, collabName: null, collabHandle: null }); }

/** Live list of sketchbooks the user has been invited to draw in. */
export function watchInvites(uid: string, cb: (b: BookDoc[]) => void): () => void {
  if (!db) return () => {};
  return onSnapshot(query(collection(db, 'books'), where('invite', '==', uid)), s => cb(s.docs.map(x => bookDoc(x.id, x.data()))), () => cb([]));
}
/** Live copy of one book; `local` is true while the change is this browser's own unsent write. */
export function watchBook(id: string, cb: (b: BookDoc | null, local: boolean) => void): () => void {
  if (!db) return () => {};
  return onSnapshot(doc(db, 'books', id), s => cb(s.exists() ? bookDoc(s.id, s.data()) : null, s.metadata.hasPendingWrites), () => cb(null, false));
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

/** Follows or unfollows. Each follow is mirrored as users/{target}/followers/{me}, so a follower
 *  count is just the size of that collection: exact, live, and it can't drift. */
export async function setFollow(me: Account, target: string, on: boolean) {
  const { db: d } = need(), batch = writeBatch(d), r = doc(d, 'users', me.uid, 'following', target), m = doc(d, 'users', target, 'followers', me.uid);
  if (on) { batch.set(r, { at: Date.now() }); batch.set(m, { at: Date.now() }); } else { batch.delete(r); batch.delete(m); }
  await batch.commit();
  if (on) notifyOnce(target, 'follow_' + me.uid, note(me, 'follow'));
}

/** Adds follower entries for follows made before they existed (idempotent; run on sign-in). */
export async function mirrorFollows(me: string, targets: string[]) {
  if (!targets.length) return;
  const { db: d } = need(), batch = writeBatch(d);
  targets.forEach(t => batch.set(doc(d, 'users', t, 'followers', me), { at: Date.now() }, { merge: true }));
  await batch.commit();
}

/** Live size of a collection (used for follower counts). */
export function watchSize(path: string[], cb: (n: number) => void): () => void {
  if (!db) return () => {};
  const [c, ...rest] = path;
  return onSnapshot(collection(db, c, ...rest), s => cb(s.size), () => cb(0));
}

// ---------- likes, counts, notifications ----------

export interface Notif { id: string; type: 'like' | 'follow' | 'goal' | 'invite'; from: string; fromName: string; fromHandle: string; bookId?: string; bookName?: string; goal?: string; at: number; read: boolean }
const note = (me: Account, type: 'like' | 'follow', book?: { id: string; name: string }) => ({
  type, from: me.uid, fromName: me.name, fromHandle: me.handle, ...(book ? { bookId: book.id, bookName: book.name } : {}), at: Date.now(), read: false,
});

/** Sends a notification once: its id is fixed per person and action, and the rules refuse overwriting it. */
function notifyOnce(to: string, id: string, data: object) {
  setDoc(doc(need().db, 'users', to, 'notifications', id), data).catch(() => { /* already sent */ });
}

/** Likes or unlikes a sketchbook: the like itself, the book's and owner's like counts, and (the first time) a notification. */
export async function setLike(me: Account, book: { id: string; ownerId: string; name: string }, on: boolean) {
  const { db: d } = need(), batch = writeBatch(d), r = doc(d, 'books', book.id, 'likes', me.uid), by = on ? 1 : -1;
  if (on) batch.set(r, { at: Date.now() }); else batch.delete(r);
  batch.set(doc(d, 'bookCounts', book.id), { likes: increment(by) }, { merge: true });
  batch.set(doc(d, 'userCounts', book.ownerId), { likes: increment(by), likeBook: book.id }, { merge: true });
  await batch.commit();
  if (on && book.ownerId !== me.uid) notifyOnce(book.ownerId, `like_${book.id}_${me.uid}`, note(me, 'like', book));
}

/** Live document listener; returns an unsubscribe function. */
export function watch(path: string[], cb: (data: DocumentData | null) => void): () => void {
  if (!db) return () => {};
  const [c, ...rest] = path;
  return onSnapshot(doc(db, c, ...rest), s => cb(s.exists() ? s.data() : null), () => cb(null));
}

export function watchNotifications(uid: string, cb: (n: Notif[]) => void): () => void {
  if (!db) return () => {};
  return onSnapshot(query(collection(db, 'users', uid, 'notifications'), orderBy('at', 'desc'), limit(40)),
    s => cb(s.docs.map(x => ({ ...(x.data() as Omit<Notif, 'id'>), id: x.id }))), () => cb([]));
}

export async function markRead(uid: string, ids: string[]) {
  if (!ids.length) return;
  const { db: d } = need(), batch = writeBatch(d);
  ids.forEach(id => batch.update(doc(d, 'users', uid, 'notifications', id), { read: true }));
  await batch.commit();
}

/** Records reaching a goal once (fixed id, so a second attempt is refused by the rules and ignored). */
export async function addGoal(me: Account, goal: string) {
  await setDoc(doc(need().db, 'users', me.uid, 'notifications', 'goal_' + goal), { type: 'goal', goal, from: me.uid, fromName: me.name, fromHandle: me.handle, at: Date.now(), read: false }).catch(() => {});
}

// ---------- saved, blocked, reports, following shelf ----------

/** What a saved sketchbook shows in your Saved list (copied so the list renders without extra reads). */
export interface Saved { id: string; name: string; color: string; shape: ShapeKey; cover: string | null; ownerId: string; ownerName: string; ownerHandle: string; at: number; /** Collection name ('' = unsorted). */ col?: string }

export async function savedBooks(uid: string): Promise<Saved[]> {
  const s = await getDocs(collection(need().db, 'users', uid, 'saved'));
  return s.docs.map(d => ({ ...(d.data() as Omit<Saved, 'id'>), id: d.id })).sort((a, b) => b.at - a.at);
}
export async function setSaved(uid: string, b: Saved, on: boolean) {
  const r = doc(need().db, 'users', uid, 'saved', b.id);
  if (on) { const { id: _id, ...rest } = b; await setDoc(r, rest); } else await deleteDoc(r);
}

/** Moves a saved sketchbook into a collection ('' takes it out of one). */
export async function setCollection(uid: string, bookId: string, col: string) { await updateDoc(doc(need().db, 'users', uid, 'saved', bookId), { col: col.slice(0, 40) }); }

export async function blockedUsers(uid: string): Promise<string[]> {
  return (await getDocs(collection(need().db, 'users', uid, 'blocked'))).docs.map(d => d.id);
}
export async function setBlocked(uid: string, target: string, on: boolean, wasFollowing = false) {
  const { db: d } = need(), r = doc(d, 'users', uid, 'blocked', target);
  if (!on) return deleteDoc(r);
  const batch = writeBatch(d);
  batch.set(r, { at: Date.now() });
  if (wasFollowing) { batch.delete(doc(d, 'users', uid, 'following', target)); batch.delete(doc(d, 'users', target, 'followers', uid)); }
  await batch.commit();
}

export const REPORT_REASONS = ['Spam or scam', 'Not their own work', 'Harassment or hate', 'Sexual content', 'Something else'] as const;
/** Files a report for moderators (one per person per target; reporting again is quietly ignored). */
export async function report(by: string, r: { kind: 'book' | 'user'; targetId: string; ownerId: string; reason: string; note: string }) {
  await setDoc(doc(need().db, 'reports', `${by}_${r.targetId}`), { by, ...r, note: r.note.slice(0, 500), at: Date.now() })
    .catch(e => { if ((e as { code?: string }).code !== 'permission-denied') throw e; });
}

// ---------- moderation ----------

export interface Report { id: string; by: string; kind: 'book' | 'user'; targetId: string; ownerId: string; reason: string; note: string; at: number }

export async function isAdmin(uid: string): Promise<boolean> {
  try { return (await getDoc(doc(need().db, 'admins', uid))).exists(); } catch { return false; }
}
export async function reports(): Promise<Report[]> {
  const s = await getDocs(query(collection(need().db, 'reports'), orderBy('at', 'desc'), limit(200)));
  return s.docs.map(d => ({ ...(d.data() as Omit<Report, 'id'>), id: d.id }));
}
export async function dismissReport(id: string) { await deleteDoc(doc(need().db, 'reports', id)); }
export async function bannedUsers(): Promise<string[]> {
  if (!db) return [];
  try { return (await getDocs(collection(db, 'banned'))).docs.map(d => d.id); } catch { return []; }
}
/** Staff pick: one sketchbook moderators feature on the home page (picks/current). */
export async function getPick(): Promise<{ bookId: string; at: number } | null> {
  if (!db) return null;
  try { const s = await getDoc(doc(db, 'picks', 'current')); return s.exists() && s.data().bookId ? { bookId: s.data().bookId, at: s.data().at || 0 } : null; } catch { return null; }
}
export async function setPick(by: string, bookId: string | null) {
  const r = doc(need().db, 'picks', 'current');
  if (bookId) await setDoc(r, { bookId, by, at: Date.now() }); else await deleteDoc(r);
}

/** Hides a sketchbook from everyone but its owner, or restores it. */
export async function setHidden(bookId: string, on: boolean) { await updateDoc(doc(need().db, 'books', bookId), { hidden: on, isPublic: !on }); }
/** Suspends an artist (their public sketchbooks are hidden) or lifts it (books hidden by moderators come back). */
export async function setBanned(uid: string, on: boolean) {
  const { db: d } = need(), books = await getDocs(query(collection(d, 'books'), where('ownerId', '==', uid))), batch = writeBatch(d);
  if (on) batch.set(doc(d, 'banned', uid), { at: Date.now() }); else batch.delete(doc(d, 'banned', uid));
  books.forEach(b => {
    const x = b.data();
    if (on && x.isPublic !== false) batch.update(b.ref, { hidden: true, isPublic: false });
    if (!on && x.hidden === true) batch.update(b.ref, { hidden: false, isPublic: true });
  });
  await batch.commit();
}

/** Recent public books from the given artists (Firestore allows 30 ids per `in` query). */
export async function booksBy(uids: string[]): Promise<BookDoc[]> {
  if (!db || !uids.length) return [];
  const chunks: string[][] = []; for (let i = 0; i < uids.length; i += 30) chunks.push(uids.slice(i, i + 30));
  const all = await Promise.all(chunks.map(c => getDocs(query(collection(db!, 'books'), where('ownerId', 'in', c), where('isPublic', '==', true)))));
  return all.flatMap(s => s.docs.map(x => bookDoc(x.id, x.data()))).filter(b => b.pageCount > 0).sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Opens the share sheet where there is one, otherwise copies the link. Returns what happened. */
export async function shareLink(url: string, title: string): Promise<'shared' | 'copied' | 'cancelled'> {
  const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
  if (nav.share && matchMedia('(pointer: coarse)').matches) {
    try { await nav.share({ title, url }); return 'shared'; } catch { return 'cancelled'; }
  }
  await navigator.clipboard.writeText(url);
  return 'copied';
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

/** Our own branded email, sent by api/email (Resend). Returns false when that isn't available
 *  (not set up yet, or local dev), so the caller can fall back to Firebase's plain email. */
async function ourEmail(kind: 'verify' | 'reset' | 'change', body: object, u?: User | null): Promise<boolean> {
  let r: Response;
  try {
    r = await fetch('/api/email', { method: 'POST', headers: { 'content-type': 'application/json', ...(u ? { authorization: 'Bearer ' + await u.getIdToken(true) } : {}) }, body: JSON.stringify({ kind, ...body }) });
  } catch { return false; }
  if (r.ok) return true;
  const err = await r.json().catch(() => null) as { error?: string } | null;
  if (r.status >= 500 || r.status === 404 || !err?.error?.startsWith('auth/')) return false;
  throw Object.assign(new Error(err.error), { code: err.error });
}

/** Firebase's own email, with its link sent straight to our /auth/action page: handleCodeInApp makes
 *  Firebase pass the code through instead of acting on it, so the console's action URL isn't needed.
 *  (Falls back to Firebase's own page if this domain isn't in Authentication → Settings → Authorized domains.) */
async function withLink(send: (s?: { url: string; handleCodeInApp: boolean }) => Promise<void>) {
  try { await send({ url: location.origin + '/auth/action', handleCodeInApp: true }); }
  catch (e) { if ((e as { code?: string }).code !== 'auth/unauthorized-continue-uri') throw e; await send(); }
}
async function sendVerification(u: User) { if (!await ourEmail('verify', {}, u)) await withLink(s => sendEmailVerification(u, s)); }
// ---------- email links (our own page at /auth/action instead of Firebase's) ----------

/** What an emailed link is for, and the address it concerns. Throws for expired or used links. */
export async function checkLink(mode: string, code: string): Promise<{ email: string }> {
  const a = need().auth;
  if (mode === 'resetPassword') return { email: await verifyPasswordResetCode(a, code) };
  const info = await checkActionCode(a, code); return { email: info.data.email || '' };
}
/** Confirms an email address, an email change, or undoes one (recoverEmail). */
export async function useLink(code: string) { await applyActionCode(need().auth, code); }
export async function setNewPassword(code: string, pw: string) { await confirmPasswordReset(need().auth, code, pw); }

/** The signed-in user's ID token, for our own api/ functions. */
export async function idToken() { const u = need().auth.currentUser; return u ? u.getIdToken() : ''; }

export async function resendVerification() { const u = need().auth.currentUser; if (u) await sendVerification(u); }

/** Reloads the signed-in user and reports whether their email is confirmed. */
export async function refreshVerified(): Promise<boolean> { const u = need().auth.currentUser; if (!u) return false; await u.reload(); return u.emailVerified; }

/** Sends a confirmation link to the new address; the email changes once it's clicked. */
export async function changeEmail(pw: string, next: string) { const u = await reauth(pw); if (!await ourEmail('change', { newEmail: next }, u)) await withLink(s => verifyBeforeUpdateEmail(u, next, s)); }

export async function changePassword(pw: string, next: string) { await updatePassword(await reauth(pw), next); }

async function removeFolder(path: string) {
  const r = await listAll(ref(need().storage, path));
  await Promise.all([...r.items.map(i => deleteObject(i).catch(() => {})), ...r.prefixes.map(p => removeFolder(p.fullPath))]);
}

/** Deletes everything the user owns (books, images, follows, handle, profile), then the account itself. */
export async function deleteAccount(pw: string, acct: Account) {
  const u = await reauth(pw), { db: d } = need();
  const books = await getDocs(query(collection(d, 'books'), where('ownerId', '==', acct.uid)));
  // Leave sketchbooks shared with this account, and turn down open invitations.
  const [shared, invited] = await Promise.all([getDocs(query(collection(d, 'books'), where('collab', '==', acct.uid))), getDocs(query(collection(d, 'books'), where('invite', '==', acct.uid)))]);
  await Promise.all([...shared.docs.map(b => endShare(b.id)), ...invited.docs.map(b => declineInvite(b.id))]).catch(e => console.warn('leaving shared books', e));
  const subs = await Promise.all(['following', 'followers', 'saved', 'blocked', 'notifications'].map(c => getDocs(collection(d, 'users', acct.uid, c))));
  // The username is only removed if it's really this account's: older accounts may not have one (or have an old
  // one), and deleting a missing or someone else's handle is refused, which used to fail the whole deletion.
  const handle = acct.handle ? await getDoc(doc(d, 'handles', acct.handle)).catch(() => null) : null;
  const refs = [...books.docs.map(b => b.ref), ...subs.flatMap(c => c.docs.map(f => f.ref)),
    ...subs[0].docs.map(f => doc(d, 'users', f.id, 'followers', acct.uid)),
    ...(handle?.exists() && handle.data().uid === acct.uid ? [handle.ref] : [])];
  // In batches (Firestore takes at most 500 writes in one), the profile itself last.
  for (let i = 0; i < refs.length; i += 400) { const batch = writeBatch(d); refs.slice(i, i + 400).forEach(r => batch.delete(r)); await batch.commit(); }
  await deleteDoc(doc(d, 'users', acct.uid));
  await removeFolder(`users/${acct.uid}`).catch(() => {});
  await deleteUser(u);
}
