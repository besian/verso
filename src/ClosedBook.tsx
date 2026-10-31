import type { CSSProperties, ReactNode } from 'react';
import { PAGE_EDGES } from './theme';

interface Props {
  /** 'lg' — carousel, Explore grid, profile; 'sm' — home and landing panels. */
  size?: 'lg' | 'sm';
  /** Front cover background (colour or cover image). */
  bg: string;
  /** Back-board colour (darkened). */
  board: string;
  boardShadow?: string;
  band?: number;
  /** False for a sketchbook whose owner took its elastic band off. */
  hasBand?: boolean;
  bandShadow?: boolean;
  coverShadow?: boolean;
  label?: ReactNode;
  labelStyle?: CSSProperties;
  /** Dark overlay over the cover (0–1), used for books receding in the carousel. */
  shade?: string | number;
}

/**
 * A closed, face-on sketchbook: darker back board, lined page block peeking out
 * at the right and bottom, elastic band and optional cream name label.
 * Fills its positioned parent.
 */
export default function ClosedBook({ size = 'lg', bg, board, boardShadow, band, hasBand = true, bandShadow = size === 'lg', coverShadow = size === 'lg', label, labelStyle, shade }: Props) {
  const lg = size === 'lg';
  const r = lg ? '2px 10px 10px 2px' : '2px 8px 8px 2px';
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, transform: lg ? 'translate(7px,6px)' : 'translate(6px,5px)', borderRadius: lg ? '3px 11px 11px 3px' : '2px 8px 8px 2px', background: board, filter: 'brightness(.6)', boxShadow: boardShadow ?? (lg ? '0 20px 32px rgba(34,35,32,.16)' : '0 18px 30px rgba(34,35,32,.14)') }} />
      <div style={lg
        ? { position: 'absolute', top: 3, bottom: -3, left: 4, right: -4, borderRadius: '2px 9px 9px 2px', background: PAGE_EDGES }
        : { position: 'absolute', top: 3, bottom: -3, left: 3, right: -3, borderRadius: '2px 7px 7px 2px', background: PAGE_EDGES }} />
      {/* A size container, so the label's text can scale with the cover (cqw) instead of overflowing small ones. */}
      <div style={{ position: 'absolute', inset: 0, borderRadius: r, overflow: 'hidden', background: bg, boxShadow: coverShadow ? '0 1px 2px rgba(0,0,0,.3)' : undefined, containerType: 'inline-size' }}>
        {hasBand && <div style={{ position: 'absolute', right: '13%', top: 0, bottom: 0, width: band ?? (lg ? 7 : 6), background: '#1d1d26', boxShadow: bandShadow ? '-2px 0 3px rgba(0,0,0,.25),2px 0 3px rgba(0,0,0,.25)' : undefined }} />}
        {label != null && (
          <div className="cover-label" style={{ position: 'absolute', left: '16%', right: '26%', top: '14%', background: '#f6f2e9', color: '#222320', boxSizing: 'border-box', overflow: 'hidden', overflowWrap: 'anywhere', lineHeight: 1.2, display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, ...(lg ? { padding: '8px 10px', borderRadius: 2, boxShadow: '0 1px 2px rgba(0,0,0,.2)', fontSize: 'clamp(9px, 7cqw, 13px)', fontWeight: 600 } : {}), ...labelStyle }}>{label}</div>
        )}
      </div>
      {shade != null && <div style={{ position: 'absolute', inset: 0, borderRadius: r, background: '#1c1d30', opacity: shade, pointerEvents: 'none' }} />}
    </>
  );
}
