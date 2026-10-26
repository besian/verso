import { Component, createRef } from 'react';
import { flushSync } from 'react-dom';
import type { ChangeEvent, DragEvent, MouseEvent, PointerEvent, ReactNode, WheelEvent } from 'react';
import { CONFIG, GRID_WIDTH, MAX_MEDIUMS, MAX_TAGS, MEDIUMS, PALETTE, SHAPES, mediumKey, tagSlug } from './data';
import type { Account, ArchiveEntry, Book, OtherBook, PageNote, Shape, ShapeKey } from './data';
import * as api from './backend';
import type { AuthUser, Billing, BillingDetails, BookDoc, Chat, Msg, Notif, Person, Report, Saved, Stats, ViewSource } from './backend';
import { BOOKS_FREE, PAGES_FREE, PAGES_PLUS, PAGE_H, PAGE_H_PLUS, PERKS, PRICE, REASONS, YEAR_SAVING } from './plus';
import { alignSpreads, isLeftPage, partner, renamePage, splitSpread } from './spreads';
import * as store from './storage';
import * as sound from './sound';
import * as themeMode from './themeMode';
import * as installer from './install';
import { currentPrompt } from './prompts';
import { COVER_INSIDE, pageWear } from './wear';
import { ADJUSTERS, NO_ADJUST, applyToCanvas, feValues, isAdjusted } from './adjust';
import type { Adjust } from './adjust';
import { LINE_H, drawTexts, inkPng, readInk, textFromInk, textWidth, wrapLines } from './handwriting';
import type { PageText, Stroke } from './handwriting';
import { RULED, paperUrl } from './paper';
import { MAX_SOCIALS, PLATFORM, PLATFORMS, cleanHandle, socialLinks } from './socials';
import { drawMarks, pathD } from './draw';
import { DEFAULT_PEN, NO_COLOR, Painter } from './paint';
import type { Mark } from './draw';
import type { Pen, Tool } from './paint';
import type { Paper } from './paper';
import type { Wear } from './wear';
import { INK, MARK, PAPER, STONE } from './theme';
import Stage from './views/Stage';
import { findPage, fitPage } from './autofit';
import type { Fit, Pt } from './autofit';
import { AuthPage, BillingPage, Explore, HomeScreen, Profile, Settings } from './views/Screens';
import { Admin, AuthAction, Legal, NotFound } from './views/Pages';
import { Messages } from './views/Messages';
import { ArchiveModal, AskModal, CardModal, ConsentBar, CollectionModal, Editor, EditProfile, EmbedModal, GiftModal, Manager, NewBookPicker, PlanConfirm, PlusModal, ReportModal, Toast, Welcome } from './views/Overlays';

export type Mode = 'home' | 'mine' | 'other' | 'explore' | 'profile' | 'auth' | 'settings' | 'legal' | 'admin' | 'notfound' | 'action' | 'messages' | 'billing';
/** A report with what it points at, for the moderation page. */
type AdminItem = Report & { targetName: string; ownerName: string; ownerHandle: string; hidden: boolean; banned: boolean; gone: boolean; mature: boolean };
type AnyBook = Book | OtherBook;
/** Whose profile is open; name shows while the profile loads. */
type Who = { name: string; uid?: string; handle?: string };
type PublicProfile = Omit<Account, 'uid' | 'email'>;
// Everything a view reads: computed styles/labels plus handlers (mirrors the design's template bindings).
export type V = Record<string, any>;

interface EditState {
  queue: string[]; i: number; replaceIdx: number | null; target?: 'cover' | 'avatar';
  scale: number; rot: number; skx: number; sky: number; tx: number; ty: number; nw: number; nh: number;
  /** Brightness, contrast and the rest (see adjust.ts), and which set of controls is showing. */
  adj: Adjust; mode: EdMode;
  /** Write mode: handwriting not yet converted, the typed text placed on the page, and the one being edited. */
  ink: Stroke[]; texts: PageText[]; sel: string | null; inkBusy?: boolean; inkErr?: string;
  /** Set for a blank page, so typed text can sit on lined paper's rules. */
  paper?: Paper;
  /** Draw mode: finished strokes and the current tool. Write mode: whether the zoom pad is on, and where it sits on the page. */
  marks: Mark[]; pen: Pen; pad: boolean; box?: { x: number; y: number };
  /** A new picture across two pages: the frame is two pages wide, and the picture is cut into a left and a right page. */
  spread?: boolean;
  /** A new photo of a page: the page's corners found in it, and the settings that straighten and crop it to the frame. */
  autoP?: Pt[] | null; auto?: Fit | null;
  /** Draw mode: bumped after each stroke, undo or clear (the paint itself is in the Painter); picking a colour off the page. */
  painted?: number; eyedrop?: boolean;
}
type EdMode = 'fit' | 'adjust' | 'write' | 'draw' | 'pick';

interface State {
  mode?: Mode;
  /** False until the first auth check (and, when signed in, the user's books) has finished. */
  authReady?: boolean;
  acct: Account | null; follows: string[];
  books: Book[]; active: number; images: string[];
  other?: AnyBook | null; profileOf?: Who | null; pfPreview?: boolean;
  pf?: { uid: string; profile: PublicProfile | null; books: OtherBook[]; plus?: boolean; gift?: api.PlusInfo } | null;
  /** Fletora Plus: whether you have it (undefined until known), your plan details, and the upgrade sheet
   *  (open when plusFor isn't null; its value says why it opened, see REASONS). */
  plus?: boolean; bill?: Billing | null; myGift?: api.PlusInfo | null;
  /** Analytics consent ('yes' / 'no', or null when not asked yet; only asked when analytics is set up). */
  analytics?: 'yes' | 'no' | null;
  /** Shows Mature sketchbooks (Settings; signed in and 18 or over). */
  showMature?: boolean;
  /** Making a PDF of the open sketchbook: how far along ('3/40'). */
  pdfBusy?: string;
  /** A question asked in Fletora's own dialog before something that can't easily be undone. */
  ask?: { title: string; text: string; yes: string; danger?: boolean; notice?: boolean; run: () => void } | null;
  /** Moderators giving someone Plus: who, and while it's being saved. */
  giftFor?: { uid: string; name: string; gift: api.PlusInfo | null } | null; giftBusy?: boolean; plusFor?: string | null; plusPlan?: 'month' | 'year'; plusBusy?: boolean; plusErr?: string;
  /** Checkout on our page: its session's client secret, whether it's our own form with Stripe's card fields
   *  ('elements') or Stripe's whole form ('embedded'), and the thank-you once it's paid. */
  plusSecret?: string; plusUi?: 'elements' | 'embedded'; plusDone?: boolean; plusWhy?: string[];
  /** The billing page in Settings: plan, card and receipts from Stripe, the change being confirmed, and a new card's setup. */
  bd?: BillingDetails | null; bdErr?: string; bdAsk?: 'cancel' | 'switch' | null; bdBusy?: boolean; cardSecret?: string | null;
  /** The open sketchbook's stats on the edit screen. */
  stats?: { id: string; s: Stats } | null;
  acErr?: string; acInfo?: string; acBusy?: string; verified?: boolean;
  ac?: { email?: string; pwEmail?: string; pwOld?: string; pwNew?: string; delHandle?: string; pwDel?: string };
  community?: OtherBook[]; people?: Person[];
  saved?: Saved[]; blocked?: string[]; followFeed?: OtherBook[]; followPeople?: Person[]; pfTab?: 'books' | 'saved' | 'following';
  toast?: string; more?: 'book' | 'profile' | 'chat' | null;
  counts?: Record<string, number>; liked?: Record<string, boolean>; notifs?: Notif[]; notifOpen?: boolean;
  reportFor?: { kind: 'book' | 'user' | 'message'; targetId: string; ownerId: string; label: string; quote?: string } | null; reportReason?: string; reportNote?: string; reportBusy?: boolean; reportErr?: string;
  p: number; zoom: number; managing: boolean;
  vw: number; vh: number; sw?: number; sh?: number;
  /** Top of the book area on screen (it sits below the title), used to centre a zoomed page on the whole screen. */
  st?: number;
  switching?: boolean; car?: number; swT?: number;
  /** Focus view: which page is centred, the left or right one, or 'S' for a picture across both (centred on the fold). */
  focus?: boolean; fz?: number; fside?: 'L' | 'R' | 'S'; fsx?: number; ctrlShow?: boolean; menuOpen?: boolean;
  edit?: EditState | null; edTool?: string; edAdjTool?: string; edPeek?: boolean;
  /** Messages: your conversations, the open one (or a new one with chatNew), its messages and the reply being written. */
  /** From the archive (Explore), and the moderator's add/edit form for it. */
  /** Fletora team accounts (verified tick). */
  team?: string[];
  archive?: OtherBook[]; archForm?: (Omit<ArchiveEntry, 'at'> & { at?: number; busy?: boolean; err?: string }) | null;
  chats?: Chat[]; chatOpen?: string | null; chatNew?: Person | null; msgs?: Msg[]; msgDraft?: string; msgTab?: 'chats' | 'requests'; msgBusy?: boolean; msgErr?: string;
  newPick?: boolean; pickShape?: ShapeKey;
  /** Sign-in page: which form, and the screen to return to. */
  authFrom?: Mode; suMode?: 'join' | 'signin' | 'reset'; su?: { name: string; handle: string; email: string; pw: string } | null; suHT?: boolean;
  suBusy?: boolean; suErr?: string; suInfo?: string;
  draft?: (Omit<Account, 'uid' | 'email' | 'joined'>) | null; dBusy?: boolean; dErr?: string; socialMenu?: boolean;
  exView?: string; exSort?: 'trending' | 'new'; exQ?: string; stS?: number;
  /** Explore paging, and the medium/tag filter ('m:ink', 't:lisbon') with its results. */
  exMore?: boolean; exBusy?: boolean; exLabel?: string; exLabelBooks?: OtherBook[] | null;
  legal?: 'privacy' | 'terms' | 'contact' | 'plus'; nf?: string;
  /** Explore's Plus card, closed by the visitor (for a while). */
  exPromoHidden?: boolean;
  /** The Contact page's form. */
  ct?: { kind: string; email: string; text: string; link: string; hp: string; busy?: boolean; err?: string; sentTo?: string };
  banned?: string[]; admin?: boolean; adReports?: AdminItem[] | null; adBusy?: string; adErr?: string;
  /** Resend on the confirm-email reminder rests until this time. */
  vfUntil?: number;
  /** Saved tab: the collection shown ('' = all), and collections made but still empty. */
  pfCol?: string; newCols?: string[];
  /** New-collection dialog: its name, and the saved sketchbook to move into it (if any). The open collection menu. */
  colNew?: { name: string; forId?: string } | null; colMenu?: string | null;
  /** Shown inside an iframe on someone's site (/embed/<id>): just the book. And the embed-code dialog. */
  embed?: boolean; embedFor?: { id: string; title: string } | null;
  /** The sketchbook moderators feature on the home page. */
  pick?: OtherBook | null;
  /** /auth/action: a link from one of our emails (confirm email, reset password, email change). */
  act?: { mode: string; code: string; next: string; step: 'checking' | 'form' | 'working' | 'done' | 'error'; email: string; pw: string; err: string };
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
/** Leaves drawn on each side of the open spread. */
const LEAF_WINDOW = 3;
/** Page width as a share of a phone's screen: closed, and open (two pages side by side, plus the fan of turning pages). */
const PHONE_CLOSED = 0.6, PHONE_OPEN = 0.44;
const IS_TOUCH = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
/** Zooming into a page, and sliding between the two pages of a spread while zoomed (ms). */
// With "Reduce motion" turned on, page turns, zooms and the shelf move in about a third of the time.
const MOTION = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.35 : 1;
const FOCUS_MS = 300 * MOTION, FOCUS_OUT_MS = 340 * MOTION, FOCUS_SHIFT_MS = 280 * MOTION;
/** Likes and followers each artist is working toward. */
const GOAL = 100;
// border-box: the photo also fills under the thin avatar border, so the dark fallback colour never shows at the edge.
const avatarBg = (av?: string | null) => av ? `url("${av}") center/cover no-repeat border-box ${INK}` : INK;
const isData = (u?: string | null): u is string => !!u && u.startsWith('data:');
/** Every stored file a book uses: pages, cover and their thumbnails (for cleaning up removed ones). */
const bookUrls = (b: Book) => { const main = [...b.images, ...(b.coverImg ? [b.coverImg] : [])]; return [...main, ...main.map(u => b.thumbs?.[u]).filter((u): u is string => !!u)]; };
/** Drops thumbnails for pages and covers the book no longer has. */
const pruneThumbs = (b: Book) => Object.fromEntries([...b.images, b.coverImg].filter((u): u is string => !!u && !!b.thumbs?.[u]).map(u => [u, b.thumbs![u]]));
const localBook = (): Book => ({ id: 'local', name: 'sketchbook', color: '#b8243a', images: [] });
/** A Firestore book shown read-only (Explore, profiles). */
const toOther = (b: BookDoc, idx: number): OtherBook => ({
  id: b.id, idx, shape: b.shape, likes: b.pageCount, artist: names([{ name: b.ownerName, handle: b.ownerHandle }, ...b.collabs]), name: b.name, color: b.color,
  images: b.pages, pages: Math.max(CONFIG.minPages, b.pageCount + (b.pageCount % 2)), initials: ini(b.ownerName), coverImg: b.cover,
  ownerId: b.ownerId, handle: b.ownerHandle, updatedAt: b.updatedAt, thumbs: api.thumbMap(b),
  notes: api.noteMap(b), mediums: b.mediums, tags: b.tags, mature: b.mature, collabIds: b.collabs.map(m => m.uid),
  spreads: Object.fromEntries(b.pages.flatMap((u, i) => b.spreads[i] && b.pages[i + 1] ? [[u, b.pages[i + 1]]] : [])),
});
/** "Ana", "Ana & Ben", "Ana, Ben & Cleo", "Ana, Ben & 3 others". */
const names = (l: { name: string; handle: string }[] = []) => {
  const n = l.map(m => m.name || '@' + m.handle);
  return n.length <= 1 ? n[0] || '' : n.length <= 3 ? `${n.slice(0, -1).join(', ')} & ${n[n.length - 1]}` : `${n.slice(0, 2).join(', ')} & ${n.length - 2} others`;
};
const fmtDate = (d?: string) => { if (!d) return ''; const t = new Date(d + 'T12:00:00'); return isNaN(+t) ? '' : t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); };
/** "Lisbon · 12 Mar 2026" */
const fmtLong = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const noteText = (n?: PageNote) => [n?.c?.trim(), fmtDate(n?.d)].filter(Boolean).join(' · ');

