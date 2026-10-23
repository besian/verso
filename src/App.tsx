import { Component, createRef } from 'react';
import type { ChangeEvent, DragEvent, MouseEvent, PointerEvent, WheelEvent } from 'react';
import { CONFIG, GRID_WIDTH, PALETTE, PANEL_WIDTH, SHAPES } from './data';
import type { Account, Book, OtherBook, Shape, ShapeKey } from './data';
import * as api from './backend';
import type { AuthUser, BookDoc } from './backend';
import * as store from './storage';
import { INK, MARK, PAPER } from './theme';
import Stage from './views/Stage';
import { AuthPage, Explore, Home, Landing, Profile } from './views/Screens';
import { Editor, EditProfile, Manager, NewBookPicker } from './views/Overlays';

export type Mode = 'home' | 'mine' | 'other' | 'explore' | 'profile' | 'auth';
type AnyBook = Book | OtherBook;
/** Whose profile is open; name shows while the profile loads. */
type Who = { name: string; uid?: string };
type PublicProfile = Omit<Account, 'uid' | 'email'>;
// Everything a view reads: computed styles/labels plus handlers (mirrors the design's template bindings).
export type V = Record<string, any>;

interface EditState {
  queue: string[]; i: number; replaceIdx: number | null; target?: 'cover';
  scale: number; rot: number; skx: number; sky: number; tx: number; ty: number; nw: number; nh: number;
}

interface State {
  mode?: Mode;
  acct: Account | null; follows: string[];
  books: Book[]; active: number; images: string[];
  other?: AnyBook | null; profileOf?: Who | null; pfPreview?: boolean;
  pf?: { uid: string; profile: PublicProfile | null; books: OtherBook[] } | null;
  community?: OtherBook[];
  p: number; zoom: number; managing: boolean;
  vw: number; vh: number; sw?: number; sh?: number;
  switching?: boolean; car?: number; swT?: number;
  focus?: boolean; fz?: number; fside?: 'L' | 'R'; fsx?: number; ctrlShow?: boolean; menuOpen?: boolean;
  edit?: EditState | null;
  newPick?: boolean; pickShape?: ShapeKey;
  /** Sign-in page: which form, and the screen to return to. */
  authFrom?: Mode; suMode?: 'join' | 'signin' | 'reset'; su?: { name: string; handle: string; email: string; pw: string } | null; suHT?: boolean;
  suBusy?: boolean; suErr?: string; suInfo?: string;
  draft?: (Omit<Account, 'uid' | 'email' | 'joined'>) | null; dBusy?: boolean; dErr?: string;
  exView?: string; exSort?: 'trending' | 'new'; exQ?: string; stS?: number;
}

const ini = (n?: string) => (n || '').trim().split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
const slug = (v?: string) => (v || '').toLowerCase().replace(/[^a-z0-9._]+/g, '').slice(0, 24);
const fmtK = (v: number) => v >= 1000 ? (v / 1000).toFixed(1) + 'k' : String(v);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const avatarBg = (av?: string | null) => av ? `url("${av}") center/cover no-repeat ${INK}` : INK;
const isData = (u?: string | null): u is string => !!u && u.startsWith('data:');
const bookUrls = (b: Book) => [...b.images, ...(b.coverImg ? [b.coverImg] : [])];
const localBook = (): Book => ({ id: 'local', name: 'sketchbook', color: '#b8243a', images: [] });
/** A Firestore book shown read-only (Explore, profiles). */
const toOther = (b: BookDoc, idx: number): OtherBook => ({
  id: b.id, idx, shape: b.shape, likes: b.pageCount, artist: b.ownerName || '@' + b.ownerHandle, name: b.name, color: b.color,
  images: b.pages, pages: Math.max(CONFIG.minPages, b.pageCount + (b.pageCount % 2)), initials: ini(b.ownerName), coverImg: b.cover,
  ownerId: b.ownerId, updatedAt: b.updatedAt,
});

export default class App extends Component<object, State> {
  state: State = {
    acct: null, follows: [],
    books: [localBook()], active: 0, managing: false, images: [], p: 0, zoom: 1,
    vw: window.innerWidth || 1200, vh: window.innerHeight || 800,
  };

