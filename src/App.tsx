import { Component, createRef } from 'react';
import type { ChangeEvent, DragEvent, MouseEvent, PointerEvent, WheelEvent } from 'react';
import { CONFIG, GRID_WIDTH, MAX_MEDIUMS, MAX_TAGS, MEDIUMS, PALETTE, SHAPES, mediumKey, tagSlug } from './data';
import type { Account, Book, OtherBook, PageNote, Shape, ShapeKey } from './data';
import * as api from './backend';
import type { AuthUser, BookDoc, Notif, Person, Report, Saved } from './backend';
import * as store from './storage';
import * as sound from './sound';
import * as themeMode from './themeMode';
import * as installer from './install';
import { COVER_INSIDE, pageWear } from './wear';
import { ADJUSTERS, NO_ADJUST, applyToCanvas, feValues, isAdjusted } from './adjust';
import type { Adjust } from './adjust';
import type { Wear } from './wear';
import { INK, MARK, PAPER, STONE } from './theme';
import Stage from './views/Stage';
import { AuthPage, Explore, HomeScreen, Profile, Settings } from './views/Screens';
import { Admin, Legal, NotFound } from './views/Pages';
import { Editor, EditProfile, Manager, NewBookPicker, ReportModal, Toast, Welcome } from './views/Overlays';

export type Mode = 'home' | 'mine' | 'other' | 'explore' | 'profile' | 'auth' | 'settings' | 'legal' | 'admin' | 'notfound';
/** A report with what it points at, for the moderation page. */
type AdminItem = Report & { targetName: string; ownerName: string; ownerHandle: string; hidden: boolean; banned: boolean; gone: boolean };
type AnyBook = Book | OtherBook;
/** Whose profile is open; name shows while the profile loads. */
type Who = { name: string; uid?: string; handle?: string };
type PublicProfile = Omit<Account, 'uid' | 'email'>;
// Everything a view reads: computed styles/labels plus handlers (mirrors the design's template bindings).
export type V = Record<string, any>;

interface EditState {
  queue: string[]; i: number; replaceIdx: number | null; target?: 'cover';
  scale: number; rot: number; skx: number; sky: number; tx: number; ty: number; nw: number; nh: number;
  /** Brightness, contrast and the rest (see adjust.ts), and which set of controls is showing. */
  adj: Adjust; mode: 'fit' | 'adjust';
}

interface State {
  mode?: Mode;
  /** False until the first auth check (and, when signed in, the user's books) has finished. */
  authReady?: boolean;
  acct: Account | null; follows: string[];
  books: Book[]; active: number; images: string[];
  other?: AnyBook | null; profileOf?: Who | null; pfPreview?: boolean;
  pf?: { uid: string; profile: PublicProfile | null; books: OtherBook[] } | null;
  acErr?: string; acInfo?: string; acBusy?: string; verified?: boolean;
  ac?: { email?: string; pwEmail?: string; pwOld?: string; pwNew?: string; delHandle?: string; pwDel?: string };
  community?: OtherBook[]; people?: Person[];
  saved?: Saved[]; blocked?: string[]; followFeed?: OtherBook[]; followPeople?: Person[]; pfTab?: 'books' | 'saved' | 'following';
  toast?: string; more?: 'book' | 'profile' | null;
  counts?: Record<string, number>; liked?: Record<string, boolean>; notifs?: Notif[]; notifOpen?: boolean;
  reportFor?: { kind: 'book' | 'user'; targetId: string; ownerId: string; label: string } | null; reportReason?: string; reportNote?: string; reportBusy?: boolean; reportErr?: string;
  p: number; zoom: number; managing: boolean;
  vw: number; vh: number; sw?: number; sh?: number;
  switching?: boolean; car?: number; swT?: number;
  focus?: boolean; fz?: number; fside?: 'L' | 'R'; fsx?: number; ctrlShow?: boolean; menuOpen?: boolean;
  edit?: EditState | null; edTool?: string; edAdjTool?: string; edPeek?: boolean;
  newPick?: boolean; pickShape?: ShapeKey;
  /** Sign-in page: which form, and the screen to return to. */
  authFrom?: Mode; suMode?: 'join' | 'signin' | 'reset'; su?: { name: string; handle: string; email: string; pw: string } | null; suHT?: boolean;
  suBusy?: boolean; suErr?: string; suInfo?: string;
  draft?: (Omit<Account, 'uid' | 'email' | 'joined'>) | null; dBusy?: boolean; dErr?: string;
  exView?: string; exSort?: 'trending' | 'new'; exQ?: string; stS?: number;
  /** Explore paging, and the medium/tag filter ('m:ink', 't:lisbon') with its results. */
  exMore?: boolean; exBusy?: boolean; exLabel?: string; exLabelBooks?: OtherBook[] | null;
  legal?: 'privacy' | 'terms'; nf?: string;
  banned?: string[]; admin?: boolean; adReports?: AdminItem[] | null; adBusy?: string; adErr?: string;
  /** Resend on the confirm-email reminder rests until this time. */
  vfUntil?: number;
  tagDraft?: string; soundOn?: boolean; dark?: boolean; welcome?: boolean;
  /** Shared sketchbooks: invitations waiting for an answer, and the invite form on the Pages screen. */
  invites?: BookDoc[]; shDraft?: string; shBusy?: boolean; shErr?: string;
  /** Edit screen: which tab, and the page whose details sheet is open. */
  mgTab?: 'pages' | 'details' | 'share'; mgPage?: number | null;
  /** Touch screens: the swipe hint shows the first few times until a page is turned. */
  hintDone?: boolean;
}

const ini = (n?: string) => (n || '').trim().split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
const slug = (v?: string) => (v || '').toLowerCase().replace(/[^a-z0-9._]+/g, '').slice(0, 24);
const fmtK = (v: number) => v >= 1000 ? (v / 1000).toFixed(1) + 'k' : String(v);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
/** Peak total bend from spine to outer edge of a turning page (degrees). */
const CURL_DEG = 110;
/** Page width as a share of a phone's screen: closed, and open (two pages side by side, plus the fan of turning pages). */
const PHONE_CLOSED = 0.6, PHONE_OPEN = 0.44;
const IS_TOUCH = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
/** Zooming into a page, and sliding between the two pages of a spread while zoomed (ms). */
const FOCUS_MS = 300, FOCUS_SHIFT_MS = 280;
/** Likes and followers each artist is working toward. */
const GOAL = 100;
const avatarBg = (av?: string | null) => av ? `url("${av}") center/cover no-repeat ${INK}` : INK;
const isData = (u?: string | null): u is string => !!u && u.startsWith('data:');
/** Every stored file a book uses: pages, cover and their thumbnails (for cleaning up removed ones). */
const bookUrls = (b: Book) => { const main = [...b.images, ...(b.coverImg ? [b.coverImg] : [])]; return [...main, ...main.map(u => b.thumbs?.[u]).filter((u): u is string => !!u)]; };
/** Drops thumbnails for pages and covers the book no longer has. */
const pruneThumbs = (b: Book) => Object.fromEntries([...b.images, b.coverImg].filter((u): u is string => !!u && !!b.thumbs?.[u]).map(u => [u, b.thumbs![u]]));
const localBook = (): Book => ({ id: 'local', name: 'sketchbook', color: '#b8243a', images: [] });
/** A Firestore book shown read-only (Explore, profiles). */
const toOther = (b: BookDoc, idx: number): OtherBook => ({
  id: b.id, idx, shape: b.shape, likes: b.pageCount, artist: (b.ownerName || '@' + b.ownerHandle) + (b.collab ? ' & ' + (b.collab.name || '@' + b.collab.handle) : ''), name: b.name, color: b.color,
  images: b.pages, pages: Math.max(CONFIG.minPages, b.pageCount + (b.pageCount % 2)), initials: ini(b.ownerName), coverImg: b.cover,
  ownerId: b.ownerId, handle: b.ownerHandle, updatedAt: b.updatedAt, thumbs: api.thumbMap(b),
  notes: api.noteMap(b), mediums: b.mediums, tags: b.tags,
});
const fmtDate = (d?: string) => { if (!d) return ''; const t = new Date(d + 'T12:00:00'); return isNaN(+t) ? '' : t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); };
/** "Lisbon · 12 Mar 2026" */
const noteText = (n?: PageNote) => [n?.c?.trim(), fmtDate(n?.d)].filter(Boolean).join(' · ');

export default class App extends Component<object, State> {
  state: State = {
    acct: null, follows: [],
    books: [localBook()], active: 0, managing: false, images: [], p: 0, zoom: 1,
    vw: window.innerWidth || 1200, vh: window.innerHeight || 800, soundOn: sound.soundOn(), dark: themeMode.isDark(),
  };

  // Animation and gesture bookkeeping (not rendered directly).
  raf = 0; exRaf = 0; sraf = 0; fraf = 0;
  target = 0;
  drag: { x: number; p0: number; id: number } | null = null; moved = false;
  edDrag: { x: number; y: number; tx: number; ty: number } | null = null;
  /** Active pointers on the editor frame, and the two-finger gesture baseline (pinch zoom + twist rotate). */
  edPts = new Map<number, { x: number; y: number }>();
  edPinch: { dist: number; ang: number; mx: number; my: number; scale: number; rot: number; tx: number; ty: number } | null = null;
  dragIdx: number | null = null;
  /** Fingers on the book, for pinch to zoom. */
  stPts = new Map<number, { x: number; y: number }>(); pinch0 = 0;
  wheelLock = false; stLock = false; stT = 0; stY: number | null = null;
  wakeT?: ReturnType<typeof setTimeout>;
  editImg?: HTMLImageElement;
  exView0 = store.loadExView();
  blobs = new Map<string, string>();
  ro?: ResizeObserver; stageEl?: HTMLElement;
  fileRef = createRef<HTMLInputElement>(); coverRef = createRef<HTMLInputElement>(); avRef = createRef<HTMLInputElement>();
  unAuth?: () => void; signingUp = false;
  // Book sync: books with unsaved changes, one promise chain per book, and the file URLs last written for each.
  dirty = new Set<string>(); syncT?: ReturnType<typeof setTimeout>; syncQ = new Map<string, Promise<void>>(); synced = new Map<string, string[]>();