export default class App extends Component<object, State> {
  state: State = {
    acct: null, follows: [],
    books: [localBook()], active: 0, managing: false, images: [], p: 0, zoom: 1,
    vw: window.innerWidth || 1200, vh: window.innerHeight || 800, soundOn: sound.soundOn(), dark: themeMode.isDark(), analytics: store.loadAnalytics(), showMature: false, exPromoHidden: (() => { try { return Date.now() - Number(localStorage.getItem('sb-promo-hidden') || 0) < 30 * 86_400_000; } catch { return false; } })(),
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
  fileRef = createRef<HTMLInputElement>(); camRef = createRef<HTMLInputElement>(); coverRef = createRef<HTMLInputElement>(); avRef = createRef<HTMLInputElement>();
  unAuth?: () => void; signingUp = false;
  // Book sync: books with unsaved changes, one promise chain per book, and the file URLs last written for each.
  dirty = new Set<string>(); syncT?: ReturnType<typeof setTimeout>; syncQ = new Map<string, Promise<void>>(); synced = new Map<string, string[]>();

  /** Animation frames draw their state straight away: React would otherwise apply an update made in a frame a
   *  moment later, sometimes merging two frames into one, which shows as a lag and then a jump (zooming out). */
  /** One animation frame. Only the book moves, so the render reuses everything else from the last full one
   *  (the screens and dialogs are skipped outright) and a full render follows once the animation stops. */
  frameState(patch: Partial<State>) {
    this.inFrame = true;
    try { flushSync(() => this.setState(patch as State)); } finally { this.inFrame = false; }
    clearTimeout(this.frameEndT); this.frameEndT = setTimeout(() => this.forceUpdate(), 120);
  }
  inFrame = false; frameEndT = 0 as unknown as ReturnType<typeof setTimeout>;
  lastV: V | null = null; lastKids: ReactNode = null;

  // ---------- lifecycle ----------
  onResize = () => this.setState({ vw: window.innerWidth || 1200, vh: window.innerHeight || 800 });
  onKey = (e: KeyboardEvent) => {
    const s = this.state;
    if (e.key === 'Escape' && s.ask) return this.setState({ ask: null });
    if (e.key === 'Escape' && s.draft) return this.setState({ draft: null });
    if (e.key === 'Escape' && s.welcome) return this.setState({ welcome: false });
    if (e.key === 'Escape' && s.mode === 'auth') return this.closeAuth();
    if (e.key !== 'Escape' && (!['mine', 'other'].includes(s.mode || 'home') || s.draft)) return;
    if (e.key === 'Escape') {
      if (s.newPick) return this.setState({ newPick: false });
      if (!s.edit && !s.managing && s.focus) return this.setFocus(false);
      if (s.edit) return this.setState({ edit: null });
      if (s.managing && s.mgPage != null) return this.setState({ mgPage: null });
      if (s.managing && this.mgChanged()) return this.ask({ title: 'Discard your changes?', text: 'Your changes to this sketchbook won’t be saved.', yes: 'Discard', danger: true, run: () => this.setState({ managing: false }) });
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
    this.loadPick(); this.loadArchive(); api.teamIds().then(team => this.setState({ team }));
  }
  /** Loads (or clears) everything that belongs to the signed-in user. */
  async loadUser(u: AuthUser | null, acct?: Account) {
    // Mature work is for signed-in people who chose it on this device.
    const mt = !!u && store.loadMature();
    api.setShowMature(mt);
    if (mt !== !!this.state.showMature) this.setState({ showMature: mt }, () => this.loadCommunity());
    if (!u) {
      this.synced.clear(); this.dirty.clear();
      return this.setState({ acct: null, follows: [], saved: [], blocked: [], followFeed: [], followPeople: [], books: [localBook()], active: 0, images: [], p: 0, authReady: true, admin: false, plus: undefined, bill: null });
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
          api.isAdmin(u.uid).then(admin => this.setState({ admin }, () => { if (admin && this.state.mode === 'admin') this.loadReports(); }));
          if (this.pendingCheckout) this.confirmPlus(this.pendingCheckout);
          this.startTrial(u.uid); });
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
  /** Surprise me: someone else's public sketchbook at random, opened at a random drawing. */
  lastSurprise = '';
  async surprise() {
    const me = this.state.acct?.uid, ok = (b: OtherBook) => b.images.length > 0 && b.ownerId !== me;
    let pool = this.community([...(this.state.community || []), ...(this.state.followFeed || []), ...(this.state.pick ? [this.state.pick] : [])]).filter(ok);
    if (!pool.length) {
      // Nothing loaded yet (e.g. straight from the home page): fetch a page of the community first.
      try { pool = this.community((await api.communityPage('trending', null)).books.map((b, i) => toOther(b, i))).filter(ok); } catch (e) { console.error(e); }
    }
    pool = [...new Map(pool.map(b => [b.id, b])).values()];
    if (pool.length > 1) pool = pool.filter(b => b.id !== this.lastSurprise);
    if (!pool.length) return this.toast('No sketchbooks to show yet. Check back soon.');
    const b = pool[Math.floor(Math.random() * pool.length)]; this.lastSurprise = b.id;
    this.openOtherBook(b);
    // Turn to a random page: leaf L shows image 2(L-1) on its front (right page, at p = L) and the next on its back (left page, at p = L + 1).
    const k = Math.floor(Math.random() * b.images.length), at = Math.floor(k / 2) + 1 + (k % 2);
    setTimeout(() => { if (this.state.other?.id === b.id) { this.turnTo(at, 0); this.animate(); } }, 350);
  }

  /** The staff pick, shown first on the home shelf. */
  loadPick() {
    api.getPick().then(p => p ? api.getBook(p.bookId) : null).then(d => this.setState({ pick: d && d.pageCount > 0 ? toOther(d, 0) : null })).catch(() => this.setState({ pick: null }));
  }
  isTeam(uid?: string | null) { return !!uid && (this.state.team || []).includes(uid); }
  loadArchive() {
    api.listArchive().then(list => this.setState({ archive: list.map(({ e, d }, i) => ({ ...toOther(d, i), artist: e.artist, arch: e })) })).catch(() => this.setState({ archive: [] }));
  }
  /** Moderators: open the form to add a sketchbook to (or edit it in) From the archive. */
  openArchForm(bookId: string) {
    const e = (this.state.archive || []).find(b => b.id === bookId)?.arch;
    this.setState({ more: null, archForm: e ? { ...e } : { bookId, artist: '', years: '', source: '', url: '', note: '' } });
  }
  async saveArchForm(remove = false) {
    const f = this.state.archForm, a = this.state.acct; if (!f || !a) return;
    if (!remove && (!f.artist.trim() || !f.source.trim())) return this.setState({ archForm: { ...f, err: 'Add the artist and where the pages come from.' } });
    if (!remove && f.url && !/^https?:\/\//.test(f.url.trim())) return this.setState({ archForm: { ...f, err: 'The link should start with https://' } });
    this.setState({ archForm: { ...f, busy: true, err: '' } });
    try {
      await api.setArchive(a.uid, f.bookId, remove ? null : { artist: f.artist.trim(), years: f.years.trim(), source: f.source.trim(), url: f.url.trim(), note: f.note.trim() }, f.at);
      this.setState({ archForm: null }); this.toast(remove ? 'Removed from the archive' : 'Saved to From the archive'); this.loadArchive();
    } catch (e) { console.error(e); this.setState({ archForm: { ...f, busy: false, err: 'Couldn’t save. Only moderators can change the archive.' } }); }
  }
  togglePick(b: OtherBook) {
    const a = this.state.acct; if (!a || !this.state.admin) return;
    const on = this.state.pick?.id !== b.id;
    this.setState({ pick: on ? b : null, more: null });
    api.setPick(a.uid, on ? b.id : null).then(() => this.toast(on ? `“${b.name}” is the staff pick` : 'Staff pick removed'), e => { console.error(e); this.toast('Couldn’t change the staff pick'); this.loadPick(); });
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
  community(list = this.state.community): OtherBook[] { const bl = [...(this.state.blocked || []), ...(this.state.banned || [])], ar = new Set((this.state.archive || []).map(b => b.id)); return (list || []).filter(b => (!b.ownerId || !bl.includes(b.ownerId)) && !ar.has(b.id)); }
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
  /** Handles an emailed link: confirm email straight away, or ask for the new password first. */
  async openAction() {
    const q = new URLSearchParams(location.search), mode = q.get('mode') || '', code = q.get('oobCode') || '';
    let next = '/'; try { const c = new URL(q.get('continueUrl') || '', location.origin); if (c.origin === location.origin && !c.pathname.startsWith('/auth/')) next = c.pathname + c.search; } catch { /* no continue link */ }
    const set = (p: Partial<NonNullable<State['act']>>) => this.setState(s => ({ act: { ...(s.act || { mode, code, next, step: 'checking', email: '', pw: '', err: '' }), ...p } }));
    cancelAnimationFrame(this.raf); this.setState({ mode: 'action', other: null, focus: false, fz: 0, managing: false, act: { mode, code, next, step: 'checking', email: '', pw: '', err: '' } });
    try {
      const { email } = await api.checkLink(mode, code);
      if (mode === 'resetPassword') return set({ step: 'form', email });
      await api.useLink(code); set({ step: 'done', email });
      if (mode === 'verifyEmail') this.checkVerified();
    } catch (e) { set({ step: 'error', err: api.errMsg(e) }); }
  }
  notFound(nf: string) { cancelAnimationFrame(this.raf); this.target = 0; this.setState(s => ({ mode: 'notfound', nf, other: null, images: s.books[s.active].images, p: 0, focus: false, fz: 0, managing: false })); }
  openLegal(legal: 'privacy' | 'terms' | 'contact' | 'plus') { cancelAnimationFrame(this.raf); this.setState({ mode: 'legal', legal, other: null, focus: false, fz: 0, managing: false, draft: null }); }
  openAdmin() { cancelAnimationFrame(this.raf); this.setState({ mode: 'admin', other: null, focus: false, fz: 0, managing: false, draft: null }); if (this.state.admin) this.loadReports(); }
  collections(): string[] { return [...new Set([...(this.state.saved || []).map(x => x.col || '').filter(Boolean), ...(this.state.newCols || [])])].sort((a, b) => a.localeCompare(b)); }
  moveSaved(id: string, col: string) {
    const a = this.state.acct; if (!a) return;
    if (col === '__new') return this.setState({ colNew: { name: '', forId: id }, colMenu: null });
    this.setState(st => ({ saved: (st.saved || []).map(x => x.id === id ? { ...x, col } : x), colMenu: null }));
    this.toast(col ? `Moved to ${col}` : 'Removed from the collection');
    api.setCollection(a.uid, id, col).catch(e => { console.error(e); this.toast('Couldn’t move that. Try again.'); });
  }
  isSaved(id?: string) { return !!id && (this.state.saved || []).some(x => x.id === id); }
  toggleSave(b: OtherBook) {
    const a = this.state.acct; if (!a) return this.openJoin();
    const on = !this.isSaved(b.id), cover = b.coverImg ? this.thumbOf(b, b.coverImg) : null;
    const item: Saved = { id: b.id, name: b.name, color: b.color, shape: b.shape, cover, ownerId: b.ownerId || '', ownerName: b.artist, ownerHandle: b.handle || '', at: Date.now() };
    this.setState(s => ({ saved: on ? [item, ...(s.saved || [])] : (s.saved || []).filter(x => x.id !== b.id) }));
    this.toast(on ? 'Saved to your profile' : 'Removed from Saved');
    api.setSaved(a.uid, item, on).catch(e => { console.error(e); this.toast('Couldn’t save that. Try again.'); });
  }
  /** Asks in Fletora's own dialog; `run` happens only on yes. */
  ask = (q: NonNullable<State['ask']>) => this.setState({ ask: q, more: null });
  toggleBlock(uid: string, name: string, sure = false) {
    const a = this.state.acct; if (!a) return this.openJoin();
    const on = !(this.state.blocked || []).includes(uid), wasFollowing = (this.state.follows || []).includes(uid);
    if (on && !sure) return this.ask({ title: `Block ${name}?`, text: 'Their sketchbooks will be hidden from you, they can’t message you, and you’ll stop following them. They aren’t told.', yes: 'Block', danger: true, run: () => this.toggleBlock(uid, name, true) });
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
    // Animation frames change only where the book is; the full render after them catches up on the rest.
    if (this.inFrame) return;
    const s = this.state;
    // The edit screen works on a draft: it's saved with Save, and closing it any other way puts the book back.
    if (!prev.managing && s.managing) {
      const b = s.books[s.active]; this.mgSnap = b; this.mgHold = b?.id ?? null; this.setState({ mgTab: 'pages', mgPage: null });
      if (b && s.acct && b.role !== 'collab' && !b.id.startsWith('local')) api.bookStats(b.id).then(st => this.setState({ stats: { id: b.id, s: st } })).catch(() => {});
    }
    if (prev.managing && !s.managing && this.mgHold) this.revertEdits();
    this.syncWatches();
    // Settings shows the plan, card and receipts; they're fetched again whenever the plan changes.
    if ((s.mode === 'settings' || s.mode === 'billing') && s.bill && (prev.mode !== s.mode || prev.bill !== s.bill)) this.loadBilling();
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
    if (me) want.set('ch:' + me, () => api.watchChats(me, chats => this.setState({ chats })));
    if (me) want.set('pl:' + me, () => api.watch(['plus', me], d => {
      const on = api.plusOn(d), info = api.plusInfo(d);
      // In the trial's last two days, a reminder once a day.
      const left = info.until - Date.now(), day = 'sb-trial-note-' + new Date().toISOString().slice(0, 10);
      if (on && info.trial && left < 2 * 86_400_000) { try { if (!localStorage.getItem(day)) { localStorage.setItem(day, '1'); this.toast(`Your Plus trial ends ${fmtLong(info.until)}. Keep it in Account settings → Plan.`); } } catch { /* storage unavailable */ } }
      // Without Plus, link-only sketchbooks are private again (the server changes the stored ones).
      this.setState(st => ({ plus: on, myGift: on ? info : null, books: on ? st.books : st.books.map(b => b.linkOnly ? { ...b, linkOnly: false } : b) }));
    }));
    if (me) want.set('bl:' + me, () => api.watch(['billing', me], d => this.setState({ bill: d ? { status: d.status || '', interval: d.interval || '', periodEnd: d.periodEnd || 0, renews: !!d.renews } : null })));
    const openChat = s.mode === 'messages' && s.chatOpen && (s.chats || []).some(c => c.id === s.chatOpen) ? s.chatOpen : null;
    if (me && openChat) want.set('msg:' + openChat, () => api.watchMessages(openChat, msgs => this.setState({ msgs })));
    if (me && openChat) this.markSeen(openChat);
    // Books two people can change are kept in sync live.
    if (me) for (const b of s.books) if (b.role === 'collab' || b.collabs?.length || b.invites?.length) want.set('sb:' + b.id, () => api.watchBook(b.id, (d, local) => this.onSharedBook(b.id, d, local)));
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
      this.ro = new ResizeObserver(([e]) => this.setState({ sh: e.contentRect.height, sw: e.contentRect.width, st: (e.target as HTMLElement).getBoundingClientRect().top })); this.ro.observe(el);
    }
  };

  // ---------- navigation ----------
  openOtherBook(b: OtherBook, from?: ViewSource) {
    cancelAnimationFrame(this.raf); this.target = 0;
    // One view per sketchbook per visit for its owner's stats, with where it was opened from.
    const s = this.state, uid = s.acct?.uid;
    // Mature sketchbooks open for people who've chosen to see them (signed in, 18 or over), and their own artists.
    if (b.mature && !s.showMature && !s.admin && b.ownerId !== uid && !(uid && b.collabIds?.includes(uid))) {
      return uid
        ? this.ask({ title: 'Mature sketchbook', text: 'This sketchbook has drawings with nudity. Only open it if you’re 18 or over. You can change this any time in Account settings.', yes: 'I’m 18 or over, show it', run: () => this.setMature(true, () => this.openOtherBook(b, from)) })
        : this.ask({ title: 'Mature sketchbook', text: 'This sketchbook has drawings with nudity. Sign in to choose whether to see Mature work.', yes: 'Sign in', run: () => this.openAuth('signin') });
    }
    if (b.ownerId !== s.acct?.uid && !this.viewed.has(b.id)) {
      this.viewed.add(b.id);
      api.countView(b.id, from || (this.applying ? 'link' : s.mode === 'explore' ? 'explore' : s.mode === 'profile' ? 'profile' : s.mode === 'home' ? 'home' : 'link'));
    }
    this.setState({ mode: 'other', other: b, images: b.images, p: 0, focus: false, fz: 0 });
  }
  viewed = new Set<string>();
  /** A new account's free 14-day trial of Plus: asked for once (the server decides), then welcomed. */
  async startTrial(uid: string) {
    if (!api.isNewAccount() || this.state.plus) return;
    const key = 'sb-trial-' + uid; try { if (localStorage.getItem(key)) return; } catch { /* storage unavailable */ }
    try {
      const r = await api.startTrial(); try { localStorage.setItem(key, '1'); } catch { /* storage unavailable */ }
      if (!r.ok || !r.until) return;
      this.ask({ title: 'Plus is on, free for 14 days', yes: 'Start drawing', notice: true, run: () => {},
        text: `Everything in Fletora Plus until ${fmtLong(r.until)}: unlimited sketchbooks, 300 pages each, PDFs, stats, link-only sketchbooks and more. No card needed. Afterwards you’re back on the free plan, and nothing you’ve made is deleted.` });
    } catch (e) { console.warn('trial', e); }
  }
  setMature(on: boolean, then?: () => void) { store.saveMature(on); api.setShowMature(on); this.setState({ showMature: on }, () => { this.loadCommunity(); then?.(); }); }
  pendingCheckout: string | null = null;
  confirmPlus(session: string | null) {
    if (!session || !session.startsWith('cs_')) return;
    api.confirmCheckout(session).then(r => { this.pendingCheckout = null; if (!r.plus) this.toast('Payment received. Plus switches on in a moment.'); })
      .catch(e => console.warn('confirm checkout', e));
  }
  /** Opens the Fletora Plus sheet, saying why (a key of REASONS, or '' for none). */
  openPlus = (why = '') => this.setState({ plusFor: why, plusErr: '', plusDone: false, more: null });
  loadBilling() { api.billingDetails().then(bd => this.setState({ bd, bdErr: '' })).catch(e => this.setState({ bdErr: api.errMsg(e) })); }
  /** Room left in the open sketchbook for new pages. Someone else's plan decides for a shared one (the rules check it). */
  pageRoom() { const s = this.state, b = s.books[s.active]; return b?.role === 'collab' ? Infinity : (s.plus ? PAGES_PLUS : PAGES_FREE) - s.images.length; }
  pagesFull() { if (this.state.plus) this.toast(`A sketchbook holds up to ${PAGES_PLUS} pages. Start a new one for more.`); else this.openPlus('pages'); }
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
      case 'notfound': case 'action': return here;
      case 'mine': { const b = s.books[s.active]; return s.acct && b && !b.id.startsWith('local') ? '/sketchbooks/' + b.id : '/sketchbooks'; }
      case 'other': { const o = s.other as OtherBook | null; if (s.embed && o) return '/embed/' + o.id; if (o?.arch) return '/archive/' + o.id; return o?.handle ? `/@${o.handle}/${o.id}` : here; }
      case 'profile': {
        if (!s.profileOf) return s.acct ? '/@' + s.acct.handle : '/';
        const h = (s.pf?.uid === s.profileOf.uid && s.pf?.profile?.handle) || s.profileOf.handle;
        return h ? '/@' + h : here;
      }
      case 'auth': return s.suMode === 'signin' ? '/signin' : s.suMode === 'reset' ? '/reset' : '/join';
      case 'settings': return '/settings';
      case 'billing': return '/billing';
      case 'messages': return s.chatOpen ? '/messages/' + s.chatOpen : '/messages';
      default: return '/';
    }
  }
  titleFor(): string {
    const s = this.state, mode = s.mode || 'home', o = s.other as OtherBook | null;
    const t = mode === 'other' && o ? `${o.name} by ${o.artist}` : mode === 'mine' ? s.books[s.active]?.name : mode === 'explore' ? 'Explore'
      : mode === 'profile' ? (s.profileOf ? (s.pf?.profile?.name || s.profileOf.name) : s.acct?.name) : mode === 'settings' ? 'Account settings' : mode === 'billing' ? 'Billing' : mode === 'messages' ? 'Messages' : mode === 'auth' ? (s.suMode === 'join' ? 'Join' : 'Sign in')
      : mode === 'legal' ? (s.legal === 'terms' ? 'Terms' : s.legal === 'contact' ? 'Contact' : s.legal === 'plus' ? 'Fletora Plus' : 'Privacy') : mode === 'admin' ? 'Moderation' : mode === 'notfound' ? 'Not found' : '';
    return t ? `${t} · fletora.` : 'fletora. — A place for the unfinished';
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
      if (a === 'privacy' || a === 'terms' || a === 'contact') return this.openLegal(a);
      if (a === 'auth' && b === 'action') return this.openAction();
      if (a === 'embed' && b) {
        const d = await api.getBook(b);
        if (!d) return this.notFound('sketchbook');
        this.setState({ embed: true }); return this.openOtherBook(toOther(d, 0), 'embed');
      }
      if (a === 'archive' && b) {
        const list = await api.listArchive(), hit = list.find(x => x.e.bookId === b);
        if (!hit) return this.notFound('sketchbook');
        return this.openOtherBook({ ...toOther(hit.d, 0), artist: hit.e.artist, arch: hit.e });
      }
      if (a === 'admin') return s.acct ? this.openAdmin() : this.openAuth('signin');
      if (a === 'signin' || a === 'join' || a === 'reset') { if (s.acct) return this.goMode('mine'); this.openAuth(a === 'join' ? 'join' : 'signin'); if (a === 'reset') this.setState({ suMode: 'reset' }); return; }
      if (a === 'settings') {
        // Signed out on the way back from paying: confirm the checkout once they've signed in.
        if (!s.acct) { this.pendingCheckout = new URLSearchParams(location.search).get('session_id') || this.pendingCheckout; return this.openAuth('signin'); }
        // Back from Stripe's checkout: confirm it with the server straight away (the webhook follows too).
        const q = new URLSearchParams(location.search);
        if (q.get('plus') === 'welcome') { this.toast('Welcome to Fletora Plus'); this.confirmPlus(q.get('session_id')); }
        return this.openSettings();
      }
      if (a === 'billing') return s.acct ? this.openBilling() : this.openAuth('signin');
      if (a === 'plus') return this.openLegal('plus');
      if (a === 'messages') return s.acct ? this.openMessages(b || null) : this.openAuth('signin');
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
  // ---------- messages ----------
  openMessages = (id: string | null = null, chatNew: Person | null = null) => {
    cancelAnimationFrame(this.raf);
    this.setState(s => ({ mode: 'messages', chatOpen: id, chatNew, msgs: s.chatOpen === id ? s.msgs : [], msgDraft: s.chatOpen === id ? s.msgDraft : '', msgErr: '', other: null, focus: false, fz: 0, managing: false, draft: null, notifOpen: false, more: null }));
  };
  /** Message button on a profile: opens your conversation with them, or a new one. */
  messageUser(p: Person) {
    const a = this.state.acct; if (!a) return this.openJoin();
    const id = api.chatIdFor(a.uid, p.uid);
    this.openMessages(id, (this.state.chats || []).some(c => c.id === id) ? null : p);
  }
  seen = new Set<string>();
  /** Marks the open conversation read when something new from the other person is in it. */
  markSeen(id: string) {
    const me = this.state.acct?.uid, c = (this.state.chats || []).find(x => x.id === id);
    if (!me || !c || c.lastFrom === me || c.lastAt <= (c.read[me] || 0) || (c.status !== 'open' && c.by !== me)) return;
    const k = id + ':' + c.lastAt; if (this.seen.has(k)) return; this.seen.add(k);
    api.markChatRead(id, me).catch(e => console.warn('read', e));
  }
  async sendMsg() {
    const s = this.state, a = s.acct, text = (s.msgDraft || '').trim(); if (!a || !text || s.msgBusy) return;
    const c = (s.chats || []).find(x => x.id === s.chatOpen) || null, other = c ? this.chatOther(c) : s.chatNew;
    if (!other) return;
    this.setState({ msgBusy: true, msgErr: '', msgDraft: '' });
    try { await api.sendMessage(a, other, text, c); this.setState({ chatNew: null }); }
    catch (e) { console.error(e); this.setState({ msgDraft: text, msgErr: (e as { code?: string }).code === 'permission-denied' ? 'Couldn’t send. They may not be accepting messages from you, or you’ve started a lot of new conversations today.' : 'Couldn’t send. Check your connection and try again.' }); }
    finally { this.setState({ msgBusy: false }); }
  }
  chatOther(c: Chat): Person { const me = this.state.acct?.uid || '', uid = c.members.find(m => m !== me) || me, i = c.info[uid] || { name: '', handle: '', av: null }; return { uid, ...i }; }
  /** Conversations you can see: not with anyone you've blocked, and declined requests stay out of sight. */
  myChats() { const s = this.state, me = s.acct?.uid || '', bl = s.blocked || []; return (s.chats || []).filter(c => !bl.includes(this.chatOther(c).uid) && !(c.status === 'declined' && c.by !== me)); }
  chatUnread(c: Chat) { const me = this.state.acct?.uid || ''; return c.lastFrom !== me && c.lastAt > (c.read[me] || 0); }

  openBilling = () => { cancelAnimationFrame(this.raf); this.setState({ mode: 'billing', other: null, focus: false, fz: 0, managing: false, draft: null, acErr: '', acInfo: '' }); };
  openSettings = () => { cancelAnimationFrame(this.raf); this.setState({ mode: 'settings', other: null, focus: false, fz: 0, managing: false, draft: null, acErr: '', acInfo: '' }); };
  closeAuth = () => {
    // Coming from an emailed link (e.g. after resetting a password), carry on to the sketchbooks rather than back to the link page.
    if (this.state.authFrom === 'action') { this.setState({ suErr: '', suInfo: '', su: null }); return this.goMode(this.state.acct ? 'mine' : 'home'); }
    this.setState(s => ({ mode: s.authFrom && s.authFrom !== 'auth' ? s.authFrom : 'home', suErr: '', suInfo: '', su: null }));
  };
  openProfile(who: Who | null, force?: boolean) {
    if (!who && !this.state.acct && !force) return this.openJoin();
    if (who?.uid && who.uid === this.state.acct?.uid) who = null;
    cancelAnimationFrame(this.raf); cancelAnimationFrame(this.exRaf); this.target = 0;
    this.setState(s => ({ mode: 'profile', profileOf: who, pf: null, pfPreview: false, other: null, acErr: '', acInfo: '', images: s.books[s.active].images, p: 0, focus: false, fz: 0, managing: false }));
    const uid = who?.uid;
    if (uid) Promise.all([api.getProfile(uid), api.userBooks(uid, true), api.getPlus(uid)]).then(([profile, docs, p]) => {
      if (this.state.profileOf?.uid === uid) this.setState({ pf: { uid, profile, books: docs.filter(b => b.pageCount > 0).map(toOther), plus: p.on, gift: p } });
    }).catch(e => console.error(e));
  }
  whoOf(b: OtherBook): Who { return { name: b.artist, uid: b.ownerId, handle: b.handle }; }
  openNewPick = () => {
    const s = this.state, own = s.books.filter(b => b.role !== 'collab' && !b.id.startsWith('local')).length;
    if (s.acct && s.plus === false && own >= BOOKS_FREE) return this.openPlus('books');
    this.setState({ newPick: true, pickShape: s.pickShape || 'portrait' });
  };

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
    const next = (this.syncQ.get(id) || Promise.resolve()).then(job).catch(e => {
      console.error('sync failed', e);
      // Said out loud: a save that silently fails loses the sketchbook on the next visit.
      const code = String((e as { code?: string })?.code || '');
      const name = this.findBook(id)?.name || 'your sketchbook';
      this.toast(code.startsWith('image/') ? api.errMsg(e) : code === 'permission-denied' ? `Couldn’t save “${name}”: it was refused. Try again, or contact us if it keeps happening.` : `Couldn’t save “${name}”. Check your connection and try again.`);
    })
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
      const books = s.books.map(b => b.id === id ? { ...snap, collabs: b.collabs, invites: b.invites, owner: b.owner } : b), mine = s.books[s.active]?.id === id;
      return { books, images: mine ? snap.images : s.images, mgPage: null, tagDraft: '' };
    });
  }
  // ---------- shared sketchbooks ----------
  editedAt = new Map<string, number>(); busy = new Map<string, number>();
  /** A shared book changed elsewhere: take the other person's pages unless this browser has edits of its own on the way. */
  onSharedBook(id: string, d: BookDoc | null, local: boolean) {
    const me = this.state.acct?.uid, cur = this.findBook(id); if (!me || !cur || local) return;
    if (!d || (cur.role === 'collab' && !d.collabs.some(m => m.uid === me))) {
      // Removed from it, or it was deleted.
      if (cur.role !== 'collab') return;
      this.setState(s => { const books = s.books.filter(b => b.id !== id), k = Math.min(s.active, books.length - 1);
        return books.length ? { books, active: k, images: s.books[s.active]?.id === id ? books[k].images : s.images } : null; });
      return this.toast(`You’re no longer drawing in “${cur.name}”`);
    }
    const share = { collabs: d.collabs, invites: d.invites, owner: { uid: d.ownerId, name: d.ownerName, handle: d.ownerHandle } };
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
      if (c === 'share-full' && !this.state.plus) this.openPlus('people');
    } finally { this.setState({ shBusy: false }); }
  }
  async answerInvite(d: BookDoc, yes: boolean) {
    const a = this.state.acct; if (!a) return;
    this.setState(s => ({ invites: (s.invites || []).filter(x => x.id !== d.id) }));
    try {
      if (!yes) return void await api.declineInvite(d.id, a.uid);
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
      const { done: m, refused, mature, error } = await api.uploadImages(acct.uid, id, pending);
      m.forEach(({ full }, du) => { const bu = this.blobs.get(du); if (bu) this.blobs.set(full, bu); });
      // Pictures the upload check refused come out of the book.
      const swap = (u: string) => m.get(u)?.full || u, thumbs: Record<string, string> = {};
      // A refused half takes its spread with it.
      const cur = this.findBook(id), gone = new Set([...refused.keys()].flatMap(u => [u, partner(u, cur?.spreads) || u]));
      const keep = (u: string) => !gone.has(u);
      m.forEach(({ full, thumb }) => { thumbs[full] = thumb; });
      await new Promise<void>(done => this.setState(s => ({
        books: s.books.map(x => x.id === id ? { ...x, images: x.images.filter(keep).map(swap), coverImg: x.coverImg && keep(x.coverImg) ? swap(x.coverImg) : null, thumbs: { ...x.thumbs, ...thumbs },
          notes: x.notes && Object.fromEntries(Object.entries(x.notes).map(([u, n]) => [swap(u), n])), ...renamePage(x.spreads, x.fillers, swap), ...(mature ? { mature: true, matureLock: true } : {}) } : x),
        images: s.books[s.active]?.id === id ? s.images.filter(keep).map(swap) : s.images,
      }), done));
      if (refused.size) {
        const why = [...refused.values()], n = refused.size;
        this.ask({ title: n === 1 ? 'A page wasn’t added' : `${n} pages weren’t added`, yes: 'OK', notice: true, run: () => {},
          text: why.includes('photo') ? 'Photos with nudity or sexual content can’t be posted on Fletora. Drawings with nudity are welcome, labelled Mature.'
            : why.includes('explicit') ? 'Sexually explicit pictures can’t be posted on Fletora. Nude figure drawings are welcome, labelled Mature.'
            : 'The automatic check couldn’t clear it, so a moderator will look at it. If it was a mistake, they’ll be in touch.' });
      } else if (mature && !this.findBook(id)?.mature) this.toast('Labelled Mature: drawn nudity');
      if (mature) this.persist(this.state.books);
      if (error) throw error;
      b = this.findBook(id); if (!b) return;
      if (bookUrls(b).some(isData)) return; // newer images arrived meanwhile; their own sync follows
    }
    // Link-only needs Plus: once it's known to have ended, the book is saved as private.
    b = { ...b, thumbs: pruneThumbs(b), linkOnly: !!b.linkOnly && this.state.plus !== false };
    await api.writeBook(this.state.acct || acct, b);
    const now = bookUrls(b), before = this.synced.get(id) || [];
    api.removeFiles(before.filter(u => !now.includes(u)));
    this.synced.set(id, now);
  }
  setImages(images: string[], patch: Partial<Book> = {}) {
    // Spreads stay on facing pages whatever moved (see spreads.ts).
    const cur = this.state.books[this.state.active];
    const a = alignSpreads(images, patch.spreads ?? cur?.spreads, patch.fillers ?? cur?.fillers, () => paperUrl('plain', this.aspect()));
    images = a.images; patch = { ...patch, spreads: a.spreads, fillers: a.fillers };
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
      const dur = (520 + 140 * Math.min(3, Math.abs(j - from))) * MOTION, t0 = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - t0) / dur), e = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        if (t < 1) { this.frameState({ car: from + (j - from) * e, swT: t }); this.raf = requestAnimationFrame(tick); }
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
  /** Plus: the open sketchbook as a PDF download (made in the browser, see pdf.ts). */
  async downloadPdf() {
    const s = this.state, b = s.books[s.active]; if (!b || s.pdfBusy) return;
    if (!s.plus) return this.openPlus('pdf');
    if (!b.images.length) return this.toast('Add some pages first');
    this.setState({ pdfBusy: `0/${b.images.length}` });
    try {
      const { makePdf } = await import('./pdf');
      // Blank pages that only keep spreads on facing pages are left out; a spread's halves go on one page.
      const sp = b.spreads || {}, rights = new Set(Object.values(sp)), handle = b.owner?.handle || s.acct?.handle || '';
      const pages = b.images.filter(u => !b.fillers?.[u] && !rights.has(u))
        .map(u => ({ url: this.blobUrl(u), caption: b.notes?.[u]?.c || '', date: b.notes?.[u]?.d || '', ...(sp[u] ? { right: this.blobUrl(sp[u]) } : {}) }));
      const blob = await makePdf({
        title: b.name || 'sketchbook', artist: `by ${b.owner?.name || s.acct?.name || ''}`, color: b.color, cover: b.coverImg ? this.blobUrl(b.coverImg) : null, mediums: b.mediums,
        link: handle && !b.id.startsWith('local') ? `fletora.studio/@${handle}/${b.id}` : 'fletora.studio',
      }, pages, (d, n) => this.setState({ pdfBusy: `${d}/${n}` }), await api.idToken());
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${(b.name || 'sketchbook').replace(/[\\/:*?"<>|]+/g, ' ').trim()}.pdf`;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    } catch (e) { console.error('pdf', e); this.toast(`Couldn’t make the PDF (${(e as Error).message || 'unknown error'}). Try again.`); }
    finally { this.setState({ pdfBusy: '' }); }
  }
  deleteBook(sure = false) {
    const { books, active } = this.state;
    if (!sure) return this.ask({ title: `Delete “${books[active].name}”?`, text: 'The sketchbook and all its pages are deleted for good. This can’t be undone.', yes: 'Delete', danger: true, run: () => this.deleteBook(true) });
    const gone = books[active], j = Math.max(0, active - 1);
    // Deleting the only sketchbook leaves a fresh blank one in its place.
    let nb = books.filter((_, k) => k !== active);
    if (!nb.length) nb = [{ id: this.state.acct ? api.newBookId() : 'local-' + Date.now(), name: 'sketchbook', color: '#b8243a', images: [], createdAt: Date.now() }];
    if (this.state.acct) this.enqueue(gone.id, async () => { await api.deleteBook(gone.id, [...new Set([...bookUrls(gone), ...(this.synced.get(gone.id) || [])])]); this.synced.delete(gone.id); });
    const k = Math.min(j, nb.length - 1); this.target = 0; this.setState({ books: nb, active: k, images: nb[k].images, p: 0, managing: false }); this.persist(nb);
  }
  movePage(from: number, to: number) {
    const im = [...this.state.images]; if (to < 0 || to >= im.length || from === to) return;
    const sp = this.state.books[this.state.active]?.spreads || {}, other = partner(im[from], sp);
    if (other) {
      // A spread moves as one: both halves together, past the next page in that direction.
      const l = sp[im[from]] ? im[from] : other, r = sp[l], li = im.indexOf(l), step = Math.abs(to - from) === 1 ? Math.sign(to - from) : 0;
      const rest = im.filter(u => u !== l && u !== r), at = Math.max(0, Math.min(rest.length, step ? li + step : to));
      rest.splice(at, 0, l, r); return this.setImages(rest);
    }
    const [x] = im.splice(from, 1); im.splice(to, 0, x); this.setImages(im);
  }
  addFiles(files: FileList | File[]) {
    if (this.state.other || (this.state.mode || 'home') !== 'mine') return;
    const list = [...files].filter(f => f.type.startsWith('image/')).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const room = this.pageRoom();
    if (list.length && room <= 0) return this.pagesFull();
    if (list.length > room) this.toast(`Only the first ${room} fit in this sketchbook`);
    Promise.all(list.slice(0, room).map(f => new Promise<string>(r => { const fr = new FileReader(); fr.onload = () => r(fr.result as string); fr.readAsDataURL(f); })))
      .then(urls => { if (urls.length) this.startEdit(urls, null); });
  }
  /** A new blank page (plain, lined, grid or dotted), opened straight in Write mode. */
  addBlank(paper: Paper) {
    if (this.state.other || (this.state.mode || 'home') !== 'mine') return;
    if (this.pageRoom() <= 0) return this.pagesFull();
    this.startEdit([paperUrl(paper, this.aspect())], null, undefined, 'pick'); this.setEd({ paper });
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
  /** The editor frame's shape: square for a profile photo, otherwise the sketchbook's page. */
  edAspect() { const e = this.state.edit; return e?.target === 'avatar' ? 1 : e?.spread ? this.aspect() * 2 : this.aspect(); }

  // ---------- page turning ----------
  nPages() { const o = this.state.other as OtherBook | null | undefined; if (o) return o.pages; const n = this.state.images.length; return Math.max(CONFIG.minPages, n + (n % 2)); }
  nLeaves() { return this.nPages() / 2 + 2; }
  maxP() { return this.nLeaves(); }
  /** Background + page number for one side of a leaf. Leaf 0 is the front cover, the last leaf the back cover. */
  face(leaf: number, side: 0 | 1, w = 0, small = false): { bg: string; num: string; idx: number; wear: Wear | null; inside?: boolean; note?: string } {
    const N = this.nLeaves(), book = this.curBook(), cover = book?.color ?? '#b8243a', inner = '#e9e2d3';
    if (leaf === 0) return side ? { bg: inner, num: '', idx: -1, wear: null, inside: true } : { bg: this.coverBg(book, true), num: '', idx: -1, wear: null };
    if (leaf === N - 1) return side ? { bg: cover, num: '', idx: -1, wear: null } : { bg: inner, num: '', idx: -1, wear: null, inside: true };
    const pi = 2 * (leaf - 1) + side, img = this.state.images[pi], wear = this.wear(`${book?.id}:${pi}`, side ? 'l' : 'r', w), paper = wear.paper;
    return { bg: img ? `url("${this.blobUrl(small ? this.thumbOf(book, img) : img)}") center/cover no-repeat ${paper}` : paper, num: String(pi + 1), idx: img ? pi : -1, wear, note: img ? noteText(book?.notes?.[img]) : '' };
  }
  /** Decodes the photos a few pages either side of the visible ones, so a page that comes into view is ready to draw. */
  decoded = new Map<string, HTMLImageElement>();
  prefetchPages(lo: number, hi: number) {
    const imgs = this.state.images, from = Math.max(0, 2 * (lo - 1 - 2)), to = Math.min(imgs.length, 2 * (hi + 2));
    for (let k = from; k < to; k++) {
      const u = imgs[k] && this.blobUrl(imgs[k]); if (!u || this.decoded.has(u)) continue;
      if (this.decoded.size > 60) this.decoded.delete(this.decoded.keys().next().value!);
      const im = new Image(); im.decoding = 'async'; im.src = u; im.decode?.().catch(() => {}); this.decoded.set(u, im);
    }
  }
  wearCache = new Map<string, Wear>();
  /** Per-page wear, cached because the book re-renders every animation frame. */
  wear(seed: string, outer: 'l' | 'r', w: number) {
    // Width in 24px steps: on phones the book's size changes every frame while it opens, and an exact key
    // rebuilt every page's wear (and restyled it) on each of those frames.
    w = Math.round(w / 24) * 24; const k = `${seed}|${w}`; let v = this.wearCache.get(k);
    if (!v) { if (this.wearCache.size > 2000) this.wearCache.clear(); v = pageWear(seed, outer, w); this.wearCache.set(k, v); }
    return v;
  }
  /** Sets where the book is turning to, with a page sound for each turn made by the reader. */
  turnTo(t: number, from = Math.round(this.target)) {
    const n = Math.abs(Math.round(t) - from); if (n) sound.pageTurn(n);
    if (n && IS_TOUCH && !this.state.hintDone) { store.saveHints(store.loadHints() + 1); this.setState({ hintDone: true }); }
    this.target = t;
  }
  /** Where the book last came to rest, while it's moving (see bookVals). */
  rest = 0; tweenAt = 0;
  /** Being dragged, or animating (a tween that's been cancelled stops counting after a moment). */
  get moving() { return !!this.drag || performance.now() - this.tweenAt < 120; }
  startMoving() { if (!this.moving) this.rest = Math.round(this.state.p); }
  /**
   * Moves the page position to the target over a fixed time (longer for several pages at once), easing out so it
   * lands softly; each leaf eases in and out on top of that (see bookVals). Time-based, so a turn takes the same time
   * on a slow phone (fewer frames) as on a fast screen.
   */
  animate(onDone?: () => void) {
    cancelAnimationFrame(this.raf); this.startMoving(); this.tweenAt = performance.now();
    const from = this.state.p, dist = Math.abs(this.target - from);
    const dur = Math.max(200, Math.min(900, 430 * Math.sqrt(dist))) * MOTION; let t0 = 0;
    const step = (now: number) => {
      t0 = t0 || now; const to = this.target, k = Math.min(1, (now - t0) / dur), e = 1 - (1 - k) * (1 - k);
      if (k >= 1 || dist < 0.002) { this.tweenAt = 0; this.setState({ p: to }); onDone?.(); return; }
      this.tweenAt = now; this.frameState({ p: from + (to - from) * e }); this.raf = requestAnimationFrame(step);
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
  /** Whether the opening at p (left page: image 2p−3, right page: 2p−2) shows one picture across both pages. */
  isSpreadAt(p: number) { const im = this.state.images, l = im[2 * p - 3], r = im[2 * p - 2]; return p >= 2 && !!l && !!r && (this.curBook() as Book)?.spreads?.[l] === r; }
  /** Which page of the spread at p to centre in focus view: both (the fold) for a picture across two pages; otherwise
   *  the left one when it has a drawing (or, arriving backwards, the right one when it does). */
  autoSide(p: number, from: 'L' | 'R' = 'L'): 'L' | 'R' | 'S' {
    if (this.isSpreadAt(p)) return 'S';
    if (p >= this.nLeaves() - 1) return 'L';
    const { l, r } = this.spreadImages(p);
    return from === 'L' ? (l ? 'L' : 'R') : (r || !l ? 'R' : 'L');
  }
  /** Focus view steps page by page: across the spread when the other page has a drawing, otherwise to the next spread. */
  focusGo(dir: number) {
    const p = Math.round(this.target), N = this.nLeaves(), side = this.state.fside || 'R', { l, r } = this.spreadImages(p);
    // A picture across both pages is seen whole, so the next step goes to the next opening.
    if (dir > 0 && side === 'L' && r && !this.isSpreadAt(p)) return this.focusOn(p, 'R');
    if (dir < 0 && side === 'R' && l && !this.isSpreadAt(p)) return this.focusOn(p, 'L');
    const np = Math.max(1, Math.min(N - 1, p + dir)); if (np === p) return;
    this.focusOn(np, this.autoSide(np, dir > 0 ? 'L' : 'R'));
  }
  /** Book size: normal view (Hn) blended toward the focus view (Hf) by fz. */
  dims(b?: AnyBook, flat?: boolean, at?: { fz: number; open: number }) {
    const s = this.state, shp = this.shapeOf(b === undefined ? this.curBook() : b), sh = s.sh || s.vh * 0.5, sw = s.sw || s.vw, aspect = shp.a, fz = flat ? 0 : at ? at.fz : s.fz || 0;
    // Phones: a closed book is shown large, and shrinks as it opens so the whole spread fits the screen width.
    const phone = sw < 640, open = phone && !flat && (b === undefined || b === this.curBook()) ? at ? at.open : clamp01(Math.min(s.p, this.nLeaves() - s.p)) : 0;
    const across = phone ? PHONE_CLOSED + (PHONE_OPEN - PHONE_CLOSED) * open : 0.29;
    const Hn = Math.max(phone ? 60 : 120, Math.min(sh * (phone ? 0.78 : 0.7) * shp.s, sw * across / aspect, 560 * shp.s) || 360) * s.zoom;
    // Focus: one page fills the screen, or both pages for a picture across two.
    const Hf = Math.max(200, Math.min(s.vh * 0.8, s.vw * 0.86 / (aspect * (s.fside === 'S' && (b === undefined || b === this.curBook()) ? 2 : 1))));
    const H = Hn + (Hf - Hn) * fz; return { H: Math.round(H), W: Math.round(H * aspect) };
  }
  /** The size the open book's pages are laid out at. While it zooms, or opens on a phone, the size on screen changes
   *  every frame: the pages then keep the larger of the two end sizes and the whole book is scaled down to fit, since
   *  re-laying-out and redrawing every page at a new size each frame was much of the cost of those animations. */
  layoutDims() {
    const s = this.state, d = this.dims(), fz = s.fz || 0, N = this.nLeaves(), open = clamp01(Math.min(s.p, N - s.p));
    const zooming = fz > 0.001 && fz < 0.999, opening = (s.sw || s.vw) < 640 && open > 0.001 && open < 0.999;
    if (!zooming && !opening) return d;
    let big = d;
    for (const z of zooming ? [0, 1] : [fz]) for (const o of opening ? [0, 1] : [open]) { const e = this.dims(undefined, false, { fz: z, open: o }); if (e.H > big.H) big = e; }
    return big;
  }

  // ---------- focus (zoomed single page) ----------
  focusOn(p: number, side: 'L' | 'R' | 'S') {
    if (this.state.switching) return;
    if (this.isSpreadAt(p)) side = 'S';
    this.setState({ fside: side }); cancelAnimationFrame(this.sraf);
    // 1 centres the left page, 0 the right one, ½ the fold between them.
    const from = this.state.fsx || 0, to = side === 'L' ? 1 : side === 'S' ? 0.5 : 0; let t0 = 0;
    const tick = (now: number) => { t0 = t0 || now; const t = Math.min(1, (now - t0) / FOCUS_SHIFT_MS), e = 1 - Math.pow(1 - t, 3); this.frameState({ fsx: from + (to - from) * e }); if (t < 1) this.sraf = requestAnimationFrame(tick); };
    if (this.state.focus) this.sraf = requestAnimationFrame(tick); else this.setState({ fsx: to });
    if (Math.abs(this.state.p - p) > 0.01) { this.turnTo(p); this.animate(); }
    this.setFocus(true);
  }
  setFocus(on: boolean) {
    if (on === !!this.state.focus) return;
    this.setState({ focus: on, ctrlShow: true, menuOpen: false });
    clearTimeout(this.wakeT); if (on) this.wakeT = setTimeout(() => this.state.focus && this.setState({ ctrlShow: false }), 1800);
    cancelAnimationFrame(this.fraf);
    // The clock starts on the first drawn frame, so a slow first render can't make the book skip ahead.
    // Zooming out eases in and out (a fast start read as a jump); zooming in keeps its quick start.
    const from = this.state.fz || 0, to = on ? 1 : 0, dur = on ? FOCUS_MS : FOCUS_OUT_MS; let t0 = 0;
    const tick = (now: number) => {
      t0 = t0 || now; const t = Math.min(1, (now - t0) / dur);
      const e = on ? 1 - Math.pow(1 - t, 3) : t < .5 ? 4 * t * t * t : 1 - Math.pow(2 - 2 * t, 3) / 2;
      this.frameState({ fz: from + (to - from) * e }); if (t < 1) this.fraf = requestAnimationFrame(tick);
    };
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
  // The backdrop only slides: a layer that turns or changes size has to be redrawn every frame, and this one covers
  // the screen (it was most of the cost of zooming in on phones).
  bgRefA = (el: HTMLDivElement | null) => this.drift(el, [{ transform: 'translate(-6%,-4%) scale(1.2)' }, { transform: 'translate(5%,4%) scale(1.2)' }], 16000);

  // ---------- fit-your-page editor ----------
  startEdit(queue: string[], replaceIdx: number | null, target?: 'cover' | 'avatar', mode: EdMode = 'fit') {
    this.editSeq++;
    this.setState({ edit: { queue, i: 0, replaceIdx, target, scale: 1, rot: 0, skx: 0, sky: 0, tx: 0, ty: 0, nw: 0, nh: 0, adj: NO_ADJUST, mode, ink: [], texts: [], sel: null, marks: [], pen: this.lastPen, pad: true } });
    this.loadEditImg(queue[0]);
  }
  loadEditImg(src: string) {
    const im = new Image();
    // Stored pages are re-drawn to a canvas, so they must load with CORS (see cors.json).
    if (!isData(src)) im.crossOrigin = 'anonymous';
    im.onload = () => {
      this.editImg = im; const e = this.state.edit, nw = im.naturalWidth, nh = im.naturalHeight;
      // A new photo of a page is straightened and cropped to the frame straight away (Reset puts it back as taken).
      const autoP = e && isData(src) && !e.target && !e.paper && e.replaceIdx == null ? findPage(im, nw, nh) : null;
      this.setState(s => s.edit ? { edit: { ...s.edit, nw, nh, autoP } } : null, () => this.applyAuto());
    };
    im.src = this.blobUrl(src);
  }
  /** Fits the found page to the frame (again after the frame changes shape). */
  applyAuto() {
    const e = this.state.edit; if (!e?.autoP || !e.nw) return;
    const { fw, fh } = this.frame(), { bw, bh } = this.baseSize(), auto = fitPage(e.autoP, e.nw, e.nh, bw, bh, fw, fh);
    this.setEd(auto ? { ...auto, auto } : { auto: null });
  }
  frame() {
    const { vw, vh } = this.state, a = this.edAspect();
    // Phones: the frame fills the width, capped so the controls below still fit.
    if (vw < 640) { let fw = vw - 32, fh = fw / a; const e = this.state.edit, maxH = vh * (e?.mode === 'write' && e.pad ? 0.34 : e?.mode === 'draw' ? 0.42 : 0.5); if (fh > maxH) { fh = maxH; fw = fh * a; } return { fw: Math.round(fw), fh: Math.round(fh) }; }
    const ed = this.state.edit, fh = Math.round(Math.max(200, Math.min(vh * (ed?.mode === 'write' && ed.pad ? 0.5 : 0.58), 520)));
    // A two-page frame is capped to the room beside the controls.
    const maxW = Math.max(320, vw - 380); return fh * a > maxW ? { fw: Math.round(maxW), fh: Math.round(maxW / a) } : { fh, fw: Math.round(fh * a) };
  }
  baseSize() { const e = this.state.edit!, { fw, fh } = this.frame(); if (!e.nw) return { bw: fw, bh: fh }; const s = (e.target === 'avatar' ? Math.max : Math.min)(fw / e.nw, fh / e.nh); return { bw: e.nw * s, bh: e.nh * s }; }
  /** Re-baselines the drag / pinch gesture whenever a finger is added or lifted. */
  edGestureStart() {
    const e = this.state.edit, pts = [...this.edPts.values()]; this.edDrag = null; this.edPinch = null;
    if (!e || !pts.length) return;
    if (pts.length === 1) this.edDrag = { x: pts[0].x, y: pts[0].y, tx: e.tx, ty: e.ty };
    else { const [a, b] = pts; this.edPinch = { dist: Math.hypot(b.x - a.x, b.y - a.y) || 1, ang: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, scale: e.scale, rot: e.rot, tx: e.tx, ty: e.ty }; }
  }
  setEd(patch: Partial<EditState>) { this.setState(s => ({ edit: { ...s.edit!, ...patch } })); }
  /** Renders the framed image exactly as shown into a page 1600px tall, or with Plus up to 3200px when the photo
   *  has that much detail in the frame (a phone photo usually does; a small image isn't blown up). */
  /** The photo as fitted and adjusted, onto a page of W × H (the saved page, and what the paint brushes pick up). */
  drawPhoto(ctx: CanvasRenderingContext2D, W: number, H: number) {
    const e = this.state.edit, im = this.editImg; if (!e) return;
    const { fh } = this.frame(), { bw, bh } = this.baseSize(), k = H / fh, r = Math.PI / 180;
    ctx.save(); ctx.fillStyle = '#f3efe6'; ctx.fillRect(0, 0, W, H);
    if (im) {
      ctx.translate(W / 2 + e.tx * k, H / 2 + e.ty * k); ctx.rotate(e.rot * r); ctx.scale(e.scale, e.scale);
      ctx.transform(1, Math.tan(e.sky * r), Math.tan(e.skx * r), 1, 0, 0);
      ctx.drawImage(im, -bw * k / 2, -bh * k / 2, bw * k, bh * k);
    }
    ctx.restore(); applyToCanvas(ctx.canvas, e.adj);
  }
  // ---------- painting ----------
  /** The paint layer for the picture being edited: one per picture, and made again if the frame changes shape. */
  painter: Painter | null = null; painterKey = ''; editSeq = 0; recentColors: string[] = [];
  painterKeyNow() { const e = this.state.edit; return e ? `${this.editSeq}:${e.i}:${this.edAspect().toFixed(4)}` : ''; }
  livePainter() { return this.painter && this.painterKey === this.painterKeyNow() ? this.painter : null; }
  getPainter() {
    const key = this.painterKeyNow();
    if (!this.painter || this.painterKey !== key) { this.painter = new Painter(this.edAspect()); this.painterKey = key; }
    const e = this.state.edit!, p = this.painter;
    p.setBase((ctx, W, H) => this.drawPhoto(ctx, W, H), JSON.stringify([e.queue[e.i].length, e.tx, e.ty, e.rot, e.scale, e.skx, e.sky, e.adj, e.nw, !!this.editImg]));
    return p;
  }
  async applyEdit() {
    const e = this.state.edit, im = this.editImg; if (!e || !im || e.inkBusy) return;
    const { fh } = this.frame(), { bw, bh } = this.baseSize(), avatar = e.target === 'avatar';
    const detail = e.nh && bh ? Math.round(fh * e.nh / (bh * e.scale)) : PAGE_H;
    const outH = avatar ? 512 : !e.target && this.state.plus ? Math.max(PAGE_H, Math.min(PAGE_H_PLUS, detail)) : PAGE_H;
    const outW = Math.round(outH * this.edAspect());
    const c = document.createElement('canvas'); c.width = outW; c.height = outH; const ctx = c.getContext('2d')!;
    this.drawPhoto(ctx, outW, outH);
    drawMarks(ctx, e.marks, outW, outH);
    this.livePainter()?.drawOnto(ctx, outW, outH);
    await drawTexts(ctx, e.texts.filter(t => t.text.trim()), outW, outH);
    const images = [...this.state.images];
    if (e.spread && e.replaceIdx == null && !e.target) {
      // Two pages: one picture cut down the middle, the halves kept together on facing pages.
      // Two pages, and a blank one first when the next page would be a right-hand page.
      if (this.pageRoom() < 2 + (isLeftPage(images.length) ? 0 : 1)) { this.setState({ edit: null }); return this.pagesFull(); }
      const [l, r] = splitSpread(c), cur = this.state.books[this.state.active];
      this.setImages([...images, l, r], { spreads: { ...cur.spreads, [l]: r } }); this.nextEdit(); return;
    }
    const url = c.toDataURL('image/jpeg', 0.9);
    if (e.target === 'cover') { this.updateBook({ coverImg: url }); this.setState({ edit: null }); return; }
    if (avatar) { this.setState(st => ({ edit: null, draft: st.draft ? { ...st.draft, av: url } : st.draft })); return; }
    let patch: Partial<Book> = {};
    if (e.replaceIdx != null) {
      // A re-fitted page keeps its caption and date.
      const old = images[e.replaceIdx], cur = this.state.books[this.state.active], notes = cur.notes;
      if (notes?.[old]) patch = { notes: { ...notes, [url]: notes[old] } };
      patch = { ...patch, ...renamePage(cur.spreads, cur.fillers, u => u === old ? url : u) };
      images[e.replaceIdx] = url;
    } else if (this.pageRoom() <= 0) { this.setState({ edit: null }); return this.pagesFull(); }
    else images.push(url);
    this.setImages(images, patch); this.nextEdit();
  }
  nextEdit() {
    const e = this.state.edit; if (!e) return; const i = e.i + 1;
    if (i >= e.queue.length || e.replaceIdx != null) { this.setState({ edit: null }); cancelAnimationFrame(this.raf); this.target = Math.round(this.target); this.setState({ p: this.target }); return; }
    // The next image keeps the same adjustments: a batch of scans usually needs the same fix.
    this.setState({ edit: { ...e, i, scale: 1, rot: 0, skx: 0, sky: 0, tx: 0, ty: 0, nw: 0, nh: 0, ink: [], texts: [], sel: null, inkErr: '', marks: [], box: undefined, spread: false, autoP: null, auto: null } }); this.loadEditImg(e.queue[i]);
  }

  /** Write mode: send the handwriting to be read, and place the words where it was written. */
  async convertInk() {
    const e = this.state.edit; if (!e || !e.ink.length || e.inkBusy) return;
    const { fw, fh } = this.frame(), ink = e.ink;
    this.setEd({ inkBusy: true, inkErr: '' });
    try {
      const text = await readInk(inkPng(ink, fw, fh), await api.idToken()), t = textFromInk(ink, text);
      // On untouched lined paper, size the text to the ruling and sit it on the nearest line.
      if (e.paper === 'lined' && e.scale === 1 && !e.tx && !e.ty && !e.rot) {
        const { step, top } = RULED, n = Math.max(0, Math.round((t.y + step * 0.8 - top) / step));
        Object.assign(t, { size: step / LINE_H, y: top + n * step - step * 0.8 });
      }
      // Wide enough for the words as written (wrapping only at the page edge), then the pad carries on just after them.
      const natural = textWidth(text, t.size * fh) / fw + 0.01;
      t.w = Math.min(0.97 - t.x, Math.max(natural, 0.05));
      const lines = wrapLines(text, t.w * fw, t.size * fh), lastW = textWidth(lines[lines.length - 1], t.size * fh) / fw;
      const lineStep = t.size * LINE_H, endX = t.x + lastW + 0.03, endY = t.y + (lines.length - 1) * lineStep;
      const b = this.padBox(e, { fw, fh }), rowY = endY + lineStep * 0.8 - b.h * 0.75;
      const box = e.pad ? (endX + b.w * 0.5 > 0.97 ? { x: 0.06, y: rowY + (e.paper === 'lined' ? RULED.step : b.h * 0.8) } : { x: endX, y: rowY }) : e.box;
      this.setState(s => s.edit ? { edit: { ...s.edit, inkBusy: false, ink: s.edit.ink.slice(ink.length), texts: [...s.edit.texts, t], sel: e.pad ? null : t.id, box } } : null);
    } catch (err) {
      this.setEd({ inkBusy: false, inkErr: (err as Error).message });
      if ((err as { code?: string }).code === 'ink-limit') this.openPlus('ink');
    }
  }
  setText(id: string, patch: Partial<PageText>) { this.setState(s => s.edit ? { edit: { ...s.edit, texts: s.edit.texts.map(t => t.id === id ? { ...t, ...patch } : t) } } : null); }

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
    // Books from people you follow come first, then the community; your own public books only fill spots left over.
    const seen = new Set(feed.map(b => b.id)), me = this.state.acct?.uid, rest = [...this.community()].filter(b => !seen.has(b.id)).sort((a, b) => b.likes - a.likes);
    const pick = this.state.pick && !(this.state.blocked || []).includes(this.state.pick.ownerId || '') ? this.state.pick : null;
    const list = [...(pick ? [pick] : []), ...[...feed, ...rest.filter(b => b.ownerId !== me), ...rest.filter(b => !!me && b.ownerId === me)].filter(b => b.id !== pick?.id)];
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
        return { key: b.id, isPick: b.id === pick?.id, name: b.name, color: b.color, bg: this.coverBg(b), showLabel: !b.coverImg, title: b.name + ' — ' + b.artist, h: hh, w: Math.round(hh * shapes[i].a), fs: Math.max(11, Math.round(hh / 17)), rot: [0, -2, 0, 1.5, 0, -1, 1, 0, -1.5, 1][i] || 0, open: () => this.openOtherBook(b) };
      }),
      hmPick: pick ? { name: pick.name, artist: pick.artist, open: () => this.openOtherBook(pick) } : null,
      hmPrompt: currentPrompt().word, hmPromptOpen: () => this.openLabel('t:' + currentPrompt().tag),
      startOwn: () => { if (!this.state.acct) return this.openProfile(null); this.goMode('mine'); this.openNewPick(); },
    };
  }

  profileVals(): V {
    const s = this.state, vw = s.vw, mob = vw < 640, mine = !s.profileOf, pv = mine && !!s.pfPreview, a = (s.acct || {}) as Partial<Account>, follows = s.follows || [];
    // Plus: the pinned sketchbook comes first on the profile.
    const pin = mine ? (s.plus ? a.pin : '') : s.pf?.uid === s.profileOf?.uid && s.pf?.plus ? s.pf?.profile?.pin : '';
    const card = (b: AnyBook, bg: string, showLabel: boolean, pages: number, open: () => void) => ({
      key: b.id, name: b.name, color: b.color, bg, showLabel, a: this.shapeOf(b).a, s: this.shapeOf(b).s,
      count: `${pin && b.id === pin ? 'Pinned · ' : ''}${pages} ${pages === 1 ? 'page' : 'pages'} · ${(b as Book).role === 'collab' ? 'With ' + (b as Book).owner?.name : (b as Book).collabs?.length ? 'With ' + names((b as Book).collabs) : this.shapeOf(b).label || 'Portrait'}${(b as Book).linkOnly ? ' · Link only' : (b as Book).isPublic === false ? ' · Private' : ''}`, open,
    });
    const pinFirst = <T extends { key: string }>(l: T[]) => pin ? [...l.filter(x => x.key === pin), ...l.filter(x => x.key !== pin)] : l;
    let p: { name?: string; handle?: string; bio?: string; loc?: string; web?: string; ig?: string; mail?: string; socials?: Record<string, string>; accent?: string; av?: string | null; joined: string; stats: [number, string][] };
    let list: ReturnType<typeof card>[], folOn = false;
    if (mine) {
      const tab = pv ? 'books' : s.pfTab || 'books';
      list = tab === 'saved'
        ? (s.saved || []).filter(x => !(s.blocked || []).includes(x.ownerId) && (!s.pfCol || (x.col || '') === s.pfCol)).map(x => ({ ...card({ id: x.id, name: x.name, color: x.color, shape: x.shape, coverImg: x.cover, images: [] } as Book, x.cover ? `url("${x.cover}") center/cover no-repeat ${x.color}` : x.color, !x.cover, 0, () => this.openBookById(x.id)), count: `by ${x.ownerName}`, col: x.col || '', moveTo: (col: string) => this.moveSaved(x.id, col) }))
        : tab === 'following' ? []
        : pinFirst(s.books.map((b, j) => card(b, this.coverBg(b), !b.coverImg, b.images.length, () => { cancelAnimationFrame(this.raf); this.target = 0; this.setState({ mode: 'mine', profileOf: null, active: j, images: b.images, p: 0, other: null }); })));
      p = {
        name: a.name, handle: a.handle, bio: a.bio, loc: a.loc, web: a.web, ig: a.ig, mail: a.mail, socials: a.socials, accent: a.accent, av: a.av,
        joined: 'Joined ' + new Date(a.joined || Date.now()).toLocaleDateString('en', { month: 'short', year: 'numeric' }),
        stats: [[s.books.length, s.books.length === 1 ? 'sketchbook' : 'sketchbooks'], [s.books.reduce((t, b) => t + b.images.length, 0), 'pages']],
      };
    } else {
      const who = s.profileOf!, pf = s.pf?.uid === who.uid ? s.pf : null, pr = pf?.profile, bks = (s.blocked || []).includes(who.uid || '') ? [] : pf?.books || [];
      folOn = !!who.uid && follows.includes(who.uid);
      list = pinFirst(bks.map(b => card(b, this.coverBg(b), !b.coverImg, b.likes, () => this.openOtherBook(b))));
      p = { name: pr?.name || who.name, handle: pr?.handle, bio: pr?.bio, loc: pr?.loc, web: pr?.web, ig: pr?.ig, mail: pr?.mail, socials: pr?.socials, accent: pr?.accent, av: pr?.av,
        joined: pr ? 'Joined ' + new Date(pr.joined).toLocaleDateString('en', { month: 'short', year: 'numeric' }) : '',
        stats: [[bks.length, bks.length === 1 ? 'sketchbook' : 'sketchbooks'], [bks.reduce((t, b) => t + b.likes, 0), 'pages']] };
    }
    const pad = mob ? 16 : 40, web = (p.web || '').trim();
    return {
      pfName: p.name, pfVerified: this.isTeam(s.profileOf ? s.profileOf.uid : s.acct?.uid), pfPlus: mine ? !!s.plus : s.pf?.uid === s.profileOf?.uid && !!s.pf?.plus, pfHandle: '@' + (p.handle || ''), pfHasBio: !!p.bio || (mine && !pv), pfBio: p.bio || 'Add a short bio so people know what you draw.', pfBioOp: p.bio ? 1 : 0.55,
      pfHasLoc: !!(p.loc || '').trim(), pfLoc: p.loc, pfHasWeb: !!web, pfWeb: web.replace(/^https?:\/\//, ''), pfSocials: socialLinks({ ...(p.ig ? { instagram: p.ig } : {}), ...(p.socials || {}) }), pfMail: /^\S+@\S+\.\S+$/.test((p.mail || '').trim()) ? (p.mail || '').trim() : '', pfWebHref: /^https?:\/\//.test(web) ? web : 'https://' + web, pfJoined: p.joined,
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
          pfTab: tab, pfEmptyNote: tab === 'saved' ? (s.pfCol ? `Nothing in “${s.pfCol}” yet. Use the menu under a saved sketchbook to move it here.` : 'Save sketchbooks you love with Save. Only you can see this list.') : '',
          // Collections: shelves for saved sketchbooks (private, like Saved).
          pfColl: tab === 'saved' ? this.collections() : null, pfColOn: s.pfCol || '',
          pfPickCol: (c: string) => this.setState({ pfCol: c }),
          pfNewCol: () => this.setState({ colNew: { name: '' } }),
          colMenu: s.colMenu || null, toggleColMenu: (id: string) => this.setState(st => ({ colMenu: st.colMenu === id ? null : id })),
          pfPeople: tab === 'following' ? (s.followPeople || []).map(x => ({ key: x.uid, verified: this.isTeam(x.uid), name: x.name, handle: '@' + x.handle, avBg: avatarBg(x.av), init: x.av ? '' : ini(x.name), open: () => this.openProfile({ uid: x.uid, name: x.name, handle: x.handle }) })) : null,
          pfBlocked: blockedOn, pfUnblock: () => this.toggleBlock(uid, name),
          pfSuspended: !mine && !!uid && (s.banned || []).includes(uid),
          pfAdmin: mine && !pv && !!s.admin, openAdmin: () => this.openAdmin(),
          pfShare: () => handle && this.share('/@' + handle, `${name} on fletora.`),
          pfMessage: () => uid && this.messageUser({ uid, name: name || '', handle: handle || '', av: p.av || null }), pfCanMessage: !mine && !!uid && !blockedOn,
          pfMoreOpen: s.more === 'profile', pfMore: () => this.setState(st => ({ more: st.more === 'profile' ? null : 'profile' })),
          pfReport: () => this.openReport({ kind: 'user', targetId: uid, ownerId: uid, label: name }),
          // Moderators can give Plus from someone's profile.
          pfCanGift: !mine && !!s.admin && !!uid, pfGiftLbl: s.pf?.plus ? 'Plus: change or remove…' : 'Give Plus…',
          pfGift: () => this.setState({ more: null, giftFor: { uid, name, gift: s.pf?.uid === uid ? s.pf.gift || null : null } }),
          pfBlock: () => this.toggleBlock(uid, name), pfBlockLbl: blockedOn ? `Unblock ${name}` : `Block ${name}`,
        };
      })(),
      pfDir: mob ? 'column' : 'row', pfAlign: mob ? 'center' : 'flex-start', pfTA: mob ? 'center' : 'left', pfJust: mob ? 'center' : 'flex-start', pfHeadGap: mob ? 16 : 28,
      pfWide: vw >= 980, pfBanH: mob ? 96 : 128, pfInfoTop: mob ? 0 : 2, pfPadX: pad, pfNameSize: mob ? 48 : 72,
      pfCols: Math.max(2, Math.min(5, Math.floor((Math.min(vw, 1080) - pad * 2 + 18) / (mob ? 150 : 200)))),
      editProfile: () => this.setState({ draft: { name: a.name || '', handle: a.handle || '', bio: a.bio || '', loc: a.loc || '', web: a.web || '', ig: '', mail: a.mail || '', socials: { ...(a.socials || {}) }, accent: a.accent || '#C9C3B4', av: a.av || null } }),
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
    const setD = (k: 'name' | 'handle' | 'bio' | 'loc' | 'web' | 'ig' | 'mail') => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const v = k === 'handle' ? slug(e.target.value) : e.target.value; this.setState(st => ({ draft: { ...st.draft!, [k]: v } }));
    };
    return {
      hasAcct: !!a, noAcct: !a, meAvBg: avatarBg(a?.av), meInit: a?.av ? '' : ini(a?.name),
      meRing: s.mode === 'profile' && !s.profileOf ? `0 0 0 2px ${PAPER}, 0 0 0 4px ${MARK}` : 'none', openMe: () => this.openProfile(null),
      suName: su.name || '', suHandle: su.handle || '', suEmail: su.email || '', suPw: su.pw || '', suOp: suOk ? 1 : 0.4,
      onSuName: setSu('name'), onSuHandle: setSu('handle'), onSuEmail: setSu('email'), onSuPw: setSu('pw'),
      isAuth: s.mode === 'auth', suMode, suJoin: join, suReset: reset, suOk,
      suKicker: join ? 'Join fletora' : reset ? 'Reset password' : 'Sign in',
      suSub: join ? 'Get a profile page where others can browse your sketchbooks, unfinished pages and all.'
        : reset ? 'Enter the email you joined with and we’ll send you a link to choose a new password.' : 'Pick up where you left off.',
      suBtn: join ? 'Create account' : reset ? 'Send reset link' : 'Sign in',
      suSwitchQ: join ? 'Already a member?' : 'New to fletora?', suSwitchLbl: join ? 'Sign in' : 'Create an account',
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
      suGoogle: async () => {
        if (s.suBusy) return;
        this.setState({ suBusy: true, suErr: '', suInfo: '' });
        try { await api.signInGoogle(); this.closeAuth(); }
        catch (e) { const code = (e as { code?: string }).code; if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') this.setState({ suErr: api.errMsg(e) }); }
        finally { this.setState({ suBusy: false }); }
      },
      // Moderators: give Plus.
      gfOpen: !!s.giftFor && !!s.admin, gfName: s.giftFor?.name || '', gfBusy: !!s.giftBusy,
      gfNow: (() => {
        const g = s.giftFor?.gift; if (!g?.on) return ''; if (g.paid) return 'They pay for Plus, so it can’t be changed here.';
        const end = g.forever || g.until > Date.UTC(2099, 0) ? 'for good' : `until ${new Date(g.until).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`;
        return g.gift ? `They have Plus from Fletora, ${end}.` : `They have Plus, switched on in the Firebase console, ${end}. Choose a length to replace it, or remove it.`;
      })(),
      // Paid Plus can't be changed; anything else (a gift, or Plus set by hand) can be replaced or removed.
      gfPaid: !!s.giftFor?.gift?.on && !!s.giftFor.gift.paid, gfHas: !!s.giftFor?.gift?.on && !s.giftFor.gift.paid,
      gfClose: () => this.setState({ giftFor: null }),
      gfGive: async (months: number) => {
        const g = s.giftFor; if (!g || s.giftBusy) return;
        this.setState({ giftBusy: true });
        try {
          months < 0 ? await api.ungiftPlus(g.uid) : await api.giftPlus(g.uid, months);
          const p = await api.getPlus(g.uid);
          this.setState(st => ({ giftFor: null, pf: st.pf?.uid === g.uid ? { ...st.pf, plus: p.on, gift: p } : st.pf }));
          this.toast(months < 0 ? `Plus removed from ${g.name}` : `${g.name} has Plus${months ? ` for ${months} ${months === 1 ? 'month' : 'months'}` : ' for good'}`);
        } catch (e) { this.toast(api.errMsg(e)); }
        finally { this.setState({ giftBusy: false }); }
      },
      // The Fletora Plus sheet.
      plOpen: s.plusFor != null && !!a, plHave: !!s.plus && !s.myGift?.trial,
      // On a trial: when it ends, and the plans to keep Plus.
      plReason: s.plus && s.myGift?.trial ? `Your free trial ends ${fmtLong(s.myGift.until)}. Choose a plan to keep Plus.` : (s.plusFor && REASONS[s.plusFor]) || '',
      plPerks: PERKS.map(([t, n]) => ({ key: t, title: t, note: n })),
      plPlan: s.plusPlan || 'year', plSetPlan: (k: 'month' | 'year') => this.setState({ plusPlan: k }),
      plPlans: ([['month', 'Monthly', `${PRICE.month} a month`], ['year', 'Yearly', `${PRICE.year} a year · save ${YEAR_SAVING}`]] as const).map(([k, l, n]) => ({ key: k, label: l, note: n })),
      plBusy: !!s.plusBusy, plErr: s.plusErr || '',
      plClose: () => this.setState({ plusFor: null, plusSecret: '', plusDone: false }),
      // Checkout opens inside the sheet when it can, otherwise on Stripe's own page; both come back to /settings.
      plBuy: async () => {
        if (s.plusBusy) return;
        this.setState({ plusBusy: true, plusErr: '' });
        try {
          const r = await api.checkout(s.plusPlan || 'year');
          if (r.clientSecret) this.setState({ plusSecret: r.clientSecret, plusUi: r.ui || 'embedded', plusWhy: r.refused || [], plusBusy: false }); else location.href = r.url || '';
        } catch (e) { this.setState({ plusErr: api.errMsg(e), plusBusy: false }); }
      },
      plSecret: s.plusSecret || '', plUi: s.plusUi || 'embedded',
      // Test mode only: why Stripe refused Fletora's own form, so it can be fixed.
      plWhy: (s.plusSecret || '').startsWith('cs_test_') ? (s.plusWhy || []).filter(w => /^(elements|custom):/.test(w)) : [], plStripeKey: api.STRIPE_KEY, plDone: !!s.plusDone, plDark: !!s.dark,
      // Paid on our own form: thank them here and confirm it with the server (the session id leads its client secret).
      plPaid: () => { const id = (s.plusSecret || '').split('_secret_')[0]; this.setState({ plusSecret: '', plusDone: true }); this.confirmPlus(id); },
      plBack: () => this.setState({ plusSecret: '' }),
      // Stripe.js couldn't load the embedded form (blocked, offline…): carry on with Stripe's own page.
      plEmbedFailed: async () => {
        this.setState({ plusSecret: '', plusBusy: true });
        try { location.href = (await api.checkout(s.plusPlan || 'year', false)).url || ''; }
        catch (e) { this.setState({ plusErr: api.errMsg(e), plusBusy: false }); }
      },
      plSummary: s.plusPlan === 'month' ? `Fletora Plus · ${PRICE.month} a month` : `Fletora Plus · ${PRICE.year} a year`,
      // First visit after joining: a short guide to how fletora works.
      welcomeOpen: !!s.welcome && !!a, welcomeName: (a?.name || '').split(' ')[0],
      welcomeStart: () => { this.setState({ welcome: false }); this.goMode('mine'); this.setState({ managing: true }); },
      welcomeLater: () => { this.setState({ welcome: false }); this.goMode('explore'); },
      inInstalled: installer.installed(), inCanPrompt: installer.canPrompt(), inIOS: installer.isIOS(),
      inInstall: () => installer.install().then(ok => ok && this.toast('fletora is on your home screen')),
      isDark: !!s.dark, setTheme: (t: 'light' | 'dark') => { themeMode.setTheme(t); this.setState({ dark: t === 'dark' }); },
      openPrivacy: () => this.openLegal('privacy'), openTerms: () => this.openLegal('terms'), openContact: () => this.openLegal('contact'), openPlusPage: () => this.openLegal('plus'),
      // Plus and its free trial, shown around the site to people who don't have Plus.
      promoPlus: !s.plus, promoTrial: !s.acct, promoLine: !s.acct ? 'Join free and get 14 days of Fletora Plus, no card needed.' : 'More room, PDFs and stats with Fletora Plus.',
      exPromo: !s.plus && !s.exPromoHidden,
      hidePromo: () => { try { localStorage.setItem('sb-promo-hidden', String(Date.now())); } catch { /* storage unavailable */ } this.setState({ exPromoHidden: true }); },
      navPlusLine: s.mode === 'legal' && s.legal === 'plus' ? INK : 'transparent', navPlusFg: s.mode === 'legal' && s.legal === 'plus' ? INK : STONE,
      // The Plus page's button: start the trial, choose a plan, keep it after a trial, or manage it.
      ...(() => {
        const trial = !!s.plus && !!s.myGift?.trial, until = s.myGift?.until || 0;
        return {
          ppCta: !s.acct ? 'Start your free trial' : trial ? 'Keep Plus' : s.plus ? 'Manage your plan' : 'Choose a plan',
          ppNote: !s.acct ? '14 days of Plus free when you join, with no card needed. Then £7 a month or £60 a year, only if you choose it.'
            : trial ? `You’re on the free trial until ${fmtLong(until)}. Choose a plan to keep Plus after that.`
            : s.plus ? 'You have Plus. Thank you for supporting fletora.' : 'Renews automatically. Cancel anytime in Account settings and keep Plus until the end of the period you’ve paid for.',
          ppGo: () => !s.acct ? this.openAuth('join') : trial ? this.openPlus('trial') : s.plus ? this.openSettings() : this.openPlus(),
        };
      })(),
      ...(() => {
        const t = s.act; if (s.mode !== 'action' || !t) return { isAction: false };
        return {
          isAction: true, acMode: t.mode, acStep: t.step, acMail: t.email, acPw: t.pw, acErr: t.err, acSignedIn: !!a,
          onAcPw: (e: ChangeEvent<HTMLInputElement>) => { const pw = e.target.value; this.setState(st => ({ act: { ...st.act!, pw, err: '' } })); },
          acSubmit: async (e?: { preventDefault(): void }) => {
            e?.preventDefault(); if (t.pw.length < 6) return this.setState(st => ({ act: { ...st.act!, err: 'Choose a password of at least 6 characters.' } }));
            this.setState(st => ({ act: { ...st.act!, step: 'working' } }));
            try { await api.setNewPassword(t.code, t.pw); this.setState(st => ({ act: { ...st.act!, step: 'done', pw: '' } })); }
            catch (err) { this.setState(st => ({ act: { ...st.act!, step: 'form', err: api.errMsg(err) } })); }
          },
          acContinue: () => { history.replaceState(null, '', t.next); this.applyRoute(); },
          acSignIn: () => { this.openAuth('signin'); this.setState(st => ({ su: { ...(st.su || { name: '', handle: '', pw: '' }), email: t.email, pw: '', name: '', handle: '' } })); },
          acResetAgain: () => { this.openAuth('signin'); this.setState({ suMode: 'reset' }); },
        };
      })(),
      // New collection dialog.
      arOpen: !!s.archForm, arF: s.archForm || null, arBusy: !!s.archForm?.busy, arErr: s.archForm?.err || '', arExists: !!s.archForm?.at,
      arSet: (k: 'artist' | 'years' | 'source' | 'url' | 'note') => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { const val = e.target.value; this.setState(st => st.archForm ? { archForm: { ...st.archForm, [k]: val, err: '' } } : null); },
      arSave: (e?: { preventDefault(): void }) => { e?.preventDefault(); this.saveArchForm(); }, arRemove: () => this.saveArchForm(true), arClose: () => this.setState({ archForm: null }),
      cnOpen: !!s.colNew, cnName: s.colNew?.name || '', cnMoving: !!s.colNew?.forId,
      onCnName: (e: ChangeEvent<HTMLInputElement>) => { const name = e.target.value.slice(0, 40); this.setState(st => ({ colNew: { ...st.colNew!, name } })); },
      cnClose: () => this.setState({ colNew: null }),
      cnCreate: (e?: { preventDefault(): void }) => {
        e?.preventDefault(); const c = s.colNew, n = (c?.name || '').trim(); if (!c || !n) return;
        this.setState(st => ({ colNew: null, newCols: [...new Set([...(st.newCols || []), n])], pfCol: c.forId ? st.pfCol : n }));
        if (c.forId) this.moveSaved(c.forId, n);
      },
      isLegal: s.mode === 'legal', legalDoc: s.legal || 'privacy', ...this.contactVals(), isNotFound: s.mode === 'notfound', nfWhat: s.nf || 'page',
      ...this.settingsVals(),
      pfEditing: !!s.draft, dName: d.name || '', dHandle: d.handle || '', dBio: d.bio || '', dLoc: d.loc || '', dWeb: d.web || '', dMail: d.mail || '', onDMail: setD('mail'),
      dSocials: Object.keys(d.socials || {}).filter(k => PLATFORM[k]).map(k => ({ key: k, label: PLATFORM[k].label, hint: PLATFORM[k].hint, value: d.socials![k],
        onChange: (e: ChangeEvent<HTMLInputElement>) => { const val = e.target.value.slice(0, 120); this.setState(st => ({ draft: { ...st.draft!, socials: { ...st.draft!.socials, [k]: val } } })); },
        remove: () => this.setState(st => { const n = { ...st.draft!.socials }; delete n[k]; return { draft: { ...st.draft!, socials: n } }; }) })),
      dSocialAdd: Object.keys(d.socials || {}).length >= MAX_SOCIALS ? [] : PLATFORMS.filter(pl => !(d.socials || {})[pl.key]).map(pl => ({ key: pl.key, label: pl.label,
        add: () => this.setState(st => ({ socialMenu: false, draft: { ...st.draft!, socials: { ...st.draft!.socials, [pl.key]: '' } } })) })),
      dSocialMenu: !!s.socialMenu, toggleSocialMenu: () => this.setState(st => ({ socialMenu: !st.socialMenu })),
      dEmail: a?.email || '', dBioCount: `${(d.bio || '').length}/160`,
      onDName: setD('name'), onDHandle: setD('handle'), onDBio: setD('bio'), onDLoc: setD('loc'), onDWeb: setD('web'),
      dAvBg: avatarBg(d.av), dInit: d.av ? '' : ini(d.name), dHasAv: !!d.av,
      avRef: this.avRef, pickAv: () => this.avRef.current?.click(), removeAv: () => this.setState(st => ({ draft: { ...st.draft!, av: null } })),
      onAvFile: (e: ChangeEvent<HTMLInputElement>) => {
        // Opens the photo in the editor (move, zoom, rotate, light) with a round guide; Use photo saves a 512px square.
        const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
        const fr = new FileReader(); fr.onload = () => this.startEdit([fr.result as string], null, 'avatar'); fr.readAsDataURL(f);
      },
      dBusy: !!s.dBusy, dErr: s.dErr || '',
      pfSave: async () => {
        if (!a || s.dBusy) return;
        this.setState({ dBusy: true, dErr: '' });
        try {
          const socials = Object.fromEntries(Object.entries(d.socials || {}).map(([k, h]) => [k, cleanHandle(h)]).filter(([k, h]) => PLATFORM[k] && h));
          const acct = await api.saveProfile(a, { ...d, socials, ig: '', mail: (d.mail || '').trim().slice(0, 120), name: (d.name || '').trim() || a.name, handle: d.handle || a.handle, joined: a.joined });
          this.setState({ acct, draft: null });
        } catch (e) { this.setState({ dErr: api.errMsg(e) }); }
        finally { this.setState({ dBusy: false }); }
      },
      pfCancel: () => this.setState({ draft: null, dErr: '' }), pfClose: (e: MouseEvent) => { if (e.target === e.currentTarget) this.setState({ draft: null }); },
      signOut: () => this.ask({ title: 'Sign out?', text: 'You can sign back in any time with your email and password.', yes: 'Sign out', run: async () => { await api.signOut(); this.setState({ draft: null }); this.goMode('home'); } }),
      // Analytics consent: a small bar until they choose, and a setting under Your data.
      anOffered: api.analyticsOffered, anOn: s.analytics === 'yes', anAsk: api.analyticsOffered && !s.analytics && !s.embed,
      anChoose: (yes: boolean) => { store.saveAnalytics(yes ? 'yes' : 'no'); api.analyticsConsent(yes); this.setState({ analytics: yes ? 'yes' : 'no' }); },
      mtOn: !!s.showMature,
      mtToggle: () => s.showMature ? this.setMature(false)
        : this.ask({ title: 'Show Mature work?', text: 'Mature sketchbooks have drawings with nudity. Turn this on only if you’re 18 or over.', yes: 'I’m 18 or over', run: () => this.setMature(true) }),
      anToggle: () => { const yes = s.analytics !== 'yes'; store.saveAnalytics(yes ? 'yes' : 'no'); api.analyticsConsent(yes); this.setState({ analytics: yes ? 'yes' : 'no' }); },
      // Fletora's own confirm dialog.
      askQ: s.ask || null, askNo: () => this.setState({ ask: null }), askYes: () => { const q = s.ask; this.setState({ ask: null }); q?.run(); },
    };
  }

  notifVals(): V {
    // An invitation still waiting for an answer shows as its own Accept / Decline card instead.
    const s = this.state, pending = new Set((s.invites || []).map(d => d.id)), list = (s.notifs || []).filter(n => !(n.type === 'invite' && n.bookId && pending.has(n.bookId))), unread = list.filter(n => !n.read);
    const ago = (t: number) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? m + 'm' : m < 1440 ? Math.round(m / 60) + 'h' : Math.round(m / 1440) + 'd'; };
    const msgNew = s.acct ? this.myChats().filter(c => this.chatUnread(c) && (c.status === 'open' || c.by !== s.acct!.uid)).length : 0;
    return {
      ntShow: !!s.acct, ntUnread: unread.length + (s.invites || []).length, isMessagesMode: s.mode === 'messages', ntOpen: !!s.notifOpen,
      ntMsgs: msgNew, ntMsgLbl: msgNew ? `${msgNew} new` : 'Your conversations', ntOpenMsgs: () => this.openMessages(),
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

  messagesVals(): V {
    const s = this.state, me = s.acct?.uid || '', all = this.myChats();
    const inbox = all.filter(c => c.status === 'open' || c.by === me), reqs = all.filter(c => c.status === 'request' && c.by !== me);
    const tab = s.msgTab || 'chats', list = tab === 'requests' ? reqs : inbox;
    const cur = all.find(c => c.id === s.chatOpen) || null, other = cur ? this.chatOther(cur) : s.chatNew || null;
    const ago = (t: number) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'now' : m < 60 ? m + 'm' : m < 1440 ? Math.round(m / 60) + 'h' : new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); };
    const stamp = (t: number) => { const d = new Date(t), today = new Date().toDateString() === d.toDateString(); return (today ? 'Today' : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })) + ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); };
    const msgs = cur ? (s.msgs || []) : [], askMe = !!cur && cur.status === 'request' && cur.by !== me;
    return {
      isMessages: true, msTab: tab, msSetTab: (t: 'chats' | 'requests') => this.setState({ msgTab: t }), msReqCount: reqs.length,
      msList: list.map(c => { const o = this.chatOther(c); return {
        key: c.id, verified: this.isTeam(o.uid), name: o.name || '@' + o.handle, avBg: avatarBg(o.av), init: o.av ? '' : ini(o.name), preview: (c.lastFrom === me ? 'You: ' : '') + c.lastText, when: ago(c.lastAt),
        unread: this.chatUnread(c) && (c.status === 'open' || c.by !== me), on: c.id === s.chatOpen, open: () => this.openMessages(c.id) }; }),
      msEmpty: tab === 'requests' ? 'No message requests. When someone you don’t follow back writes to you, it waits here until you accept.' : 'No messages yet. Open an artist’s profile and press Message to say hello.',
      msThread: other ? {
        name: other.name || '@' + other.handle, verified: this.isTeam(other.uid), handle: other.handle ? '@' + other.handle : '', avBg: avatarBg(other.av), init: other.av ? '' : ini(other.name),
        openProfile: () => this.openProfile({ uid: other.uid, name: other.name, handle: other.handle }),
        msgs: msgs.map((m, i) => ({ key: m.id, mine: m.from === me, text: m.text, pending: m.pending, stamp: !i || m.at - msgs[i - 1].at > 30 * 60000 ? stamp(m.at) : '',
          report: m.from === me ? undefined : () => this.setState({ reportFor: { kind: 'message', targetId: `${cur!.id}~${m.id}`, ownerId: m.from, label: `this message from ${other.name || '@' + other.handle}`, quote: m.text }, reportReason: '', reportNote: '', reportErr: '' }) })),
        isNew: !cur, askMe, waiting: !!cur && cur.status !== 'open' && cur.by === me,
        accept: () => cur && api.answerChat(cur.id, true).catch(e => { console.error(e); this.toast('Couldn’t accept. Try again.'); }),
        decline: () => { if (!cur) return; api.answerChat(cur.id, false).catch(e => console.error(e)); this.openMessages(null); this.toast('Request declined. They won’t be told.'); },
        block: () => { this.setState({ more: null }); this.toggleBlock(other.uid, other.name || '@' + other.handle); this.openMessages(null); },
        reportChat: () => this.setState({ more: null, reportFor: { kind: 'user', targetId: other.uid, ownerId: other.uid, label: other.name || '@' + other.handle }, reportReason: '', reportNote: '', reportErr: '' }),
        moreOpen: s.more === 'chat', more: () => this.setState(st => ({ more: st.more === 'chat' ? null : 'chat' })),
        back: () => this.openMessages(null),
      } : null,
      msDraft: s.msgDraft || '', onMsgDraft: (e: ChangeEvent<HTMLTextAreaElement>) => this.setState({ msgDraft: e.target.value.slice(0, 2000) }),
      msSend: () => this.sendMsg(), msKey: (e: { key: string; shiftKey: boolean; preventDefault(): void; nativeEvent: { isComposing?: boolean } }) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && !IS_TOUCH) { e.preventDefault(); this.sendMsg(); } },
      msBusy: !!s.msgBusy, msErr: s.msgErr || '', msCanSend: !!(s.msgDraft || '').trim() && !s.msgBusy,
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
      isBilling: s.mode === 'billing', openBilling: this.openBilling,
      // Accounts made with Google have no password: no password fields, and Google confirms it's them instead.
      acPw: api.hasPassword(), acEmail: a?.email || '', acVerified: !!s.verified, acErr: s.acErr || '', acInfo: s.acInfo || '', acBusy: s.acBusy || '',
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
      exportData: () => run('export', async () => {
        if (!a) return;
        const blob = await api.exportMyData(a), link = document.createElement('a');
        link.href = URL.createObjectURL(blob); link.download = `fletora-data-${a.handle}-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(link.href), 60000);
        return 'Your data is downloading as a file you can open in any text editor.';
      }),
      deleteAccount: (e?: { preventDefault(): void }) => { e?.preventDefault(); if (!a) return;
        if ((f.delHandle || '').replace(/^@/, '').toLowerCase() !== a.handle) return this.setState({ acErr: `Type your handle, ${a.handle}, to confirm.` });
        run('delete', async () => { await api.deleteAccount(f.pwDel || '', a, !!s.bill); this.setState({ ac: {} }); this.goMode('home'); }); },
      // Plan: free, or Plus with its renewal (or end) date and the Stripe billing portal.
      ...(() => {
        const b = s.bill, end = b?.periodEnd ? new Date(b.periodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
        // Plus from Fletora: given by a moderator, or turned on in Firebase by hand (no subscription behind it).
        const live = ['active', 'trialing', 'past_due'].includes(b?.status || ''), trial = !!s.plus && !!s.myGift?.trial && !live;
        const gift = !trial && !!s.plus && !!s.myGift && (s.myGift.gift || (s.bill !== undefined && !live));
        const daysLeft = trial && s.myGift ? Math.max(1, Math.ceil((s.myGift.until - Date.now()) / 86_400_000)) : 0;
        return {
          acPlus: !!s.plus, acHasBilling: !!b,
          // The free trial: days left, and a way to keep Plus.
          acTrial: trial, acTrialLine: trial && s.myGift ? `Free trial of Fletora Plus · ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left (until ${fmtLong(s.myGift.until)}). No card on file.` : '',
          keepPlus: () => this.openPlus('trial'),
          acGift: gift, acGiftLine: gift && s.myGift ? (s.myGift.forever || s.myGift.until > Date.UTC(2099, 0) ? 'Fletora Plus, from Fletora. It’s yours for good, no payment needed.' : `Fletora Plus, from Fletora, until ${new Date(s.myGift.until).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}. No payment needed.`) : '',
          acPlan: !s.plus ? 'You’re on the free plan.' : gift ? 'Fletora Plus, from Fletora.' : `Fletora Plus${b?.interval ? ` · ${b.interval === 'year' ? 'yearly' : 'monthly'}` : ''}${end ? (b?.renews ? ` · renews ${end}` : ` · ends ${end}`) : ''}.`,
          acPastDue: b?.status === 'past_due',
          seePlus: () => this.openPlus(),
          manageBilling: () => run('billing', async () => { location.href = await api.billingPortal(); }),
          ...(() => {
            // Fletora's billing page.
            const d = s.bd, money = (n: number, c = 'gbp') => (n / 100).toLocaleString('en-GB', { style: 'currency', currency: c.toUpperCase() });
            const date = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
            const act = (k: 'cancel' | 'resume' | 'switch', done: string) => async () => {
              this.setState({ bdBusy: true });
              try { await api.changePlan(k); this.toast(done); this.loadBilling(); this.setState({ bdAsk: null }); }
              catch (e) { this.toast(api.errMsg(e)); }
              finally { this.setState({ bdBusy: false }); }
            };
            return {
              bdShow: !!b && live, bdReady: !!d, bdErr: s.bdErr || '',
              bdPlan: d ? `${d.interval === 'year' ? 'Yearly' : 'Monthly'} · ${money(d.amount, d.currency)} a ${d.interval === 'year' ? 'year' : 'month'}` : '',
              bdNext: d ? (d.cancelling ? `Cancelled. You keep Plus until ${date(d.endsAt || d.periodEnd)}, and won’t be charged again.` : d.status === 'past_due' ? 'Your last payment didn’t go through. Update your card to keep Plus.' : `Renews on ${date(d.periodEnd)}.`) : '',
              // The dates behind it: started, this period, and cancelled / ends, or renews.
              bdDates: d ? ([
                ['Started', d.started ? date(d.started) : ''],
                ['This period', d.periodStart && d.periodEnd ? `${date(d.periodStart)} – ${date(d.periodEnd)}` : ''],
                ...(d.cancelling ? [['Cancelled on', d.cancelledAt ? date(d.cancelledAt) : ''], ['Plus ends on', date(d.endsAt || d.periodEnd)]] : [['Next payment', `${money(d.amount, d.currency)} on ${date(d.periodEnd)}`]]),
              ] as [string, string][]).filter(([, x]) => x).map(([k, x]) => ({ key: k, label: k, value: x })) : [],
              bdWarn: !!d && (d.cancelling || d.status === 'past_due'),
              bdCardLbl: d?.card ? (d.card.last4 ? `${d.card.brand.charAt(0).toUpperCase() + d.card.brand.slice(1)} •••• ${d.card.last4}${d.card.exp ? ` · expires ${d.card.exp}` : ''}` : d.card.brand) : 'No card saved',
              bdCardAdded: d?.card?.added ? `Added ${date(d.card.added)}` : '',
              bdCanSwitch: !!d && d.interval === 'month' && !d.cancelling, bdCancelling: !!d?.cancelling,
              bdInvoices: (d?.payments || []).map(i => ({ key: i.id, date: new Date(i.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }), amount: money(i.amount, i.currency),
                card: i.card?.last4 ? `${i.card.brand.charAt(0).toUpperCase() + i.card.brand.slice(1)} •••• ${i.card.last4}` : '',
                status: i.status === 'paid' ? 'Paid' : i.status === 'refunded' ? 'Refunded' : i.status === 'part-refunded' ? `${money(i.refunded, i.currency)} refunded` : i.status === 'open' ? 'Due' : i.status === 'failed' ? 'Failed' : i.status,
                bad: i.status === 'failed' || i.status === 'open', url: i.url })),
              bdAsk: s.bdAsk || null, bdBusy: !!s.bdBusy, bdEnd: d ? date(d.periodEnd) : '', bdYearPrice: PRICE.year,
              bdAskCancel: () => this.setState({ bdAsk: 'cancel' }), bdAskSwitch: () => this.setState({ bdAsk: 'switch' }), bdNo: () => this.setState({ bdAsk: null }),
              bdCancel: act('cancel', 'Plus is cancelled. You keep it until the end of this period.'),
              bdSwitch: act('switch', 'You’re on yearly Plus now'),
              bdResume: act('resume', 'Plus will carry on renewing'),
              bdCard: () => run('card', async () => { this.setState({ cardSecret: await api.cardSetup() }); }),
              cardSecret: s.cardSecret || '', cardClose: () => this.setState({ cardSecret: null }),
              cardSaved: async (setupId: string) => { await api.cardDone(setupId); this.setState({ cardSecret: null }); this.toast('Card updated'); this.loadBilling(); },
            };
          })(),
        };
      })(),
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
      exPrompt: s.exLabel === 't:' + currentPrompt().tag ? currentPrompt() : null, exPromptEnds: currentPrompt().ends.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }),
      exPromptJoin: () => { if (!s.acct) return this.openJoin(); this.goMode('mine'); this.setState({ managing: true }); setTimeout(() => this.setState({ mgTab: 'details' }), 0); },
      exCanMore: !s.exLabel && !!s.exMore, exBusy: !!s.exBusy, loadMore: () => this.loadCommunity(true),
      onExScroll: (e: { currentTarget: HTMLElement }) => { const el = e.currentTarget; if (!s.exLabel && el.scrollHeight - el.scrollTop - el.clientHeight < 700) this.loadCommunity(true); },
      stDir: mob ? 'column' : 'row', stGap: mob ? 4 : 48, stMaxW: mob ? '100%' : '60%', stFlex: mob ? '1 1 0' : '0 0 auto', stInfoGap: mob ? 4 : 10,
      stAlign: mob ? 'center' : 'stretch', stTA: mob ? 'center' : 'left', stTitle: mob ? 30 : 44, stBtnTop: mob ? 6 : 10,
      stHint: mob ? 'swipe the pile up to lift books off' : 'scroll over the pile to lift books off',
      stDown0: (e: PointerEvent) => { this.stY = e.clientY; },
      stUp0: (e: PointerEvent) => { if (this.stY == null) return; const dy = e.clientY - this.stY; this.stY = null; if (Math.abs(dy) > 40) this.stackStep(dy < 0 ? 1 : -1); },
      exLoading: !s.community || (!!s.exLabel && !s.exLabelBooks), exEmpty: !s.exLabel && !!s.community && !s.community.length,
      exNoneLbl: s.exLabel ? (s.exLabel.startsWith('m:') ? `No ${MEDIUMS.find(m => 'm:' + mediumKey(m) === s.exLabel) || 'sketchbooks'} sketchbooks yet` : `Nothing tagged #${s.exLabel.slice(2)} yet`) + (s.exQ ? ` matching “${s.exQ}”` : '') : s.exQ ? `No sketchbooks match “${s.exQ}”` : 'No community sketchbooks yet. Be the first to share one.',
      // From the archive: shown on the main Explore view, not while searching or filtering.
      exArchive: s.exQ || s.exLabel ? [] : (s.archive || []).map(b => ({ key: b.id, name: b.name, artist: b.artist, years: b.arch?.years || '', color: b.color,
        bg: this.coverBg(b), showLabel: !b.coverImg, shape: b.shape, a: this.shapeOf(b).a, open: () => this.openOtherBook(b) })),
      exPeople: (() => {
        const q = (s.exQ || '').trim().toLowerCase().replace(/^@/, '');
        if (!q) return [];
        return (s.people || []).filter(p => p.name && !(s.blocked || []).includes(p.uid) && !(s.banned || []).includes(p.uid) && `${p.name} ${p.handle}`.toLowerCase().includes(q)).slice(0, 12).map(p => ({
          key: p.uid, verified: this.isTeam(p.uid), name: p.name, handle: '@' + p.handle, avBg: avatarBg(p.av), init: p.av ? '' : ini(p.name), open: () => this.openProfile({ uid: p.uid, name: p.name }),
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
        key: b.id, name: b.name, artist: b.artist, verified: this.isTeam(b.ownerId), color: b.color, bg: this.coverBg(b), showLabel: !b.coverImg, no: 'Sketchbook ' + String(b.idx + 1).padStart(3, '0'),
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
        ...[...new Set(rs.filter(r => r.kind === 'book' || (r.kind === 'image' && r.targetId !== r.ownerId)).map(r => r.targetId))].map(async id => { books.set(id, await api.getBook(id)); }),
        ...[...new Set(rs.map(r => r.ownerId).filter(Boolean))].map(async id => { people.set(id, await api.getProfile(id).catch(() => null)); }),
      ]);
      const adReports = rs.map((r): AdminItem => {
        const b = books.get(r.targetId), pr = people.get(r.ownerId), forBook = r.kind === 'image' && r.targetId !== r.ownerId;
        const targetName = r.kind === 'book' ? b?.name || 'Deleted sketchbook' : r.kind === 'message' ? `A message from ${pr?.name || 'a deleted account'}`
          : r.kind === 'image' ? (forBook ? `A page for “${b?.name || 'a sketchbook not saved yet'}”` : 'A profile picture') : pr?.name || 'Deleted account';
        return { ...r, targetName, ownerName: pr?.name || '', ownerHandle: pr?.handle || '',
          hidden: !!b?.hidden, mature: !!b?.mature, banned: banned.includes(r.ownerId), gone: r.kind === 'book' || forBook ? !b : !pr };
      });
      this.setState({ adReports, banned });
    } catch (e) { console.error(e); this.setState({ adReports: [], adErr: api.errMsg(e) }); }
  }
  contactVals(): V {
    const s = this.state, c = s.ct || { kind: 'help', email: s.acct?.email || '', text: '', link: '', hp: '' };
    const set = (k: 'kind' | 'email' | 'text' | 'link' | 'hp') => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { const val = e.target.value; this.setState(st => ({ ct: { ...(st.ct || c), [k]: val, err: '' } })); };
    const HINTS: Record<string, string> = {
      complaint: 'What happened, and what you’d like us to do about it.', appeal: 'Which sketchbook or account, what we did, and why you think it was wrong.',
      bug: 'What you were doing, what went wrong, and your device and browser.', report: 'What’s wrong with it. For the fastest response, use Report on the page itself.',
      privacy: 'What you’d like: a copy of your data, a correction, deletion, or something else.', billing: 'What you need help with. Don’t send card details.',
    };
    return {
      ctKind: c.kind, ctEmail: c.email, ctText: c.text, ctLink: c.link, ctHp: c.hp, ctBusy: !!c.busy, ctErr: c.err || '', ctDone: !!c.sentTo, ctSentTo: c.sentTo || '',
      ctNeedsLink: ['complaint', 'appeal', 'bug', 'report'].includes(c.kind), ctHint: HINTS[c.kind] || 'How can we help?',
      setCtKind: (k: string) => this.setState(st => ({ ct: { ...(st.ct || c), kind: k, err: '' } })), onCtEmail: set('email'), onCtText: set('text'), onCtLink: set('link'), onCtHp: set('hp'),
      ctAgain: () => this.setState({ ct: { ...c, text: '', link: '', sentTo: undefined } }),
      ctSend: async (e: { preventDefault(): void }) => {
        e.preventDefault(); if (c.busy) return;
        const email = c.email.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return this.setState({ ct: { ...c, err: 'Enter the email address we should reply to.' } });
        if (c.text.trim().length < 10) return this.setState({ ct: { ...c, err: 'Tell us a little more, so we can help.' } });
        this.setState({ ct: { ...c, busy: true, err: '' } });
        try { await api.contactUs({ kind: c.kind, email, text: c.text, link: c.link, website: c.hp }); this.setState({ ct: { ...c, busy: false, sentTo: email } }); }
        catch (er) { this.setState({ ct: { ...c, busy: false, err: api.errMsg(er) } }); }
      },
    };
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
      adPick: s.pick ? { name: s.pick.name, artist: s.pick.artist, open: () => this.openOtherBook(s.pick!), remove: () => this.togglePick(s.pick!) } : null,
      isAdminPage: s.mode === 'admin', adAllowed: !!s.admin, adLoading: !list, adErr: s.adErr || '', adReload: () => this.loadReports(),
      adCount: list ? `${list.length} open ${list.length === 1 ? 'report' : 'reports'}` : '',
      adItems: (list || []).map(r => ({
        key: r.id, kind: r.kind === 'book' ? 'Sketchbook' : r.kind === 'message' ? 'Message' : r.kind === 'image' ? 'Upload' : 'Artist', name: r.targetName, owner: r.ownerName ? `${r.ownerName} · @${r.ownerHandle}` : '',
        reason: r.reason, note: r.note, when: ago(r.at), hidden: r.hidden, banned: r.banned, gone: r.gone, isBook: r.kind === 'book' || (r.kind === 'image' && r.targetId !== r.ownerId), busy: s.adBusy?.startsWith(r.id) ? s.adBusy : '',
        open: () => r.kind === 'book' || (r.kind === 'image' && r.targetId !== r.ownerId) ? this.openBookById(r.targetId) : this.openProfile({ uid: r.ownerId, name: r.ownerName, handle: r.ownerHandle }),
        openOwner: () => this.openProfile({ uid: r.ownerId, name: r.ownerName, handle: r.ownerHandle }),
        hide: () => act(r.id + ':hide', () => api.setHidden(r.targetId, !r.hidden), l => l.map(x => x.targetId === r.targetId ? { ...x, hidden: !r.hidden } : x), r.hidden ? 'Sketchbook restored' : 'Sketchbook hidden'),
        ban: () => {
          const go = () => act(r.id + ':ban', () => api.setBanned(r.ownerId, !r.banned), l => l.map(x => x.ownerId === r.ownerId ? { ...x, banned: !r.banned, hidden: x.kind === 'book' ? !r.banned : x.hidden } : x), r.banned ? 'Suspension lifted' : 'Artist suspended')
            .then(() => api.bannedUsers().then(banned => this.setState({ banned })));
          if (r.banned) return go();
          this.ask({ title: `Suspend ${r.ownerName || 'this artist'}?`, text: 'Their public sketchbooks will be hidden and they won’t be able to publish or notify anyone until you lift it.', yes: 'Suspend', danger: true, run: go });
        },
        auto: r.by === 'check', file: !!r.file, mature: r.mature,
        viewFile: () => {
          // Opened before the link arrives, so the browser doesn't block it as a pop-up.
          const w = window.open('', '_blank');
          api.heldPicture(r.id).then(u => { if (w) w.location.href = u; }, e => { w?.close(); this.setState({ adErr: api.errMsg(e) }); });
        },
        deleteFile: () => this.ask({ title: 'Delete this picture?', text: 'It’s deleted for good. If it may show child sexual abuse, report it to the IWF or the NCA first and keep a record.', yes: 'Delete', danger: true,
          run: () => act(r.id + ':file', () => api.deleteHeldPicture(r.id), l => l.map(x => x.id === r.id ? { ...x, file: undefined } : x), 'Picture deleted') }),
        clearMature: () => act(r.id + ':mature', () => api.clearMature(r.targetId), l => l.map(x => x.targetId === r.targetId ? { ...x, mature: false } : x), 'Mature label removed'),
        dismiss: () => act(r.id + ':dismiss', () => api.dismissReport(r.id), l => l.filter(x => x.id !== r.id), 'Report dismissed'),
      })),
    };
  }

  // ---------- write mode: pen strokes, the zoom pad, and dragging the typed text around ----------
  inkPen: { id: number; r: DOMRect; pad?: boolean; drag?: { tid: string; px: number; py: number; x: number; y: number } } | null = null;
  lastPen: Pen = DEFAULT_PEN;
  /** The zoom pad's size on screen. */
  padSize(fr: { fw: number }) { return this.state.vw < 640 ? { pw: this.state.vw - 32, ph: 118 } : { pw: fr.fw, ph: 128 }; }
  /** The part of the page the zoom pad shows (frame fractions), the same shape as the pad. */
  padBox(ed: EditState, fr: { fw: number; fh: number }) {
    const { pw, ph } = this.padSize(fr), lined = ed.paper === 'lined', h = lined ? RULED.step * 2 : 0.09, w = Math.min(0.9, pw / ph * h * fr.fh / fr.fw);
    const b = ed.box || (lined ? { x: 0.06, y: RULED.top - RULED.step * 1.5 } : { x: 0.06, y: 0.08 });
    return { x: Math.max(0, Math.min(1 - w, b.x)), y: Math.max(0, Math.min(1 - h, b.y)), w, h };
  }
  /** Moves the pad along the line as you write, and down to the next line at the edge. */
  padAdvance(ed: EditState, fr: { fw: number; fh: number }, newLine = false) {
    const b = this.padBox(ed, fr), down = ed.paper === 'lined' ? RULED.step : b.h * 0.8;
    const x = b.x + b.w * 0.55;
    this.setEd({ box: newLine || x + b.w > 0.97 ? { x: 0.06, y: b.y + down } : { x, y: b.y } });
  }
  inkDown(e: PointerEvent<HTMLDivElement>, pad?: boolean) {
    const ed = this.state.edit; if (!ed || this.inkPen || ed.inkBusy) return;
    const r = e.currentTarget.getBoundingClientRect(), fr = this.frame();
    let x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    if (pad) { const b = this.padBox(ed, fr); x = b.x + x * b.w; y = b.y + y * b.h; }
    else {
      const tid = (e.target as HTMLElement).closest?.('[data-tid]')?.getAttribute('data-tid'), t = tid && ed.texts.find(q => q.id === tid);
      if (t) { this.inkPen = { id: e.pointerId, r, drag: { tid: t.id, px: x, py: y, x: t.x, y: t.y } }; this.setEd({ sel: t.id }); return; }
      // With the pad on, touching the page moves the pad there instead of writing.
      if (ed.pad) { this.inkPen = { id: e.pointerId, r }; return this.movePad(x, y); }
    }
    this.inkPen = { id: e.pointerId, r, pad }; this.setEd({ ink: [...ed.ink, [x, y]], sel: null, inkErr: '' });
  }
  movePad(x: number, y: number) { const ed = this.state.edit!, b = this.padBox(ed, this.frame()); this.setEd({ box: { x: x - b.w / 2, y: y - b.h / 2 } }); }
  inkMove(e: PointerEvent) {
    const p = this.inkPen, ed = this.state.edit; if (!p || p.id !== e.pointerId || !ed) return;
    let x = (e.clientX - p.r.left) / p.r.width, y = (e.clientY - p.r.top) / p.r.height;
    if (p.drag) { const d = p.drag; this.setText(d.tid, { x: Math.max(0, Math.min(0.95, d.x + x - d.px)), y: Math.max(0, Math.min(0.97, d.y + y - d.py)) }); return; }
    if (ed.pad && !p.pad) return this.movePad(x, y);
    let px = p.r.width, py = p.r.height;
    if (p.pad) { const b = this.padBox(ed, this.frame()); x = b.x + x * b.w; y = b.y + y * b.h; px = p.r.width / b.w; py = p.r.height / b.h; }
    const s = ed.ink[ed.ink.length - 1]; if (!s) return;
    // Skip points under ~1.5px apart (on screen): smoother lines, smaller images.
    if (Math.hypot((x - s[s.length - 2]) * px, (y - s[s.length - 1]) * py) < 1.5) return;
    this.setEd({ ink: [...ed.ink.slice(0, -1), [...s, x, y]] });
  }
  inkUp(e: PointerEvent) {
    const p = this.inkPen; if (p?.id !== e.pointerId) return; this.inkPen = null;
    if (this.state.edit?.mode === 'draw') return this.drawEnd();
    const ed = this.state.edit; if (!ed || !p.pad) return;
    // Writing near the pad's right edge slides it along.
    const fr = this.frame(), b = this.padBox(ed, fr), s = ed.ink[ed.ink.length - 1] || [];
    let mx = 0; for (let i = 0; i < s.length; i += 2) mx = Math.max(mx, s[i]);
    if (mx > b.x + b.w * 0.7) this.padAdvance(ed, fr);
  }

  // ---------- draw mode ----------
  drawDown(e: PointerEvent<HTMLDivElement>) {
    const ed = this.state.edit; if (!ed || this.inkPen) return;
    const r = e.currentTarget.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height, p = this.getPainter();
    // Picking a colour off the page: one tap, then back to the brush.
    if (ed.eyedrop) return this.pickColor(p.colorAt(x, y));
    this.inkPen = { id: e.pointerId, r }; p.begin(ed.pen, x, y, this.pressure(e));
  }
  drawMove(e: PointerEvent) {
    const pt = this.inkPen, p = this.livePainter(); if (!pt || pt.id !== e.pointerId || !p) return;
    // Every point the pointer reported since the last event, so fast strokes stay smooth.
    const evs = (e.nativeEvent as globalThis.PointerEvent).getCoalescedEvents?.() || [e.nativeEvent];
    for (const q of evs.length ? evs : [e.nativeEvent]) p.move((q.clientX - pt.r.left) / pt.r.width, (q.clientY - pt.r.top) / pt.r.height, this.pressure(q));
  }
  /** Pen pressure from a stylus; fingers and mice paint at a steady, fairly firm touch. */
  pressure(e: { pointerType: string; pressure: number }) { return e.pointerType === 'pen' ? Math.max(0.05, Math.min(1, e.pressure || 0.5)) : 0.75; }
  drawEnd() { const p = this.livePainter(); if (p?.end()) this.setEd({ painted: (this.state.edit?.painted || 0) + 1 }); }
  pickColor(color: string) {
    const ed = this.state.edit!, tool = NO_COLOR.has(ed.pen.tool) ? 'pen' : ed.pen.tool;
    this.recentColors = [color, ...this.recentColors.filter(c => c !== color)].slice(0, 6);
    this.lastPen = { ...ed.pen, color, tool }; this.setEd({ pen: this.lastPen, eyedrop: false });
  }
  drawVals(ed: EditState): V {
    const pen = ed.pen, setPen = (patch: Partial<Pen>) => { this.lastPen = { ...pen, ...patch }; this.setEd({ pen: this.lastPen }); };
    const p = ed.mode === 'draw' || ed.painted ? this.livePainter() : null, bump = () => this.setEd({ painted: (ed.painted || 0) + 1 });
    return {
      edDraw: ed.mode === 'draw', hasMarks: !!p?.canUndo, edPaint: p?.el || null,
      edMarks: [],
      penTool: pen.tool, penColor: pen.color, penSize: pen.size, penOpacity: Math.round((pen.opacity ?? 1) * 100), penNoColor: NO_COLOR.has(pen.tool),
      setTool: (tool: Tool) => setPen({ tool }), setColor: (color: string) => this.pickColor(color),
      recentColors: this.recentColors,
      onPenSize: (e: ChangeEvent<HTMLInputElement>) => setPen({ size: parseFloat(e.target.value) }),
      onPenOpacity: (e: ChangeEvent<HTMLInputElement>) => setPen({ opacity: parseFloat(e.target.value) / 100 }),
      edEyedrop: !!ed.eyedrop, toggleEyedrop: () => this.setEd({ eyedrop: !ed.eyedrop }),
      undoMark: () => { p?.undo(); bump(); }, clearMarks: () => { p?.clear(); bump(); },
    };
  }
  writeVals(ed: EditState, fr: { fw: number; fh: number }): V {
    const sel = ed.texts.find(t => t.id === ed.sel);
    return {
      ...this.padVals(ed, fr),
      edWrite: ed.mode === 'write', inkBusy: !!ed.inkBusy, inkErr: ed.inkErr || '', hasInk: ed.ink.length > 0, edTextCount: ed.texts.length,
      edInkPaths: ed.ink.map(s => s.reduce((d, n, i) => d + (i % 2 ? `${(n * fr.fh).toFixed(1)} ` : `${i ? 'L' : 'M'}${(n * fr.fw).toFixed(1)} `), '') + (s.length === 2 ? 'l.1 0' : '')),
      edTexts: ed.texts.map(t => ({ id: t.id, left: t.x * fr.fw, top: t.y * fr.fh, width: t.w * fr.fw, fontPx: t.size * fr.fh, lineH: t.size * fr.fh * LINE_H, sel: t.id === ed.sel,
        lines: wrapLines(t.text, t.w * fr.fw, t.size * fr.fh) })),
      convertInk: () => this.convertInk(), undoInk: () => this.setEd({ ink: ed.ink.slice(0, -1) }), clearInk: () => this.setEd({ ink: [], inkErr: '' }),
      selText: sel ? {
        text: sel.text, onText: (e: ChangeEvent<HTMLTextAreaElement>) => this.setText(sel.id, { text: e.target.value }),
        size: Math.round(sel.size * 1000), sizeLbl: `${Math.round(sel.size * 1000)}`, onSize: (e: ChangeEvent<HTMLInputElement>) => this.setText(sel.id, { size: parseFloat(e.target.value) / 1000 }),
        width: Math.round(sel.w * 100), onWidth: (e: ChangeEvent<HTMLInputElement>) => this.setText(sel.id, { w: Math.min(1 - sel.x, parseFloat(e.target.value) / 100) }),
        remove: () => this.setEd({ texts: ed.texts.filter(t => t.id !== sel.id), sel: null }), done: () => this.setEd({ sel: null }),
      } : null,
    };
  }

  padVals(ed: EditState, fr: { fw: number; fh: number }): V {
    const b = this.padBox(ed, fr), { pw, ph } = this.padSize(fr), mag = pw / (b.w * fr.fw);
    return {
      edPad: ed.pad && ed.mode === 'write', togglePad: () => this.setEd({ pad: !ed.pad }), padW: pw, padH: ph,
      padRect: { left: b.x * fr.fw, top: b.y * fr.fh, width: b.w * fr.fw, height: b.h * fr.fh },
      padInner: `scale(${mag}) translate(${-b.x * fr.fw}px, ${-b.y * fr.fh}px)`, padGuide: ed.paper === 'lined' ? 0 : 0.75,
      padDown: (e: PointerEvent<HTMLDivElement>) => { e.stopPropagation(); try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* gone */ } this.inkDown(e, true); },
      padMove: (e: PointerEvent) => this.inkMove(e), padUp: (e: PointerEvent) => this.inkUp(e),
      padSpace: () => this.padAdvance(ed, fr), padNewLine: () => this.padAdvance(ed, fr, true),
    };
  }

  editorVals(): V {
    const ed = this.state.edit; if (!ed) return { editing: false };
    const fr = this.frame(), bs = this.baseSize(), num = (f: 'scale' | 'rot' | 'skx' | 'sky') => (e: ChangeEvent<HTMLInputElement>) => this.setEd({ [f]: parseFloat(e.target.value) });
    return {
      editing: true, fw: fr.fw, fh: fr.fh, bw: bs.bw, bh: bs.bh, edBg: `url("${this.blobUrl(ed.queue[ed.i])}") center/100% 100% no-repeat`,
      edTransform: `translate(${ed.tx}px, ${ed.ty}px) rotate(${ed.rot}deg) scale(${ed.scale}) skew(${ed.skx}deg, ${ed.sky}deg)`,
      edAvatar: ed.target === 'avatar', edOne: !!ed.paper || ed.target === 'avatar' || ed.target === 'cover',
      // Across two pages: only for a new picture (not a cover, profile photo, blank page or one being re-fitted).
      edCanSpread: !ed.target && ed.replaceIdx == null && !ed.paper, edSpread: !!ed.spread,
      edSpreadNote: isLeftPage(this.state.images.length) ? 'It’s cut at the dashed line onto two facing pages.' : 'It’s cut at the dashed line onto two facing pages. A blank page goes first, so they face each other.',
      setSpread: (on: boolean) => this.setState(s => ({ edit: { ...s.edit!, spread: on, scale: 1, rot: 0, skx: 0, sky: 0, tx: 0, ty: 0 } }), () => this.applyAuto()),
      edTitle: ed.target === 'avatar' ? 'Profile photo' : ed.paper ? `${ed.paper[0].toUpperCase()}${ed.paper.slice(1)} page` : ed.target === 'cover' ? 'Cover image' : ed.replaceIdx != null ? `Edit page ${ed.replaceIdx + 1}` : `Image ${ed.i + 1} of ${ed.queue.length}`,
      scale: ed.scale, rot: ed.rot, skx: ed.skx, sky: ed.sky,
      scaleLbl: `${Math.round(ed.scale * 100)}%`, rotLbl: `${ed.rot}°`, skxLbl: `${ed.skx}°`, skyLbl: `${ed.sky}°`,
      onScale: num('scale'), onRot: num('rot'), onSkx: num('skx'), onSky: num('sky'),
      rot90: () => this.setEd({ rot: ((ed.rot + 90 + 180) % 360) - 180 }),
      resetEd: () => ed.mode === 'adjust' ? this.setEd({ adj: NO_ADJUST }) : this.setEd({ scale: 1, rot: 0, skx: 0, sky: 0, tx: 0, ty: 0 }),
      // Straightened and cropped automatically: say so, with the way back (and back again).
      edAuto: !!ed.auto, edAutoOn: !!ed.auto && (['scale', 'rot', 'skx', 'sky', 'tx', 'ty'] as const).every(k => ed[k] === ed.auto![k]),
      autoFit: () => ed.auto && this.setEd({ ...ed.auto }),
      edMode: ed.mode, setEdMode: (mode: EdMode) => this.setEd({ mode, sel: null }), edBlank: !!ed.paper,
      ...this.drawVals(ed),
      ...this.writeVals(ed, fr),
      edAdjTool: this.state.edAdjTool || 'white', setEdAdjTool: (t: string) => this.setState({ edAdjTool: t }),
      edPeek: !!this.state.edPeek, peekOn: () => this.setState({ edPeek: true }), peekOff: () => this.state.edPeek && this.setState({ edPeek: false }),
      edFx: feValues(ed.adj), edAdjusted: isAdjusted(ed.adj),
      edAdj: ADJUSTERS.map(([k, label, min, max]) => ({ key: k, label, min, max, value: ed.adj[k], lbl: (ed.adj[k] > 0 && min < 0 ? '+' : '') + ed.adj[k],
        onChange: (e: ChangeEvent<HTMLInputElement>) => { const v = Math.round(parseFloat(e.target.value)); this.setState(s => s.edit ? { edit: { ...s.edit, adj: { ...s.edit.adj, [k]: Math.abs(v) < 3 ? 0 : v } } } : null); } })),
      applyEdit: () => this.applyEdit(), skipEdit: () => this.nextEdit(), cancelEdit: () => this.setState({ edit: null }),
      applyLbl: ed.target === 'avatar' ? 'Use photo' : ed.target === 'cover' ? 'Save cover' : ed.replaceIdx != null ? 'Save page' : 'Add to sketchbook',
      // One pointer drags the image; two pinch to zoom and twist to rotate.
      edDown: (e: PointerEvent<HTMLDivElement>) => {
        e.stopPropagation(); try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* pointer already gone */ }
        if (ed.mode === 'write') return this.inkDown(e);
        if (ed.mode === 'draw') return this.drawDown(e);
        if (ed.mode === 'pick') return;
        this.edPts.set(e.pointerId, { x: e.clientX, y: e.clientY }); this.edGestureStart();
      },
      edMove: (e: PointerEvent) => {
        if (ed.mode === 'write') return this.inkMove(e);
        if (ed.mode === 'draw') return this.drawMove(e);
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
      edUp: (e: PointerEvent) => { if (ed.mode === 'write' || ed.mode === 'draw') return this.inkUp(e); this.edPts.delete(e.pointerId); this.edGestureStart(); },
      edMob: this.state.vw < 640, edTool: this.state.edTool || 'scale', setEdTool: (t: string) => this.setState({ edTool: t }),
      edWheel: (e: WheelEvent) => { e.stopPropagation(); this.setEd({ scale: Math.max(0.3, Math.min(4, ed.scale * (e.deltaY > 0 ? 0.95 : 1.05))) }); },
    };
  }

  /** The 3D book, carousel, focus view and page manager. */
  /** What changes from one animation frame to the next: where the book, its leaves and the shelf are. */
  frameVals(): V {
    const s = this.state, { p, books, active } = s, other = s.other;
    const { W, H } = this.dims(), L = this.layoutDims(), scale = H / L.H;
    const N = this.nLeaves(), fan = CONFIG.fan, tilt = CONFIG.tilt, fz = s.fz || 0;
    const book = (other || books[active] || {}) as AnyBook;

    // Horizontal shift: a closed book sits centred on its cover; in focus the chosen page is centred.
    const shiftN = p < 1 ? -W / 2 * (1 - p) : p > N - 1 ? W / 2 * (p - (N - 1)) : 0;
    const fL = s.fside === 'L' && p > 0.5, fsx = (s.fsx || 0) * clamp01(p * 2 - 1);
    const shiftR = -W / 2 + W * clamp01(p - (N - 1)), shiftF = shiftR + (W / 2 - shiftR) * fsx;
    const shift = shiftN + (shiftF - shiftN) * fz;

    // Only the leaves near the open spread are drawn: the rest lie flat under them, out of sight, and drawing every
    // page of a long book (two full-size photos each) is what made opening and turning slow on phones.
    // Everything below is decided around the spread the book last rested on (rest) as well as where it is now, so a
    // turn doesn't add leaves, swap in sharper photos or build its curl strips on its first frame (which made each
    // turn start with a hitch); those changes happen once the book settles.
    const rest = this.moving ? this.rest : Math.round(p), fp = Math.floor(p), cp = Math.ceil(p);
    const lo = Math.max(0, Math.min(rest - LEAF_WINDOW, fp - 2)), hi = Math.min(N - 1, Math.max(rest + LEAF_WINDOW, cp + 2));
    this.prefetchPages(lo, hi);
    const leaves = Array.from({ length: hi - lo + 1 }, (_, j) => {
      const i = lo + j, x = p - i, t = clamp01(x);
      const A = fan * 2.5 * clamp01(Math.min(p, N - p));
      const ease = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      // Pages near the one turning fan out, always in order so none passes through another.
      const a = -(A * clamp01((x + 2.5) / 2.5) + (180 - 2 * A) * ease + A * clamp01((x - 1) / 2.5));
      const rad = -a * Math.PI / 180;
      // Leaves out of sight (under the open spread, waiting to be turned to) use the small copy of each photo;
      // the spread and the leaf turning use the full one. Less to decode and hold in memory on phones.
      const small = i < Math.min(rest - 2, fp - 1) || i > Math.max(rest + 2, cp + 1), F = this.face(i, 0, L.W, small), B = this.face(i, 1, L.W, small);
      // Mid-turn the page bends: the outer edge trails behind the turn, most at halfway.
      // Paper turn: the outer edge leads as the page lifts, then the curl relaxes as it lands.
      // Capped so the tip never swings past the pages lying on either side.
      const curlAmt = t > 0.01 && t < 0.99 ? Math.sin(Math.PI * t) * (1.2 - t) / 0.95 : 0;
      const forward = this.drag ? p >= this.drag.p0 : this.target >= p;
      const curlTotal = Math.min(CURL_DEG * curlAmt, forward ? 178 + a : -a - 2);
      return {
        curl: curlAmt && curlTotal > 0.5 ? (forward ? -1 : 1) * curlTotal : 0, curlAmt: Math.min(1, curlAmt),
        // The leaves either side of the resting spread keep their curl strips built (hidden) so a turn can start at once.
        curlable: i >= Math.min(rest - 1, fp) && i <= Math.max(rest, fp),
        wearF: F.wear, wearB: B.wear, overlayF: F.wear?.overlay || (F.inside ? COVER_INSIDE : ''), overlayB: B.wear?.overlay || (B.inside ? COVER_INSIDE : ''),
        key: i, label: book.name, isCover: i === 0 && !book.coverImg, isCoverAny: i === 0, isBackCover: i === N - 1,
        transform: `rotateY(${a}deg) translateZ(${((N - i) * 0.5).toFixed(2)}px)`, frontBg: F.bg, backBg: B.bg,
        shadeF: (0.35 * Math.sin(rad) * (rad < Math.PI / 2 ? 1 : 0)).toFixed(3), shadeB: (0.3 * Math.max(0, Math.sin(rad)) * (rad > Math.PI / 2 ? 1 : 0)).toFixed(3),
        numF: F.num, numB: B.num, noteF: F.note || '', noteB: B.note || '', noteFs: Math.max(9, Math.min(15, Math.round(L.H * 0.026))),
        // On touch screens, tapping a zoomed page only brings the controls back (swipe to move between pages).
        openFront: () => { if (!this.moved && !(IS_TOUCH && this.state.focus)) this.focusOn(i, 'R'); },
        openBack: () => { if (!this.moved && !(IS_TOUCH && this.state.focus)) this.focusOn(i + 1, 'L'); },
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


    return {
      fz: fz.toFixed(3), uiOp: (1 - fz).toFixed(3), uiPE: fz > 0.5 ? 'none' : 'auto', railOp: fz.toFixed(3),
      focusBg: (() => {
        if (fz < 0.001) return '';
        const r = Math.round(p), f = fL || r >= N - 1 ? this.face(Math.max(1, Math.min(N - 2, r - 1)), 1) : this.face(Math.max(1, r), 0);
        const soft = f.idx >= 0 ? this.softCopy(this.thumbOf(book, s.images[f.idx])) : null;
        return soft ? `url("${soft}") center/100% 100% no-repeat ${PAPER}` : `radial-gradient(circle at 30% 35%, ${book.color} 0, transparent 55%), radial-gradient(circle at 72% 68%, #C9C3B4 0, transparent 55%), ${PAPER}`;
      })(),
      // The real book carries the closed-book back board until opened so the carousel hand-over doesn't pop.
      openShadowOp: clamp01(Math.min(p, N - p) * 3).toFixed(3), bodyOp: (1 - clamp01(Math.min(p, N - p) * 4)).toFixed(3),
      // Closed on its back, the book is turned over: the spine is on the right, so the page block and board stick out on the left.
      bodyBack: p > N / 2, bodyLeft: p > N / 2 ? -L.W : 0, boardColor: book.color || '#b8243a',
      bookOp: sw ? 0 : 1, titleName: other ? other.name : (books[Math.round(car)] || book).name,
      titleOp: ((sw ? 1 - Math.sin(Math.PI * (s.swT || 0)) * 0.85 : 1) * (1 - fz)).toFixed(3),
      sideBooks, sbBase: `rotateX(${tilt}deg)`, ghostT: sideT(books.length), ghostW: ghostD.W, ghostH: ghostD.H, ghostTop: -ghostD.H / 2,
      W: L.W, H: L.H, leaves,
      // Zoomed in, the page is centred on the whole screen rather than on the book area below the title.
      bookTransform: `translateY(${((s.vh / 2 - ((s.st ?? 0) + (s.sh || s.vh) / 2)) * fz).toFixed(1)}px) rotateX(${(tilt * (1 - fz) + 3 * fz).toFixed(2)}deg) translateX(${shift}px)${scale !== 1 ? ` scale(${scale.toFixed(4)})` : ''}`,
      shadowLeft: -L.W * clamp01(p), shadowW: L.W * (clamp01(p) + clamp01(N - p)),
      emptyOp: !s.images.length && !other && !sw ? 1 : 0,
      onDown: (e: PointerEvent) => {
        this.stPts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (this.stPts.size === 2) {
          // Two fingers: a pinch, not a page turn. Put any half-turned page back.
          const [a, b] = [...this.stPts.values()]; this.pinch0 = Math.hypot(b.x - a.x, b.y - a.y) || 1;
          if (this.drag) { this.drag = null; this.animate(); }
          return;
        }
        this.startMoving(); this.drag = { x: e.clientX, p0: this.state.p, id: e.pointerId }; this.moved = false; cancelAnimationFrame(this.raf);
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
        this.frameState({ p: Math.max(-0.15, Math.min(N + 0.15, this.drag.p0 - dx / (W * 1.1))) });
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
        // In focus view a swipe steps one page, like the arrow keys: from a left page to its right page first,
        // and only then on to the next spread (a picture across both pages counts as one).
        if (this.state.focus && moved) {
          this.target = p0;
          if (Math.abs(dx) > 30) return this.focusGo(dx < 0 ? 1 : -1);
          return this.focusOn(p0, this.state.fside || 'R');
        }
        this.turnTo(tp, p0); this.animate();
      },
      onWheel: (e: WheelEvent) => { const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY; if (this.wheelLock || Math.abs(d) < 8) return; this.wheelLock = true; setTimeout(() => this.wheelLock = false, 380); this.go(d > 0 ? 1 : -1); },
      zoomIn: () => { if (this.state.focus) return; const fp = Math.max(1, Math.min(N - 1, Math.round(this.state.p))); this.focusOn(fp, this.autoSide(fp)); },
      zoomOut: () => this.state.focus ? this.setFocus(false) : this.setState(st => ({ zoom: Math.max(0.6, st.zoom - 0.15) })),
    };
  }

  bookVals(): V {
    const s = this.state, { images, books, active } = s, other = s.other, mode = s.mode || 'home';
    const book = (other || books[active] || {}) as AnyBook;
    const notes = (book as Book).notes || {}, setNote = (u: string, patch: PageNote) => {
      const cur = this.state.books[this.state.active], n = { ...cur.notes?.[u], ...patch };
      this.updateBook({ notes: { ...cur.notes, [u]: n } });
    };
    const sp = (book as Book).spreads || {}, fill = (book as Book).fillers || {};
    const pagesList = images.map((u, i) => ({
      // A spread's halves, and the blank pages that keep spreads on facing pages.
      spread: sp[u] ? 'Spread · left' : partner(u, sp) ? 'Spread · right' : '', filler: !!fill[u],
      key: u.length + ':' + i + ':' + u.slice(-24), bg: `url("${this.blobUrl(this.thumbOf(book, u))}") center/cover no-repeat #f3efe6`, num: String(i + 1),
      caption: notes[u]?.c || '', date: notes[u]?.d || '',
      onCaption: (e: ChangeEvent<HTMLInputElement>) => setNote(u, { c: e.target.value.slice(0, 140) }),
      onDate: (e: ChangeEvent<HTMLInputElement>) => setNote(u, { d: e.target.value }),
      edit: () => this.startEdit([images[i]], i), adjust: () => this.startEdit([images[i]], i, undefined, 'adjust'), write: () => this.startEdit([images[i]], i, undefined, 'write'), remove: () => { const p = partner(u, sp); this.setImages(images.filter((x, k) => k !== i && x !== p)); },
      // The open page follows the move (a spread moves two or three places, past any blank page).
      left: () => { this.movePage(i, i - 1); if (s.mgPage === i) this.setState(st => ({ mgPage: Math.max(0, st.images.indexOf(u)) })); },
      right: () => { this.movePage(i, i + 1); if (s.mgPage === i) this.setState(st => ({ mgPage: Math.max(0, st.images.indexOf(u)) })); },
      dragStart: (e: DragEvent) => { this.dragIdx = i; e.dataTransfer.effectAllowed = 'move'; },
      dragOver: (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); },
      drop: (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.files?.length) return this.addFiles(e.dataTransfer.files); if (this.dragIdx != null) this.movePage(this.dragIdx, i); this.dragIdx = null; },
    }));
    const blanks = this.nPages() - images.length;
    const m = s.vw < 640;

    const focusMode = CONFIG.focusMenu, foc = !!s.focus;
    const vis = !foc || (focusMode === 'auto-hide' ? s.ctrlShow !== false : focusMode === 'toggle' ? !!s.menuOpen : false);

    return {
      ...this.frameVals(), bgRefA: this.bgRefA,
      isMine: mode === 'mine', isOther: mode === 'other', isExplore: mode === 'explore', notOther: !other, showGhost: !other,
      navMineLine: mode === 'mine' ? INK : 'transparent', navMineFg: mode === 'mine' ? INK : STONE,
      navExLine: mode === 'explore' || mode === 'other' ? INK : 'transparent', navExFg: mode === 'explore' || mode === 'other' ? INK : STONE,
      isProfile: mode === 'profile', isHome: mode === 'home' && !!s.acct, isLanding: mode === 'home' && !s.acct,
      goHome: () => this.goMode('home'), goMine: () => this.goMode('mine'), goExplore: () => this.goMode('explore'), surprise: () => this.surprise(),
      openArtist: () => other && 'artist' in other && this.openProfile(this.whoOf(other)),
      otherPages: (other as OtherBook | null)?.pages || 0,
      artist: (other as OtherBook | null)?.artist || '',
      coverRef: this.coverRef, pickCover: () => this.coverRef.current?.click(),
      onCoverFile: (e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; const fr = new FileReader(); fr.onload = () => this.startEdit([fr.result as string], null, 'cover'); fr.readAsDataURL(f); },
      hasCoverImg: !!book.coverImg, removeCover: () => this.updateBook({ coverImg: null }),
      bookName: book.name,
      otherMature: !!(other as OtherBook | null)?.mature,
      bookMeta: (other ? `by ${(other as OtherBook).artist} · ${(other as OtherBook).pages} pages` : books.length > 1 ? `${images.length} ${images.length === 1 ? 'page' : 'pages'} · ${active + 1} of ${books.length}` : `${images.length} ${images.length === 1 ? 'page' : 'pages'}`) + (!other && (book as Book).linkOnly ? ' · Link only' : !other && (book as Book).isPublic === false ? ' · Private' : '') + ((other ? (other as OtherBook).mature : (book as Book).mature || (book as Book).matureLock) ? ' · Mature' : '')
        + (!other && (book as Book).role === 'collab' ? ` · ${(book as Book).owner?.name}’s, shared with you` : !other && (book as Book).collabs?.length ? ` · with ${names((book as Book).collabs)}` : ''),
      multi: !other && books.length > 1, prevBook: () => this.switchBook(active - 1), nextBook: () => this.switchBook(active + 1),
      prevOp: active > 0 ? 1 : 0.3, nextOp: active < books.length - 1 ? 1 : 0.3,
      newBook: this.openNewPick, stopPD: (e: PointerEvent) => e.stopPropagation(),
      vw: s.vw, isTouch: IS_TOUCH,
      tabBar: m && !!s.acct && mode !== 'auth' && !s.embed,
      navCompact: m && !s.acct && !s.embed,
      embed: !!s.embed, embedHref: (() => { const o = other as OtherBook | null; return o ? `${location.origin}/@${o.handle}/${o.id}` : location.origin; })(),
      // Embed code for a public sketchbook.
      bkEmbed: () => { const o = other as OtherBook | null, mb = books[active]; const id = o?.id || mb?.id, title = o?.name || mb?.name; if (id && !id.startsWith('local')) this.setState({ embedFor: { id, title }, more: null }); },
      emOpen: !!s.embedFor, emTitle: s.embedFor?.title || '',
      emCode: s.embedFor ? `<iframe src="${location.origin}/embed/${s.embedFor.id}" title="${(s.embedFor.title || 'sketchbook').replace(/"/g, '&quot;')} on fletora" width="100%" height="520" style="border:0;max-width:900px" loading="lazy" allowfullscreen></iframe>` : '',
      emCopy: () => { const f = s.embedFor; if (!f) return; navigator.clipboard.writeText(`<iframe src="${location.origin}/embed/${f.id}" title="${(f.title || 'sketchbook').replace(/"/g, '&quot;')} on fletora" width="100%" height="520" style="border:0;max-width:900px" loading="lazy" allowfullscreen></iframe>`).then(() => this.toast('Embed code copied'), () => this.toast('Select the code and copy it')); },
      emClose: () => this.setState({ embedFor: null }),
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
      mgSummary: `${images.length} ${images.length === 1 ? 'page' : 'pages'} · ${(book as Book).hidden ? 'Private' : (book as Book).linkOnly ? 'Link only' : (book as Book).isPublic === false ? 'Private' : 'Public'}${(book as Book).collabs?.length ? ' · with ' + names((book as Book).collabs) : (book as Book).role === 'collab' ? ' · ' + (book as Book).owner?.name + '’s, shared with you' : ''}`,
      ...(() => {
        const o = other as OtherBook | null, mineB = books[active];
        return {
          bkVerified: !!o && !o.arch && this.isTeam(o.ownerId),
          bkSaved: this.isSaved(o?.id), bkSave: () => o && this.toggleSave(o),
          bkLiked: !!(o && s.liked?.[o.id]), bkLike: () => o && this.toggleLike(o),
          bkLikes: (() => { const id = o?.id || (mineB && !mineB.id.startsWith('local') ? mineB.id : ''); return id ? s.counts?.['b:' + id] || 0 : 0; })(),
          bkShare: () => o ? this.share(o.arch ? `/archive/${o.id}` : `/@${o.handle}/${o.id}`, `${o.name} by ${o.artist}`) : s.acct && mineB && this.share(`/@${mineB.owner?.handle || s.acct.handle}/${mineB.id}`, `${mineB.name} by ${mineB.owner?.name || s.acct.name}`),
          bkCanShare: !!o || (!!s.acct && (mineB?.isPublic !== false || !!mineB?.linkOnly) && !mineB?.id.startsWith('local')),
          bkMoreOpen: s.more === 'book', bkMore: () => this.setState(st => ({ more: st.more === 'book' ? null : 'book' })),
          bkArch: o?.arch ? { years: o.arch.years, source: o.arch.source, url: o.arch.url, note: o.arch.note } : (() => { const e = mineB && (s.archive || []).find(b => b.id === mineB.id)?.arch; return s.mode === 'mine' && e ? { years: e.years, source: e.source, url: e.url, note: e.note, own: true } : null; })(),
          bkArchLbl: (s.archive || []).some(b => b.id === (o?.id || mineB?.id)) ? 'Edit archive details…' : 'Add to the archive…',
          bkArchEdit: () => { const id = o?.id || (mineB && !mineB.id.startsWith('local') ? mineB.id : ''); if (id) this.openArchForm(id); },
          bkIsAdmin: !!s.admin, bkPickLbl: o && s.pick?.id === o.id ? 'Remove staff pick' : 'Make staff pick', bkPick: () => o && this.togglePick(o),
          bkReport: () => o && this.openReport({ kind: 'book', targetId: o.id, ownerId: o.ownerId || '', label: `“${o.name}”` }),
          bkBlock: () => o?.ownerId && this.toggleBlock(o.ownerId, o.artist), bkBlockLbl: `Block ${o?.artist || ''}`,
          closeMore: () => (s.more || s.notifOpen || s.colMenu || s.socialMenu) && this.setState({ more: null, notifOpen: false, colMenu: null, socialMenu: false }),
          toastMsg: s.toast || '',
          ...this.notifVals(),
          reportOpen: !!s.reportFor, reportLabel: s.reportFor?.label || '', reportKind: s.reportFor?.kind, reportReasons: api.REPORT_REASONS.map(r => ({ key: r, label: r, on: s.reportReason === r, pick: () => this.setState({ reportReason: r, reportErr: '' }) })),
          reportNote: s.reportNote || '', onReportNote: (e: ChangeEvent<HTMLTextAreaElement>) => this.setState({ reportNote: e.target.value }), reportBusy: !!s.reportBusy, reportErr: s.reportErr || '',
          closeReport: () => this.setState({ reportFor: null }),
          submitReport: async () => {
            const r = s.reportFor, a = s.acct; if (!r || !a) return;
            if (!s.reportReason) return this.setState({ reportErr: 'Choose a reason.' });
            this.setState({ reportBusy: true });
            // Moderators can't read conversations, so a reported message travels with the report.
            const note = r.quote ? `Message: “${r.quote.slice(0, 300)}”\n${s.reportNote || ''}`.slice(0, 500) : s.reportNote || '';
            try { await api.report(a.uid, { kind: r.kind, targetId: r.targetId, ownerId: r.ownerId, reason: s.reportReason, note }); this.setState({ reportFor: null }); this.toast('Thanks. We’ll take a look.'); }
            catch (e) { this.setState({ reportErr: api.errMsg(e) }); }
            finally { this.setState({ reportBusy: false }); }
          },
        };
      })(),
      bookHidden: !other && !!(book as Book).hidden,
      // Who can see it: public, link only (Plus) or private.
      bookVis: (book as Book).hidden ? 'private' : (book as Book).linkOnly ? 'link' : (book as Book).isPublic === false ? 'private' : 'public',
      setVis: (k: 'public' | 'link' | 'private') => {
        if ((book as Book).hidden) return;
        if (k === 'link' && !s.plus) return this.openPlus('link');
        this.updateBook({ isPublic: k === 'public', linkOnly: k === 'link' });
      },
      // Mature: the owner labels it, or the upload check did (and then only moderators can take it off).
      mtShow: !other && (book as Book).role !== 'collab', mtBook: !!(book as Book).mature || !!(book as Book).matureLock, mtLock: !!(book as Book).matureLock,
      mtBookToggle: () => { const b = book as Book; if (!b.matureLock) this.updateBook({ mature: !b.mature }); },
      ...(() => {
        // Stats and pinning (Plus), for the owner of a saved sketchbook.
        const b = book as Book, st = s.stats?.id === b.id ? s.stats.s : null, a = s.acct, likes = s.counts?.['b:' + b.id] || 0;
        const own = !other && !!a && b.role !== 'collab' && !b.id?.startsWith('local'), pinned = !!a?.pin && a.pin === b.id && !!s.plus;
        const src: [ViewSource, string][] = [['explore', 'Explore'], ['profile', 'Profiles'], ['home', 'Home'], ['link', 'Links'], ['embed', 'Embeds']];
        return {
          stOwn: own, stPlus: !!s.plus, stReady: !!st,
          stTotals: st ? [[st.views, st.views === 1 ? 'view' : 'views'], [likes, likes === 1 ? 'like' : 'likes'], [st.saves, st.saves === 1 ? 'save' : 'saves']].map(([n, l]) => ({ n: fmtK(n as number), l })) : [],
          stFrom: st ? src.map(([k, l]) => ({ key: k, label: l, n: st.from[k], share: st.views ? st.from[k] / st.views : 0 })) : [],
          stTeaser: st ? (st.views ? `Viewed ${fmtK(st.views)} ${st.views === 1 ? 'time' : 'times'} so far.` : 'No views yet.') : '',
          stUpgrade: () => this.openPlus('stats'),
          pinOn: pinned,
          togglePin: () => {
            if (!a || !own) return;
            if (!s.plus) return this.openPlus('pin');
            const next = pinned ? '' : b.id;
            this.setState({ acct: { ...a, pin: next } });
            api.setPin(a.uid, next).then(() => this.toast(next ? 'Pinned to your profile' : 'Unpinned')).catch(e => { console.error(e); this.setState({ acct: { ...a } }); this.toast('Couldn’t change that. Try again.'); });
          },
        };
      })(),
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
          mgPrompt: currentPrompt().word, mgPromptTag: currentPrompt().tag, mgPromptIn: tags.includes(currentPrompt().tag),
          mgJoinPrompt: () => { const t = currentPrompt().tag, cur = this.state.books[this.state.active].tags || []; if (cur.includes(t)) return; if (cur.length >= MAX_TAGS) return this.toast(`Remove a tag first (up to ${MAX_TAGS})`); this.updateBook({ tags: [...cur, t] }); },
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
      mgPdf: () => this.downloadPdf(), mgPdfBusy: s.pdfBusy || '', mgPdfPlus: !!s.plus,
      ...(() => {
        // Sharing panel on the Pages screen.
        const b = book as Book, isCollab = !other && b.role === 'collab';
        return {
          isCollab, canShare: !other && !isCollab && !!s.acct && !b.id?.startsWith('local'),
          shOwner: b.owner?.name || '', shOwnerHandle: b.owner?.handle ? '@' + b.owner.handle : '',
          // Up to one person on the free plan, five with Plus (people drawing in it plus invitations waiting).
          ...(() => {
            const limit = s.plus ? api.SHARE_PLUS : api.SHARE_FREE, used = (b.collabs?.length || 0) + (b.invites?.length || 0);
            return {
              shPeople: (b.collabs || []).map(m => ({ key: m.uid, name: m.name || '@' + m.handle, handle: '@' + m.handle,
                remove: () => this.ask({ title: `Stop sharing with ${m.name || '@' + m.handle}?`, text: `They won’t be able to add pages to “${b.name}” any more. The pages they added stay in it.`, yes: 'Stop sharing', danger: true,
                  run: () => this.share$(() => api.endShare(b.id, m.uid), 'Sharing stopped') }) })),
              shInvites: (b.invites || []).map(m => ({ key: m.uid, name: m.name || '@' + m.handle, handle: '@' + m.handle,
                cancel: () => this.share$(() => api.cancelInvite(b.id, m.uid), 'Invitation cancelled') })),
              shRoom: used < limit, shPlus: !!s.plus, shUsed: used, shLimit: limit,
              shMore: () => this.openPlus('people'),
              shDraft: s.shDraft || '', shBusy: !!s.shBusy, shErr: s.shErr || '',
              onShDraft: (e: ChangeEvent<HTMLInputElement>) => this.setState({ shDraft: slug(e.target.value), shErr: '' }),
              shInviteSend: (e?: { preventDefault(): void }) => { e?.preventDefault(); const a = s.acct, h = s.shDraft; if (!a || !h) return;
                this.share$(() => api.invite(a, { id: b.id, name: b.name }, h, limit), `Invitation sent to @${h}`); },
            };
          })(),
          shLeave: () => this.ask({ title: `Leave “${b.name}”?`, text: `It goes back to being ${b.owner?.name}’s without you. The pages you added stay in it.`, yes: 'Leave', danger: true, run: () =>
            this.share$(async () => { await api.endShare(b.id, s.acct?.uid || ''); this.setState(st => { const books = st.books.filter(x => x.id !== b.id), k = Math.max(0, Math.min(st.active, books.length - 1)); return { books, active: k, images: books[k]?.images || [], managing: false }; }); }, `You left “${b.name}”`) }),
        };
      })(),
      stageRef: this.stageRef, fileRef: this.fileRef,
      ctrlOp: vis ? 1 : 0, ctrlY: vis ? 0 : 24, ctrlPE: vis ? 'auto' : 'none',
      showHandle: foc && focusMode === 'toggle', handleLbl: s.menuOpen ? 'Hide menu' : 'Show menu',
      toggleMenu: () => this.setState(st => ({ menuOpen: !st.menuOpen })),
      showRail: foc && focusMode === 'side rail',
      wake: () => {
        if (!foc || focusMode !== 'auto-hide') return; if (this.state.ctrlShow === false) this.setState({ ctrlShow: true });
        clearTimeout(this.wakeT); this.wakeT = setTimeout(() => this.state.focus && this.setState({ ctrlShow: false }), 1800);
      },
      pick: () => this.fileRef.current?.click(), pickCamera: () => this.camRef.current?.click(), addBlank: (k: Paper) => this.addBlank(k),
      onFiles: (e: ChangeEvent<HTMLInputElement>) => { if (e.target.files) this.addFiles(e.target.files); e.target.value = ''; },
      onDragOver: (e: DragEvent) => e.preventDefault(),
      onDrop: (e: DragEvent) => { e.preventDefault(); this.addFiles(e.dataTransfer.files); },
    };
  }

  render() {
    // Blank paper until we know whether someone is signed in, so the landing page doesn't flash first.
    if (!this.state.authReady) return <div style={{ position: 'fixed', inset: 0, background: PAPER }} />;
    if (this.inFrame && this.lastV) return <Stage v={{ ...this.lastV, ...this.frameVals(), $frame: true }}>{this.lastKids}</Stage>;
    const mode = this.state.mode || 'home';
    const v: V = {
      ...this.editorVals(),
      ...this.bookVals(),
      ...(mode === 'home' ? this.homeVals() : {}),
      ...(mode === 'profile' ? this.profileVals() : {}),
      ...(mode === 'explore' ? this.exploreVals() : {}),
      ...(mode === 'admin' ? this.adminVals() : {}),
      ...(mode === 'messages' && this.state.acct ? this.messagesVals() : {}),
      ...this.accountVals(),
    };
    const kids = (
      <>
        {(v.isLanding || v.isHome) && <HomeScreen v={v} />}
        {v.isExplore && <Explore v={v} />}
        {v.isProfile && <Profile v={v} />}
        {v.isSettings && <Settings v={v} />}
        {v.isBilling && <BillingPage v={v} />}
        {v.isLegal && <Legal v={v} />}
        {v.isNotFound && <NotFound v={v} />}
        {v.isAction && <AuthAction v={v} />}
        {v.isAdminPage && <Admin v={v} />}
        {v.isMessages && <Messages v={v} />}
        {v.reportOpen && <ReportModal v={v} />}
        {v.emOpen && <EmbedModal v={v} />}
        {v.cnOpen && <CollectionModal v={v} />}
        {v.arOpen && <ArchiveModal v={v} />}
        {v.toastMsg && <Toast msg={v.toastMsg} />}
        {v.isAuth && <AuthPage v={v} />}
        {v.pfEditing && <EditProfile v={v} />}
        {v.welcomeOpen && <Welcome v={v} />}
        <input ref={this.avRef} type="file" accept="image/*" onChange={v.onAvFile} style={{ display: 'none' }} />
        {v.newPick && <NewBookPicker v={v} />}
        {v.managing && <Manager v={v} />}
        {v.editing && <Editor v={v} />}
        {v.plOpen && <PlusModal v={v} />}
        {v.isBilling && v.bdAsk && <PlanConfirm v={v} />}
        {v.gfOpen && <GiftModal v={v} />}
        {v.askQ && <AskModal v={v} />}
        {v.anAsk && <ConsentBar v={v} />}
        {v.isBilling && v.cardSecret && <CardModal v={v} />}
        <input ref={this.fileRef} type="file" accept="image/*" multiple onChange={v.onFiles} style={{ display: 'none' }} />
        {/* Phones: opens the camera straight away. */}
        <input ref={this.camRef} type="file" accept="image/*" capture="environment" onChange={v.onFiles} style={{ display: 'none' }} />
      </>
    );
    this.lastV = v; this.lastKids = kids;
    return <Stage v={v}>{kids}</Stage>;
  }
}