  // Animation and gesture bookkeeping (not rendered directly).
  raf = 0; exRaf = 0; sraf = 0; fraf = 0;
  target = 0;
  drag: { x: number; p0: number; id: number } | null = null; moved = false;
  edDrag: { x: number; y: number; tx: number; ty: number } | null = null;
  dragIdx: number | null = null;
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
    if (e.key === 'Escape' && s.mode === 'auth') return this.closeAuth();
    if (e.key !== 'Escape' && (!['mine', 'other'].includes(s.mode || 'home') || s.draft)) return;
    if (e.key === 'Escape') {
      if (s.newPick) return this.setState({ newPick: false });
      if (!s.edit && !s.managing && s.focus) return this.setFocus(false);
      return s.edit ? this.setState({ edit: null }) : this.setState({ managing: false });
    }
    const t = e.target as HTMLElement;
    if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || s.managing || s.edit) return;
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!dir) return;
    if (e.shiftKey) this.switchBook(s.active + dir); else this.go(dir);
  };
  componentDidMount() {
    this.onResize();
    requestAnimationFrame(this.onResize);
    addEventListener('resize', this.onResize); addEventListener('keydown', this.onKey);
    this.unAuth = api.watchAuth(u => { if (!this.signingUp) this.loadUser(u); });
    this.loadCommunity();
  }
  /** Loads (or clears) everything that belongs to the signed-in user. */
  async loadUser(u: AuthUser | null, acct?: Account) {
    if (!u) {
      this.synced.clear(); this.dirty.clear();
      return this.setState({ acct: null, follows: [], books: [localBook()], active: 0, images: [], p: 0 });
    }
    try {
      const a = acct || await api.ensureProfile(u);
      const [docs, follows] = await Promise.all([api.userBooks(u.uid), api.following(u.uid)]);
      let books = docs.map(api.toBook);
      books.forEach(b => this.synced.set(b.id, bookUrls(b)));
      const fresh = !books.length;
      if (fresh) books = [{ id: api.newBookId(), name: 'sketchbook', color: '#b8243a', images: [], createdAt: Date.now() }];
      this.target = 0;
      this.setState({ acct: a, follows, books, active: 0, images: books[0].images, p: 0 }, () => { if (fresh) this.persist(books); });
    } catch (e) {
      console.error(e);
    }
  }
  loadCommunity() {
    api.communityBooks().then(docs => {
      const community = [...docs].sort((a, b) => a.createdAt - b.createdAt).map(toOther);
      this.setState({ community });
    }).catch(e => console.error(e));
  }
  community(): OtherBook[] { return this.state.community || []; }
  componentWillUnmount() {
    removeEventListener('resize', this.onResize); removeEventListener('keydown', this.onKey);
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
    if (mode === 'explore' || mode === 'home') this.loadCommunity();
    this.setState(s => ({ mode, other: null, images: s.books[s.active].images, p: 0, focus: false, fz: 0, managing: false }));
  }
  /** Opens the sign-in page; other, profileOf etc. are left alone so closing it returns to the same screen. */
  openAuth(suMode: 'join' | 'signin') {
    cancelAnimationFrame(this.raf); cancelAnimationFrame(this.exRaf);
    this.setState(s => ({ mode: 'auth', authFrom: s.mode === 'auth' ? s.authFrom : s.mode || 'home', suMode, su: s.mode === 'auth' ? s.su : { name: '', handle: '', email: '', pw: '' }, suHT: false, suErr: '', suInfo: '', focus: false, fz: 0, managing: false, newPick: false }));
  }
  openJoin = () => this.openAuth('join');
  closeAuth = () => this.setState(s => ({ mode: s.authFrom && s.authFrom !== 'auth' ? s.authFrom : 'home', suErr: '', suInfo: '', su: null }));
  openProfile(who: Who | null, force?: boolean) {
    if (!who && !this.state.acct && !force) return this.openJoin();
    if (who?.uid && who.uid === this.state.acct?.uid) who = null;
    cancelAnimationFrame(this.raf); cancelAnimationFrame(this.exRaf); this.target = 0;
    this.setState(s => ({ mode: 'profile', profileOf: who, pf: null, pfPreview: false, other: null, images: s.books[s.active].images, p: 0, focus: false, fz: 0, managing: false }));
    const uid = who?.uid;
    if (uid) Promise.all([api.getProfile(uid), api.userBooks(uid)]).then(([profile, docs]) => {
      if (this.state.profileOf?.uid === uid) this.setState({ pf: { uid, profile, books: docs.filter(b => b.pageCount > 0).map(toOther) } });
    }).catch(e => console.error(e));
  }
  whoOf(b: OtherBook): Who { return { name: b.artist, uid: b.ownerId }; }
  openNewPick = () => this.setState({ newPick: true, pickShape: this.state.pickShape || 'portrait' });

  // ---------- books ----------
  /** Queues changed books for upload + save. Signed-out books are never saved. */
  persist(books: Book[]) {
    if (!this.state.acct) return;
    const prev = new Map(this.state.books.map(b => [b.id, b]));
    for (const b of books) if (prev.get(b.id) !== b || !this.synced.has(b.id)) this.dirty.add(b.id);
    clearTimeout(this.syncT);
    this.syncT = setTimeout(() => { for (const id of this.dirty) this.enqueue(id, () => this.syncBook(id)); this.dirty.clear(); }, 400);
  }
  enqueue(id: string, job: () => Promise<void>) {
    const next = (this.syncQ.get(id) || Promise.resolve()).then(job).catch(e => console.error('sync failed', e));
    this.syncQ.set(id, next);
  }
  findBook(id: string) { return this.state.books.find(b => b.id === id); }
  /** Uploads any new images of a book, swaps in their URLs, then writes the book and removes files it no longer uses. */
  async syncBook(id: string) {
    const acct = this.state.acct; let b = this.findBook(id); if (!acct || !b) return;
    const pending = bookUrls(b).filter(isData);
    if (pending.length) {
      const m = await api.uploadImages(acct.uid, id, pending);
      m.forEach((url, du) => { const bu = this.blobs.get(du); if (bu) this.blobs.set(url, bu); });
      const swap = (u: string) => m.get(u) || u;
      await new Promise<void>(done => this.setState(s => ({
        books: s.books.map(x => x.id === id ? { ...x, images: x.images.map(swap), coverImg: x.coverImg && swap(x.coverImg) } : x),
        images: s.books[s.active]?.id === id ? s.images.map(swap) : s.images,
      }), done));
      b = this.findBook(id); if (!b) return;
      if (bookUrls(b).some(isData)) return; // newer images arrived meanwhile; their own sync follows
    }
    await api.writeBook(this.state.acct || acct, b);
    const now = bookUrls(b), before = this.synced.get(id) || [];
    api.removeFiles(before.filter(u => !now.includes(u)));
    this.synced.set(id, now);
  }
  setImages(images: string[]) {
    const books = this.state.books.map((b, k) => k === this.state.active ? { ...b, images } : b); this.setState({ books, images }); this.persist(books);
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
    this.target = 0;
    if (this.state.p > 0.01) this.animate(slide); else { this.setState({ p: 0 }); slide(); }
  }
  newBook(shape: ShapeKey) {
    const books = this.state.books, n = books.length;
    const nb = [...books, { id: this.state.acct ? api.newBookId() : 'local-' + Date.now(), name: `sketchbook ${n + 1}`, color: PALETTE[n % PALETTE.length], images: [], shape, createdAt: Date.now() }];
    cancelAnimationFrame(this.raf); this.target = 0; this.setState({ books: nb, active: n, images: [], p: 0, managing: true, newPick: false }); this.persist(nb);
  }
  deleteBook() {
    const { books, active } = this.state;
    if (!window.confirm(`Delete “${books[active].name}”? This can’t be undone.`)) return;
    if (books.length === 1) { this.setImages([]); return; }
    const nb = books.filter((_, k) => k !== active), j = Math.max(0, active - 1), gone = books[active];
    if (this.state.acct) this.enqueue(gone.id, async () => { await api.deleteBook(gone.id, [...new Set([...bookUrls(gone), ...(this.synced.get(gone.id) || [])])]); this.synced.delete(gone.id); });
    this.target = 0; this.setState({ books: nb, active: j, images: nb[j].images, p: 0, managing: false }); this.persist(nb);
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
  coverBg(b?: Partial<AnyBook>) { b = b || {}; return b.coverImg ? `url("${this.blobUrl(b.coverImg)}") center/cover no-repeat ${b.color}` : b.color || '#b8243a'; }
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
  face(leaf: number, side: 0 | 1) {
    const N = this.nLeaves(), book = this.curBook(), cover = book?.color ?? '#b8243a', inner = '#e9e2d3', paper = '#f3efe6';
    if (leaf === 0) return side ? { bg: inner, num: '', idx: -1 } : { bg: this.coverBg(book), num: '', idx: -1 };
    if (leaf === N - 1) return side ? { bg: cover, num: '', idx: -1 } : { bg: inner, num: '', idx: -1 };
    const pi = 2 * (leaf - 1) + side, img = this.state.images[pi];
    return { bg: img ? `url("${this.blobUrl(img)}") center/cover no-repeat ${paper}` : paper, num: String(pi + 1), idx: img ? pi : -1 };
  }
  animate(onDone?: () => void) {
    cancelAnimationFrame(this.raf);
    const step = () => {
      const p = this.state.p, d = this.target - p;
      if (Math.abs(d) < 0.002) { this.setState({ p: this.target }); onDone?.(); return; }
      this.setState({ p: p + d * 0.14 }); this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }
  go(dir: number) {
    if (this.state.focus) return this.focusGo(dir);
    this.target = Math.max(0, Math.min(this.maxP(), Math.round(this.target) + dir)); this.animate();
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
    const Hn = Math.max(120, Math.min(sh * 0.7 * shp.s, sw * (sw < 640 ? 0.45 : 0.29) / aspect, 560 * shp.s) || 360) * s.zoom;
    const Hf = Math.max(200, Math.min(s.vh * 0.84, s.vw * 0.86 / aspect));
    const H = Hn + (Hf - Hn) * fz; return { H: Math.round(H), W: Math.round(H * aspect) };
  }

  // ---------- focus (zoomed single page) ----------
  focusOn(p: number, side: 'L' | 'R') {
    if (this.state.switching) return;
    this.setState({ fside: side }); cancelAnimationFrame(this.sraf);
    const from = this.state.fsx || 0, to = side === 'L' ? 1 : 0, t0 = performance.now();
    const tick = (now: number) => { const t = Math.min(1, (now - t0) / 600), e = 1 - Math.pow(1 - t, 3); this.setState({ fsx: from + (to - from) * e }); if (t < 1) this.sraf = requestAnimationFrame(tick); };
    if (this.state.focus) this.sraf = requestAnimationFrame(tick); else this.setState({ fsx: to });
    if (Math.abs(this.state.p - p) > 0.01) { this.target = p; this.animate(); }
    this.setFocus(true);
  }
  setFocus(on: boolean) {
    if (on === !!this.state.focus) return;
    this.setState({ focus: on, ctrlShow: true, menuOpen: false });
    clearTimeout(this.wakeT); if (on) this.wakeT = setTimeout(() => this.state.focus && this.setState({ ctrlShow: false }), 1800);
    cancelAnimationFrame(this.fraf);
    const from = this.state.fz || 0, to = on ? 1 : 0, t0 = performance.now(), dur = 700;
    const tick = (now: number) => { const t = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - t, 3); this.setState({ fz: from + (to - from) * e }); if (t < 1) this.fraf = requestAnimationFrame(tick); };
    this.fraf = requestAnimationFrame(tick);
  }
  drift(el: (HTMLDivElement & { _anim?: Animation }) | null, kf: Keyframe[], dur: number) {
    if (el && !el._anim && el.animate) el._anim = el.animate(kf, { duration: dur, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
  }
  bgRefA = (el: HTMLDivElement | null) => this.drift(el, [{ transform: 'translate(-6%,-4%) rotate(0deg) scale(1.1)' }, { transform: 'translate(5%,4%) rotate(10deg) scale(1.3)' }], 16000);
  bgRefB = (el: HTMLDivElement | null) => this.drift(el, [{ transform: 'translate(6%,5%) rotate(0deg) scale(1.3)' }, { transform: 'translate(-5%,-6%) rotate(-14deg) scale(1.1)' }], 21000);

  // ---------- fit-your-page editor ----------
  startEdit(queue: string[], replaceIdx: number | null, target?: 'cover') {
    this.setState({ edit: { queue, i: 0, replaceIdx, target, scale: 1, rot: 0, skx: 0, sky: 0, tx: 0, ty: 0, nw: 0, nh: 0 } });
    this.loadEditImg(queue[0]);
  }
  loadEditImg(src: string) {
    const im = new Image();
    // Stored pages are re-drawn to a canvas, so they must load with CORS (see cors.json).
    if (!isData(src)) im.crossOrigin = 'anonymous';
    im.onload = () => { this.editImg = im; this.setState(s => s.edit ? { edit: { ...s.edit, nw: im.naturalWidth, nh: im.naturalHeight } } : null); };
    im.src = this.blobUrl(src);
  }
  frame() { const fh = Math.round(Math.max(200, Math.min(this.state.vh * 0.58, 520))); return { fh, fw: Math.round(fh * this.aspect()) }; }
  baseSize() { const e = this.state.edit!, { fw, fh } = this.frame(); if (!e.nw) return { bw: fw, bh: fh }; const s = Math.min(fw / e.nw, fh / e.nh); return { bw: e.nw * s, bh: e.nh * s }; }
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
    const url = c.toDataURL('image/jpeg', 0.9), images = [...this.state.images];
    if (e.target === 'cover') { this.updateBook({ coverImg: url }); this.setState({ edit: null }); return; }
    if (e.replaceIdx != null) images[e.replaceIdx] = url; else images.push(url);
    this.setImages(images); this.nextEdit();
  }
  nextEdit() {
    const e = this.state.edit; if (!e) return; const i = e.i + 1;
    if (i >= e.queue.length || e.replaceIdx != null) { this.setState({ edit: null }); cancelAnimationFrame(this.raf); this.target = Math.round(this.target); this.setState({ p: this.target }); return; }
    this.setState({ edit: { ...e, i, scale: 1, rot: 0, skx: 0, sky: 0, tx: 0, ty: 0, nw: 0, nh: 0 } }); this.loadEditImg(e.queue[i]);
  }

  // ---------- explore ----------
  exSorted() {
    const q = (this.state.exQ || '').trim().toLowerCase(), l = this.community().filter(b => !q || (b.name + ' ' + b.artist).toLowerCase().includes(q));
    if ((this.state.exSort || 'trending') === 'trending') return l.sort((a, b) => b.likes - a.likes);
    return l[0]?.updatedAt ? l.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)) : l.reverse();
  }
  exLoop() {
    cancelAnimationFrame(this.exRaf);
    const tick = () => {
      let s = this.state.stS || 0; const ds = this.stT - s, done = Math.abs(ds) <= 0.002; s = done ? this.stT : s + ds * 0.12;
      this.setState({ stS: s }); if (!done) this.exRaf = requestAnimationFrame(tick);
    };
    tick();
  }
  stackStep(d: number) { this.stT = Math.max(0, Math.min(this.exSorted().length - 1, this.stT + d)); this.exLoop(); }

  // ---------- computed values per screen ----------
  homeVals(): V {
    const vw = this.state.vw, mob = vw < 640, tab = vw < 1000;
    const list = [...this.community()].sort((a, b) => b.likes - a.likes);
    const mk = (b: OtherBook) => ({
      key: b.id, name: b.name, artist: b.artist, color: b.color, bg: this.coverBg(b), showLabel: !b.coverImg, ar: String(this.shapeOf(b).a), tw: String(PANEL_WIDTH[b.shape] || 58),
      no: 'Sketchbook ' + String(b.idx + 1).padStart(3, '0'), pg: 'Pages 01—' + String(b.pages).padStart(2, '0'),
      open: () => this.openOtherBook(b), openArtist: (e: MouseEvent) => { e.stopPropagation(); this.openProfile(this.whoOf(b)); },
    });
    const sel = list.slice(0, 6), gap = mob ? 16 : 28, rel = sel.map(b => { const s = this.shapeOf(b); return { s, w: s.s * s.a }; }), sumW = rel.reduce((t, r) => t + r.w, 0);
    const avail = Math.min(vw, 1320) - 2 * (mob ? 16 : 40) - 24 - gap * (sel.length - 1), base = mob ? 170 : Math.max(150, Math.min(300, avail / sumW));
    return {
      hmEmpty: !!this.state.community && !list.length, hmHero: list.slice(0, 1).map(mk), hmFeat: list.slice(1, 4).map(mk), hmComm: list.slice(4).map(mk),
      hmPadT: mob ? 96 : 140, hmPadX: mob ? 16 : 40, hmHeroCols: tab ? 'minmax(0,1fr)' : 'minmax(0,7fr) minmax(0,5fr)', hmHeroJustify: tab ? 'start' : 'end', hmH1: mob ? 58 : tab ? 92 : 120,
      hmFeatCols: mob ? 1 : 3, hmCommCols: mob || tab ? 2 : 4, hmGap: mob ? 72 : 120,
      ldShelf: sel.map((b, i) => {
        const hh = Math.round(base * rel[i].s.s);
        return { key: b.id, name: b.name, color: b.color, bg: this.coverBg(b), showLabel: !b.coverImg, title: b.name + ' — ' + b.artist, h: hh, w: Math.round(hh * rel[i].s.a), fs: Math.max(11, Math.round(hh / 17)), rot: [0, -2, 0, 1.5, 0, -1][i], open: () => this.openOtherBook(b) };
      }),
      ldShelfGap: gap, ldShelfJust: mob ? 'flex-start' : 'center', ldH1: mob ? 60 : tab ? 104 : 148, ldStepCols: mob ? 1 : 3,
      ldQuoteCols: mob ? 'minmax(0,1fr)' : 'minmax(0,3fr) minmax(0,9fr)', ldQuote: mob ? 34 : 60, ldQuotePad: mob ? 40 : 72,
      ldCta: mob ? 52 : 88, ldCtaDir: tab ? 'column' : 'row', ldCtaAlign: tab ? 'flex-start' : 'flex-end',
      startOwn: () => { if (!this.state.acct) return this.openProfile(null); this.goMode('mine'); this.openNewPick(); },
    };
  }

  profileVals(): V {
    const s = this.state, vw = s.vw, mob = vw < 640, mine = !s.profileOf, pv = mine && !!s.pfPreview, a = (s.acct || {}) as Partial<Account>, follows = s.follows || [];
    const card = (b: AnyBook, bg: string, showLabel: boolean, pages: number, open: () => void) => ({
      key: b.id, name: b.name, color: b.color, bg, showLabel, ar: String(this.shapeOf(b).a), wp: String((b.shape && GRID_WIDTH[b.shape]) || 78),
      count: `${pages} pages · ${this.shapeOf(b).label || 'Portrait'}`, open,
    });
    let p: { name?: string; handle?: string; bio?: string; loc?: string; web?: string; accent?: string; av?: string | null; joined: string; stats: [number, string][] };
    let list: ReturnType<typeof card>[], folOn = false;
    if (mine) {
      list = s.books.map((b, j) => card(b, this.coverBg(b), !b.coverImg, b.images.length, () => { cancelAnimationFrame(this.raf); this.target = 0; this.setState({ mode: 'mine', profileOf: null, active: j, images: b.images, p: 0, other: null }); }));
      p = {
        name: a.name, handle: a.handle, bio: a.bio, loc: a.loc, web: a.web, accent: a.accent, av: a.av,
        joined: 'Joined ' + new Date(a.joined || Date.now()).toLocaleDateString('en', { month: 'short', year: 'numeric' }),
        stats: [[s.books.length, s.books.length === 1 ? 'sketchbook' : 'sketchbooks'], [s.books.reduce((t, b) => t + b.images.length, 0), 'pages']],
      };
    } else {
      const who = s.profileOf!, pf = s.pf?.uid === who.uid ? s.pf : null, pr = pf?.profile, bks = pf?.books || [];
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
      pfStats: p.stats.map(([n, l]) => ({ n: fmtK(n), l })), pfBooks: list, pfCount: String(list.length), pfBooksLbl: mine && !pv ? 'Your sketchbooks' : 'Sketchbooks',
      pfMine: mine && !pv, pfPreviewing: pv, pfOther: !mine, pfShowNew: mine && !pv,
      pfDir: mob ? 'column' : 'row', pfAlign: mob ? 'center' : 'flex-start', pfTA: mob ? 'center' : 'left', pfJust: mob ? 'center' : 'flex-start', pfHeadGap: mob ? 16 : 28,
      pfBanH: mob ? 96 : 128, pfInfoTop: mob ? 0 : 2, pfPadX: pad, pfNameSize: mob ? 48 : 72,
      pfCols: Math.max(2, Math.min(5, Math.floor((Math.min(vw, 1080) - pad * 2 + 18) / (mob ? 150 : 200)))),
      editProfile: () => this.setState({ draft: { name: a.name || '', handle: a.handle || '', bio: a.bio || '', loc: a.loc || '', web: a.web || '', accent: a.accent || '#C9C3B4', av: a.av || null } }),
      togglePreview: () => this.setState(st => ({ pfPreview: !st.pfPreview })),
      pfNew: this.openNewPick,
      folLbl: folOn ? 'Following' : 'Follow', folBg: folOn ? 'transparent' : MARK, folFg: folOn ? INK : PAPER, folBd: folOn ? 'rgba(34,35,32,.5)' : MARK,
      toggleFollow: () => {
        if (!s.acct) return this.openJoin();
        const key = s.profileOf?.uid; if (!key) return;
        const on = !follows.includes(key);
        this.setState({ follows: on ? [...follows, key] : follows.filter(x => x !== key) });
        api.setFollow(s.acct.uid, key, on).catch(e => { console.error(e); this.setState(st => ({ follows: on ? st.follows.filter(x => x !== key) : [...st.follows, key] })); });
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
            this.setState({ su: null }); this.openProfile(null, true);
          }
        } catch (e) {
          this.setState({ suErr: api.errMsg(e) });
        } finally {
          this.signingUp = false; this.setState({ suBusy: false });
        }
      },
      closeAuth: this.closeAuth,
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
    const setSort = (v: 'trending' | 'new') => { cancelAnimationFrame(this.exRaf); this.stT = 0; this.setState({ exSort: v, stS: 0 }); };
    const [vGridBg, vGridFg] = on(view === 'grid'), [vStackBg, vStackFg] = on(view === 'stack'), [sTrBg, sTrFg] = on(sort === 'trending'), [sNewBg, sNewFg] = on(sort === 'new');
    return {
      exH1: mob ? 44 : 72, exCountLbl: n + (n === 1 ? ' sketchbook' : ' sketchbooks') + ' · ' + new Date().toLocaleDateString('en', { month: 'short', year: 'numeric' }),
      stDir: mob ? 'column' : 'row', stGap: mob ? 4 : 48, stMaxW: mob ? '100%' : '60%', stFlex: mob ? '1 1 0' : '0 0 auto', stInfoGap: mob ? 4 : 10,
      stAlign: mob ? 'center' : 'stretch', stTA: mob ? 'center' : 'left', stTitle: mob ? 30 : 44, stBtnTop: mob ? 6 : 10,
      stHint: mob ? 'swipe the pile up to lift books off' : 'scroll over the pile to lift books off',
      stDown0: (e: PointerEvent) => { this.stY = e.clientY; },
      stUp0: (e: PointerEvent) => { if (this.stY == null) return; const dy = e.clientY - this.stY; this.stY = null; if (Math.abs(dy) > 40) this.stackStep(dy < 0 ? 1 : -1); },
      exLoading: !s.community, exEmpty: !!s.community && !s.community.length,
      exQ: s.exQ || '', onExQ: (e: ChangeEvent<HTMLInputElement>) => { cancelAnimationFrame(this.exRaf); this.stT = 0; this.setState({ exQ: e.target.value, stS: 0 }); }, exNone: n === 0,
      exCols: Math.max(2, Math.min(6, Math.floor((s.vw - (mob ? 32 : 80) + 18) / (mob ? 150 : 200)))),
      exPadT: mob ? 84 : 108, exPadX: mob ? 16 : 40, exGap: mob ? 14 : 24, exSearchBasis: mob ? '100%' : 'auto', exSearchMax: mob ? 'none' : '380px',
      exOvY: view === 'grid' ? 'auto' : 'hidden', exInnerH: view === 'grid' ? 'auto' : '100%',
      stackT: `scale3d(${sk.toFixed(3)},${sk.toFixed(3)},${sk.toFixed(3)}) rotateX(56deg) rotateZ(-12deg)`,
      exGrid: view === 'grid' && n > 0, exStack: view === 'stack' && n > 0, vGridBg, vGridFg, vStackBg, vStackFg, sTrBg, sTrFg, sNewBg, sNewFg,
      viewGrid: () => setView('grid'), viewStack: () => setView('stack'), sortTrend: () => setSort('trending'), sortNew: () => setSort('new'),
      exploreList: list.map(b => ({
        key: b.id, name: b.name, artist: b.artist, color: b.color, bg: this.coverBg(b), showLabel: !b.coverImg, no: 'Sketchbook ' + String(b.idx + 1).padStart(3, '0'), count: `${b.pages} pages · ${this.shapeOf(b).label}`,
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
      resetEd: () => this.setEd({ scale: 1, rot: 0, skx: 0, sky: 0, tx: 0, ty: 0 }),
      applyEdit: () => this.applyEdit(), skipEdit: () => this.nextEdit(), cancelEdit: () => this.setState({ edit: null }),
      applyLbl: ed.target === 'cover' ? 'Save cover' : ed.replaceIdx != null ? 'Save page' : 'Add to sketchbook',
      edDown: (e: PointerEvent<HTMLDivElement>) => { e.stopPropagation(); this.edDrag = { x: e.clientX, y: e.clientY, tx: ed.tx, ty: ed.ty }; e.currentTarget.setPointerCapture?.(e.pointerId); },
      edMove: (e: PointerEvent) => { const d = this.edDrag; if (d) this.setEd({ tx: d.tx + e.clientX - d.x, ty: d.ty + e.clientY - d.y }); },
      edUp: () => { this.edDrag = null; },
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
      const F = this.face(i, 0), B = this.face(i, 1);
      return {
        key: i, label: book.name, isCover: i === 0 && !book.coverImg, isCoverAny: i === 0,
        transform: `rotateY(${a}deg) translateZ(${((N - i) * 0.5).toFixed(2)}px)`, frontBg: F.bg, backBg: B.bg,
        shadeF: (0.35 * Math.sin(rad) * (rad < Math.PI / 2 ? 1 : 0)).toFixed(3), shadeB: (0.3 * Math.max(0, Math.sin(rad)) * (rad > Math.PI / 2 ? 1 : 0)).toFixed(3),
        numF: F.num, numB: B.num,
        openFront: () => { if (!this.moved) this.focusOn(i, 'R'); },
        openBack: () => { if (!this.moved) this.focusOn(i + 1, 'L'); },
      };
    });

    // Carousel of closed books either side of the open one.
    const ext = W / 2 * (1 + clamp01(Math.min(p, N - p))), sbw = W * 0.78, gap = W * 0.32;
    const sw = !!s.switching, car = sw ? s.car! : active;
    const pos = (d: number) => { const a = Math.abs(d); return Math.sign(d) * (Math.min(1, a) * (ext + gap + sbw / 2) + Math.max(0, a - 1) * (sbw + gap)) - W / 2; };
    const zTop = (b: Book) => { const n = (b?.images || []).length; return (Math.max(CONFIG.minPages, n + (n % 2)) / 2 + 2) * 0.5; };
    const sideT = (d: number, z0 = 0, bw = W) => { const m = Math.min(1, Math.abs(d)); return `translateX(${(pos(d) + W / 2 - bw / 2).toFixed(1)}px) translateZ(${(-60 * m + z0 * (1 - m)).toFixed(2)}px) scale(${(1 - 0.22 * m).toFixed(3)})`; };
    const sideBooks = (other ? [] : books).map((b, j) => ({ b, j })).filter(x => sw || x.j !== active).map(({ b, j }) => {
      const d = this.dims(b, true);
      return {
        key: b.id, w: d.W, h: d.H, top: -d.H / 2, transform: sideT(j - car, zTop(b), d.W),
        opacity: clamp01(3 - Math.abs(j - car)).toFixed(3), labelOp: Math.min(1, Math.abs(j - car)).toFixed(3),
        shade: (0.35 * Math.min(1, Math.abs(j - car))).toFixed(3), bg: this.coverBg(b), board: b.color, showLabel: !b.coverImg, name: b.name, count: `${b.images.length} pages`,
        stop: (e: PointerEvent) => e.stopPropagation(), open: () => this.switchBook(j),
      };
    });

    const pagesList = images.map((u, i) => ({
      key: u.length + ':' + i + ':' + u.slice(-24), bg: `url("${this.blobUrl(u)}") center/cover no-repeat #f3efe6`, num: String(i + 1),
      edit: () => this.startEdit([images[i]], i), remove: () => this.setImages(images.filter((_, k) => k !== i)),
      left: () => this.movePage(i, i - 1), right: () => this.movePage(i, i + 1),
      dragStart: (e: DragEvent) => { this.dragIdx = i; e.dataTransfer.effectAllowed = 'move'; },
      dragOver: (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); },
      drop: (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.files?.length) return this.addFiles(e.dataTransfer.files); if (this.dragIdx != null) this.movePage(this.dragIdx, i); this.dragIdx = null; },
    }));
    const blanks = this.nPages() - images.length;
    const m = s.vw < 640;

    const focusMode = CONFIG.focusMenu, foc = !!s.focus;
    const vis = !foc || (focusMode === 'auto-hide' ? s.ctrlShow !== false : focusMode === 'toggle' ? !!s.menuOpen : false);

    return {
      fz: fz.toFixed(3), uiOp: (1 - fz).toFixed(3), uiPE: fz > 0.5 ? 'none' : 'auto', bgRefA: this.bgRefA, bgRefB: this.bgRefB,
      focusBg: (() => {
        const r = Math.round(p), f = fL || r >= N - 1 ? this.face(Math.max(1, Math.min(N - 2, r - 1)), 1) : this.face(Math.max(1, r), 0);
        return f.idx >= 0 ? `url("${this.blobUrl(images[f.idx])}") center/cover no-repeat ${PAPER}` : `radial-gradient(circle at 30% 35%, ${book.color} 0, transparent 55%), radial-gradient(circle at 72% 68%, #C9C3B4 0, transparent 55%), ${PAPER}`;
      })(),
      isMine: mode === 'mine', isOther: mode === 'other', isExplore: mode === 'explore', notOther: !other, showGhost: !other,
      navMineLine: mode === 'mine' ? INK : 'transparent', navMineFg: mode === 'mine' ? INK : '#85867C',
      navExLine: mode === 'explore' || mode === 'other' ? INK : 'transparent', navExFg: mode === 'explore' || mode === 'other' ? INK : '#85867C',
      isProfile: mode === 'profile', isHome: mode === 'home' && !!s.acct, isLanding: mode === 'home' && !s.acct,
      goHome: () => this.goMode('home'), goMine: () => this.goMode('mine'), goExplore: () => this.goMode('explore'),
      openArtist: () => other && 'artist' in other && this.openProfile(this.whoOf(other)),
      artist: (other as OtherBook | null)?.artist || '', artistInitials: (other as OtherBook | null)?.initials || '',
      coverRef: this.coverRef, pickCover: () => this.coverRef.current?.click(),
      onCoverFile: (e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; const fr = new FileReader(); fr.onload = () => this.startEdit([fr.result as string], null, 'cover'); fr.readAsDataURL(f); },
      hasCoverImg: !!book.coverImg, removeCover: () => this.updateBook({ coverImg: null }),
      // The real book carries the closed-book back board until opened so the carousel hand-over doesn't pop.
      openShadowOp: clamp01(Math.min(p, N - p) * 3).toFixed(3), bodyOp: (1 - clamp01(Math.min(p, N - p) * 4)).toFixed(3),
      bodyLeft: p > N / 2 ? -W : 0, boardColor: book.color || '#b8243a',
      bookOp: sw ? 0 : 1, titleName: other ? other.name : (books[Math.round(car)] || book).name,
      titleOp: ((sw ? 1 - Math.sin(Math.PI * (s.swT || 0)) * 0.85 : 1) * (1 - fz)).toFixed(3),
      bookName: book.name,
      bookMeta: other ? `by ${(other as OtherBook).artist} · ${(other as OtherBook).pages} pages` : books.length > 1 ? `${images.length} pages · ${active + 1} of ${books.length}` : `${images.length} pages`,
      multi: !other && books.length > 1, prevBook: () => this.switchBook(active - 1), nextBook: () => this.switchBook(active + 1),
      prevOp: active > 0 ? 1 : 0.3, nextOp: active < books.length - 1 ? 1 : 0.3,
      sideBooks, sbBase: `rotateX(${tilt}deg)`, sbTop: -H / 2, ghostT: sideT(books.length - car),
      newBook: this.openNewPick, stopPD: (e: PointerEvent) => e.stopPropagation(),
      navMineLbl: m ? 'Yours' : 'Your sketchbooks', mNavGap: m ? 14 : 40, notMob: !m, mPad: m ? 14 : 24, mTop: m ? 14 : 20, mGap: m ? 14 : 24,
      newLbl: m ? '+ New' : '+ New sketchbook', mTitleTop: m ? 72 : 76, mTitleSize: m ? 32 : 46, mBottom: m ? 16 : 36, mModalPad: m ? 18 : 28, mOptMin: m ? 92 : 120, mOptH: m ? 130 : 170,
      newPick: !!s.newPick, closePick: (e: MouseEvent) => { if (e.target === e.currentTarget) this.setState({ newPick: false }); }, cancelPick: () => this.setState({ newPick: false }),
      createBook: () => { if (s.mode === 'profile') this.setState({ mode: 'mine', profileOf: null }); this.newBook(s.pickShape || 'portrait'); }, pgAspect: String(this.aspect()),
      shapeOpts: (Object.entries(SHAPES) as [ShapeKey, Shape][]).map(([k, v]) => {
        const on = (s.pickShape || 'portrait') === k, ph = Math.round(120 * v.s);
        return { key: k, label: v.label, w: Math.round(ph * v.a), h: ph, c: PALETTE[books.length % PALETTE.length],
          ring: on ? `0 0 0 2px ${MARK}` : '0 0 0 1px rgba(34,35,32,.18)', bg: on ? 'rgba(34,35,32,.08)' : 'transparent', pick: () => this.setState({ pickShape: k }) };
      }),
      managing: s.managing, openManager: () => this.setState({ managing: true }), closeManager: () => this.setState({ managing: false }),
      pagesList, blankNote: blanks > 0 ? `${blanks} blank pages follow your drawings` : 'Book grows as you add pages',
      onName: (e: ChangeEvent<HTMLInputElement>) => this.updateBook({ name: e.target.value }),
      swatches: PALETTE.map(c => ({ key: c, c, ring: c === book.color ? `0 0 0 2px ${PAPER}, 0 0 0 4px ${INK}` : 'none', pick: () => this.updateBook({ color: c }) })),
      deleteBook: () => this.deleteBook(),
      W, H, leaves, stageRef: this.stageRef, fileRef: this.fileRef,
      bookTransform: `rotateX(${(tilt * (1 - fz) + 3 * fz).toFixed(2)}deg) translateX(${shift}px)`,
      shadowLeft: -W * clamp01(p), shadowW: W * (clamp01(p) + clamp01(N - p)),
      emptyOp: !images.length && !other && !sw ? 1 : 0,
      onDown: (e: PointerEvent) => { this.drag = { x: e.clientX, p0: s.p, id: e.pointerId }; this.moved = false; cancelAnimationFrame(this.raf); },
      onMove: (e: PointerEvent<HTMLDivElement>) => {
        if (!this.drag) return; const dx = e.clientX - this.drag.x;
        if (Math.abs(dx) > 4 && !this.moved) { this.moved = true; e.currentTarget.setPointerCapture?.(this.drag.id); }
        this.setState({ p: Math.max(-0.15, Math.min(N + 0.15, this.drag.p0 - dx / (W * 1.1))) });
      },
      onUp: (e: PointerEvent) => {
        if (!this.drag) return; const dx = e.clientX - this.drag.x, pp = this.state.p;
        // Swiping past the front or back cover moves to the neighbouring sketchbook.
        if (this.drag.p0 === 0 && dx > 90 && active > 0) { this.drag = null; return this.switchBook(active - 1); }
        if (this.drag.p0 === N && dx < -90 && active < books.length - 1) { this.drag = null; return this.switchBook(active + 1); }
        const tp = Math.max(0, Math.min(N, Math.abs(dx) > 30 ? (dx < 0 ? Math.ceil(pp - 0.1) : Math.floor(pp + 0.1)) : Math.round(pp)));
        const p0 = Math.round(this.drag.p0), moved = this.moved;
        this.drag = null; setTimeout(() => this.moved = false, 0);
        // In focus view a swipe to another spread picks its page the same way the arrow keys do.
        if (this.state.focus && moved) {
          const fp = Math.max(1, Math.min(N - 1, tp)); this.target = fp;
          return this.focusOn(fp, fp === p0 ? this.state.fside || 'R' : this.autoSide(fp, dx < 0 ? 'L' : 'R'));
        }
        this.target = tp; this.animate();
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
    const mode = this.state.mode || 'home';
    const v: V = {
      ...this.editorVals(),
      ...this.bookVals(),
      ...(mode === 'home' ? this.homeVals() : {}),
      ...(mode === 'profile' ? this.profileVals() : {}),
      ...(mode === 'explore' ? this.exploreVals() : {}),
      ...this.accountVals(),
    };
    return (
      <Stage v={v}>
        {v.isLanding && <Landing v={v} />}
        {v.isHome && <Home v={v} />}
        {v.isExplore && <Explore v={v} />}
        {v.isProfile && <Profile v={v} />}
        {v.isAuth && <AuthPage v={v} />}
        {v.pfEditing && <EditProfile v={v} />}
        <input ref={this.avRef} type="file" accept="image/*" onChange={v.onAvFile} style={{ display: 'none' }} />
        {v.newPick && <NewBookPicker v={v} />}
        {v.managing && <Manager v={v} />}
        {v.editing && <Editor v={v} />}
        <input ref={this.fileRef} type="file" accept="image/*" multiple onChange={v.onFiles} style={{ display: 'none' }} />
      </Stage>
    );
  }
}
