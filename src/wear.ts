// "Used sketchbook" wear for inner pages: grain, yellowed edges, the odd coffee ring, thumb
// smudge and dog-eared corner. Everything is derived from a seed so a page always looks the same.

export type Corner = 'tl' | 'tr' | 'bl' | 'br';
export interface Wear {
  /** Page tint behind blank paper. */
  paper: string;
  /** Overlay background (multiply-blended over the page). */
  overlay: string;
  /** Folded corner, in px, or null. */
  ear: { corner: Corner; size: number } | null;
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function rng(seed: number) {
  return () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Paper grain as a small noise tile, drawn once to a PNG. (An SVG feTurbulence background looked the same but
 *  phones, Safari especially, re-ran the filter whenever a page was drawn, which made turning pages slow.) */
const grain = (alpha: number) => {
  if (typeof document === 'undefined') return 'none';
  const c = document.createElement('canvas'); c.width = c.height = 160;
  const ctx = c.getContext('2d'); if (!ctx) return 'none';
  const img = ctx.createImageData(160, 160), d = img.data, r = rng(7);
  for (let i = 0; i < d.length; i += 4) { d[i] = 140; d[i + 1] = 120; d[i + 2] = 92; d[i + 3] = Math.round(r() * r() * alpha * 1.5 * 255); }
  ctx.putImageData(img, 0, 0);
  return `url("${c.toDataURL('image/png')}")`;
};
const GRAIN = grain(0.11);
const PAPERS = ['#f3efe6', '#f1ece1', '#f4f0e7', '#efe9dc', '#f2ede3'];

/**
 * Wear for one page. `outer` is the side away from the spine ('r' for right-hand pages,
 * 'l' for left-hand ones); `w` is the page width in px. Applied the same over drawings.
 */
export function pageWear(seed: string, outer: 'l' | 'r', w: number): Wear {
  const r = rng(hash(seed)), pct = (a: number, b: number) => (a + r() * (b - a)).toFixed(1) + '%';
  const layers: string[] = [];
  const edge = outer === 'r' ? 'to left' : 'to right';
  // Thumb smudge near the outer edge, where the page gets turned.
  if (r() < 0.65) layers.push(`radial-gradient(ellipse 18% 11% at ${outer === 'r' ? pct(88, 96) : pct(4, 12)} ${pct(76, 92)}, rgba(70,58,44,.13), transparent 70%)`);
  // Coffee ring.
  if (r() < 0.18) {
    const x = pct(25, 75), y = pct(20, 75), rad = 9 + r() * 6;
    layers.push(`radial-gradient(circle at ${x} ${y}, transparent ${rad}%, rgba(128,84,38,.2) ${rad + 0.6}%, rgba(128,84,38,.09) ${rad + 1.5}%, transparent ${rad + 2.4}%)`);
    layers.push(`radial-gradient(circle at ${x} ${y}, rgba(128,84,38,.05), transparent ${rad}%)`);
  }
  // Foxing spots.
  const spots = r() < 0.4 ? 1 + Math.floor(r() * 3) : 0;
  for (let i = 0; i < spots; i++) layers.push(`radial-gradient(circle at ${pct(8, 92)} ${pct(8, 92)}, rgba(140,98,48,.16), transparent ${(1 + r() * 1.4).toFixed(1)}%)`);
  // A faint crease across the page.
  if (r() < 0.2) { const ang = Math.round(20 + r() * 140), at = 30 + r() * 40; layers.push(`linear-gradient(${ang}deg, transparent ${at.toFixed(1)}%, rgba(90,70,45,.13) ${(at + 0.25).toFixed(2)}%, transparent ${(at + 0.7).toFixed(2)}%)`); }
  // Worn, darker outer edge.
  layers.push(`linear-gradient(${edge}, rgba(120,92,52,${(0.12 + r() * 0.08).toFixed(3)}), transparent 5%)`);
  // Yellowing toward the edges, a little stronger on the outer side.
  layers.push(`radial-gradient(ellipse 85% 80% at ${outer === 'r' ? '42%' : '58%'} 50%, transparent 55%, rgba(150,116,58,${(0.14 + r() * 0.08).toFixed(3)}) 100%)`);
  layers.push(GRAIN);
  // Dog-ear on the top outer corner (the bottom corners carry the page numbers).
  const ear = r() < 0.32 ? { corner: ('t' + outer) as Corner, size: Math.round(w * (0.11 + r() * 0.05)) } : null;
  return { paper: PAPERS[Math.floor(r() * PAPERS.length)], overlay: layers.join(','), ear };
}

/** Grain and edge tint only, for the inside of the covers. */
export const COVER_INSIDE = `radial-gradient(ellipse 85% 80% at 50% 50%, transparent 60%, rgba(120,95,55,.14) 100%),${GRAIN}`;

/** clip-path that cuts the folded corner off the page. */
export function earClip(ear: Wear['ear']): string | undefined {
  if (!ear) return undefined;
  const s = ear.size + 'px';
  return {
    tl: `polygon(${s} 0, 100% 0, 100% 100%, 0 100%, 0 ${s})`,
    tr: `polygon(0 0, calc(100% - ${s}) 0, 100% ${s}, 100% 100%, 0 100%)`,
    bl: `polygon(0 0, 100% 0, 100% 100%, ${s} 100%, 0 calc(100% - ${s}))`,
    br: `polygon(0 0, 100% 0, 100% calc(100% - ${s}), calc(100% - ${s}) 100%, 0 100%)`,
  }[ear.corner];
}