  // ---------- lifecycle ----------
  onResize = () => this.setState({ vw: window.innerWidth || 1200, vh: window.innerHeight || 800 });
  onKey = (e: KeyboardEvent) => {
    const s = this.state;
    if (e.key === 'Escape' && s.draft) return this.setState({ draft: null });
    if (e.key === 'Escape' && s.welcome) return this.setState({ welcome: false });
    if (e.key === 'Escape' && s.mode === 'auth') return this.closeAuth();
    if (e.key !== 'Escape' && (!['mine', 'other'].includes(s.mode || 'home') || s.draft)) return;
    if (e.key === 'Escape') {
      if (s.newPick) return this.setState({ newPick: false });
      if (!s.edit && !s.managing && s.focus) return this.setFocus(false);
      if (s.edit) return this.setState({ edit: null });
      if (s.managing && s.mgPage != null) return this.setState({ mgPage: null });
      if (s.managing && this.mgChanged() && !window.confirm('Discard your changes to this sketchbook?')) return;
      return this.setState({ managing: false });
    }
    const t = e.target as HTMLElement;
    if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || s.managing || s.edit) return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); return this.openClose(e.key === 'ArrowUp'); }
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!dir) return;
    if (e.shiftKey) this.switchBook(s.active + dir); else this.go(dir);
  };
  componentDidMount() {
    this.onResize();
    requestAnimationFrame(this.onResize);
    addEventListener('resize', this.onResize); addEventListener('keydown', this.onKey); addEventListener('popstate', this.onPop);
    document.addEventListener('visibilitychange', this.onFocus); addEventListener('focus', this.onFocus);
    installer.onChange(() => this.forceUpdate());
    this.unAuth = api.watchAuth(u => { if (!this.signingUp) this.loadUser(u); });
    this.loadCommunity();
    api.bannedUsers().then(banned => this.setState({ banned }));
  }
  /** Loads (or clears) everything that belongs to the signed-in user. */
  async loadUser(u: AuthUser | null, acct?: Account) {
    if (!u) {
      this.synced.clear(); this.dirty.clear();
      return this.setState({ acct: null, follows: [], saved: [], blocked: [], followFeed: [], followPeople: [], books: [localBook()], active: 0, images: [], p: 0, authReady: true, admin: false });
    }
    try {
      const a = acct || await api.ensureProfile(u);
      const [docs, follows, saved, blocked] = await Promise.all([api.userBooks(u.uid), api.following(u.uid), api.savedBooks(u.uid).catch(() => []), api.blockedUsers(u.uid).catch(() => [])]);
      let books = docs.map(d => api.toBook(d, u.uid));
      // Books saved before visibility existed are re-saved once so they get the field (and stay in Explore).
      const legacy = docs.some(d => d.legacy && d.ownerId === u.uid);
      books.forEach((b, k) => { if (!docs[k].legacy) this.synced.set(b.id, bookUrls(b)); });
      const fresh = !books.length;
      if (fresh) books = [{ id: api.newBookId(), name: 'sketchbook', color: '#b8243a', images: [], createdAt: Date.now() }];
      this.target = 0;
      // Signed-in visitors start on their own sketchbooks rather than the home page.
      if (!u.verified && !acct) this.checkVerified();
      this.setState(s => ({ acct: a, verified: acct ? false : !!u.verified, follows, saved, blocked, books, active: 0, images: books[0].images, p: 0, authReady: true, mode: this.routed && (s.mode === 'home' || s.mode === 'auth') ? 'mine' : s.mode }),
        () => { if (fresh || legacy) this.persist(books); this.backfillThumbs(); this.loadFollowFeed(); api.mirrorFollows(u.uid, follows).catch(e => console.warn('follower backfill', e));
          api.isAdmin(u.uid).then(admin => this.setState({ admin }, () => { if (admin && this.state.mode === 'admin') this.loadReports(); })); });
    } catch (e) {
      console.error(e);
      this.setState({ authReady: true });
    }
  }
  /** Explore loads public books a page at a time; `more` fetches the next page. */
  exCursor: api.Cursor = null; exGen = 0;
  /** The saved sign-in doesn't learn about a confirmed email until it's reloaded, so check quietly. */
  checkVerified = () => {
    if (!this.state.acct || this.state.verified === true) return;
    api.refreshVerified().then(ok => { if (ok) this.setState({ verified: true }); }).catch(() => {});
  };
  onFocus = () => { if (document.visibilityState === 'visible') this.checkVerified(); };
  loadCommunity(more = false) {
    const s = this.state, sort = s.exSort || 'trending';
    if (more && (s.exBusy || !s.exMore)) return;
    const gen = more ? this.exGen : ++this.exGen;
    if (!more) this.exCursor = null;
    this.setState({ exBusy: true });
    api.communityPage(sort, more ? this.exCursor : null).then(({ books, next }) => {
      if (gen !== this.exGen) return;
      this.exCursor = next;
      this.setState(st => {
        const prev = more ? st.community || [] : [], seen = new Set(prev.map(b => b.id));
        return { community: [...prev, ...books.filter(b => !seen.has(b.id)).map((b, i) => toOther(b, prev.length + i))], exMore: !!next, exBusy: false };
      });
    }).catch(e => { console.error(e); this.setState({ exBusy: false, community: this.state.community || [] }); });
  }
  /** Filters Explore to one medium or tag ('' clears it). */
  setLabel(lbl: string) {
    cancelAnimationFrame(this.exRaf); this.stT = 0;
    this.setState({ exLabel: lbl, exLabelBooks: lbl ? null : undefined, stS: 0 });
    if (!lbl) return;
    api.labelBooks(lbl).then(d => { if (this.state.exLabel === lbl) this.setState({ exLabelBooks: d.map(toOther) }); })
      .catch(e => {
        // Fall back to filtering what's loaded.
        console.warn('label query', e);
        const [k, val] = [lbl.slice(0, 2), lbl.slice(2)];
        if (this.state.exLabel === lbl) this.setState({ exLabelBooks: (this.state.community || []).filter(b => k === 'm:' ? (b.mediums || []).some(m => mediumKey(m) === val) : (b.tags || []).includes(val)) });
      });
  }
  openLabel(lbl: string) { this.goMode('explore'); this.setState({ exQ: '' }); this.setLabel(lbl); }
  /** Community books, minus anyone you've blocked or who's suspended. */
  community(list = this.state.community): OtherBook[] { const bl = [...(this.state.blocked || []), ...(this.state.banned || [])]; return (list || []).filter(b => !b.ownerId || !bl.includes(b.ownerId)); }
  loadFollowFeed() {
    const s = this.state, ids = (s.follows || []).filter(id => !(s.blocked || []).includes(id));
    if (!s.acct || !ids.length) return this.setState({ followFeed: [] });
    api.booksBy(ids).then(d => this.setState({ followFeed: d.map(toOther) })).catch(e => console.error(e));
  }
  toastT?: ReturnType<typeof setTimeout>;
  toast(msg: string) { clearTimeout(this.toastT); this.setState({ toast: msg }); this.toastT = setTimeout(() => this.setState({ toast: '' }), 2600); }
  share(path: string, title: string) {
    api.shareLink(location.origin + path, title).then(r => { if (r === 'copied') this.toast('Link copied'); }).catch(() => this.toast('Couldn’t copy the link'));
  }
  openBookById(id: string) { api.getBook(id).then(d => d ? this.openOtherBook(toOther(d, 0)) : this.toast('That sketchbook is no longer available')); }
  notFound(nf: string) { cancelAnimationFrame(this.raf); this.target = 0; this.setState(s => ({ mode: 'notfound', nf, other: null, images: s.books[s.active].images, p: 0, focus: false, fz: 0, managing: false })); }
  openLegal(legal: 'privacy' | 'terms') { cancelAnimationFrame(this.raf); this.setState({ mode: 'legal', legal, other: null, focus: false, fz: 0, managing: false, draft: null }); }
  openAdmin() { cancelAnimationFrame(this.raf); this.setState({ mode: 'admin', other: null, focus: false, fz: 0, managing: false, draft: null }); if (this.state.admin) this.loadReports(); }
  isSaved(id?: string) { return !!id && (this.state.saved || []).some(x => x.id === id); }
  toggleSave(b: OtherBook) {
    const a = this.state.acct; if (!a) return this.openJoin();
    const on = !this.isSaved(b.id), cover = b.coverImg ? this.thumbOf(b, b.coverImg) : null;
    const item: Saved = { id: b.id, name: b.name, color: b.color, shape: b.shape, cover, ownerId: b.ownerId || '', ownerName: b.artist, ownerHandle: b.handle || '', at: Date.now() };
    this.setState(s => ({ saved: on ? [item, ...(s.saved || [])] : (s.saved || []).filter(x => x.id !== b.id) }));
    this.toast(on ? 'Saved to your profile' : 'Removed from Saved');
    api.setSaved(a.uid, item, on).catch(e => { console.error(e); this.toast('Couldn’t save that. Try again.'); });
  }
  toggleBlock(uid: string, name: string) {
    const a = this.state.acct; if (!a) return this.openJoin();
    const on = !(this.state.blocked || []).includes(uid), wasFollowing = (this.state.follows || []).includes(uid);
    if (on && !window.confirm(`Block ${name}? Their sketchbooks will be hidden from you, and you’ll stop following them.`)) return;
    this.setState(s => ({ blocked: on ? [...(s.blocked || []), uid] : (s.blocked || []).filter(x => x !== uid), follows: on ? s.follows.filter(x => x !== uid) : s.follows, more: null }), () => this.loadFollowFeed());
    this.toast(on ? `Blocked ${name}` : `Unblocked ${name}`);
    api.setBlocked(a.uid, uid, on, wasFollowing).catch(e => { console.error(e); this.toast('Couldn’t update that. Try again.'); });
  }
  openReport(r: NonNullable<State['reportFor']>) { if (!this.state.acct) return this.openJoin(); this.setState({ reportFor: r, reportReason: '', reportNote: '', reportErr: '', more: null }); }
  /** Decoded images kept alive so turns, zooms and the focus backdrop never wait on a download. */
  preloaded = new Map<string, HTMLImageElement>();
  preload(urls: (string | null | undefined)[]) {
    for (const u of urls) {
      if (!u || this.preloaded.has(u)) continue;
      if (this.preloaded.size > 400) this.preloaded.delete(this.preloaded.keys().next().value!);
      const im = new Image(); im.decoding = 'async'; im.src = this.blobUrl(u);
      im.decode?.().catch(() => {});
      this.preloaded.set(u, im);
    }
  }
  componentDidUpdate(_: object, prev: State) {
    const s = this.state;
    // The edit screen works on a draft: it's saved with Save, and closing it any other way puts the book back.
    if (!prev.managing && s.managing) { const b = s.books[s.active]; this.mgSnap = b; this.mgHold = b?.id ?? null; this.setState({ mgTab: 'pages', mgPage: null }); }
    if (prev.managing && !s.managing && this.mgHold) this.revertEdits();
    this.syncWatches();
    // The first route is applied once we know who's signed in; after that the URL follows the screen.
    if (s.authReady && !this.routed) { this.routed = true; this.applyRoute(); }
    else if (this.routed) {
      const want = this.pathFor(), cur = location.pathname + location.search;
      if (want !== cur) {
        const newScreen = prev.mode !== s.mode || prev.other !== s.other || prev.profileOf !== s.profileOf || prev.active !== s.active;
        history[newScreen && !this.applying ? 'pushState' : 'replaceState'](null, '', want);
      }
      document.title = this.titleFor();
    }
    // Pages of the open book, nearest to the current spread first.
    if (s.images !== prev.images || s.other !== prev.other) {
      const at = Math.max(0, 2 * Math.round(this.target) - 2);
      this.preload([...s.images].map((u, i) => [u, Math.abs(i - at)] as const).sort((x, y) => x[1] - y[1]).map(x => x[0]));
      this.preload([(s.other || s.books[s.active])?.coverImg]);
    }
    if (s.books !== prev.books) this.preload(s.books.map(b => b.coverImg));
    if (s.community !== prev.community) this.preload((s.community || []).flatMap(b => [b.coverImg && this.thumbOf(b, b.coverImg), b.images[0]]));
  }
  // ---------- live counts and notifications ----------
  watches = new Map<string, () => void>(); goalTried = new Set<string>();
  /** Keeps exactly the listeners the current screen needs: the open book's likes, the profile's counts, your notifications. */
  syncWatches() {
    const s = this.state, me = s.acct?.uid, o = s.other as OtherBook | null, mb = s.books[s.active];
    const want = new Map<string, () => () => void>();
    const bookId = s.mode === 'other' ? o?.id : s.mode === 'mine' && mb && !mb.id.startsWith('local') ? mb.id : undefined;
    if (bookId) want.set('bc:' + bookId, () => api.watch(['bookCounts', bookId], d => this.setState(st => ({ counts: { ...st.counts, ['b:' + bookId]: Math.max(0, d?.likes || 0) } }))));
    if (bookId && me && s.mode === 'other') want.set(`lk:${bookId}:${me}`, () => api.watch(['books', bookId, 'likes', me], d => this.setState(st => ({ liked: { ...st.liked, [bookId]: !!d } }))));
    const pu = s.mode === 'profile' ? s.profileOf?.uid || me : undefined;
    for (const u of new Set([pu, me])) if (u) {
      want.set('uc:' + u, () => api.watch(['userCounts', u], d => this.setState(st => ({ counts: { ...st.counts, ['l:' + u]: Math.max(0, d?.likes || 0) } }))));
      want.set('fo:' + u, () => api.watchSize(['users', u, 'followers'], n => this.setState(st => ({ counts: { ...st.counts, ['f:' + u]: n } }))));
    }
    if (me) want.set('nt:' + me, () => api.watchNotifications(me, notifs => this.setState({ notifs })));
    if (me) want.set('iv:' + me, () => api.watchInvites(me, invites => this.setState({ invites })));
    // Books two people can change are kept in sync live.
    if (me) for (const b of s.books) if (b.role === 'collab' || b.collab || b.invite) want.set('sb:' + b.id, () => api.watchBook(b.id, (d, local) => this.onSharedBook(b.id, d, local)));
    for (const [k, stop] of this.watches) if (!want.has(k)) { stop(); this.watches.delete(k); }
    for (const [k, start] of want) if (!this.watches.has(k)) this.watches.set(k, start());
    // Goals: a one-off notification the first time a count reaches 100.
    if (s.acct) for (const [k, goal] of [['l:', 'likes100'], ['f:', 'followers100']] as const) {
      if ((s.counts?.[k + me] || 0) >= GOAL && !this.goalTried.has(goal) && !(s.notifs || []).some(n => n.id === 'goal_' + goal)) { this.goalTried.add(goal); api.addGoal(s.acct, goal); }
    }
  }
  toggleLike(o: OtherBook) {
    const a = this.state.acct; if (!a) return this.openJoin();
    if (!o.ownerId) return;
    const on = !this.state.liked?.[o.id], key = 'b:' + o.id;
    this.setState(st => ({ liked: { ...st.liked, [o.id]: on }, counts: { ...st.counts, [key]: Math.max(0, (st.counts?.[key] || 0) + (on ? 1 : -1)) } }));
    api.setLike(a, { id: o.id, ownerId: o.ownerId, name: o.name }, on).catch(e => { console.error(e); this.toast('Couldn’t save that. Try again.'); this.setState(st => ({ liked: { ...st.liked, [o.id]: !on } })); });
  }
  componentWillUnmount() {
    this.watches.forEach(stop => stop());
    removeEventListener('resize', this.onResize); removeEventListener('keydown', this.onKey); removeEventListener('popstate', this.onPop);
    document.removeEventListener('visibilitychange', this.onFocus); removeEventListener('focus', this.onFocus);
    this.unAuth?.(); this.ro?.disconnect(); cancelAnimationFrame(this.raf); cancelAnimationFrame(this.exRaf);
  }
  stageRef = (el: HTMLDivElement | null) => {
    if (el && el !== this.stageEl && window.ResizeObserver) {
      this.ro?.disconnect(); this.stageEl = el;
      this.ro = new ResizeObserver(([e]) => this.setState({ sh: e.contentRect.height, sw: e.contentRect.width })); this.ro.observe(el);
    }
  };

  // ---------- navigation ----------
  openOtherBook(b: OtherBook) { cancelAnimationFrame(this.raf); this.target = 0; this.setState({ mode: 'other', other: b, images: b.images, p: 0, focus: false, fz: 0 }); }
  goMode(mode: Mode) {
    cancelAnimationFrame(this.raf); this.target = 0;
    if (mode === 'explore' || mode === 'home') { this.loadCommunity(); if (this.state.exLabel) this.setState({ exLabel: '', exLabelBooks: undefined }); }
    if (mode === 'home') this.loadFollowFeed();
    if (mode === 'explore') api.people().then(people => this.setState({ people })).catch(e => console.error(e));
    this.setState(s => ({ mode, other: null, images: s.books[s.active].images, p: 0, focus: false, fz: 0, managing: false }));
  }
  /** Opens the sign-in page; other, profileOf etc. are left alone so closing it returns to the same screen. */
  openAuth(suMode: 'join' | 'signin') {
    cancelAnimationFrame(this.raf); cancelAnimationFrame(this.exRaf);
    this.setState(s => ({ mode: 'auth', authFrom: s.mode === 'auth' ? s.authFrom : s.mode || 'home', suMode, su: s.mode === 'auth' ? s.su : { name: '', handle: '', email: '', pw: '' }, suHT: false, suErr: '', suInfo: '', focus: false, fz: 0, managing: false, newPick: false }));
  }
  openJoin = () => this.openAuth('join');

  // ---------- links ----------
  routed = false; applying = false;
  onPop = () => { this.applyRoute(); };
  /** The address for whatever is on screen. */
  pathFor(): string {
    const s = this.state, here = location.pathname + location.search;
    switch (s.mode || 'home') {
      case 'explore': {
        const q = new URLSearchParams(); if (s.exQ) q.set('q', s.exQ);
        if (s.exLabel) q.set(s.exLabel.startsWith('m:') ? 'medium' : 'tag', s.exLabel.slice(2));
        return '/explore' + (q.toString() ? '?' + q : '');
      }
      case 'legal': return '/' + (s.legal || 'privacy');
      case 'admin': return '/admin';
      case 'notfound': return here;
      case 'mine': { const b = s.books[s.active]; return s.acct && b && !b.id.startsWith('local') ? '/sketchbooks/' + b.id : '/sketchbooks'; }
      case 'other': { const o = s.other as OtherBook | null; return o?.handle ? `/@${o.handle}/${o.id}` : here; }
      case 'profile': {
        if (!s.profileOf) return s.acct ? '/@' + s.acct.handle : '/';
        const h = (s.pf?.uid === s.profileOf.uid && s.pf?.profile?.handle) || s.profileOf.handle;
        return h ? '/@' + h : here;
      }
      case 'auth': return s.suMode === 'signin' ? '/signin' : s.suMode === 'reset' ? '/reset' : '/join';
      case 'settings': return '/settings';
      default: return '/';
    }
  }
  titleFor(): string {
    const s = this.state, mode = s.mode || 'home', o = s.other as OtherBook | null;
    const t = mode === 'other' && o ? `${o.name} by ${o.artist}` : mode === 'mine' ? s.books[s.active]?.name : mode === 'explore' ? 'Explore'
      : mode === 'profile' ? (s.profileOf ? (s.pf?.profile?.name || s.profileOf.name) : s.acct?.name) : mode === 'settings' ? 'Account settings' : mode === 'auth' ? (s.suMode === 'join' ? 'Join' : 'Sign in')
      : mode === 'legal' ? (s.legal === 'terms' ? 'Terms' : 'Privacy') : mode === 'admin' ? 'Moderation' : mode === 'notfound' ? 'Not found' : '';
    return t ? `${t} · verso.` : 'verso. — A place for the unfinished';
  }
  /** Shows the screen for the current address (first load, back/forward, pasted links). */
  async applyRoute() {
    this.applying = true;
    try {
      const s = this.state, parts = location.pathname.split('/').filter(Boolean).map(decodeURIComponent), [a, b] = parts;
      if (!a) return s.acct ? this.goMode('mine') : this.goMode('home');
      if (a === 'explore') {
        const q = new URLSearchParams(location.search), m = q.get('medium'), t = q.get('tag');
        this.goMode('explore'); this.setState({ exQ: q.get('q') || '' });
        return this.setLabel(m ? 'm:' + m : t ? 't:' + tagSlug(t) : '');
      }
      if (a === 'privacy' || a === 'terms') return this.openLegal(a);
      if (a === 'admin') return s.acct ? this.openAdmin() : this.openAuth('signin');
      if (a === 'signin' || a === 'join' || a === 'reset') { if (s.acct) return this.goMode('mine'); this.openAuth(a === 'join' ? 'join' : 'signin'); if (a === 'reset') this.setState({ suMode: 'reset' }); return; }
      if (a === 'settings') return s.acct ? this.openSettings() : this.openAuth('signin');
      if (a === 'sketchbooks') {
        if (!s.acct) return this.openAuth('signin');
        const j = b ? s.books.findIndex(x => x.id === b) : -1;
        if (b && j < 0) return this.notFound('sketchbook');
        this.goMode('mine'); if (j >= 0) this.setState({ active: j, images: s.books[j].images });
        return;
      }
      if (a.startsWith('@')) {
        const handle = a.slice(1).toLowerCase();
        if (b) {
          const d = await api.getBook(b);
          if (!d) return this.notFound('sketchbook');
          if (d.ownerId === this.state.acct?.uid) { const j = this.state.books.findIndex(x => x.id === d.id); this.goMode('mine'); if (j >= 0) this.setState(st => ({ active: j, images: st.books[j].images })); return; }
          return this.openOtherBook(toOther(d, 0));
        }
        const uid = await api.uidForHandle(handle).catch(() => null);
        if (!uid) return this.notFound('artist');
        return this.openProfile(uid === this.state.acct?.uid ? null : { uid, name: '@' + handle, handle });
      }
      this.notFound('page');
    } finally {
      // Let the screen settle before URL changes count as new history entries again.
      setTimeout(() => { this.applying = false; }, 0);
    }
  }
  openSettings = () => { cancelAnimationFrame(this.raf); this.setState({ mode: 'settings', other: null, focus: false, fz: 0, managing: false, draft: null, acErr: '', acInfo: '' }); };
  closeAuth = () => this.setState(s => ({ mode: s.authFrom && s.authFrom !== 'auth' ? s.authFrom : 'home', suErr: '', suInfo: '', su: null }));
  openProfile(who: Who | null, force?: boolean) {
    if (!who && !this.state.acct && !force) return this.openJoin();
    if (who?.uid && who.uid === this.state.acct?.uid) who = null;
    cancelAnimationFrame(this.raf); cancelAnimationFrame(this.exRaf); this.target = 0;
    this.setState(s => ({ mode: 'profile', profileOf: who, pf: null, pfPreview: false, other: null, acErr: '', acInfo: '', images: s.books[s.active].images, p: 0, focus: false, fz: 0, managing: false }));
    const uid = who?.uid;
    if (uid) Promise.all([api.getProfile(uid), api.userBooks(uid, true)]).then(([profile, docs]) => {
      if (this.state.profileOf?.uid === uid) this.setState({ pf: { uid, profile, books: docs.filter(b => b.pageCount > 0).map(toOther) } });
    }).catch(e => console.error(e));
  }
  whoOf(b: OtherBook): Who { return { name: b.artist, uid: b.ownerId, handle: b.handle }; }
  openNewPick = () => this.setState({ newPick: true, pickShape: this.state.pickShape || 'portrait' });

  // ---------- books ----------
  /** Queues changed books for upload + save. Signed-out books are never saved. */
  persist(books: Book[]) {
    if (!this.state.acct) return;
    const prev = new Map(this.state.books.map(b => [b.id, b]));
    for (const b of books) if (b.id !== this.mgHold && (prev.get(b.id) !== b || !this.synced.has(b.id))) { this.dirty.add(b.id); this.editedAt.set(b.id, Date.now()); }
    clearTimeout(this.syncT);
    this.syncT = setTimeout(() => { for (const id of this.dirty) this.enqueue(id, () => this.syncBook(id)); this.dirty.clear(); }, 400);
  }
  enqueue(id: string, job: () => Promise<void>) {
    this.busy.set(id, (this.busy.get(id) || 0) + 1);
    const next = (this.syncQ.get(id) || Promise.resolve()).then(job).catch(e => console.error('sync failed', e))
      .finally(() => this.busy.set(id, (this.busy.get(id) || 1) - 1));
    this.syncQ.set(id, next);
  }
  // ---------- edit screen drafts ----------
  mgSnap?: Book; mgHold: string | null = null;
  mgChanged() { return !!this.mgHold && this.findBook(this.mgHold) !== this.mgSnap; }
  saveEdits() {
    const id = this.mgHold; this.mgHold = null;
    if (id && this.findBook(id) && this.findBook(id) !== this.mgSnap) {
      this.dirty.add(id); this.editedAt.set(id, Date.now());
      clearTimeout(this.syncT); this.syncT = setTimeout(() => { for (const d of this.dirty) this.enqueue(d, () => this.syncBook(d)); this.dirty.clear(); }, 50);
      this.toast('Saved');
    }
    this.setState({ managing: false, mgPage: null });
  }
  revertEdits() {
    const id = this.mgHold, snap = this.mgSnap; this.mgHold = null; if (!id || !snap) return;
    this.setState(s => {
      // Sharing changes take effect straight away, so they survive a Cancel.
      const books = s.books.map(b => b.id === id ? { ...snap, collab: b.collab, invite: b.invite, owner: b.owner } : b), mine = s.books[s.active]?.id === id;
      return { books, images: mine ? snap.images : s.images, mgPage: null, tagDraft: '' };
    });
  }
  // ---------- shared sketchbooks ----------
  editedAt = new Map<string, number>(); busy = new Map<string, number>();
  /** A shared book changed elsewhere: take the other person's pages unless this browser has edits of its own on the way. */
  onSharedBook(id: string, d: BookDoc | null, local: boolean) {
    const me = this.state.acct?.uid, cur = this.findBook(id); if (!me || !cur || local) return;
    if (!d || (cur.role === 'collab' && d.collab?.uid !== me)) {
      // Removed from it, or it was deleted.
      if (cur.role !== 'collab') return;
      this.setState(s => { const books = s.books.filter(b => b.id !== id), k = Math.min(s.active, books.length - 1);
        return books.length ? { books, active: k, images: s.books[s.active]?.id === id ? books[k].images : s.images } : null; });
      return this.toast(`You’re no longer drawing in “${cur.name}”`);
    }
    const share = { collab: d.collab, invite: d.invite, owner: { uid: d.ownerId, name: d.ownerName, handle: d.ownerHandle } };
    const busy = this.mgHold === id || this.dirty.has(id) || (this.busy.get(id) || 0) > 0 || bookUrls(cur).some(isData) || (this.editedAt.get(id) || 0) > d.updatedAt;
    const fresh = api.toBook(d, me);
    const next: Book = busy ? { ...cur, ...share } : { ...cur, ...share, images: fresh.images, thumbs: fresh.thumbs, notes: fresh.notes,
      ...(cur.role === 'collab' ? { name: fresh.name, color: fresh.color, coverImg: fresh.coverImg, mediums: fresh.mediums, tags: fresh.tags, isPublic: fresh.isPublic, hidden: fresh.hidden, shape: fresh.shape } : {}) };
    if (!busy) this.synced.set(id, bookUrls(next));
    this.setState(s => ({ books: s.books.map(b => b.id === id ? next : b), images: s.books[s.active]?.id === id && !busy ? next.images : s.images }));
  }
  /** Sharing actions for the open sketchbook (owner: invite / cancel / remove; the other person: leave). */
  async share$(fn: () => Promise<Partial<Book> | void>, done?: string) {
    this.setState({ shBusy: true, shErr: '' });
    try {
      const id = this.state.books[this.state.active]?.id, patch = await fn();
      if (patch) this.setState(s => ({ books: s.books.map(b => b.id === id ? { ...b, ...patch } : b), shDraft: '' }));
      if (done) this.toast(done);
    } catch (e) {
      const c = (e as { code?: string }).code;
      this.setState({ shErr: c === 'no-handle' ? 'No one has that handle.' : c === 'self-invite' ? 'That’s you.' : api.errMsg(e) });
    } finally { this.setState({ shBusy: false }); }
  }
  async answerInvite(d: BookDoc, yes: boolean) {
    const a = this.state.acct; if (!a) return;
    this.setState(s => ({ invites: (s.invites || []).filter(x => x.id !== d.id) }));
    try {
      if (!yes) return void await api.declineInvite(d.id);
      await api.acceptInvite(a, d.id);
      const fresh = await api.getBook(d.id); if (!fresh) return;
      const b = api.toBook(fresh, a.uid); this.synced.set(b.id, bookUrls(b));
      this.setState(s => ({ books: [...s.books.filter(x => x.id !== b.id), b], notifOpen: false }), () => {
        const j = this.state.books.findIndex(x => x.id === b.id); this.goMode('mine'); this.setState({ active: j, images: this.state.books[j].images });
      });
      this.toast(`You can now add pages to “${d.name}”`);
    } catch (e) { console.error(e); this.toast('Couldn’t answer that invitation. Try again.'); }
  }
  /** Makes thumbnails for the signed-in user's older pages and covers, one book at a time, in the background. */
  backfillThumbs() {
    const acct = this.state.acct; if (!acct) return;
    for (const b of this.state.books) {
      if (b.role === 'collab') continue;
      const missing = [...b.images, ...(b.coverImg ? [b.coverImg] : [])].filter(u => !isData(u) && !b.thumbs?.[u]);
      if (!missing.length) continue;
      this.enqueue(b.id, async () => {
        const made: Record<string, string> = {};
        for (const u of missing) { try { made[u] = await api.thumbFor(acct.uid, b.id, u); } catch (e) { console.warn('thumbnail failed', e); } }
        if (!Object.keys(made).length) return;
        await new Promise<void>(done => this.setState(s => ({ books: s.books.map(x => x.id === b.id ? { ...x, thumbs: { ...x.thumbs, ...made } } : x) }), done));
        await this.syncBook(b.id);
      });
    }
  }
  findBook(id: string) { return this.state.books.find(b => b.id === id); }
  /** Uploads any new images of a book, swaps in their URLs, then writes the book and removes files it no longer uses. */
  async syncBook(id: string) {
    const acct = this.state.acct; let b = this.findBook(id); if (!acct || !b) return;
    // A book open on the edit screen is saved with Save, not before (saveEdits queues it again).
    if (id === this.mgHold) return;
    const pending = bookUrls(b).filter(isData);
    if (pending.length) {
      const m = await api.uploadImages(acct.uid, id, pending);
      m.forEach(({ full }, du) => { const bu = this.blobs.get(du); if (bu) this.blobs.set(full, bu); });
      const swap = (u: string) => m.get(u)?.full || u, thumbs: Record<string, string> = {};
      m.forEach(({ full, thumb }) => { thumbs[full] = thumb; });
      await new Promise<void>(done => this.setState(s => ({
        books: s.books.map(x => x.id === id ? { ...x, images: x.images.map(swap), coverImg: x.coverImg && swap(x.coverImg), thumbs: { ...x.thumbs, ...thumbs },
          notes: x.notes && Object.fromEntries(Object.entries(x.notes).map(([u, n]) => [swap(u), n])) } : x),
        images: s.books[s.active]?.id === id ? s.images.map(swap) : s.images,
      }), done));
      b = this.findBook(id); if (!b) return;
      if (bookUrls(b).some(isData)) return; // newer images arrived meanwhile; their own sync follows
    }
    b = { ...b, thumbs: pruneThumbs(b) };
    await api.writeBook(this.state.acct || acct, b);
    const now = bookUrls(b), before = this.synced.get(id) || [];
    api.removeFiles(before.filter(u => !now.includes(u)));
    this.synced.set(id, now);
  }
  setImages(images: string[], patch: Partial<Book> = {}) {
    const books = this.state.books.map((b, k) => k === this.state.active ? { ...b, ...patch, images } : b); this.setState({ books, images }); this.persist(books);
    const max = Math.max(CONFIG.minPages, images.length + (images.length % 2)) / 2 + 2;
    if (this.target > max) { this.target = max; this.setState({ p: max }); }
  }
  updateBook(patch: Partial<Book>) { const books = this.state.books.map((b, k) => k === this.state.active ? { ...b, ...patch } : b); this.setState({ books }); this.persist(books); }
  switchBook(j: number) {
    const books = this.state.books, from = this.state.active;
    if (this.state.focus || this.state.other) return;
    if (j < 0 || j >= books.length || j === from || this.state.switching) return;
    const slide = () => {
      this.setState({ switching: true, car: from });
      const dur = 520 + 140 * Math.min(3, Math.abs(j - from)), t0 = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - t0) / dur), e = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        if (t < 1) { this.setState({ car: from + (j - from) * e, swT: t }); this.raf = requestAnimationFrame(tick); }
        else this.setState({ switching: false, car: j, active: j, images: this.state.books[j].images, p: 0, swT: 0 });
      };
      this.raf = requestAnimationFrame(tick);
    };
    this.turnTo(0);
    if (this.state.p > 0.01) this.animate(slide); else { this.setState({ p: 0 }); slide(); }
  }
  newBook(shape: ShapeKey) {
    const books = this.state.books, n = books.length;
    const nb = [...books, { id: this.state.acct ? api.newBookId() : 'local-' + Date.now(), name: `sketchbook ${n + 1}`, color: PALETTE[n % PALETTE.length], images: [], shape, createdAt: Date.now() }];
    cancelAnimationFrame(this.raf); this.target = 0; this.setState({ books: nb, active: n, images: [], p: 0, managing: true, newPick: false }); this.persist(nb);
  }
  deleteBook() {
    const { books, active } = this.state;
    if (!window.confirm(`Delete “${books[active].name}” and all its pages? This can’t be undone.`)) return;
    const gone = books[active], j = Math.max(0, active - 1);
    // Deleting the only sketchbook leaves a fresh blank one in its place.
    let nb = books.filter((_, k) => k !== active);
    if (!nb.length) nb = [{ id: this.state.acct ? api.newBookId() : 'local-' + Date.now(), name: 'sketchbook', color: '#b8243a', images: [], createdAt: Date.now() }];
    if (this.state.acct) this.enqueue(gone.id, async () => { await api.deleteBook(gone.id, [...new Set([...bookUrls(gone), ...(this.synced.get(gone.id) || [])])]); this.synced.delete(gone.id); });
    const k = Math.min(j, nb.length - 1); this.target = 0; this.setState({ books: nb, active: k, images: nb[k].images, p: 0, managing: false }); this.persist(nb);
  }
  movePage(from: number, to: number) {
    const im = [...this.state.images]; if (to < 0 || to >= im.length || from === to) return;
    const [x] = im.splice(from, 1); im.splice(to, 0, x); this.setImages(im);
  }
  addFiles(files: FileList | File[]) {
    if (this.state.other || (this.state.mode || 'home') !== 'mine') return;
    const list = [...files].filter(f => f.type.startsWith('image/')).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    Promise.all(list.map(f => new Promise<string>(r => { const fr = new FileReader(); fr.onload = () => r(fr.result as string); fr.readAsDataURL(f); })))
      .then(urls => { if (urls.length) this.startEdit(urls, null); });
  }
  /** Data URLs are converted to blob URLs once so CSS backgrounds don't carry megabytes of inline data. */
  blobUrl(d: string) {
    if (!d) return d; let u = this.blobs.get(d); if (u) return u;
    if (!isData(d)) return d;
    try {
      const [h, b] = d.split(','); const bin = atob(b); const arr = new Uint8Array(bin.length);
      for (let k = 0; k < bin.length; k++) arr[k] = bin.charCodeAt(k);
      u = URL.createObjectURL(new Blob([arr], { type: h.slice(5).split(';')[0] }));
    } catch { u = d; }
    this.blobs.set(d, u); return u;
  }
  /** Cover background; the thumbnail unless `full` (the open book's own cover). */
  coverBg(b?: Partial<AnyBook>, full = false) {
    b = b || {}; if (!b.coverImg) return b.color || '#b8243a';
    const u = full ? b.coverImg : b.thumbs?.[b.coverImg] || b.coverImg;
    return `url("${this.blobUrl(u)}") center/cover no-repeat ${b.color}`;
  }
  thumbOf(b: Partial<AnyBook> | undefined, u: string) { return b?.thumbs?.[u] || u; }
  shapeOf(b?: Partial<AnyBook> | null): Shape {
    const sh = b?.shape && SHAPES[b.shape]; if (sh) return sh;
    return { a: CONFIG.aspect === 'square' ? 1 : CONFIG.aspect === 'landscape' ? 1.35 : 0.72, s: 1 };
  }
  curBook(): AnyBook { return this.state.other || this.state.books[this.state.active]; }
  aspect() { return this.shapeOf(this.curBook()).a; }

  // ---------- page turning ----------
  nPages() { const o = this.state.other as OtherBook | null | undefined; if (o) return o.pages; const n = this.state.images.length; return Math.max(CONFIG.minPages, n + (n % 2)); }
  nLeaves() { return this.nPages() / 2 + 2; }
  maxP() { return this.nLeaves(); }
  /** Background + page number for one side of a leaf. Leaf 0 is the front cover, the last leaf the back cover. */
  face(leaf: number, side: 0 | 1, w = 0): { bg: string; num: string; idx: number; wear: Wear | null; inside?: boolean; note?: string } {
    const N = this.nLeaves(), book = this.curBook(), cover = book?.color ?? '#b8243a', inner = '#e9e2d3';
    if (leaf === 0) return side ? { bg: inner, num: '', idx: -1, wear: null, inside: true } : { bg: this.coverBg(book, true), num: '', idx: -1, wear: null };
    if (leaf === N - 1) return side ? { bg: cover, num: '', idx: -1, wear: null } : { bg: inner, num: '', idx: -1, wear: null, inside: true };
    const pi = 2 * (leaf - 1) + side, img = this.state.images[pi], wear = this.wear(`${book?.id}:${pi}`, side ? 'l' : 'r', w), paper = wear.paper;
    return { bg: img ? `url("${this.blobUrl(img)}") center/cover no-repeat ${paper}` : paper, num: String(pi + 1), idx: img ? pi : -1, wear, note: img ? noteText(book?.notes?.[img]) : '' };
  }
  wearCache = new Map<string, Wear>();
  /** Per-page wear, cached because the book re-renders every animation frame. */
  wear(seed: string, outer: 'l' | 'r', w: number) {
    const k = `${seed}|${w}`; let v = this.wearCache.get(k);
    if (!v) { if (this.wearCache.size > 2000) this.wearCache.clear(); v = pageWear(seed, outer, w); this.wearCache.set(k, v); }
    return v;
  }
  /** Sets where the book is turning to, with a page sound for each turn made by the reader. */
  turnTo(t: number, from = Math.round(this.target)) {
    const n = Math.abs(Math.round(t) - from); if (n) sound.pageTurn(n);
    if (n && IS_TOUCH && !this.state.hintDone) { store.saveHints(store.loadHints() + 1); this.setState({ hintDone: true }); }
    this.target = t;
  }
  /** Eases the page position toward the target. Time-based, so a turn takes the same time on a slow phone (fewer frames) as on a fast screen. */
  animate(onDone?: () => void) {
    cancelAnimationFrame(this.raf);
    let last = performance.now();
    const step = (now: number) => {
      const p = this.state.p, d = this.target - p, dt = Math.min(64, now - last); last = now;
      if (Math.abs(d) < 0.002) { this.setState({ p: this.target }); onDone?.(); return; }
      this.setState({ p: p + d * (1 - Math.pow(1 - 0.16, dt / 16.7)) }); this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }
  /** ↑ steps closed → open → zoomed into a page; ↓ steps back: zoomed → open → closed on its front cover. */
  openClose(up: boolean) {
    if (this.state.switching) return;
    const N = this.nLeaves(), at = Math.round(this.target), closed = at === 0 || at === N;
    if (up) {
      if (closed) { this.turnTo(at === 0 ? 1 : N - 1); return this.animate(); }
      if (!this.state.focus) this.focusOn(at, this.autoSide(at));
    } else {
      if (this.state.focus) return this.setFocus(false);
      if (at !== 0) { this.turnTo(0); this.animate(); }
    }
  }
  go(dir: number) {
    if (this.state.focus) return this.focusGo(dir);
    this.turnTo(Math.max(0, Math.min(this.maxP(), Math.round(this.target) + dir))); this.animate();
  }
  /** Whether the left / right page of the spread at p has a drawing. */
  spreadImages(p: number) { const N = this.nLeaves(); return { l: p >= 1 && this.face(p - 1, 1).idx >= 0, r: p <= N - 2 && this.face(p, 0).idx >= 0 }; }
  /** Which page of the spread at p to centre in focus view: the left one when it has a drawing (or, arriving backwards, the right one when it does). */
  autoSide(p: number, from: 'L' | 'R' = 'L'): 'L' | 'R' {
    if (p >= this.nLeaves() - 1) return 'L';
    const { l, r } = this.spreadImages(p);
    return from === 'L' ? (l ? 'L' : 'R') : (r || !l ? 'R' : 'L');
  }
  /** Focus view steps page by page: across the spread when the other page has a drawing, otherwise to the next spread. */
  focusGo(dir: number) {
    const p = Math.round(this.target), N = this.nLeaves(), side = this.state.fside || 'R', { l, r } = this.spreadImages(p);
    if (dir > 0 && side === 'L' && r) return this.focusOn(p, 'R');
    if (dir < 0 && side === 'R' && l) return this.focusOn(p, 'L');
    const np = Math.max(1, Math.min(N - 1, p + dir)); if (np === p) return;
    this.focusOn(np, this.autoSide(np, dir > 0 ? 'L' : 'R'));
  }
  /** Book size: normal view (Hn) blended toward the focus view (Hf) by fz. */
  dims(b?: AnyBook, flat?: boolean) {
    const s = this.state, shp = this.shapeOf(b === undefined ? this.curBook() : b), sh = s.sh || s.vh * 0.5, sw = s.sw || s.vw, aspect = shp.a, fz = flat ? 0 : s.fz || 0;
    // Phones: a closed book is shown large, and shrinks as it opens so the whole spread fits the screen width.
    const phone = sw < 640, open = phone && !flat && (b === undefined || b === this.curBook()) ? clamp01(Math.min(s.p, this.nLeaves() - s.p)) : 0;
    const across = phone ? PHONE_CLOSED + (PHONE_OPEN - PHONE_CLOSED) * open : 0.29;
    const Hn = Math.max(phone ? 60 : 120, Math.min(sh * (phone ? 0.78 : 0.7) * shp.s, sw * across / aspect, 560 * shp.s) || 360) * s.zoom;
    const Hf = Math.max(200, Math.min(s.vh * 0.84, s.vw * 0.86 / aspect));
    const H = Hn + (Hf - Hn) * fz; return { H: Math.round(H), W: Math.round(H * aspect) };
  }

  // ---------- focus (zoomed single page) ----------
  focusOn(p: number, side: 'L' | 'R') {
    if (this.state.switching) return;
    this.setState({ fside: side }); cancelAnimationFrame(this.sraf);
    const from = this.state.fsx || 0, to = side === 'L' ? 1 : 0, t0 = performance.now();
    const tick = (now: number) => { const t = Math.min(1, (now - t0) / FOCUS_SHIFT_MS), e = 1 - Math.pow(1 - t, 3); this.setState({ fsx: from + (to - from) * e }); if (t < 1) this.sraf = requestAnimationFrame(tick); };
    if (this.state.focus) this.sraf = requestAnimationFrame(tick); else this.setState({ fsx: to });
    if (Math.abs(this.state.p - p) > 0.01) { this.turnTo(p); this.animate(); }
    this.setFocus(true);
  }
  setFocus(on: boolean) {
    if (on === !!this.state.focus) return;
    this.setState({ focus: on, ctrlShow: true, menuOpen: false });
    clearTimeout(this.wakeT); if (on) this.wakeT = setTimeout(() => this.state.focus && this.setState({ ctrlShow: false }), 1800);
    cancelAnimationFrame(this.fraf);
    const from = this.state.fz || 0, to = on ? 1 : 0, t0 = performance.now(), dur = FOCUS_MS;
    const tick = (now: number) => { const t = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - t, 3); this.setState({ fz: from + (to - from) * e }); if (t < 1) this.fraf = requestAnimationFrame(tick); };
    this.fraf = requestAnimationFrame(tick);
  }
  /** A tiny, colour-boosted copy of a page (made once per image) that the browser stretches into a soft blur. */
  soft = new Map<string, string | null>();
  softCopy(u: string): string | null {
    if (this.soft.has(u)) return this.soft.get(u) || null;
    this.soft.set(u, null);
    const im = new Image(); if (!/^(data|blob):/.test(u)) im.crossOrigin = 'anonymous';
    im.onload = () => {
      try {
        const c = document.createElement('canvas'); c.width = 14; c.height = 18; const x = c.getContext('2d')!;
        x.drawImage(im, 0, 0, c.width, c.height);
        const d = x.getImageData(0, 0, c.width, c.height);
        for (let i = 0; i < d.data.length; i += 4) { const [r, g, b] = [d.data[i], d.data[i + 1], d.data[i + 2]], l = 0.2126 * r + 0.7152 * g + 0.0722 * b; d.data[i] = l + (r - l) * 1.5; d.data[i + 1] = l + (g - l) * 1.5; d.data[i + 2] = l + (b - l) * 1.5; }
        x.putImageData(d, 0, 0); this.soft.set(u, c.toDataURL()); this.forceUpdate();
      } catch { /* image not readable (CORS): keep the plain backdrop */ }
    };
    im.src = this.blobUrl(u);
    return null;
  }
  drift(el: (HTMLDivElement & { _anim?: Animation }) | null, kf: Keyframe[], dur: number) {
    if (el && !el._anim && el.animate) el._anim = el.animate(kf, { duration: dur, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
  }
  bgRefA = (el: HTMLDivElement | null) => this.drift(el, [{ transform: 'translate(-6%,-4%) rotate(0deg) scale(1.1)' }, { transform: 'translate(5%,4%) rotate(10deg) scale(1.3)' }], 16000);

  // ---------- fit-your-page editor ----------
  startEdit(queue: string[], replaceIdx: number | null, target?: 'cover', mode: 'fit' | 'adjust' = 'fit') {
    this.setState({ edit: { queue, i: 0, replaceIdx, target, scale: 1, rot: 0, skx: 0, sky: 0, tx: 0, ty: 0, nw: 0, nh: 0, adj: NO_ADJUST, mode } });
    this.loadEditImg(queue[0]);
  }
  loadEditImg(src: string) {
    const im = new Image();
    // Stored pages are re-drawn to a canvas, so they must load with CORS (see cors.json).
    if (!isData(src)) im.crossOrigin = 'anonymous';
    im.onload = () => { this.editImg = im; this.setState(s => s.edit ? { edit: { ...s.edit, nw: im.naturalWidth, nh: im.naturalHeight } } : null); };
    im.src = this.blobUrl(src);
  }
  frame() {
    const { vw, vh } = this.state, a = this.aspect();
    // Phones: the frame fills the width, capped so the controls below still fit.
    if (vw < 640) { let fw = vw - 32, fh = fw / a; const maxH = vh * 0.5; if (fh > maxH) { fh = maxH; fw = fh * a; } return { fw: Math.round(fw), fh: Math.round(fh) }; }
    const fh = Math.round(Math.max(200, Math.min(vh * 0.58, 520))); return { fh, fw: Math.round(fh * a) };
  }
  baseSize() { const e = this.state.edit!, { fw, fh } = this.frame(); if (!e.nw) return { bw: fw, bh: fh }; const s = Math.min(fw / e.nw, fh / e.nh); return { bw: e.nw * s, bh: e.nh * s }; }
  /** Re-baselines the drag / pinch gesture whenever a finger is added or lifted. */
  edGestureStart() {
    const e = this.state.edit, pts = [...this.edPts.values()]; this.edDrag = null; this.edPinch = null;
    if (!e || !pts.length) return;
    if (pts.length === 1) this.edDrag = { x: pts[0].x, y: pts[0].y, tx: e.tx, ty: e.ty };
    else { const [a, b] = pts; this.edPinch = { dist: Math.hypot(b.x - a.x, b.y - a.y) || 1, ang: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, scale: e.scale, rot: e.rot, tx: e.tx, ty: e.ty }; }
  }
  setEd(patch: Partial<EditState>) { this.setState(s => ({ edit: { ...s.edit!, ...patch } })); }
  /** Renders the framed image exactly as shown into a 1600px-tall page. */
  applyEdit() {
    const e = this.state.edit, im = this.editImg; if (!e || !im) return;
    const { fh } = this.frame(), { bw, bh } = this.baseSize(), outH = 1600, outW = Math.round(outH * this.aspect()), k = outH / fh, r = Math.PI / 180;
    const c = document.createElement('canvas'); c.width = outW; c.height = outH; const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#f3efe6'; ctx.fillRect(0, 0, outW, outH);
    ctx.translate(outW / 2 + e.tx * k, outH / 2 + e.ty * k); ctx.rotate(e.rot * r); ctx.scale(e.scale, e.scale);
    ctx.transform(1, Math.tan(e.sky * r), Math.tan(e.skx * r), 1, 0, 0);
    ctx.drawImage(im, -bw * k / 2, -bh * k / 2, bw * k, bh * k);
    applyToCanvas(c, e.adj);
    const url = c.toDataURL('image/jpeg', 0.9), images = [...this.state.images];
    if (e.target === 'cover') { this.updateBook({ coverImg: url }); this.setState({ edit: null }); return; }
    let patch: Partial<Book> = {};
    if (e.replaceIdx != null) {
      // A re-fitted page keeps its caption and date.
      const old = images[e.replaceIdx], notes = this.state.books[this.state.active].notes;
      if (notes?.[old]) patch = { notes: { ...notes, [url]: notes[old] } };
      images[e.replaceIdx] = url;
    } else images.push(url);
    this.setImages(images, patch); this.nextEdit();
  }
  nextEdit() {
    const e = this.state.edit; if (!e) return; const i = e.i + 1;
    if (i >= e.queue.length || e.replaceIdx != null) { this.setState({ edit: null }); cancelAnimationFrame(this.raf); this.target = Math.round(this.target); this.setState({ p: this.target }); return; }
    // The next image keeps the same adjustments: a batch of scans usually needs the same fix.
    this.setState({ edit: { ...e, i, scale: 1, rot: 0, skx: 0, sky: 0, tx: 0, ty: 0, nw: 0, nh: 0 } }); this.loadEditImg(e.queue[i]);
  }

  // ---------- explore ----------
  /** Explore's list: the loaded pages (already in order from the server) or the medium/tag results, then the search. */
  exSorted() {
    const s = this.state, q = (s.exQ || '').trim().toLowerCase().replace(/^#/, '');
    const src = s.exLabel ? this.community(s.exLabelBooks || []) : this.community();
    const l = src.filter(b => !q || `${b.name} ${b.artist} @${b.handle || ''} ${(b.mediums || []).join(' ')} ${(b.tags || []).join(' ')}`.toLowerCase().includes(q));
    if (s.exLabel) return (s.exSort || 'trending') === 'trending' ? l.sort((a, b) => b.pages - a.pages) : l;
    return l;
  }
  exLoop() {
    cancelAnimationFrame(this.exRaf);
    const tick = () => {
      let s = this.state.stS || 0; const ds = this.stT - s, done = Math.abs(ds) <= 0.002; s = done ? this.stT : s + ds * 0.12;
      this.setState({ stS: s }); if (!done) this.exRaf = requestAnimationFrame(tick);
    };
    tick();
  }
  stackStep(d: number) {
    const n = this.exSorted().length; this.stT = Math.max(0, Math.min(n - 1, this.stT + d)); this.exLoop();
    if (!this.state.exLabel && this.stT > n - 6) this.loadCommunity(true);
  }

  // ---------- computed values per screen ----------
  homeVals(): V {
    const { vw, vh } = this.state, mob = vw < 640;
    // Signed in and following someone: the shelf shows their latest books first.
    const feed = this.state.acct ? (this.state.followFeed || []).filter(b => !(this.state.blocked || []).includes(b.ownerId || '')) : [];
    // Books from people you follow come first; the rest of the shelf is filled from the community.
    const seen = new Set(feed.map(b => b.id));
    const list = [...feed, ...[...this.community()].filter(b => !seen.has(b.id) && b.ownerId !== this.state.acct?.uid).sort((a, b) => b.likes - a.likes)];
    // One screen: the shelf takes what height is left after the headline block, and its books
    // shrink further if they'd be wider than the page.
    const sel = list.slice(0, mob ? 5 : 10), gap = mob ? 10 : 16, shapes = sel.map(b => this.shapeOf(b)), sumW = shapes.reduce((t, sh) => t + sh.s * sh.a, 0);
    const avail = (Math.min(vw, 1680) - 2 * (mob ? 16 : 40) - 24 - gap * Math.max(0, sel.length - 1)) * 0.9; // room for the tilt and back boards
    const maxH = mob ? Math.max(90, Math.min(170, vh * 0.21)) : Math.max(110, Math.min(290, vh * 0.29));
    const base = sumW ? Math.min(maxH, avail / sumW) : maxH;
    return {
      hmFollowing: feed.length > 0, hmMixed: feed.length > 0 && feed.length < sel.length, hmMob: mob, hmPadX: mob ? 16 : 40, hmPadT: mob ? 70 : 84, hmEmpty: !!this.state.community && !list.length, hmShelfGap: gap, hmShelfH: Math.round(base),
      hmShelf: sel.map((b, i) => {
        const hh = Math.round(base * shapes[i].s);
        return { key: b.id, name: b.name, color: b.color, bg: this.coverBg(b), showLabel: !b.coverImg, title: b.name + ' — ' + b.artist, h: hh, w: Math.round(hh * shapes[i].a), fs: Math.max(11, Math.round(hh / 17)), rot: [0, -2, 0, 1.5, 0, -1, 1, 0, -1.5, 1][i] || 0, open: () => this.openOtherBook(b) };
      }),
      startOwn: () => { if (!this.state.acct) return this.openProfile(null); this.goMode('mine'); this.openNewPick(); },
    };
  }

  profileVals(): V {
    const s = this.state, vw = s.vw, mob = vw < 640, mine = !s.profileOf, pv = mine && !!s.pfPreview, a = (s.acct || {}) as Partial<Account>, follows = s.follows || [];
    const card = (b: AnyBook, bg: string, showLabel: boolean, pages: number, open: () => void) => ({
      key: b.id, name: b.name, color: b.color, bg, showLabel, a: this.shapeOf(b).a, s: this.shapeOf(b).s,
      count: `${pages} ${pages === 1 ? 'page' : 'pages'} · ${(b as Book).role === 'collab' ? 'With ' + (b as Book).owner?.name : (b as Book).collab ? 'With ' + (b as Book).collab!.name : this.shapeOf(b).label || 'Portrait'}${(b as Book).isPublic === false ? ' · Private' : ''}`, open,
    });
    let p: { name?: string; handle?: string; bio?: string; loc?: string; web?: string; accent?: string; av?: string | null; joined: string; stats: [number, string][] };
    let list: ReturnType<typeof card>[], folOn = false;
    if (mine) {
      const tab = pv ? 'books' : s.pfTab || 'books';
      list = tab === 'saved'
        ? (s.saved || []).filter(x => !(s.blocked || []).includes(x.ownerId)).map(x => ({ ...card({ id: x.id, name: x.name, color: x.color, shape: x.shape, coverImg: x.cover, images: [] } as Book, x.cover ? `url("${x.cover}") center/cover no-repeat ${x.color}` : x.color, !x.cover, 0, () => this.openBookById(x.id)), count: `by ${x.ownerName}` }))
        : tab === 'following' ? []
        : s.books.map((b, j) => card(b, this.coverBg(b), !b.coverImg, b.images.length, () => { cancelAnimationFrame(this.raf); this.target = 0; this.setState({ mode: 'mine', profileOf: null, active: j, images: b.images, p: 0, other: null }); }));
      p = {
        name: a.name, handle: a.handle, bio: a.bio, loc: a.loc, web: a.web, accent: a.accent, av: a.av,
        joined: 'Joined ' + new Date(a.joined || Date.now()).toLocaleDateString('en', { month: 'short', year: 'numeric' }),
        stats: [[s.books.length, s.books.length === 1 ? 'sketchbook' : 'sketchbooks'], [s.books.reduce((t, b) => t + b.images.length, 0), 'pages']],
      };
    } else {
      const who = s.profileOf!, pf = s.pf?.uid === who.uid ? s.pf : null, pr = pf?.profile, bks = (s.blocked || []).includes(who.uid || '') ? [] : pf?.books || [];
      folOn = !!who.uid && follows.includes(who.uid);
      list = bks.map(b => card(b, this.coverBg(b), !b.coverImg, b.likes, () => this.openOtherBook(b)));
      p = { name: pr?.name || who.name, handle: pr?.handle, bio: pr?.bio, loc: pr?.loc, web: pr?.web, accent: pr?.accent, av: pr?.av,
        joined: pr ? 'Joined ' + new Date(pr.joined).toLocaleDateString('en', { month: 'short', year: 'numeric' }) : '',
        stats: [[bks.length, bks.length === 1 ? 'sketchbook' : 'sketchbooks'], [bks.reduce((t, b) => t + b.likes, 0), 'pages']] };
    }
    const pad = mob ? 16 : 40, web = (p.web || '').trim();
    return {
      pfName: p.name, pfHandle: '@' + (p.handle || ''), pfHasBio: !!p.bio || (mine && !pv), pfBio: p.bio || 'Add a short bio so people know what you draw.', pfBioOp: p.bio ? 1 : 0.55,
      pfHasLoc: !!(p.loc || '').trim(), pfLoc: p.loc, pfHasWeb: !!web, pfWeb: web.replace(/^https?:\/\//, ''), pfWebHref: /^https?:\/\//.test(web) ? web : 'https://' + web, pfJoined: p.joined,
      pfAvBg: avatarBg(p.av), pfInit: p.av ? '' : ini(p.name),
      ...(() => {
        // Followers and likes update live from the counters (see syncWatches).
        const pu = mine ? s.acct?.uid : s.profileOf?.uid, fol = s.counts?.['f:' + pu] || 0, lk = s.counts?.['l:' + pu] || 0;
        const stats = [...p.stats, [fol, fol === 1 ? 'follower' : 'followers'], [lk, lk === 1 ? 'like' : 'likes']] as [number, string][];
        return {
          pfStats: stats.map(([n, l]) => ({ n: fmtK(n), l })),
        };
      })(), pfBooks: list, pfCount: String(list.length), pfBooksLbl: mine && !pv ? 'Your sketchbooks' : 'Sketchbooks',
      pfMine: mine && !pv, pfPreviewing: pv, pfOther: !mine, pfShowNew: mine && !pv && (s.pfTab || 'books') === 'books',
      ...(() => {
        const tab = mine && !pv ? s.pfTab || 'books' : 'books', setTab = (t: 'books' | 'saved' | 'following') => {
          this.setState({ pfTab: t });
          if (t === 'following') Promise.all((s.follows || []).filter(id => !(s.blocked || []).includes(id)).map(id => api.getProfile(id).then(pr => pr && { uid: id, name: pr.name, handle: pr.handle, av: pr.av }).catch(() => null)))
            .then(ps => this.setState({ followPeople: ps.filter((x): x is Person => !!x) }));
        };
        const uid = s.profileOf?.uid || '', blockedOn = !!uid && (s.blocked || []).includes(uid), name = p.name || 'this artist', handle = p.handle || s.profileOf?.handle;
        return {
          pfTabs: mine && !pv ? ([['books', 'Sketchbooks', s.books.length], ['saved', 'Saved', (s.saved || []).length], ['following', 'Following', (s.follows || []).length]] as const).map(([k, l, n]) => ({ key: k, label: l, n, on: tab === k, pick: () => setTab(k) })) : null,
          pfTab: tab, pfEmptyNote: tab === 'saved' ? 'Save sketchbooks you love with ♡ Save. Only you can see this list.' : '',
          pfPeople: tab === 'following' ? (s.followPeople || []).map(x => ({ key: x.uid, name: x.name, handle: '@' + x.handle, avBg: avatarBg(x.av), init: x.av ? '' : ini(x.name), open: () => this.openProfile({ uid: x.uid, name: x.name, handle: x.handle }) })) : null,
          pfBlocked: blockedOn, pfUnblock: () => this.toggleBlock(uid, name),
          pfSuspended: !mine && !!uid && (s.banned || []).includes(uid),
          pfAdmin: mine && !pv && !!s.admin, openAdmin: () => this.openAdmin(),
          pfShare: () => handle && this.share('/@' + handle, `${name} on verso.`),
          pfMoreOpen: s.more === 'profile', pfMore: () => this.setState(st => ({ more: st.more === 'profile' ? null : 'profile' })),
          pfReport: () => this.openReport({ kind: 'user', targetId: uid, ownerId: uid, label: name }),
          pfBlock: () => this.toggleBlock(uid, name), pfBlockLbl: blockedOn ? `Unblock ${name}` : `Block ${name}`,
        };
      })(),
      pfDir: mob ? 'column' : 'row', pfAlign: mob ? 'center' : 'flex-start', pfTA: mob ? 'center' : 'left', pfJust: mob ? 'center' : 'flex-start', pfHeadGap: mob ? 16 : 28,
      pfWide: vw >= 980, pfBanH: mob ? 96 : 128, pfInfoTop: mob ? 0 : 2, pfPadX: pad, pfNameSize: mob ? 48 : 72,
      pfCols: Math.max(2, Math.min(5, Math.floor((Math.min(vw, 1080) - pad * 2 + 18) / (mob ? 150 : 200)))),
      editProfile: () => this.setState({ draft: { name: a.name || '', handle: a.handle || '', bio: a.bio || '', loc: a.loc || '', web: a.web || '', accent: a.accent || '#C9C3B4', av: a.av || null } }),
      togglePreview: () => this.setState(st => ({ pfPreview: !st.pfPreview })),
      pfNew: this.openNewPick,
      folLbl: folOn ? 'Following' : 'Follow', folBg: folOn ? 'transparent' : MARK, folFg: folOn ? INK : PAPER, folBd: folOn ? 'rgba(var(--ink-rgb),.5)' : MARK,
      toggleFollow: () => {
        if (!s.acct) return this.openJoin();
        const key = s.profileOf?.uid; if (!key) return;
        const on = !follows.includes(key);
        this.setState({ follows: on ? [...follows, key] : follows.filter(x => x !== key) });
        api.setFollow(s.acct, key, on).then(() => this.loadFollowFeed()).catch(e => { console.error(e); this.setState(st => ({ follows: on ? st.follows.filter(x => x !== key) : [...st.follows, key] })); });
      },
    };
  }

  accountVals(): V {
    const s = this.state, a = s.acct, su = s.su || { name: '', handle: '', email: '', pw: '' }, d = s.draft || ({} as NonNullable<State['draft']>);
    const suMode = s.suMode || 'join', join = suMode === 'join', reset = suMode === 'reset', emailOk = /\S+@\S+\.\S+/.test(su.email || '');
    const suOk = emailOk && (reset || ((!join || !!(su.name || '').trim()) && (su.pw || '').length >= 6));
    const setSu = (k: keyof typeof su) => (e: ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      this.setState(st => {
        const n = { ...su, ...st.su, [k]: k === 'handle' ? slug(v) : v };
        if (k === 'name' && !st.suHT) n.handle = slug(v);
        return { su: n, suHT: st.suHT || k === 'handle' };
      });
    };
    const setD = (k: 'name' | 'handle' | 'bio' | 'loc' | 'web') => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const v = k === 'handle' ? slug(e.target.value) : e.target.value; this.setState(st => ({ draft: { ...st.draft!, [k]: v } }));
    };
    return {
      hasAcct: !!a, noAcct: !a, meAvBg: avatarBg(a?.av), meInit: a?.av ? '' : ini(a?.name),
      meRing: s.mode === 'profile' && !s.profileOf ? `0 0 0 2px ${PAPER}, 0 0 0 4px ${MARK}` : 'none', openMe: () => this.openProfile(null),
      suName: su.name || '', suHandle: su.handle || '', suEmail: su.email || '', suPw: su.pw || '', suOp: suOk ? 1 : 0.4,
      onSuName: setSu('name'), onSuHandle: setSu('handle'), onSuEmail: setSu('email'), onSuPw: setSu('pw'),
      isAuth: s.mode === 'auth', suMode, suJoin: join, suReset: reset, suOk,
      suKicker: join ? 'Join verso' : reset ? 'Reset password' : 'Sign in',
      suSub: join ? 'Get a profile page where others can browse your sketchbooks, unfinished pages and all.'
        : reset ? 'Enter the email you joined with and we’ll send you a link to choose a new password.' : 'Pick up where you left off.',
      suBtn: join ? 'Create account' : reset ? 'Send reset link' : 'Sign in',
      suSwitchQ: join ? 'Already a member?' : 'New to verso?', suSwitchLbl: join ? 'Sign in' : 'Create an account',
      suSwitch: () => this.openAuth(join ? 'signin' : 'join'),
      suToReset: () => this.setState({ suMode: 'reset', suErr: '', suInfo: '' }),
      suToSignin: () => this.setState({ suMode: 'signin', suErr: '', suInfo: '' }),
      openSignin: () => this.openAuth('signin'),
      suBusy: !!s.suBusy, suErr: s.suErr || '', suInfo: s.suInfo || '',
      suSubmit: async (e?: { preventDefault(): void }) => {
        e?.preventDefault();
        if (s.suBusy) return;
        if (!suOk) return this.setState({ suErr: !emailOk ? 'Enter a valid email address.' : join && !(su.name || '').trim() ? 'Add your name.' : 'Passwords need at least 6 characters.', suInfo: '' });
        const email = su.email.trim();
        this.setState({ suBusy: true, suErr: '', suInfo: '' });
        try {
          if (reset) {
            await api.resetPassword(email);
            this.setState({ suInfo: `If there’s an account for ${email}, a reset link is on its way. Check your inbox, then sign in with your new password.` });
          } else if (!join) {
            await api.signIn(email, su.pw);
            this.closeAuth();
          } else {
            // The auth listener would race us to create a default profile, so this flow loads the user itself.
            this.signingUp = true;
            const acct = await api.signUp(email, su.pw, su.name.trim(), su.handle || slug(su.name) || 'artist');
            await this.loadUser({ uid: acct.uid, email }, acct);
            this.setState({ su: null, welcome: true }); this.openProfile(null, true);
          }
        } catch (e) {
          this.setState({ suErr: api.errMsg(e) });
        } finally {
          this.signingUp = false; this.setState({ suBusy: false });
        }
      },
      closeAuth: this.closeAuth,
      // First visit after joining: a short guide to how verso works.
      welcomeOpen: !!s.welcome && !!a, welcomeName: (a?.name || '').split(' ')[0],
      welcomeStart: () => { this.setState({ welcome: false }); this.goMode('mine'); this.setState({ managing: true }); },
      welcomeLater: () => { this.setState({ welcome: false }); this.goMode('explore'); },
      inInstalled: installer.installed(), inCanPrompt: installer.canPrompt(), inIOS: installer.isIOS(),
      inInstall: () => installer.install().then(ok => ok && this.toast('verso is on your home screen')),
      isDark: !!s.dark, setTheme: (t: 'light' | 'dark') => { themeMode.setTheme(t); this.setState({ dark: t === 'dark' }); },
      openPrivacy: () => this.openLegal('privacy'), openTerms: () => this.openLegal('terms'),
      isLegal: s.mode === 'legal', legalDoc: s.legal || 'privacy', isNotFound: s.mode === 'notfound', nfWhat: s.nf || 'page',
      ...this.settingsVals(),
      pfEditing: !!s.draft, dName: d.name || '', dHandle: d.handle || '', dBio: d.bio || '', dLoc: d.loc || '', dWeb: d.web || '', dEmail: a?.email || '', dBioCount: `${(d.bio || '').length}/160`,
      onDName: setD('name'), onDHandle: setD('handle'), onDBio: setD('bio'), onDLoc: setD('loc'), onDWeb: setD('web'),
      dAvBg: avatarBg(d.av), dInit: d.av ? '' : ini(d.name), dHasAv: !!d.av,
      avRef: this.avRef, pickAv: () => this.avRef.current?.click(), removeAv: () => this.setState(st => ({ draft: { ...st.draft!, av: null } })),
      onAvFile: (e: ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
        const fr = new FileReader();
        fr.onload = () => {
          const im = new Image();
          im.onload = () => {
            const c = document.createElement('canvas'), z = 256, m = Math.min(im.width, im.height); c.width = c.height = z;
            c.getContext('2d')!.drawImage(im, (im.width - m) / 2, (im.height - m) / 2, m, m, 0, 0, z, z);
            const av = c.toDataURL('image/jpeg', 0.85); this.setState(st => ({ draft: { ...st.draft!, av } }));
          };
          im.src = fr.result as string;
        };
        fr.readAsDataURL(f);
      },
      dBusy: !!s.dBusy, dErr: s.dErr || '',
      pfSave: async () => {
        if (!a || s.dBusy) return;
        this.setState({ dBusy: true, dErr: '' });
        try {
          const acct = await api.saveProfile(a, { ...d, name: (d.name || '').trim() || a.name, handle: d.handle || a.handle, joined: a.joined });
          this.setState({ acct, draft: null });
        } catch (e) { this.setState({ dErr: api.errMsg(e) }); }
        finally { this.setState({ dBusy: false }); }
      },
      pfCancel: () => this.setState({ draft: null, dErr: '' }), pfClose: (e: MouseEvent) => { if (e.target === e.currentTarget) this.setState({ draft: null }); },
      signOut: async () => { if (!window.confirm('Sign out of your account?')) return; await api.signOut(); this.setState({ draft: null }); this.goMode('home'); },
    };
  }

  notifVals(): V {
    // An invitation still waiting for an answer shows as its own Accept / Decline card instead.
    const s = this.state, pending = new Set((s.invites || []).map(d => d.id)), list = (s.notifs || []).filter(n => !(n.type === 'invite' && n.bookId && pending.has(n.bookId))), unread = list.filter(n => !n.read);
    const ago = (t: number) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? m + 'm' : m < 1440 ? Math.round(m / 60) + 'h' : Math.round(m / 1440) + 'd'; };
    return {
      ntShow: !!s.acct, ntUnread: unread.length + (s.invites || []).length, ntOpen: !!s.notifOpen,
      ntInvites: (s.invites || []).map(d => ({ key: d.id, who: d.ownerName || '@' + d.ownerHandle, book: d.name, accept: () => this.answerInvite(d, true), decline: () => this.answerInvite(d, false) })),
      ntToggle: () => {
        const open = !s.notifOpen; this.setState({ notifOpen: open, more: null });
        if (open && s.acct && unread.length) api.markRead(s.acct.uid, unread.map(n => n.id)).catch(() => {});
      },
      ntClose: () => this.setState({ notifOpen: false }),
      ntItems: list.map(n => ({
        key: n.id, unread: !n.read, when: ago(n.at), goal: n.type === 'goal',
        who: n.type === 'goal' ? '' : n.fromName || '@' + n.fromHandle,
        text: n.type === 'like' ? <>liked <i>{n.bookName}</i></> : n.type === 'invite' ? <>invited you to draw in <i>{n.bookName}</i></> : n.type === 'follow' ? 'started following you' : n.goal === 'likes100' ? `You reached ${GOAL} likes. Thank you for sharing your pages.` : `You reached ${GOAL} followers. People are following along.`,
        open: () => {
          this.setState({ notifOpen: false });
          if (n.type === 'invite' && n.bookId) { const j = s.books.findIndex(b => b.id === n.bookId); if (j >= 0) { this.goMode('mine'); this.setState({ active: j, images: s.books[j].images }); } else this.setState({ notifOpen: true }); }
          else if (n.type === 'like' && n.bookId) { const j = s.books.findIndex(b => b.id === n.bookId); if (j >= 0) { this.goMode('mine'); this.setState({ active: j, images: s.books[j].images }); } }
          else if (n.type === 'follow') this.openProfile({ uid: n.from, name: n.fromName, handle: n.fromHandle });
          else this.openProfile(null);
        },
      })),
    };
  }

  settingsVals(): V {
    const s = this.state, a = s.acct, f = s.ac || {};
    const set = (k: keyof NonNullable<State['ac']>) => (e: ChangeEvent<HTMLInputElement>) => { const v = e.target.value; this.setState(st => ({ ac: { ...st.ac, [k]: v } })); };
    const run = async (key: string, fn: () => Promise<string | void>) => {
      this.setState({ acBusy: key, acErr: '', acInfo: '' });
      try { const info = await fn(); if (info) this.setState({ acInfo: info }); }
      catch (e) { this.setState({ acErr: api.errMsg(e) }); }
      finally { this.setState({ acBusy: '' }); }
    };
    return {
      isSettings: s.mode === 'settings', openSettings: this.openSettings, closeSettings: () => this.openProfile(null),
      acEmail: a?.email || '', acVerified: !!s.verified, acErr: s.acErr || '', acInfo: s.acInfo || '', acBusy: s.acBusy || '',
      acF: { email: f.email || '', pwEmail: f.pwEmail || '', pwOld: f.pwOld || '', pwNew: f.pwNew || '', delHandle: f.delHandle || '', pwDel: f.pwDel || '' },
      onAc: { email: set('email'), pwEmail: set('pwEmail'), pwOld: set('pwOld'), pwNew: set('pwNew'), delHandle: set('delHandle'), pwDel: set('pwDel') },
      acHandle: a?.handle || '',
      // Firebase sends at most about one confirmation email a minute, so Resend rests for a minute after sending.
      resendVerify: () => run('verify', async () => {
        try { await api.resendVerification(); }
        catch (e) { if ((e as { code?: string }).code === 'auth/too-many-requests') throw Object.assign(new Error('wait'), { code: 'verify-wait' }); throw e; }
        this.setState({ vfUntil: Date.now() + 60000 }); setTimeout(() => this.setState({ vfUntil: 0 }), 60000);
        return `Sent to ${a?.email}. It can take a minute or two, and may land in spam.`;
      }),
      vfCooldown: (s.vfUntil || 0) > Date.now(), vfMsg: s.acInfo || '', vfErr: s.acErr || '',
      checkVerified: () => run('verify', async () => { const ok = await api.refreshVerified(); this.setState({ verified: ok }); return ok ? 'Thanks, your email is confirmed.' : 'Not confirmed yet. Open the link in the email we sent, then try again.'; }),
      changeEmail: (e?: { preventDefault(): void }) => { e?.preventDefault(); const next = (f.email || '').trim();
        if (!/\S+@\S+\.\S+/.test(next)) return this.setState({ acErr: 'Enter the new email address.' });
        run('email', async () => { await api.changeEmail(f.pwEmail || '', next); this.setState(st => ({ ac: { ...st.ac, email: '', pwEmail: '' } })); return `We sent a link to ${next}. Your email changes once you click it.`; }); },
      changePassword: (e?: { preventDefault(): void }) => { e?.preventDefault();
        if ((f.pwNew || '').length < 6) return this.setState({ acErr: 'Choose a new password of at least 6 characters.' });
        run('password', async () => { await api.changePassword(f.pwOld || '', f.pwNew || ''); this.setState(st => ({ ac: { ...st.ac, pwOld: '', pwNew: '' } })); return 'Your password has been changed.'; }); },
      deleteAccount: (e?: { preventDefault(): void }) => { e?.preventDefault(); if (!a) return;
        if ((f.delHandle || '').replace(/^@/, '').toLowerCase() !== a.handle) return this.setState({ acErr: `Type your handle, ${a.handle}, to confirm.` });
        run('delete', async () => { await api.deleteAccount(f.pwDel || '', a); this.setState({ ac: {} }); this.goMode('home'); }); },
    };
  }

  exploreVals(): V {
    const s = this.state, saved = s.exView || this.exView0 || '', view = ['grid', 'stack'].includes(saved) ? saved : 'grid', sort = s.exSort || 'trending', list = this.exSorted(), n = list.length;
    const on = (v: boolean) => v ? [INK, PAPER] : ['transparent', INK];
    const sp = s.stS || 0, top = Math.max(0, Math.min(n - 1, Math.round(this.stT)));
    const stackList = list.map((b, i) => {
      const o = i - sp, jit = (((b.idx * 53) % 11) - 5) * 1.3; if (o < -1.05 || o > 9) return null;
      const l = Math.max(0, -o);
      const t = o >= 0
        ? `translateZ(${(-o * 18).toFixed(1)}px) rotateZ(${jit}deg)`
        : `translateZ(${(l * 240).toFixed(1)}px) translateY(${(-l * 420).toFixed(1)}px) rotateX(${(-l * 25).toFixed(1)}deg) rotateZ(${(jit * (1 - l)).toFixed(2)}deg)`;
      const shp = this.shapeOf(b), bh = Math.round(300 * shp.s), bw = Math.round(bh * shp.a);
      return { key: b.id, name: b.name, color: b.color, bg: this.coverBg(b), showLabel: !b.coverImg, w: bw, h: bh, l: -bw / 2, tp: -bh / 2, t,
        op: (o >= 0 ? Math.min(1, 9 - o) : 1 - l).toFixed(3), shade: (Math.min(0.5, Math.max(0, o) * 0.12)).toFixed(3),
        click: () => { if (i === top) this.openOtherBook(b); } };
    }).filter(Boolean).reverse();
    const vh = s.vh, mob = s.vw < 640, sk = Math.min(1, Math.max(0.4, (vh - (mob ? 360 : 156)) / 640), mob ? s.vw / 520 : 1);
    const tb = list[top], setView = (v: string) => { this.setState({ exView: v }); store.saveExView(v); };
    const setSort = (v: 'trending' | 'new') => { cancelAnimationFrame(this.exRaf); this.stT = 0; if (v !== sort) this.setState({ exSort: v, stS: 0 }, () => this.loadCommunity()); };
    const [vGridBg, vGridFg] = on(view === 'grid'), [vStackBg, vStackFg] = on(view === 'stack'), [sTrBg, sTrFg] = on(sort === 'trending'), [sNewBg, sNewFg] = on(sort === 'new');
    return {
      exH1: mob ? 36 : 72, exCountLbl: n + (s.exMore && !s.exLabel ? '+' : '') + (n === 1 ? ' sketchbook' : ' sketchbooks') + ' · ' + new Date().toLocaleDateString('en', { month: 'short', year: 'numeric' }),
      exMediums: [{ key: '', label: 'All mediums', on: !s.exLabel?.startsWith('m:'), pick: () => this.setLabel('') },
        ...MEDIUMS.map(m => ({ key: m, label: m, on: s.exLabel === 'm:' + mediumKey(m), pick: () => this.setLabel(s.exLabel === 'm:' + mediumKey(m) ? '' : 'm:' + mediumKey(m)) }))],
      exTag: s.exLabel?.startsWith('t:') ? '#' + s.exLabel.slice(2) : '', clearLabel: () => this.setLabel(''),
      exCanMore: !s.exLabel && !!s.exMore, exBusy: !!s.exBusy, loadMore: () => this.loadCommunity(true),
      onExScroll: (e: { currentTarget: HTMLElement }) => { const el = e.currentTarget; if (!s.exLabel && el.scrollHeight - el.scrollTop - el.clientHeight < 700) this.loadCommunity(true); },
      stDir: mob ? 'column' : 'row', stGap: mob ? 4 : 48, stMaxW: mob ? '100%' : '60%', stFlex: mob ? '1 1 0' : '0 0 auto', stInfoGap: mob ? 4 : 10,
      stAlign: mob ? 'center' : 'stretch', stTA: mob ? 'center' : 'left', stTitle: mob ? 30 : 44, stBtnTop: mob ? 6 : 10,
      stHint: mob ? 'swipe the pile up to lift books off' : 'scroll over the pile to lift books off',
      stDown0: (e: PointerEvent) => { this.stY = e.clientY; },
      stUp0: (e: PointerEvent) => { if (this.stY == null) return; const dy = e.clientY - this.stY; this.stY = null; if (Math.abs(dy) > 40) this.stackStep(dy < 0 ? 1 : -1); },
      exLoading: !s.community || (!!s.exLabel && !s.exLabelBooks), exEmpty: !s.exLabel && !!s.community && !s.community.length,
      exNoneLbl: s.exLabel ? (s.exLabel.startsWith('m:') ? `No ${MEDIUMS.find(m => 'm:' + mediumKey(m) === s.exLabel) || 'sketchbooks'} sketchbooks yet` : `Nothing tagged #${s.exLabel.slice(2)} yet`) + (s.exQ ? ` matching “${s.exQ}”` : '') : `No sketchbooks match “${s.exQ}”`,
      exPeople: (() => {
        const q = (s.exQ || '').trim().toLowerCase().replace(/^@/, '');
        if (!q) return [];
        return (s.people || []).filter(p => p.name && !(s.blocked || []).includes(p.uid) && !(s.banned || []).includes(p.uid) && `${p.name} ${p.handle}`.toLowerCase().includes(q)).slice(0, 12).map(p => ({
          key: p.uid, name: p.name, handle: '@' + p.handle, avBg: avatarBg(p.av), init: p.av ? '' : ini(p.name), open: () => this.openProfile({ uid: p.uid, name: p.name }),
        }));
      })(),
      exQ: s.exQ || '', onExQ: (e: ChangeEvent<HTMLInputElement>) => { cancelAnimationFrame(this.exRaf); this.stT = 0; this.setState({ exQ: e.target.value, stS: 0 }); }, exNone: n === 0,
      exCols: Math.max(2, Math.min(6, Math.floor((s.vw - (mob ? 32 : 80) + 18) / (mob ? 150 : 200)))),
      exPadT: mob ? 74 : 108, exPadX: mob ? 16 : 40, exGap: mob ? 14 : 24, exSearchBasis: mob ? '100%' : 'auto', exSearchMax: mob ? 'none' : '380px',
      exOvY: view === 'grid' ? 'auto' : 'hidden', exInnerH: view === 'grid' ? 'auto' : '100%',
      stackT: `scale3d(${sk.toFixed(3)},${sk.toFixed(3)},${sk.toFixed(3)}) rotateX(56deg) rotateZ(-12deg)`,
      exGrid: view === 'grid' && n > 0, exStack: view === 'stack' && n > 0, vGridBg, vGridFg, vStackBg, vStackFg, sTrBg, sTrFg, sNewBg, sNewFg,
      viewGrid: () => setView('grid'), viewStack: () => setView('stack'), sortTrend: () => setSort('trending'), sortNew: () => setSort('new'),
      exploreList: list.map(b => ({
        key: b.id, name: b.name, artist: b.artist, color: b.color, bg: this.coverBg(b), showLabel: !b.coverImg, no: 'Sketchbook ' + String(b.idx + 1).padStart(3, '0'),
        count: `${b.pages} pages · ${(b.mediums || []).length ? (b.mediums || []).join(', ') : this.shapeOf(b).label}`,
        ar: String(this.shapeOf(b).a), wp: String(GRID_WIDTH[b.shape] || 78),
        open: () => this.openOtherBook(b), openArtist: (e: MouseEvent) => { e.stopPropagation(); this.openProfile(this.whoOf(b)); },
      })),
      stackList,
      stRank: 'Sketchbook ' + String((tb?.idx ?? 0) + 1).padStart(3, '0'), stShape: this.shapeOf(tb).label || '', stName: tb?.name, stArtist: tb?.artist,
      stPages: `Pages 01—${String(tb?.pages).padStart(2, '0')}`, stPos: `${top + 1} of ${n}`,
      stOpen: () => tb && this.openOtherBook(tb), stArtistOpen: (e: MouseEvent) => { e.stopPropagation(); if (tb) this.openProfile(this.whoOf(tb)); },
      stUp: () => this.stackStep(-1), stDown: () => this.stackStep(1), stUpOp: top > 0 ? 1 : 0.35, stDownOp: top < n - 1 ? 1 : 0.35,
      stackWheel: (e: WheelEvent) => { if (this.stLock || Math.abs(e.deltaY) < 8) return; this.stLock = true; setTimeout(() => this.stLock = false, 380); this.stackStep(e.deltaY > 0 ? 1 : -1); },
    };
  }

  // ---------- moderation ----------
  async loadReports() {
    this.setState({ adReports: null, adErr: '' });
    try {
      const [rs, banned] = await Promise.all([api.reports(), api.bannedUsers()]);
      const books = new Map<string, BookDoc | null>(), people = new Map<string, Awaited<ReturnType<typeof api.getProfile>>>();
      await Promise.all([
        ...[...new Set(rs.filter(r => r.kind === 'book').map(r => r.targetId))].map(async id => { books.set(id, await api.getBook(id)); }),
        ...[...new Set(rs.map(r => r.ownerId).filter(Boolean))].map(async id => { people.set(id, await api.getProfile(id).catch(() => null)); }),
      ]);
      const adReports = rs.map((r): AdminItem => {
        const b = books.get(r.targetId), pr = people.get(r.ownerId);
        return { ...r, targetName: r.kind === 'book' ? b?.name || 'Deleted sketchbook' : pr?.name || 'Deleted account', ownerName: pr?.name || '', ownerHandle: pr?.handle || '',
          hidden: !!b?.hidden, banned: banned.includes(r.ownerId), gone: r.kind === 'book' ? !b : !pr };
      });
      this.setState({ adReports, banned });
    } catch (e) { console.error(e); this.setState({ adReports: [], adErr: api.errMsg(e) }); }
  }
  adminVals(): V {
    const s = this.state, list = s.adReports;
    const act = async (key: string, fn: () => Promise<void>, done: (l: AdminItem[]) => AdminItem[], msg: string) => {
      this.setState({ adBusy: key, adErr: '' });
      try { await fn(); this.setState(st => ({ adReports: done(st.adReports || []) })); this.toast(msg); }
      catch (e) { console.error(e); this.setState({ adErr: api.errMsg(e) }); }
      finally { this.setState({ adBusy: '' }); }
    };
    const ago = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ', ' + new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return {
      isAdminPage: s.mode === 'admin', adAllowed: !!s.admin, adLoading: !list, adErr: s.adErr || '', adReload: () => this.loadReports(),
      adCount: list ? `${list.length} open ${list.length === 1 ? 'report' : 'reports'}` : '',
      adItems: (list || []).map(r => ({
        key: r.id, kind: r.kind === 'book' ? 'Sketchbook' : 'Artist', name: r.targetName, owner: r.ownerName ? `${r.ownerName} · @${r.ownerHandle}` : '',
        reason: r.reason, note: r.note, when: ago(r.at), hidden: r.hidden, banned: r.banned, gone: r.gone, isBook: r.kind === 'book', busy: s.adBusy?.startsWith(r.id) ? s.adBusy : '',
        open: () => r.kind === 'book' ? this.openBookById(r.targetId) : this.openProfile({ uid: r.ownerId, name: r.ownerName, handle: r.ownerHandle }),
        openOwner: () => this.openProfile({ uid: r.ownerId, name: r.ownerName, handle: r.ownerHandle }),
        hide: () => act(r.id + ':hide', () => api.setHidden(r.targetId, !r.hidden), l => l.map(x => x.targetId === r.targetId ? { ...x, hidden: !r.hidden } : x), r.hidden ? 'Sketchbook restored' : 'Sketchbook hidden'),
        ban: () => {
          if (!r.banned && !window.confirm(`Suspend ${r.ownerName || 'this artist'}? Their public sketchbooks will be hidden and they won’t be able to publish or notify anyone until you lift it.`)) return;
          act(r.id + ':ban', () => api.setBanned(r.ownerId, !r.banned), l => l.map(x => x.ownerId === r.ownerId ? { ...x, banned: !r.banned, hidden: x.kind === 'book' ? !r.banned : x.hidden } : x), r.banned ? 'Suspension lifted' : 'Artist suspended')
            .then(() => api.bannedUsers().then(banned => this.setState({ banned })));
        },
        dismiss: () => act(r.id + ':dismiss', () => api.dismissReport(r.id), l => l.filter(x => x.id !== r.id), 'Report dismissed'),
      })),
    };
  }

  editorVals(): V {
    const ed = this.state.edit; if (!ed) return { editing: false };
    const fr = this.frame(), bs = this.baseSize(), num = (f: 'scale' | 'rot' | 'skx' | 'sky') => (e: ChangeEvent<HTMLInputElement>) => this.setEd({ [f]: parseFloat(e.target.value) });
    return {
      editing: true, fw: fr.fw, fh: fr.fh, bw: bs.bw, bh: bs.bh, edBg: `url("${this.blobUrl(ed.queue[ed.i])}") center/100% 100% no-repeat`,
      edTransform: `translate(${ed.tx}px, ${ed.ty}px) rotate(${ed.rot}deg) scale(${ed.scale}) skew(${ed.skx}deg, ${ed.sky}deg)`,
      edTitle: ed.target === 'cover' ? 'Cover image' : ed.replaceIdx != null ? `Edit page ${ed.replaceIdx + 1}` : `Image ${ed.i + 1} of ${ed.queue.length}`,
      scale: ed.scale, rot: ed.rot, skx: ed.skx, sky: ed.sky,
      scaleLbl: `${Math.round(ed.scale * 100)}%`, rotLbl: `${ed.rot}°`, skxLbl: `${ed.skx}°`, skyLbl: `${ed.sky}°`,
      onScale: num('scale'), onRot: num('rot'), onSkx: num('skx'), onSky: num('sky'),
      rot90: () => this.setEd({ rot: ((ed.rot + 90 + 180) % 360) - 180 }),
      resetEd: () => ed.mode === 'adjust' ? this.setEd({ adj: NO_ADJUST }) : this.setEd({ scale: 1, rot: 0, skx: 0, sky: 0, tx: 0, ty: 0 }),
      edMode: ed.mode, setEdMode: (mode: 'fit' | 'adjust') => this.setEd({ mode }),
      edAdjTool: this.state.edAdjTool || 'white', setEdAdjTool: (t: string) => this.setState({ edAdjTool: t }),
      edPeek: !!this.state.edPeek, peekOn: () => this.setState({ edPeek: true }), peekOff: () => this.state.edPeek && this.setState({ edPeek: false }),
      edFx: feValues(ed.adj), edAdjusted: isAdjusted(ed.adj),
      edAdj: ADJUSTERS.map(([k, label, min, max]) => ({ key: k, label, min, max, value: ed.adj[k], lbl: (ed.adj[k] > 0 && min < 0 ? '+' : '') + ed.adj[k],
        onChange: (e: ChangeEvent<HTMLInputElement>) => { const v = Math.round(parseFloat(e.target.value)); this.setState(s => s.edit ? { edit: { ...s.edit, adj: { ...s.edit.adj, [k]: Math.abs(v) < 3 ? 0 : v } } } : null); } })),
      applyEdit: () => this.applyEdit(), skipEdit: () => this.nextEdit(), cancelEdit: () => this.setState({ edit: null }),
      applyLbl: ed.target === 'cover' ? 'Save cover' : ed.replaceIdx != null ? 'Save page' : 'Add to sketchbook',
      // One pointer drags the image; two pinch to zoom and twist to rotate.
      edDown: (e: PointerEvent<HTMLDivElement>) => {
        e.stopPropagation(); try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* pointer already gone */ }
        this.edPts.set(e.pointerId, { x: e.clientX, y: e.clientY }); this.edGestureStart();
      },
      edMove: (e: PointerEvent) => {
        if (!this.edPts.has(e.pointerId)) return;
        this.edPts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const pin = this.edPinch, pts = [...this.edPts.values()];
        if (pin && pts.length >= 2) {
          const [a, b] = pts, dist = Math.hypot(b.x - a.x, b.y - a.y), ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
          const rot = Math.round((((pin.rot + ang - pin.ang + 540) % 360) - 180) * 2) / 2;
          this.setEd({ scale: Math.max(0.3, Math.min(4, pin.scale * dist / pin.dist)), rot, tx: pin.tx + (a.x + b.x) / 2 - pin.mx, ty: pin.ty + (a.y + b.y) / 2 - pin.my });
        } else if (this.edDrag) {
          const d = this.edDrag; this.setEd({ tx: d.tx + e.clientX - d.x, ty: d.ty + e.clientY - d.y });
        }
      },
      edUp: (e: PointerEvent) => { this.edPts.delete(e.pointerId); this.edGestureStart(); },
      edMob: this.state.vw < 640, edTool: this.state.edTool || 'scale', setEdTool: (t: string) => this.setState({ edTool: t }),
      edWheel: (e: WheelEvent) => { e.stopPropagation(); this.setEd({ scale: Math.max(0.3, Math.min(4, ed.scale * (e.deltaY > 0 ? 0.95 : 1.05))) }); },
    };
  }

  /** The 3D book, carousel, focus view and page manager. */
  bookVals(): V {
    const s = this.state, { images, p, books, active } = s, other = s.other, mode = s.mode || 'home';
    const { W, H } = this.dims();
    const N = this.nLeaves(), fan = CONFIG.fan, tilt = CONFIG.tilt, fz = s.fz || 0;
    const book = (other || books[active] || {}) as AnyBook;

    // Horizontal shift: a closed book sits centred on its cover; in focus the chosen page is centred.
    const shiftN = p < 1 ? -W / 2 * (1 - p) : p > N - 1 ? W / 2 * (p - (N - 1)) : 0;
    const fL = s.fside === 'L' && p > 0.5, fsx = (s.fsx || 0) * clamp01(p * 2 - 1);
    const shiftR = -W / 2 + W * clamp01(p - (N - 1)), shiftF = shiftR + (W / 2 - shiftR) * fsx;
    const shift = shiftN + (shiftF - shiftN) * fz;

    const leaves = Array.from({ length: N }, (_, i) => {
      const x = p - i, t = clamp01(x);
      const A = fan * 2.5 * clamp01(Math.min(p, N - p));
      const ease = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      // Pages near the one turning fan out, always in order so none passes through another.
      const a = -(A * clamp01((x + 2.5) / 2.5) + (180 - 2 * A) * ease + A * clamp01((x - 1) / 2.5));
      const rad = -a * Math.PI / 180;
      const F = this.face(i, 0, W), B = this.face(i, 1, W);
      // Mid-turn the page bends: the outer edge trails behind the turn, most at halfway.
      // Paper turn: the outer edge leads as the page lifts, then the curl relaxes as it lands.
      // Capped so the tip never swings past the pages lying on either side.
      const curlAmt = t > 0.01 && t < 0.99 ? Math.sin(Math.PI * t) * (1.2 - t) / 0.95 : 0;
      const forward = this.drag ? p >= this.drag.p0 : this.target >= p;
      const curlTotal = Math.min(CURL_DEG * curlAmt, forward ? 178 + a : -a - 2);
      return {
        curl: curlAmt && curlTotal > 0.5 ? (forward ? -1 : 1) * curlTotal : 0, curlAmt: Math.min(1, curlAmt),
        wearF: F.wear, wearB: B.wear, overlayF: F.wear?.overlay || (F.inside ? COVER_INSIDE : ''), overlayB: B.wear?.overlay || (B.inside ? COVER_INSIDE : ''),
        key: i, label: book.name, isCover: i === 0 && !book.coverImg, isCoverAny: i === 0, isBackCover: i === N - 1,
        transform: `rotateY(${a}deg) translateZ(${((N - i) * 0.5).toFixed(2)}px)`, frontBg: F.bg, backBg: B.bg,
        shadeF: (0.35 * Math.sin(rad) * (rad < Math.PI / 2 ? 1 : 0)).toFixed(3), shadeB: (0.3 * Math.max(0, Math.sin(rad)) * (rad > Math.PI / 2 ? 1 : 0)).toFixed(3),
        numF: F.num, numB: B.num, noteF: F.note || '', noteB: B.note || '', noteFs: Math.max(9, Math.min(15, Math.round(H * 0.026))),
        // On touch screens, tapping a zoomed page only brings the controls back (swipe to move between pages).
        openFront: () => { if (!this.moved && !(IS_TOUCH && s.focus)) this.focusOn(i, 'R'); },
        openBack: () => { if (!this.moved && !(IS_TOUCH && s.focus)) this.focusOn(i + 1, 'L'); },
      };
    });

    // Carousel of closed books either side of the open one. Each book is laid out at its own size
    // (books can be different shapes) with a fixed gap, so nothing re-spaces when the middle book
    // changes; mid-switch, positions blend between the layouts centred on the two nearest books.
    const sw = !!s.switching, car = sw ? s.car! : active, SIDE = 0.78;
    const shelf = (other ? [] : books) as Book[];
    const ghostD = this.dims({ shape: 'portrait' } as Book, true);
    const widths = [...shelf.map(b => this.dims(b, true).W), ghostD.W]; // last slot is "+ New sketchbook"
    const gap = Math.round((s.sh || s.vh * 0.5) * 0.1);
    const openExt = W / 2 * (1 + clamp01(Math.min(p, N - p)));
    /** Centre x of slot j when slot k is in the middle. */
    const layout = (k: number, j: number) => {
      if (j === k) return 0;
      const half = k === active && !sw ? openExt : widths[k] / 2, dir = Math.sign(j - k);
      let x = half + gap;
      for (let i = k + dir; i !== j; i += dir) x += widths[i] * SIDE + gap;
      return dir * (x + widths[j] * SIDE / 2);
    };
    const kMax = widths.length - 1, k0 = Math.max(0, Math.min(kMax, Math.floor(car))), k1 = Math.min(kMax, k0 + 1), f = car - k0;
    const centre = (j: number) => layout(k0, j) * (1 - f) + layout(k1, j) * f;
    const zTop = (b: Book) => { const n = (b?.images || []).length; return (Math.max(CONFIG.minPages, n + (n % 2)) / 2 + 2) * 0.5; };
    const sideT = (j: number, z0 = 0) => { const m = Math.min(1, Math.abs(j - car)); return `translateX(${(centre(j) - widths[j] / 2).toFixed(1)}px) translateZ(${(-60 * m + z0 * (1 - m)).toFixed(2)}px) scale(${(1 - (1 - SIDE) * m).toFixed(3)})`; };
    const sideBooks = shelf.map((b, j) => ({ b, j })).filter(x => sw || x.j !== active).map(({ b, j }) => {
      const d = this.dims(b, true);
      return {
        key: b.id, w: d.W, h: d.H, top: -d.H / 2, transform: sideT(j, zTop(b)),
        opacity: clamp01(3 - Math.abs(j - car)).toFixed(3), labelOp: Math.min(1, Math.abs(j - car)).toFixed(3),
        shade: (0.35 * Math.min(1, Math.abs(j - car))).toFixed(3), bg: this.coverBg(b), board: b.color, showLabel: !b.coverImg, name: b.name, count: `${b.images.length} ${b.images.length === 1 ? 'page' : 'pages'}`,
        stop: (e: PointerEvent) => e.stopPropagation(), open: () => this.switchBook(j),
      };
    });

    const notes = (book as Book).notes || {}, setNote = (u: string, patch: PageNote) => {
      const cur = this.state.books[this.state.active], n = { ...cur.notes?.[u], ...patch };
      this.updateBook({ notes: { ...cur.notes, [u]: n } });
    };
    const pagesList = images.map((u, i) => ({
      key: u.length + ':' + i + ':' + u.slice(-24), bg: `url("${this.blobUrl(this.thumbOf(book, u))}") center/cover no-repeat #f3efe6`, num: String(i + 1),
      caption: notes[u]?.c || '', date: notes[u]?.d || '',
      onCaption: (e: ChangeEvent<HTMLInputElement>) => setNote(u, { c: e.target.value.slice(0, 140) }),
      onDate: (e: ChangeEvent<HTMLInputElement>) => setNote(u, { d: e.target.value }),
      edit: () => this.startEdit([images[i]], i), adjust: () => this.startEdit([images[i]], i, undefined, 'adjust'), remove: () => this.setImages(images.filter((_, k) => k !== i)),
      left: () => { this.movePage(i, i - 1); if (s.mgPage === i && i > 0) this.setState({ mgPage: i - 1 }); },
      right: () => { this.movePage(i, i + 1); if (s.mgPage === i && i < images.length - 1) this.setState({ mgPage: i + 1 }); },
      dragStart: (e: DragEvent) => { this.dragIdx = i; e.dataTransfer.effectAllowed = 'move'; },
      dragOver: (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); },
      drop: (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.files?.length) return this.addFiles(e.dataTransfer.files); if (this.dragIdx != null) this.movePage(this.dragIdx, i); this.dragIdx = null; },
    }));
    const blanks = this.nPages() - images.length;
    const m = s.vw < 640;

    const focusMode = CONFIG.focusMenu, foc = !!s.focus;
    const vis = !foc || (focusMode === 'auto-hide' ? s.ctrlShow !== false : focusMode === 'toggle' ? !!s.menuOpen : false);

    return {
      fz: fz.toFixed(3), uiOp: (1 - fz).toFixed(3), uiPE: fz > 0.5 ? 'none' : 'auto', bgRefA: this.bgRefA,
      focusBg: (() => {
        const r = Math.round(p), f = fL || r >= N - 1 ? this.face(Math.max(1, Math.min(N - 2, r - 1)), 1) : this.face(Math.max(1, r), 0);
        const soft = f.idx >= 0 ? this.softCopy(this.thumbOf(book, images[f.idx])) : null;
        return soft ? `url("${soft}") center/100% 100% no-repeat ${PAPER}` : `radial-gradient(circle at 30% 35%, ${book.color} 0, transparent 55%), radial-gradient(circle at 72% 68%, #C9C3B4 0, transparent 55%), ${PAPER}`;
      })(),
      isMine: mode === 'mine', isOther: mode === 'other', isExplore: mode === 'explore', notOther: !other, showGhost: !other,
      navMineLine: mode === 'mine' ? INK : 'transparent', navMineFg: mode === 'mine' ? INK : STONE,
      navExLine: mode === 'explore' || mode === 'other' ? INK : 'transparent', navExFg: mode === 'explore' || mode === 'other' ? INK : STONE,
      isProfile: mode === 'profile', isHome: mode === 'home' && !!s.acct, isLanding: mode === 'home' && !s.acct,
      goHome: () => this.goMode('home'), goMine: () => this.goMode('mine'), goExplore: () => this.goMode('explore'),
      openArtist: () => other && 'artist' in other && this.openProfile(this.whoOf(other)),
      otherPages: (other as OtherBook | null)?.pages || 0,
      artist: (other as OtherBook | null)?.artist || '',
      coverRef: this.coverRef, pickCover: () => this.coverRef.current?.click(),
      onCoverFile: (e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; const fr = new FileReader(); fr.onload = () => this.startEdit([fr.result as string], null, 'cover'); fr.readAsDataURL(f); },
      hasCoverImg: !!book.coverImg, removeCover: () => this.updateBook({ coverImg: null }),
      // The real book carries the closed-book back board until opened so the carousel hand-over doesn't pop.
      openShadowOp: clamp01(Math.min(p, N - p) * 3).toFixed(3), bodyOp: (1 - clamp01(Math.min(p, N - p) * 4)).toFixed(3),
      // Closed on its back, the book is turned over: the spine is on the right, so the page block and board stick out on the left.
      bodyBack: p > N / 2, bodyLeft: p > N / 2 ? -W : 0, boardColor: book.color || '#b8243a',
      bookOp: sw ? 0 : 1, titleName: other ? other.name : (books[Math.round(car)] || book).name,
      titleOp: ((sw ? 1 - Math.sin(Math.PI * (s.swT || 0)) * 0.85 : 1) * (1 - fz)).toFixed(3),
      bookName: book.name,
      bookMeta: (other ? `by ${(other as OtherBook).artist} · ${(other as OtherBook).pages} pages` : books.length > 1 ? `${images.length} ${images.length === 1 ? 'page' : 'pages'} · ${active + 1} of ${books.length}` : `${images.length} ${images.length === 1 ? 'page' : 'pages'}`) + (!other && (book as Book).isPublic === false ? ' · Private' : '')
        + (!other && (book as Book).role === 'collab' ? ` · ${(book as Book).owner?.name}’s, shared with you` : !other && (book as Book).collab ? ` · with ${(book as Book).collab!.name}` : ''),
      multi: !other && books.length > 1, prevBook: () => this.switchBook(active - 1), nextBook: () => this.switchBook(active + 1),
      prevOp: active > 0 ? 1 : 0.3, nextOp: active < books.length - 1 ? 1 : 0.3,
      sideBooks, sbBase: `rotateX(${tilt}deg)`, ghostT: sideT(books.length), ghostW: ghostD.W, ghostH: ghostD.H, ghostTop: -ghostD.H / 2,
      newBook: this.openNewPick, stopPD: (e: PointerEvent) => e.stopPropagation(),
      vw: s.vw, isTouch: IS_TOUCH,
      tabBar: m && !!s.acct && mode !== 'auth',
      tbOn: mode === 'explore' || mode === 'other' ? 'explore' : mode === 'mine' ? 'mine' : mode === 'profile' && !s.profileOf ? 'me' : '',
      tbNew: () => { if (mode !== 'mine') this.goMode('mine'); this.openNewPick(); },
      swipeHint: IS_TOUCH && !s.hintDone && store.loadHints() < 3 && (mode === 'mine' || mode === 'other') && !s.focus && (images.length > 0 || !!other) && !s.switching,
      navMineLbl: m ? 'Yours' : 'Your sketchbooks', mNavGap: m ? 14 : 40, notMob: !m, mPad: m ? 14 : 24, mTop: m ? 14 : 20, mGap: m ? 14 : 24,
      newLbl: m ? '+ New' : '+ New sketchbook', mTitleTop: m ? 72 : 76, mTitleSize: m ? 32 : 46, mBottom: m ? 16 : 36, mModalPad: m ? 18 : 28, mOptMin: m ? 92 : 120, mOptH: m ? 130 : 170,
      newPick: !!s.newPick, closePick: (e: MouseEvent) => { if (e.target === e.currentTarget) this.setState({ newPick: false }); }, cancelPick: () => this.setState({ newPick: false }),
      createBook: () => { if (s.mode === 'profile') this.setState({ mode: 'mine', profileOf: null }); this.newBook(s.pickShape || 'portrait'); }, pgAspect: String(this.aspect()),
      shapeOpts: (Object.entries(SHAPES) as [ShapeKey, Shape][]).map(([k, v]) => {
        const on = (s.pickShape || 'portrait') === k, ph = Math.round(120 * v.s);
        return { key: k, label: v.label, w: Math.round(ph * v.a), h: ph, c: PALETTE[books.length % PALETTE.length],
          ring: on ? `0 0 0 2px ${MARK}` : '0 0 0 1px rgba(var(--ink-rgb),.18)', bg: on ? 'rgba(var(--ink-rgb),.08)' : 'transparent', pick: () => this.setState({ pickShape: k }) };
      }),
      managing: s.managing, openManager: () => this.setState({ managing: true }), closeManager: () => this.setState({ managing: false }),
      mgTab: s.mgTab || 'pages', setMgTab: (t: State['mgTab']) => this.setState({ mgTab: t, mgPage: null }),
      mgPage: s.mgPage != null && s.mgPage < images.length ? s.mgPage : null, openPage: (i: number) => this.setState({ mgPage: i }), closePage: () => this.setState({ mgPage: null }),
      mgChanged: s.managing && this.mgChanged(), mgSave: () => this.saveEdits(), mgCancel: () => this.setState({ managing: false }),
      mgSummary: `${images.length} ${images.length === 1 ? 'page' : 'pages'} · ${(book as Book).isPublic === false || (book as Book).hidden ? 'Private' : 'Public'}${(book as Book).collab ? ' · with ' + (book as Book).collab!.name : (book as Book).role === 'collab' ? ' · ' + (book as Book).owner?.name + '’s, shared with you' : ''}`,
      ...(() => {
        const o = other as OtherBook | null, mineB = books[active];
        return {
          bkSaved: this.isSaved(o?.id), bkSave: () => o && this.toggleSave(o),
          bkLiked: !!(o && s.liked?.[o.id]), bkLike: () => o && this.toggleLike(o),
          bkLikes: (() => { const id = o?.id || (mineB && !mineB.id.startsWith('local') ? mineB.id : ''); return id ? s.counts?.['b:' + id] || 0 : 0; })(),
          bkShare: () => o ? this.share(`/@${o.handle}/${o.id}`, `${o.name} by ${o.artist}`) : s.acct && mineB && this.share(`/@${mineB.owner?.handle || s.acct.handle}/${mineB.id}`, `${mineB.name} by ${mineB.owner?.name || s.acct.name}`),
          bkCanShare: !!o || (!!s.acct && mineB?.isPublic !== false && !mineB?.id.startsWith('local')),
          bkMoreOpen: s.more === 'book', bkMore: () => this.setState(st => ({ more: st.more === 'book' ? null : 'book' })),
          bkReport: () => o && this.openReport({ kind: 'book', targetId: o.id, ownerId: o.ownerId || '', label: `“${o.name}”` }),
          bkBlock: () => o?.ownerId && this.toggleBlock(o.ownerId, o.artist), bkBlockLbl: `Block ${o?.artist || ''}`,
          closeMore: () => (s.more || s.notifOpen) && this.setState({ more: null, notifOpen: false }),
          toastMsg: s.toast || '',
          ...this.notifVals(),
          reportOpen: !!s.reportFor, reportLabel: s.reportFor?.label || '', reportKind: s.reportFor?.kind, reportReasons: api.REPORT_REASONS.map(r => ({ key: r, label: r, on: s.reportReason === r, pick: () => this.setState({ reportReason: r, reportErr: '' }) })),
          reportNote: s.reportNote || '', onReportNote: (e: ChangeEvent<HTMLTextAreaElement>) => this.setState({ reportNote: e.target.value }), reportBusy: !!s.reportBusy, reportErr: s.reportErr || '',
          closeReport: () => this.setState({ reportFor: null }),
          submitReport: async () => {
            const r = s.reportFor, a = s.acct; if (!r || !a) return;
            if (!s.reportReason) return this.setState({ reportErr: 'Choose a reason.' });
            this.setState({ reportBusy: true });
            try { await api.report(a.uid, { kind: r.kind, targetId: r.targetId, ownerId: r.ownerId, reason: s.reportReason, note: s.reportNote || '' }); this.setState({ reportFor: null }); this.toast('Thanks. We’ll take a look.'); }
            catch (e) { this.setState({ reportErr: api.errMsg(e) }); }
            finally { this.setState({ reportBusy: false }); }
          },
        };
      })(),
      bookPublic: (book as Book).isPublic !== false && !(book as Book).hidden, bookHidden: !other && !!(book as Book).hidden,
      setPublic: (on: boolean) => !(book as Book).hidden && this.updateBook({ isPublic: on }),
      ...(() => {
        // Mediums (from a fixed list) and free tags, edited on the Pages screen, shown under the title.
        const mine = (book as Book), meds = book.mediums || [], tags = book.tags || [];
        const addTags = (raw: string) => {
          const add = raw.split(/[,\s]+/).map(tagSlug).filter(Boolean), cur = this.state.books[this.state.active].tags || [];
          const next = [...new Set([...cur, ...add])].slice(0, MAX_TAGS);
          this.updateBook({ tags: next }); this.setState({ tagDraft: '' });
        };
        return {
          mgMediums: MEDIUMS.map(m => ({ key: m, label: m, on: meds.includes(m), pick: () => {
            const cur = this.state.books[this.state.active].mediums || [];
            if (!cur.includes(m) && cur.length >= MAX_MEDIUMS) return this.toast(`Pick up to ${MAX_MEDIUMS} mediums`);
            this.updateBook({ mediums: cur.includes(m) ? cur.filter(x => x !== m) : [...cur, m] });
          } })),
          mgTags: tags.map(t => ({ key: t, label: '#' + t, remove: () => this.updateBook({ tags: (mine.tags || []).filter(x => x !== t) }) })),
          mgTagFull: tags.length >= MAX_TAGS, tagDraft: s.tagDraft || '',
          onTagDraft: (e: ChangeEvent<HTMLInputElement>) => { const v = e.target.value; if (/[,\s]$/.test(v)) addTags(v); else this.setState({ tagDraft: v.slice(0, 30) }); },
          onTagKey: (e: { key: string; preventDefault(): void }) => {
            if (e.key === 'Enter') { e.preventDefault(); if (s.tagDraft) addTags(s.tagDraft); }
            if (e.key === 'Backspace' && !s.tagDraft && tags.length) this.updateBook({ tags: tags.slice(0, -1) });
          },
          commitTag: () => { if (s.tagDraft) addTags(s.tagDraft); },
          bkMediums: meds.join(' · '),
          bkTags: tags.map(t => ({ key: t, label: '#' + t, open: () => this.openLabel('t:' + t) })),
        };
      })(),
      sndOn: !!s.soundOn, toggleSound: () => { const on = !s.soundOn; sound.setSound(on); this.setState({ soundOn: on }); },
      pagesList, blankNote: blanks > 0 ? `${blanks} blank pages follow your drawings` : 'Book grows as you add pages',
      onName: (e: ChangeEvent<HTMLInputElement>) => this.updateBook({ name: e.target.value }),
      swatches: PALETTE.map(c => ({ key: c, c, ring: c === book.color ? `0 0 0 2px ${PAPER}, 0 0 0 4px ${INK}` : 'inset 0 0 0 1px rgba(var(--ink-rgb),.22)', pick: () => this.updateBook({ color: c }) })),
      deleteBook: () => this.deleteBook(),
      ...(() => {
        // Sharing panel on the Pages screen.
        const b = book as Book, isCollab = !other && b.role === 'collab';
        return {
          isCollab, canShare: !other && !isCollab && !!s.acct && !b.id?.startsWith('local'),
          shOwner: b.owner?.name || '', shOwnerHandle: b.owner?.handle ? '@' + b.owner.handle : '',
          shCollab: b.collab ? { name: b.collab.name, handle: '@' + b.collab.handle } : null,
          shInvite: b.invite ? { name: b.invite.name, handle: '@' + b.invite.handle } : null,
          shDraft: s.shDraft || '', shBusy: !!s.shBusy, shErr: s.shErr || '',
          onShDraft: (e: ChangeEvent<HTMLInputElement>) => this.setState({ shDraft: slug(e.target.value), shErr: '' }),
          shInviteSend: (e?: { preventDefault(): void }) => { e?.preventDefault(); const a = s.acct, h = s.shDraft; if (!a || !h) return;
            this.share$(async () => ({ invite: await api.invite(a, { id: b.id, name: b.name }, h) }), `Invitation sent to @${h}`); },
          shCancel: () => this.share$(async () => { await api.cancelInvite(b.id); return { invite: null }; }, 'Invitation cancelled'),
          shRemove: () => { if (!window.confirm(`Stop sharing “${b.name}” with ${b.collab?.name}? The pages they added stay in the sketchbook.`)) return;
            this.share$(async () => { await api.endShare(b.id); return { collab: null }; }, 'Sharing stopped'); },
          shLeave: () => { if (!window.confirm(`Leave “${b.name}”? It goes back to being only ${b.owner?.name}’s. The pages you added stay in it.`)) return;
            this.share$(async () => { await api.endShare(b.id); this.setState(st => { const books = st.books.filter(x => x.id !== b.id), k = Math.max(0, Math.min(st.active, books.length - 1)); return { books, active: k, images: books[k]?.images || [], managing: false }; }); }, `You left “${b.name}”`); },
        };
      })(),
      W, H, leaves, stageRef: this.stageRef, fileRef: this.fileRef,
      bookTransform: `rotateX(${(tilt * (1 - fz) + 3 * fz).toFixed(2)}deg) translateX(${shift}px)`,
      shadowLeft: -W * clamp01(p), shadowW: W * (clamp01(p) + clamp01(N - p)),
      emptyOp: !images.length && !other && !sw ? 1 : 0,
      onDown: (e: PointerEvent) => {
        this.stPts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (this.stPts.size === 2) {
          // Two fingers: a pinch, not a page turn. Put any half-turned page back.
          const [a, b] = [...this.stPts.values()]; this.pinch0 = Math.hypot(b.x - a.x, b.y - a.y) || 1;
          if (this.drag) { this.drag = null; this.animate(); }
          return;
        }
        this.drag = { x: e.clientX, p0: s.p, id: e.pointerId }; this.moved = false; cancelAnimationFrame(this.raf);
      },
      onMove: (e: PointerEvent<HTMLDivElement>) => {
        if (this.stPts.has(e.pointerId)) this.stPts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (this.pinch0 && this.stPts.size >= 2) {
          const [a, b] = [...this.stPts.values()], k = Math.hypot(b.x - a.x, b.y - a.y) / this.pinch0;
          if (k > 1.25 && !this.state.focus) { this.pinch0 = 0; const fp = Math.max(1, Math.min(N - 1, Math.round(this.target))); this.focusOn(fp, this.autoSide(fp)); }
          else if (k < 0.8 && this.state.focus) { this.pinch0 = 0; this.setFocus(false); }
          return;
        }
        if (!this.drag) return; const dx = e.clientX - this.drag.x;
        if (Math.abs(dx) > 4 && !this.moved) { this.moved = true; e.currentTarget.setPointerCapture?.(this.drag.id); }
        this.setState({ p: Math.max(-0.15, Math.min(N + 0.15, this.drag.p0 - dx / (W * 1.1))) });
      },
      onUp: (e: PointerEvent) => {
        this.stPts.delete(e.pointerId); if (this.stPts.size < 2) this.pinch0 = 0;
        if (!this.drag) return; const dx = e.clientX - this.drag.x, pp = this.state.p;
        // Swiping past the front or back cover moves to the neighbouring sketchbook.
        if (this.drag.p0 === 0 && dx > 90 && active > 0) { this.drag = null; return this.switchBook(active - 1); }
        if (this.drag.p0 === N && dx < -90 && active < books.length - 1) { this.drag = null; return this.switchBook(active + 1); }
        const tp = Math.max(0, Math.min(N, Math.abs(dx) > 30 ? (dx < 0 ? Math.ceil(pp - 0.1) : Math.floor(pp + 0.1)) : Math.round(pp)));
        const p0 = Math.round(this.drag.p0), moved = this.moved;
        this.drag = null; setTimeout(() => this.moved = false, 0);
        // In focus view a swipe to another spread picks its page the same way the arrow keys do.
        if (this.state.focus && moved) {
          const fp = Math.max(1, Math.min(N - 1, tp)); this.turnTo(fp, p0);
          return this.focusOn(fp, fp === p0 ? this.state.fside || 'R' : this.autoSide(fp, dx < 0 ? 'L' : 'R'));
        }
        this.turnTo(tp, p0); this.animate();
      },
      onWheel: (e: WheelEvent) => { const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY; if (this.wheelLock || Math.abs(d) < 8) return; this.wheelLock = true; setTimeout(() => this.wheelLock = false, 380); this.go(d > 0 ? 1 : -1); },
      zoomIn: () => { if (this.state.focus) return; const fp = Math.max(1, Math.min(N - 1, Math.round(p))); this.focusOn(fp, this.autoSide(fp)); },
      zoomOut: () => this.state.focus ? this.setFocus(false) : this.setState(st => ({ zoom: Math.max(0.6, st.zoom - 0.15) })),
      ctrlOp: vis ? 1 : 0, ctrlY: vis ? 0 : 24, ctrlPE: vis ? 'auto' : 'none',
      showHandle: foc && focusMode === 'toggle', handleLbl: s.menuOpen ? 'Hide menu' : 'Show menu',
      toggleMenu: () => this.setState(st => ({ menuOpen: !st.menuOpen })),
      showRail: foc && focusMode === 'side rail', railOp: fz.toFixed(3),
      wake: () => {
        if (!foc || focusMode !== 'auto-hide') return; if (this.state.ctrlShow === false) this.setState({ ctrlShow: true });
        clearTimeout(this.wakeT); this.wakeT = setTimeout(() => this.state.focus && this.setState({ ctrlShow: false }), 1800);
      },
      pick: () => this.fileRef.current?.click(),
      onFiles: (e: ChangeEvent<HTMLInputElement>) => { if (e.target.files) this.addFiles(e.target.files); e.target.value = ''; },
      onDragOver: (e: DragEvent) => e.preventDefault(),
      onDrop: (e: DragEvent) => { e.preventDefault(); this.addFiles(e.dataTransfer.files); },
    };
  }

  render() {
    // Blank paper until we know whether someone is signed in, so the landing page doesn't flash first.
    if (!this.state.authReady) return <div style={{ position: 'fixed', inset: 0, background: PAPER }} />;
    const mode = this.state.mode || 'home';
    const v: V = {
      ...this.editorVals(),
      ...this.bookVals(),
      ...(mode === 'home' ? this.homeVals() : {}),
      ...(mode === 'profile' ? this.profileVals() : {}),
      ...(mode === 'explore' ? this.exploreVals() : {}),
      ...(mode === 'admin' ? this.adminVals() : {}),
      ...this.accountVals(),
    };
    return (
      <Stage v={v}>
        {(v.isLanding || v.isHome) && <HomeScreen v={v} />}
        {v.isExplore && <Explore v={v} />}
        {v.isProfile && <Profile v={v} />}
        {v.isSettings && <Settings v={v} />}
        {v.isLegal && <Legal v={v} />}
        {v.isNotFound && <NotFound v={v} />}
        {v.isAdminPage && <Admin v={v} />}
        {v.reportOpen && <ReportModal v={v} />}
        {v.toastMsg && <Toast msg={v.toastMsg} />}
        {v.isAuth && <AuthPage v={v} />}
        {v.pfEditing && <EditProfile v={v} />}
        {v.welcomeOpen && <Welcome v={v} />}
        <input ref={this.avRef} type="file" accept="image/*" onChange={v.onAvFile} style={{ display: 'none' }} />
        {v.newPick && <NewBookPicker v={v} />}
        {v.managing && <Manager v={v} />}
        {v.editing && <Editor v={v} />}
        <input ref={this.fileRef} type="file" accept="image/*" multiple onChange={v.onFiles} style={{ display: 'none' }} />
      </Stage>
    );
  }
}
