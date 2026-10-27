// Text on a page (and, earlier, handwriting turned into text). Strokes and text boxes live in frame fractions (0–1
// of the editor frame's width and height), so the preview and the saved page line up exactly.
import { INK_FREE } from './plus';

/** One pen stroke: x0, y0, x1, y1, … as fractions of the frame. */
export type Stroke = number[];
export type TextFont = 'serif' | 'sans' | 'hand' | 'type' | 'marker';
export type TextAlign = 'left' | 'center' | 'right';
/** Typed text placed on the page. x, y, w are fractions of the frame; size is the font size as a fraction of its height.
 *  Style fields are optional: text saved before they existed is Instrument Serif in ink, left-aligned. */
export interface PageText { id: string; x: number; y: number; w: number; size: number; text: string; font?: TextFont; color?: string; align?: TextAlign; bold?: boolean; italic?: boolean }

export const TEXT_FONT = "'Instrument Serif',serif", TEXT_INK = '#222320', LINE_H = 1.2;
/** The fonts text can be set in (all served from the site, see public/fonts). */
export const TEXT_FONTS: { key: TextFont; label: string; css: string }[] = [
  { key: 'serif', label: 'Serif', css: TEXT_FONT },
  { key: 'sans', label: 'Sans', css: "'Geist',sans-serif" },
  { key: 'hand', label: 'Handwritten', css: "'Caveat',cursive" },
  { key: 'type', label: 'Typewriter', css: "'Courier Prime',monospace" },
  { key: 'marker', label: 'Marker', css: "'Permanent Marker',cursive" },
];
/** The CSS / canvas font for a text box at a size in px. */
export function fontOf(t: Pick<PageText, 'font' | 'bold' | 'italic'>, px: number) {
  const css = (TEXT_FONTS.find(f => f.key === t.font) || TEXT_FONTS[0]).css;
  return `${t.italic ? 'italic ' : ''}${t.bold ? 700 : 400} ${px}px ${css}`;
}

let measurer: CanvasRenderingContext2D | null = null;
/** Greedy word wrap, measured with canvas so the preview and the saved page break lines the same way. */
export function wrapLines(text: string, maxW: number, font: string): string[] {
  measurer = measurer || document.createElement('canvas').getContext('2d');
  const ctx = measurer!; ctx.font = font;
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? line + ' ' + word : word;
      if (line && ctx.measureText(next).width > maxW) { out.push(line); line = word; } else line = next;
    }
    out.push(line);
  }
  return out;
}

/** Width of the longest line of text in a font, in px. */
export function textWidth(text: string, font: string): number {
  measurer = measurer || document.createElement('canvas').getContext('2d');
  const ctx = measurer!; ctx.font = font;
  return Math.max(0, ...text.split('\n').map(l => ctx.measureText(l).width));
}

/** Draws the text boxes onto a page canvas of W × H, each in its own font, colour and alignment. */
export async function drawTexts(ctx: CanvasRenderingContext2D, texts: PageText[], W: number, H: number) {
  if (!texts.length) return;
  await Promise.all([...new Set(texts.map(t => fontOf(t, 40)))].map(f => document.fonts?.load(f).catch(() => {})));
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.textBaseline = 'top';
  for (const t of texts) {
    const px = t.size * H, font = fontOf(t, px), align = t.align || 'left';
    ctx.font = font; ctx.fillStyle = t.color || TEXT_INK; ctx.textAlign = align;
    const x = align === 'center' ? (t.x + t.w / 2) * W : align === 'right' ? (t.x + t.w) * W : t.x * W;
    // Same half-leading as CSS line-height, so the saved page matches the preview.
    const lh = px * LINE_H, lead = (lh - px) / 2;
    wrapLines(t.text, t.w * W, font).forEach((l, i) => ctx.fillText(l, x, t.y * H + lead + i * lh));
  }
  ctx.restore();
}

/** Strokes' bounding box, in frame fractions. */
export function inkBox(strokes: Stroke[]) {
  let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
  for (const s of strokes) for (let i = 0; i < s.length; i += 2) { x0 = Math.min(x0, s[i]); x1 = Math.max(x1, s[i]); y0 = Math.min(y0, s[i + 1]); y1 = Math.max(y1, s[i + 1]); }
  return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
}

/** The handwriting alone, cropped and drawn black on white (what the reader sees), as base64 PNG. */
export function inkPng(strokes: Stroke[], fw: number, fh: number): string {
  const b = inkBox(strokes), pad = 24, k = Math.min(3, 1400 / Math.max(1, b.w * fw), 1400 / Math.max(1, b.h * fh));
  const c = document.createElement('canvas'); c.width = Math.round(b.w * fw * k + pad * 2); c.height = Math.round(b.h * fh * k + pad * 2);
  const ctx = c.getContext('2d')!; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = '#000'; ctx.lineWidth = 3 * Math.max(1, k * 0.8); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const s of strokes) {
    ctx.beginPath();
    for (let i = 0; i < s.length; i += 2) { const x = (s[i] - b.x) * fw * k + pad, y = (s[i + 1] - b.y) * fh * k + pad; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    if (s.length === 2) ctx.lineTo((s[0] - b.x) * fw * k + pad + 0.1, (s[1] - b.y) * fh * k + pad);
    ctx.stroke();
  }
  return c.toDataURL('image/png').split(',')[1];
}

/** A text box where the handwriting was, sized so its lines take up roughly the same height. */
export function textFromInk(strokes: Stroke[], text: string): PageText {
  const b = inkBox(strokes), lines = Math.max(1, text.split('\n').length);
  const size = Math.max(0.02, Math.min(0.12, b.h / lines / LINE_H));
  return { id: Math.random().toString(36).slice(2), x: Math.max(0.02, b.x), y: Math.max(0.02, b.y), w: Math.min(0.96 - Math.max(0.02, b.x), Math.max(b.w * 1.15, 0.3)), size, text };
}

/** Sends the handwriting to api/handwriting and returns what it says. */
export async function readInk(png: string, token: string): Promise<string> {
  const r = await fetch('/api/handwriting', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token }, body: JSON.stringify({ image: png }) }).catch(() => null);
  const body = r && await r.json().catch(() => null) as { text?: string; error?: string } | null;
  // The free plan's monthly allowance is used up: the editor offers Plus (code 'ink-limit').
  if (body?.error === 'limit-free') throw Object.assign(new Error(`You’ve used this month’s ${INK_FREE} conversions.`), { code: 'ink-limit' });
  if (!r || !r.ok || !body) throw new Error(body?.error === 'not-configured' ? 'Handwriting isn’t set up yet.' : r?.status === 401 ? 'Sign in to convert handwriting.' : r?.status === 429 ? 'You’ve used this month’s conversions. They start again next month.' : 'Couldn’t read that, try again.');
  if (!body.text?.trim()) throw new Error('Couldn’t make out any words, try writing a little larger.');
  return body.text.trim();
}
