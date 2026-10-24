import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { createPortal } from 'react-dom';

/**
 * A dropdown drawn on top of the whole page (so no card or scroll area can clip it), next to its anchor: below it,
 * or above when there isn't room below; kept on screen and clear of the phone tab bar, and scrolling if it's taller
 * than the space. It follows the anchor when the page scrolls or resizes.
 */
export function Popover({ anchor, children, align = 'left', gap = 4 }: { anchor: RefObject<HTMLElement>; children: ReactNode; align?: 'left' | 'right' | 'center'; gap?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; maxH: number } | null>(null);
  useLayoutEffect(() => {
    const place = () => {
      const a = anchor.current?.getBoundingClientRect(), m = ref.current; if (!a || !m) return;
      const vw = innerWidth, vh = innerHeight, edge = 8, bottomEdge = vw < 640 ? 72 : edge;
      const h = m.scrollHeight, w = m.offsetWidth, below = vh - bottomEdge - a.bottom - gap, above = a.top - edge - gap;
      const down = below >= h || below >= above, maxH = Math.max(120, down ? below : above);
      const top = down ? a.bottom + gap : Math.max(edge, a.top - gap - Math.min(h, maxH));
      const want = align === 'right' ? a.right - w : align === 'center' ? a.left + a.width / 2 - w / 2 : a.left;
      setPos({ top, left: Math.max(edge, Math.min(vw - edge - w, want)), maxH });
    };
    place();
    addEventListener('scroll', place, true); addEventListener('resize', place);
    return () => { removeEventListener('scroll', place, true); removeEventListener('resize', place); };
  }, [anchor, align, gap]);
  return createPortal(
    <span ref={ref} style={{ position: 'fixed', top: pos?.top ?? 0, left: pos?.left ?? 0, maxHeight: pos?.maxH, overflowY: 'auto', zIndex: 1000, visibility: pos ? 'visible' : 'hidden', display: 'flex' }}>
      {children}
    </span>,
    document.body,
  );
}
