import type { CSSProperties } from 'react';

export const PAPER = '#F4F1E9';
export const CANVAS = '#E2DED4';
export const INK = '#222320';
export const STONE = '#85867C';
export const MARK = '#AD493A';
export const MUTED = '#5E5F57';
export const PAGE = '#f3efe6';
export const SANS = "'Geist',sans-serif";
export const SERIF = "'Instrument Serif',serif";

/** Small uppercase editorial label. */
export const label = (color = STONE, size = 11): CSSProperties => ({
  font: `500 ${size}px ${SANS}`, letterSpacing: '.14em', textTransform: 'uppercase', color,
});

export const serif = (size: number, lh: number | string = 1.05, ls = '-.01em'): CSSProperties => ({
  font: `400 ${size}px/${lh} ${SERIF}`, letterSpacing: ls,
});

export const PAGE_EDGES = 'repeating-linear-gradient(180deg,#f3efe6 0 2px,#d8d1c1 2px 3px)';
/** Shading for the bound edge of a cover: rounded spine falling into shadow, a soft highlight
 *  where it turns, then a shallow hinge groove. `dir` is 90deg for a spine on the left, 270deg on the right. */
const spineGrad = (dir: number) => `linear-gradient(${dir}deg, rgba(0,0,0,.34) 0%, rgba(0,0,0,.14) 7%, rgba(255,255,255,.10) 22%, rgba(255,255,255,.04) 40%, rgba(0,0,0,.10) 62%, rgba(0,0,0,.20) 72%, rgba(255,255,255,.07) 80%, rgba(0,0,0,0) 100%)`;
export const SPINE = spineGrad(90), SPINE_R = spineGrad(270);
/** Width of the spine shading as a share of the cover. */
export const SPINE_W = '11%';
