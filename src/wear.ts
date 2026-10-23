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

const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .55  0 0 0 0 .47  0 0 0 0 .36  0 0 0 .075 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>',
)}")`;
const PAPERS = ['#f3efe6', '#f1ece1', '#f4f0e7', '#efe9dc', '#f2ede3'];

/**
 * Wear for one page. `outer` is the side away from the spine ('r' for right-hand pages,
 * 'l' for left-hand ones); `w` is the page width in px.
 */
export function pageWear(seed: string, outer: 'l' | 'r', w: number): Wear {
  const r = rng(hash(seed)), pct = (a: number, b: number) => (a + r() * (b - a)).toFixed(1) + '%';
  const layers: string[] = [];
  // Thumb smudge near the outer edge, where the page gets turned.
  if (r() < 0.55) layers.push(`radial-gradient(ellipse 16% 10% at ${outer === 'r' ? pct(88, 96) : pct(4, 12)} ${pct(78, 92)}, rgba(70,58,44,.05), transparent 70%)`);
  // Occasional coffee ring.
  if (r() < 0.12) {
    const x = pct(25, 75), y = pct(20, 75), rad = 9 + r() * 6;
    layers.push(`radial-gradient(circle at ${x} ${y}, transparent ${rad}%, rgba(128,84,38,.11) ${rad + 0.6}%, rgba(128,84,38,.05) ${rad + 1.4}%, transparent ${rad + 2.2}%)`);
    layers.push(`radial-gradient(circle at ${x} ${y}, rgba(128,84,38,.03), transparent ${rad}%)`);
  }
  // Faint foxing spot or two.
  if (r() < 0.25) layers.push(`radial-gradient(circle at ${pct(10, 90)} ${pct(10, 90)}, rgba(140,100,50,.08), transparent 1.6%)`);
  // Yellowing toward the edges, a little stronger on the outer side.
  layers.push(`radial-gradient(ellipse 85% 80% at ${outer === 'r' ? '42%' : '58%'} 50%, transparent 62%, rgba(150,118,62,${(0.07 + r() * 0.06).toFixed(3)}) 100%)`);
  layers.push(GRAIN);
  // Dog-ear on the top outer corner (the bottom corners carry the page numbers).
  const ear = r() < 0.2 ? { corner: ('t' + outer) as Corner, size: Math.round(w * (0.07 + r() * 0.05)) } : null;
  return { paper: PAPERS[Math.floor(r() * PAPERS.length)], overlay: layers.join(','), ear };
}

/** Grain and edge tint only, for the inside of the covers. */
export const COVER_INSIDE = `radial-gradient(ellipse 85% 80% at 50% 50%, transparent 60%, rgba(120,95,55,.1) 100%),${GRAIN}`;

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
