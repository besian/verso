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
export const SPINE = 'linear-gradient(90deg,rgba(0,0,0,.28),rgba(0,0,0,.08))';
