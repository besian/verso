// Photo adjustments for pages and covers. Every adjustment is linear, so together they make one
// colour matrix: the editor previews it with an SVG feColorMatrix and the saved page applies the
// same numbers pixel by pixel, so what you see is what you get (Safari included).

export interface Adjust { bri: number; con: number; sat: number; warm: number; white: number }
export const NO_ADJUST: Adjust = { bri: 0, con: 0, sat: 0, warm: 0, white: 0 };
export const isAdjusted = (a: Adjust) => Object.values(a).some(v => v !== 0);

/** Slider definitions: key, label, range. Values are percentages around 0 (Whites: 0–100). */
export const ADJUSTERS: [keyof Adjust, string, number, number][] = [
  ['bri', 'Brightness', -100, 100], ['con', 'Contrast', -100, 100], ['sat', 'Saturation', -100, 100],
  ['warm', 'Warmth', -100, 100], ['white', 'Whites', 0, 100],
];

/** 3 rows of [r, g, b, offset] (offset on a 0–1 scale). */
type M = number[][];
const I: M = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0]];
/** Applies `s` after `m`. */
function then(m: M, s: M): M {
  return s.map(row => [0, 1, 2, 3].map(j => row[0] * m[0][j] + row[1] * m[1][j] + row[2] * m[2][j] + (j === 3 ? row[3] : 0)));
}

export function matrix(a: Adjust): M {
  let m = I;
  // Whites: lifts the paper of a photographed page toward clean white (a levels white point).
  if (a.white) { const k = 1 / (1 - 0.3 * a.white / 100); m = then(m, [[k, 0, 0, 0], [0, k, 0, 0], [0, 0, k, 0]]); }
  if (a.bri) { const d = 0.35 * a.bri / 100; m = then(m, [[1, 0, 0, d], [0, 1, 0, d], [0, 0, 1, d]]); }
  if (a.con) { const k = 1 + a.con / 100, o = 0.5 * (1 - k); m = then(m, [[k, 0, 0, o], [0, k, 0, o], [0, 0, k, o]]); }
  if (a.sat) {
    const s = 1 + a.sat / 100, r = 0.2126, g = 0.7152, b = 0.0722;
    m = then(m, [[r + (1 - r) * s, g - g * s, b - b * s, 0], [r - r * s, g + (1 - g) * s, b - b * s, 0], [r - r * s, g - g * s, b + (1 - b) * s, 0]]);
  }
  if (a.warm) { const w = 0.09 * a.warm / 100; m = then(m, [[1, 0, 0, w], [0, 1, 0, w * 0.25], [0, 0, 1, -w]]); }
  return m;
}

/** `values` for <feColorMatrix type="matrix">. */
export const feValues = (a: Adjust) => matrix(a).map(r => [r[0], r[1], r[2], 0, r[3]].map(n => +n.toFixed(4)).join(' ')).concat('0 0 0 1 0').join(' ');

/** Applies the adjustments to everything drawn on a canvas. */
export function applyToCanvas(c: HTMLCanvasElement, a: Adjust) {
  if (!isAdjusted(a)) return;
  const ctx = c.getContext('2d')!, img = ctx.getImageData(0, 0, c.width, c.height), d = img.data, m = matrix(a);
  const [r0, r1, r2] = m, o0 = r0[3] * 255, o1 = r1[3] * 255, o2 = r2[3] * 255;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    d[i] = r0[0] * r + r0[1] * g + r0[2] * b + o0;
    d[i + 1] = r1[0] * r + r1[1] * g + r1[2] * b + o1;
    d[i + 2] = r2[0] * r + r2[1] * g + r2[2] * b + o2;
  }
  ctx.putImageData(img, 0, 0);
}
