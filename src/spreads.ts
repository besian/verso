// Pictures across two pages ("spreads"): a left half and a right half that always sit side by side when the book
// is open. Page 1 is a right-hand page on its own, so a spread's left half must be on an even page number
// (an odd index: 1, 3, 5…). When pages move or are removed, `alignSpreads` keeps every spread on an opening by
// adding a blank filler page in front of it where needed, and dropping fillers that are no longer needed.

/** Left half → right half. */
export type Spreads = Record<string, string>;
export type Fillers = Record<string, true>;

/** Whether page `i` is the left page of an opening (page 1, index 0, is on the right on its own). */
export const isLeftPage = (i: number) => i % 2 === 1;

/**
 * Puts the pages in order with each spread's right half straight after its left half, and each left half on a
 * left page, using blank `makeFiller()` pages (reusing existing fillers first). Spreads whose halves aren't both
 * in the book are dropped.
 */
export function alignSpreads(images: string[], spreads: Spreads = {}, fillers: Fillers = {}, makeFiller: () => string): { images: string[]; spreads: Spreads; fillers: Fillers } {
  const has = new Set(images);
  const pairs: Spreads = Object.fromEntries(Object.entries(spreads).filter(([l, r]) => has.has(l) && has.has(r) && !fillers[l] && !fillers[r]));
  const rights = new Set(Object.values(pairs));
  const pool = images.filter(u => fillers[u]), out: string[] = [], used: Fillers = {};
  for (const u of images) {
    if (fillers[u] || rights.has(u)) continue;
    if (pairs[u]) {
      if (!isLeftPage(out.length)) { const f = pool.shift() || makeFiller(); out.push(f); used[f] = true; }
      out.push(u, pairs[u]);
    } else out.push(u);
  }
  return { images: out, spreads: pairs, fillers: used };
}

/** The other half of a spread page, if `u` is one. */
export function partner(u: string, spreads: Spreads = {}): string | null {
  if (spreads[u]) return spreads[u];
  for (const [l, r] of Object.entries(spreads)) if (r === u) return l;
  return null;
}

/** Renames a page in the spreads and fillers (when it's uploaded, or re-fitted). */
export function renamePage(spreads: Spreads = {}, fillers: Fillers = {}, swap: (u: string) => string): { spreads: Spreads; fillers: Fillers } {
  return {
    spreads: Object.fromEntries(Object.entries(spreads).map(([l, r]) => [swap(l), swap(r)])),
    fillers: Object.fromEntries(Object.keys(fillers).map(u => [swap(u), true])) as Fillers,
  };
}

/** Cuts a picture into its left and right halves, as page images. */
export function splitSpread(c: HTMLCanvasElement): [string, string] {
  const w = Math.floor(c.width / 2), half = (x: number) => {
    const h = document.createElement('canvas'); h.width = w; h.height = c.height;
    h.getContext('2d')!.drawImage(c, x, 0, w, c.height, 0, 0, w, c.height);
    return h.toDataURL('image/jpeg', 0.9);
  };
  return [half(0), half(c.width - w)];
}
