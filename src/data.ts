export type ShapeKey = 'pocket' | 'portrait' | 'square' | 'landscape' | 'panorama';
export interface Shape { a: number; s: number; label?: string }

/** a = width / height of one page, s = height relative to a portrait book. */
export const SHAPES: Record<ShapeKey, Shape> = {
  pocket: { a: 0.62, s: 0.82, label: 'Pocket' },
  portrait: { a: 0.72, s: 1, label: 'Portrait' },
  square: { a: 1, s: 0.86, label: 'Square' },
  landscape: { a: 1.35, s: 0.78, label: 'Landscape' },
  panorama: { a: 1.8, s: 0.64, label: 'Panorama' },
};

export const PALETTE = ['#b8243a', '#e8542f', '#2f4a7a', '#3f7a5a', '#d9a42b', '#1f1f24'];

/** Tunables that were "Tweaks" props in the design. */
export const CONFIG = {
  focusMenu: 'auto-hide' as 'auto-hide' | 'toggle' | 'side rail',
  fan: 7,
  tilt: 14,
  aspect: 'portrait' as 'portrait' | 'square' | 'landscape',
  minPages: 12,
};

/** One of the signed-in user's sketchbooks. Images are download URLs, or data URLs until uploaded. */
export interface Book {
  id: string;
  name: string;
  color: string;
  images: string[];
  shape?: ShapeKey;
  coverImg?: string | null;
  createdAt?: number;
  /** Defaults to public. */
  isPublic?: boolean;
  /** Plus: not public, but anyone with its link can open it. */
  linkOnly?: boolean;
  /** Pictures across two pages: left half → right half; and blank pages added to keep them on facing pages. */
  spreads?: Record<string, string>; fillers?: Record<string, true>;
  /** Labelled Mature (drawn nudity or sexual content); `matureLock` when the upload check did it. */
  mature?: boolean; matureLock?: boolean;
  /** Full image URL → thumbnail URL. */
  thumbs?: Record<string, string>;
  /** Page image URL → caption and date written in its margin. */
  notes?: Record<string, PageNote>;
  mediums?: string[];
  tags?: string[];
  /** Hidden by a moderator: stays private until they restore it. */
  hidden?: boolean;
  /** Shared sketchbooks: the owner, people who can add pages (one, or five with Plus), and invitations waiting. */
  role?: 'owner' | 'collab';
  owner?: Member; collabs?: Member[]; invites?: Member[];
}

export interface Member { uid: string; name: string; handle: string }

export interface PageNote { c?: string; d?: string }

export const MEDIUMS = ['Graphite', 'Ink', 'Watercolour', 'Gouache', 'Charcoal', 'Marker', 'Pastel', 'Coloured pencil', 'Digital', 'Collage', 'Mixed media'];
export const MAX_MEDIUMS = 4, MAX_TAGS = 8;
/** Lowercase, letters/numbers/hyphens only, at most 24 characters. */
export const tagSlug = (v: string) => v.toLowerCase().trim().replace(/^#/, '').replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);
export const mediumKey = (m: string) => m.toLowerCase().replace(/[^a-z]+/g, '-');

/** Someone else's sketchbook: read-only. `likes` drives the Featured sort. */
export interface OtherBook {
  id: string; idx: number; shape: ShapeKey; likes: number; artist: string; name: string;
  color: string; images: string[]; pages: number; initials: string; coverImg?: string | null;
  ownerId?: string; handle?: string; updatedAt?: number; thumbs?: Record<string, string>;
  notes?: Record<string, PageNote>; mediums?: string[]; tags?: string[];
  /** Labelled Mature: drawn nudity or sexual content. */
  mature?: boolean; collabIds?: string[];
  /** Pictures across two pages: left half → right half. */
  spreads?: Record<string, string>;
  /** Set for sketchbooks in From the archive: the historical artist and where the pages come from. */
  arch?: ArchiveEntry;
  /** The welcome sketchbook (see GUIDE_BOOK): read only, nothing to like, comment on or report. */
  guide?: boolean;
}
/** The welcome sketchbook: a short guide to fletora, leafed through like any other. Its pages are in
 *  public/welcome, and page 3 was painted in the editor, so it has a replay (public/welcome/replay.json). */
export const GUIDE_ID = 'guide', GUIDE_REPLAY_PAGE = '/welcome/page-3.jpg';
export const GUIDE_BOOK: OtherBook = {
  id: GUIDE_ID, idx: 0, shape: 'portrait', likes: 0, artist: 'fletora', name: 'Welcome to fletora', color: '#2f4a7a',
  images: [1, 2, 3, 4, 5, 6, 7, 8].map(n => `/welcome/page-${n}.jpg`), pages: 8, initials: 'f', guide: true,
};
/** A historical, public-domain sketchbook featured on Explore (archive/{bookId}). */
export interface ArchiveEntry { bookId: string; artist: string; years: string; source: string; url: string; note: string; at: number }

/** Cover width (% of its grid cell) per shape, so books in a row read as a shelf. */
export const GRID_WIDTH: Record<ShapeKey, number> = { pocket: 64, portrait: 78, square: 88, landscape: 100, panorama: 100 };

export interface Account {
  uid: string;
  name: string; handle: string; email: string; bio: string; loc: string; web: string;
  /** Optional ways to reach the artist, shown on their profile: an Instagram handle and a public contact email. */
  ig?: string; mail?: string;
  /** Social links: platform key (see socials.ts) → handle. */
  socials?: Record<string, string>;
  accent: string; av: string | null; joined: number;
  /** Plus: the sketchbook shown first on the profile. */
  pin?: string;
}
