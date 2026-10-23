import type { CSSProperties } from 'react';

// UI colours are CSS variables (see global.css) so the dark theme can swap them; book pages and
// covers keep their own fixed colours, since they're paper either way.

export const PAPER = 'var(--paper)';
export const CANVAS = 'var(--canvas)';
export const INK = 'var(--ink)';
export const STONE = 'var(--stone)';
export const MARK = 'var(--mark)';
export const MUTED = 'var(--muted)';
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

/** Page spacing shared by every screen (the same as Explore): full width, 40px sides (16px on phones). */
export const pagePad = (mob: boolean, bottom = 48): CSSProperties => ({ boxSizing: 'border-box', width: '100%', padding: `${mob ? 74 : 108}px ${mob ? 16 : 40}px ${bottom}px` });

export const PAGE_EDGES = 'repeating-linear-gradient(180deg,#f3efe6 0 2px,#d8d1c1 2px 3px)';
