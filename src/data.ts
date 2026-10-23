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
}

/** Someone else's sketchbook: read-only. `likes` drives the Featured sort. */
export interface OtherBook {
  id: string; idx: number; shape: ShapeKey; likes: number; artist: string; name: string;
  color: string; images: string[]; pages: number; initials: string; coverImg?: string | null;
  ownerId?: string; handle?: string; updatedAt?: number;
}

/** Cover width (% of its grid cell) per shape, so books in a row read as a shelf. */
export const GRID_WIDTH: Record<ShapeKey, number> = { pocket: 64, portrait: 78, square: 88, landscape: 100, panorama: 100 };

export interface Account {
  uid: string;
  name: string; handle: string; email: string; bio: string; loc: string; web: string;
  accent: string; av: string | null; joined: number;
}
