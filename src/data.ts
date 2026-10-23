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

export interface Book {
  id: number | string;
  name: string;
  color: string;
  images: string[];
  shape?: ShapeKey;
  coverImg?: string | null;
}

export interface OtherBook {
  id: string; idx: number; shape: ShapeKey; likes: number; artist: string; name: string;
  color: string; images: string[]; pages: number; initials: string; coverImg?: null;
}

export const EXPLORE: OtherBook[] = ([
  ['Mira Okafor', 'night market', '#e8542f'], ['Jun Park', 'studies 03', '#2f4a7a'], ['Tomás Reyes', 'birds of lisbon', '#3f7a5a'], ['Elif Kaya', 'figure drawing', '#b8243a'],
  ['Noor Haddad', 'ink only', '#1f1f24'], ['Sam Lindqvist', 'commute', '#d9a42b'], ['Ana Ruiz', 'plants & pots', '#6b4fa0'], ['Kofi Mensah', 'summer 26', '#c8643c'],
] as const).map(([artist, name, color], i) => ({
  id: 'x' + i, idx: i,
  shape: (['portrait', 'landscape', 'square', 'pocket', 'portrait', 'panorama', 'square', 'landscape'] as ShapeKey[])[i],
  likes: [2410, 860, 1530, 3120, 640, 1980, 1190, 420][i],
  artist, name, color, images: [], pages: 12 + (i % 3) * 8,
  initials: artist.split(' ').map(w => w[0]).join(''),
}));

/** handle, location, bio, extra sketchbook names */
export const ARTISTS: Record<string, [string, string, string, string[]]> = {
  'Mira Okafor': ['miraok', 'Lagos → Berlin', 'Street food, neon and the people who stay up late. Mostly gouache.', ['market mornings', 'lagos 25']],
  'Jun Park': ['junpark', 'Seoul', 'Daily studies. Hands, folds, light on concrete.', ['studies 02', 'studies 01']],
  'Tomás Reyes': ['tomasdraws', 'Lisbon', 'Birds, rooftops and tiles from my window.', ['azulejos']],
  'Elif Kaya': ['elifkaya', 'Istanbul', 'Life drawing every Thursday. Charcoal and red pencil.', ['gesture 60s', 'portraits', 'café regulars']],
  'Noor Haddad': ['noor.ink', 'Amman', 'One brush pen, no pencils, no undo.', ['ink only ii']],
  'Sam Lindqvist': ['samlq', 'Stockholm', 'Drawn on the 7:42 every weekday.', ['commute 25', 'platforms']],
  'Ana Ruiz': ['anaruiz', 'Mexico City', 'Houseplants and the pots they live in. Watercolor.', ['succulents']],
  'Kofi Mensah': ['kofim', 'Accra', 'Beaches, buses and summer light.', ['harmattan']],
};

/** Cover width (% of its grid cell) per shape, so books in a row read as a shelf. */
export const GRID_WIDTH: Record<ShapeKey, number> = { pocket: 64, portrait: 78, square: 88, landscape: 100, panorama: 100 };
/** Cover width (% of its 4:5 canvas panel) on the home page. */
export const PANEL_WIDTH: Record<ShapeKey, number> = { pocket: 48, portrait: 58, square: 66, landscape: 78, panorama: 84 };

export interface Account {
  name: string; handle: string; email: string; bio: string; loc: string; web: string;
  accent: string; av: string | null; joined: number;
}
