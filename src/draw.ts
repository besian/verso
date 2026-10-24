// Drawing on a page: pen, pencil and marker strokes, kept in frame fractions like the handwriting
// (see handwriting.ts) and painted onto the saved page.

export type Tool = 'pen' | 'pencil' | 'marker' | 'eraser';
/** A drawn stroke. pts: x0, y0, x1, y1, … as frame fractions; size: line width as a fraction of the frame height. */
export interface Mark { pts: number[]; color: string; size: number; alpha: number }
export interface Pen { tool: Tool; color: string; size: number }

export const TOOLS: [Tool, string][] = [['pen', 'Pen'], ['pencil', 'Pencil'], ['marker', 'Marker'], ['eraser', 'Eraser']];
export const COLORS: [string, string][] = [
  ['#222320', 'Ink'], ['#6b6a64', 'Graphite'], ['#ad493a', 'Red'], ['#2f4a7a', 'Blue'], ['#3f7a56', 'Green'], ['#e0b23a', 'Yellow'], ['#f3efe6', 'White'],
];
export const DEFAULT_PEN: Pen = { tool: 'pen', color: '#222320', size: 5 };

/** How each tool turns the size slider (1–40) into a line, and how see-through it is. */
const LOOK: Record<Exclude<Tool, 'eraser'>, { width: number; alpha: number }> = {
  pen: { width: 0.0009, alpha: 1 }, pencil: { width: 0.0006, alpha: 0.75 }, marker: { width: 0.003, alpha: 0.45 },
};
export function markFor(pen: Pen, x: number, y: number): Mark {
  const l = LOOK[pen.tool as Exclude<Tool, 'eraser'>] || LOOK.pen;
  return { pts: [x, y], color: pen.color, size: l.width * pen.size, alpha: l.alpha };
}

/** SVG path data for a stroke inside a frame of fw × fh. */
export function pathD(pts: number[], fw: number, fh: number): string {
  let d = '';
  for (let i = 0; i < pts.length; i += 2) d += `${i ? 'L' : 'M'}${(pts[i] * fw).toFixed(1)} ${(pts[i + 1] * fh).toFixed(1)} `;
  return pts.length === 2 ? d + 'l.1 0' : d;
}

/** The marks that the eraser at (x, y) touches; r is its radius as a fraction of the frame height. */
export function touched(marks: Mark[], x: number, y: number, r: number, aspect: number): Set<number> {
  const hit = new Set<number>();
  marks.forEach((m, i) => {
    const rr = r + m.size / 2, p = m.pts;
    // Distance to each segment (not just its ends), measured with x scaled to the frame's shape.
    for (let k = 0; k < p.length; k += 2) {
      const ax = p[k] * aspect, ay = p[k + 1], bx = (p[k + 2] ?? p[k]) * aspect, by = p[k + 3] ?? p[k + 1], dx = bx - ax, dy = by - ay;
      const t = dx || dy ? Math.max(0, Math.min(1, ((x * aspect - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy))) : 0;
      if (Math.hypot(x * aspect - ax - t * dx, y - ay - t * dy) < rr) { hit.add(i); break; }
    }
  });
  return hit;
}

/** Paints the marks onto a page canvas of W × H. */
export function drawMarks(ctx: CanvasRenderingContext2D, marks: Mark[], W: number, H: number) {
  if (!marks.length) return;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const m of marks) {
    ctx.globalAlpha = m.alpha; ctx.strokeStyle = m.color; ctx.lineWidth = Math.max(1, m.size * H); ctx.beginPath();
    for (let i = 0; i < m.pts.length; i += 2) { const x = m.pts[i] * W, y = m.pts[i + 1] * H; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    if (m.pts.length === 2) ctx.lineTo(m.pts[0] * W + 0.1, m.pts[1] * H);
    ctx.stroke();
  }
  ctx.restore();
}
