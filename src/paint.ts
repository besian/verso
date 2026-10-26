// Painting on a page. The paint lives in one layer of pixels the size of the saved page, over the photo (the
// "base", as fitted and adjusted). Pen, pencil and marker draw a stroke as a line and lay it down when it ends; the
// wet tools work brush mark by brush mark ("dabs") straight on the pixels, picking up what's under them:
// - Blend smudges: each dab carries a patch of what it last passed over and wipes it along.
// - Watercolour smudges a little and tints with the brush colour mixed with the colour under it.
// - Oil lays down thick paint that runs out along the stroke, dragging and mixing with what's there.
// Colours mix like pigment (see spectral.js): yellow into blue makes green, not grey.

import { Color, mix } from 'spectral.js';

export type Tool = 'pen' | 'pencil' | 'marker' | 'water' | 'oil' | 'blend' | 'eraser';
export interface Pen { tool: Tool; color: string; size: number; opacity: number }

export const TOOLS: [Tool, string][] = [['pen', 'Pen'], ['pencil', 'Pencil'], ['marker', 'Marker'], ['water', 'Watercolour'], ['oil', 'Oil'], ['blend', 'Blend'], ['eraser', 'Eraser']];
export const COLORS: [string, string][] = [
  ['#222320', 'Ink'], ['#6b6a64', 'Graphite'], ['#ad493a', 'Red'], ['#2f4a7a', 'Blue'], ['#3f7a56', 'Green'], ['#e0b23a', 'Yellow'], ['#f3efe6', 'White'],
];
export const DEFAULT_PEN: Pen = { tool: 'pen', color: '#222320', size: 5, opacity: 1 };
/** Tools that don't use the colour. */
export const NO_COLOR = new Set<Tool>(['blend', 'eraser']);

/** Brush width per step of the size slider (1–40), as a share of the page height. */
const WIDTH: Record<Tool, number> = { pen: 0.0009, pencil: 0.0008, marker: 0.003, water: 0.0045, oil: 0.0035, blend: 0.0035, eraser: 0.0025 };

/** The paint layer is laid out this tall; the saved page is drawn from it. */
export const PAINT_H = 1280;
const UNDO = 12;

type RGB = [number, number, number];
const hexRgb = (h: string): RGB => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export const rgbHex = (c: number[]) => '#' + c.slice(0, 3).map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
/** Pigment mix of two colours, b weighted t (0–1). */
function pigment(a: RGB, b: RGB, t: number): RGB {
  if (t <= 0.001) return a; if (t >= 0.999) return b;
  const m = mix([new Color([a[0], a[1], a[2]]), 1 - t], [new Color([b[0], b[1], b[2]]), t]).sRGB;
  return [Math.max(0, Math.min(255, m[0])), Math.max(0, Math.min(255, m[1])), Math.max(0, Math.min(255, m[2]))];
}

interface Undo { layer: Layer; x: number; y: number; w: number; h: number; px: Uint8ClampedArray; op: Op }

/** One drawing layer: its pixels and the canvas showing them. */
interface Layer { id: number; name: string; visible: boolean; opacity: number; img: ImageData; L: Uint8ClampedArray; view: HTMLCanvasElement; vctx: CanvasRenderingContext2D }
export interface LayerInfo { id: number; name: string; visible: boolean; opacity: number; active: boolean }
export const MAX_LAYERS = 4;

/** What was done, for the stroke replay and the saved draft: strokes (points as x, y, pressure, ms since the
 *  last point), clearing a layer, and adding or removing one. */
export type Op = { t: 's'; l: number; pen: Pen; seed: number; pts: number[] } | { t: 'c'; l: number } | { t: 'a' } | { t: 'r'; l: number };
/** Everything needed to carry on with a drawing later (the draft), or to replay it. */
export interface Snapshot { w: number; h: number; layers: { name: string; visible: boolean; opacity: number; px?: Uint8ClampedArray }[]; active: number; ops: Op[] }

/** Small seeded random numbers, so a replayed stroke has the same bristles and grain as the original. */
function rng(seed: number) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export class Painter {
  readonly W: number; readonly H: number;
  /** What's shown: the layers, and the pen / pencil / marker stroke being drawn (laid down when it ends). */
  readonly el: HTMLDivElement;
  private layers: Layer[] = []; private active = 0; private nextId = 1;
  private buf: HTMLCanvasElement; private bctx: CanvasRenderingContext2D;
  /** The photo, and what's seen under the active layer (the photo with the visible layers below it). */
  private B: Uint8ClampedArray; private under: Uint8ClampedArray | null = null;
  private undos: Undo[] = []; private redos: Undo[] = []; private before: Uint8ClampedArray | null = null;
  /** Everything done so far, in order (undone strokes are taken out). */
  ops: Op[] = []; private cur: (Op & { t: 's' }) | null = null; private lastT = 0;
  private pen: Pen = DEFAULT_PEN; private last: { x: number; y: number; p: number } | null = null; private rand = Math.random;
  private box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }; private dirty = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  private raf = 0; private carry: Float32Array | null = null; private cr = 0; private res: RGB = [0, 0, 0]; private load = 1; private bristle: Float32Array | null = null;
  /** Something has been painted since the layers were made. */
  painted = false;
  baseKey = '';
  /** Called after anything that changes what undo, redo or the layers list show. */
  onChange: () => void = () => {};

  constructor(aspect: number) {
    this.H = PAINT_H; this.W = Math.max(1, Math.round(PAINT_H * aspect));
    this.el = document.createElement('div'); Object.assign(this.el.style, { position: 'absolute', inset: '0', pointerEvents: 'none' });
    this.buf = this.canvas(); this.bctx = this.buf.getContext('2d')!;
    this.B = new Uint8ClampedArray(this.W * this.H * 4).fill(255);
    this.addLayer(false);
  }
  private canvas() { const c = document.createElement('canvas'); c.width = this.W; c.height = this.H; Object.assign(c.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' }); return c; }
  private get lay() { return this.layers[this.active]; }
  private get L() { return this.lay.L; }

  // ---------- layers ----------
  get layerList(): LayerInfo[] { return this.layers.map((l, i) => ({ id: l.id, name: l.name, visible: l.visible, opacity: l.opacity, active: i === this.active })); }
  addLayer(record = true) {
    if (this.layers.length >= MAX_LAYERS) return;
    const img = new ImageData(this.W, this.H), view = this.canvas(), id = this.nextId++;
    this.layers.push({ id, name: `Layer ${id}`, visible: true, opacity: 1, img, L: img.data, view, vctx: view.getContext('2d')! });
    this.active = this.layers.length - 1; this.under = null; this.order();
    if (record) { this.ops.push({ t: 'a' }); this.onChange(); }
  }
  removeLayer(i: number) {
    if (this.layers.length <= 1 || !this.layers[i]) return;
    const [gone] = this.layers.splice(i, 1); gone.view.remove();
    // Undo steps for it go with it.
    this.undos = this.undos.filter(u => u.layer !== gone); this.redos = this.redos.filter(u => u.layer !== gone);
    this.active = Math.min(this.active, this.layers.length - 1); this.under = null; this.ops.push({ t: 'r', l: i }); this.order(); this.onChange();
  }
  setActive(i: number) { if (this.layers[i] && i !== this.active) { this.active = i; this.under = null; this.order(); this.onChange(); } }
  setVisible(i: number, on: boolean) { const l = this.layers[i]; if (!l) return; l.visible = on; l.view.style.display = on ? '' : 'none'; this.under = null; this.onChange(); }
  setOpacity(i: number, o: number) { const l = this.layers[i]; if (!l) return; l.opacity = o; l.view.style.opacity = String(o); this.onChange(); }
  /** The layers' canvases in order, with the stroke being drawn just above the active one. */
  private order() {
    this.layers.forEach((l, i) => { this.el.append(l.view); if (i === this.active) this.el.append(this.buf); });
  }
  /** What's seen under the active layer: the photo with the visible layers below it, worked out when needed. */
  private below(): Uint8ClampedArray {
    if (this.under) return this.under;
    const out = this.B.slice();
    for (let k = 0; k < this.active; k++) {
      const l = this.layers[k]; if (!l.visible) continue;
      const L = l.L, o = l.opacity;
      for (let i = 0; i < out.length; i += 4) { const a = L[i + 3] / 255 * o; if (!a) continue; out[i] += (L[i] - out[i]) * a; out[i + 1] += (L[i + 1] - out[i + 1]) * a; out[i + 2] += (L[i + 2] - out[i + 2]) * a; }
    }
    return this.under = out;
  }

  /** The photo as it will be saved, for the wet tools to pick up and the colour picker to read. */
  setBase(draw: (ctx: CanvasRenderingContext2D, W: number, H: number) => void, key: string) {
    if (key === this.baseKey) return;
    const c = document.createElement('canvas'); c.width = this.W; c.height = this.H; const ctx = c.getContext('2d', { willReadFrequently: true })!;
    draw(ctx, this.W, this.H);
    try { this.B = ctx.getImageData(0, 0, this.W, this.H).data; this.baseKey = key; this.under = null; } catch { /* unreadable image: paper white */ }
  }

  /** The colour on the page at (x, y), in 0–1 page coordinates: the photo with every visible layer over it. */
  colorAt(x: number, y: number): string {
    const i = (Math.min(this.H - 1, Math.max(0, Math.round(y * this.H))) * this.W + Math.min(this.W - 1, Math.max(0, Math.round(x * this.W)))) * 4;
    const c: number[] = [this.B[i], this.B[i + 1], this.B[i + 2]];
    for (const l of this.layers) { if (!l.visible) continue; const a = l.L[i + 3] / 255 * l.opacity; for (let k = 0; k < 3; k++) c[k] += (l.L[i + k] - c[k]) * a; }
    return rgbHex(c);
  }
  get canUndo() { return this.undos.length > 0; }
  get canRedo() { return this.redos.length > 0; }
  get drawing() { return !!this.last; }

  begin(pen: Pen, x: number, y: number, pressure: number, seed = Math.floor(Math.random() * 2 ** 31)) {
    this.pen = pen; this.before = this.L.slice(); this.rand = rng(seed); this.lastT = performance.now();
    this.cur = { t: 's', l: this.active, pen: { ...pen }, seed, pts: [] }; this.rec(x, y, pressure);
    this.box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    const X = x * this.W, Y = y * this.H; this.last = { x: X, y: Y, p: pressure };
    if (this.lined()) {
      const b = this.bctx; b.clearRect(0, 0, this.W, this.H);
      this.buf.style.opacity = String(this.strokeAlpha() * this.lay.opacity); this.buf.style.mixBlendMode = pen.tool === 'marker' ? 'multiply' : '';
      b.lineCap = 'round'; b.lineJoin = 'round';
      b.strokeStyle = pen.tool === 'pencil' ? this.pencilGrain(pen.color) : pen.color;
      this.segment(X, Y, X + 0.01, Y, pressure);
    } else {
      this.res = hexRgb(pen.color); this.load = 1; this.carry = null;
      this.bristle = new Float32Array(64).map(() => 0.55 + this.rand() * 0.45);
      this.dab(X, Y, pressure, 0);
    }
    this.show();
  }
  private rec(x: number, y: number, p: number, dt = 0) {
    this.cur?.pts.push(Math.round(x * 4095), Math.round(y * 4095), Math.round(p * 255), Math.min(60000, Math.round(dt)));
  }

  move(x: number, y: number, pressure: number) {
    const l = this.last; if (!l) return;
    const now = performance.now(); this.rec(x, y, pressure, now - this.lastT); this.lastT = now;
    const X = x * this.W, Y = y * this.H, d = Math.hypot(X - l.x, Y - l.y);
    if (this.lined()) {
      if (d < 0.6) return;
      this.segment(l.x, l.y, X, Y, (l.p + pressure) / 2); this.last = { x: X, y: Y, p: pressure }; return;
    }
    // Dabs every so often along the way, closer for small brushes; pressure eased between points.
    const step = Math.max(1, this.radius(1) * 2 * (this.pen.tool === 'eraser' ? 0.12 : 0.16));
    if (d < step) return;
    const n = Math.min(400, Math.floor(d / step)), ang = Math.atan2(Y - l.y, X - l.x);
    for (let k = 1; k <= n; k++) { const t = k / n; this.dab(l.x + (X - l.x) * t * (n * step / d), l.y + (Y - l.y) * t * (n * step / d), l.p + (pressure - l.p) * t, ang); }
    const f = n * step / d; this.last = { x: l.x + (X - l.x) * f, y: l.y + (Y - l.y) * f, p: pressure };
    this.show();
  }

  /** Ends the stroke. Returns whether it changed anything. */
  end(): boolean {
    if (!this.last) return false;
    if (this.lined()) this.layDown();
    this.last = null; this.flush();
    const b = this.box, before = this.before, op = this.cur; this.before = null; this.cur = null;
    if (!before || !op || b.x1 < b.x0) return false;
    const u = this.region(before, b); if (!u) return false;
    this.push({ ...u, layer: this.lay, op }); this.ops.push(op);
    this.painted = true; this.onChange(); return true;
  }
  /** Drops the stroke being drawn (a second finger came down: it's a pinch, not a stroke). */
  cancel() {
    if (!this.last) return;
    this.bctx.clearRect(0, 0, this.W, this.H);
    if (this.before) { this.L.set(this.before); this.mark(0, 0, this.W, this.H); }
    this.last = null; this.before = null; this.cur = null; this.flush();
  }
  private region(src: Uint8ClampedArray, b: { x0: number; y0: number; x1: number; y1: number }) {
    const x = Math.max(0, Math.floor(b.x0)), y = Math.max(0, Math.floor(b.y0)), w = Math.min(this.W, Math.ceil(b.x1) + 1) - x, h = Math.min(this.H, Math.ceil(b.y1) + 1) - y;
    if (w <= 0 || h <= 0) return null;
    const px = new Uint8ClampedArray(w * h * 4);
    for (let r = 0; r < h; r++) px.set(src.subarray(((y + r) * this.W + x) * 4, ((y + r) * this.W + x + w) * 4), r * w * 4);
    return { x, y, w, h, px };
  }
  private push(u: Undo) { this.undos.push(u); if (this.undos.length > UNDO) this.undos.shift(); this.redos = []; }
  /** Swaps a step's saved pixels with the layer's, so the same step serves undo and redo. */
  private swap(u: Undo) {
    const L = u.layer.L, now = new Uint8ClampedArray(u.px.length);
    for (let r = 0; r < u.h; r++) { const at = ((u.y + r) * this.W + u.x) * 4, row = r * u.w * 4; now.set(L.subarray(at, at + u.w * 4), row); L.set(u.px.subarray(row, row + u.w * 4), at); }
    u.px = now; this.markLayer(u.layer, u.x, u.y, u.x + u.w, u.y + u.h); this.under = null;
  }
  undo() {
    const u = this.undos.pop(); if (!u) return; this.swap(u); this.redos.push(u);
    const i = this.ops.lastIndexOf(u.op); if (i >= 0) this.ops.splice(i, 1);
    this.flushAll(); this.onChange();
  }
  redo() { const u = this.redos.pop(); if (!u) return; this.swap(u); this.undos.push(u); this.ops.push(u.op); this.flushAll(); this.onChange(); }
  /** Clears the active layer (undoable). */
  clear() {
    const op: Op = { t: 'c', l: this.active };
    this.push({ layer: this.lay, x: 0, y: 0, w: this.W, h: this.H, px: this.L.slice(), op }); this.ops.push(op);
    this.L.fill(0); this.mark(0, 0, this.W, this.H); this.under = null; this.flush(); this.onChange();
  }
  /** Draws the visible layers onto a saved page of W × H. */
  drawOnto(ctx: CanvasRenderingContext2D, W: number, H: number) {
    if (!this.painted) return;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingQuality = 'high';
    for (const l of this.layers) if (l.visible) { ctx.globalAlpha = l.opacity; ctx.drawImage(l.view, 0, 0, W, H); }
    ctx.restore();
  }

  // ---------- drafts ----------
  snapshot(withPixels = true): Snapshot {
    return { w: this.W, h: this.H, active: this.active, ops: this.ops.slice(), layers: this.layers.map(l => ({ name: l.name, visible: l.visible, opacity: l.opacity, ...(withPixels ? { px: l.L.slice() } : {}) })) };
  }
  restore(s: Snapshot) {
    if (s.w !== this.W || s.h !== this.H) return false;
    this.layers.forEach(l => l.view.remove()); this.layers = []; this.nextId = 1;
    s.layers.forEach(d => { this.addLayer(false); const l = this.lay; l.name = d.name; if (d.px) l.L.set(d.px); this.setVisible(this.active, d.visible); this.setOpacity(this.active, d.opacity); this.markLayer(l, 0, 0, this.W, this.H); });
    this.active = Math.min(s.active, this.layers.length - 1); this.order(); this.under = null;
    this.ops = s.ops.slice(); this.undos = []; this.redos = []; this.painted = this.ops.length > 0; this.flushAll(); this.onChange();
    return true;
  }

  // ---------- pen, pencil and marker ----------
  private lined() { return this.pen.tool === 'pen' || this.pen.tool === 'pencil' || this.pen.tool === 'marker'; }
  private strokeAlpha() { const o = this.pen.opacity; return this.pen.tool === 'marker' ? o * 0.6 : this.pen.tool === 'pencil' ? o * 0.85 : o; }
  private radius(p: number) {
    const base = WIDTH[this.pen.tool] * this.pen.size * this.H / 2;
    // Pen and pencil get thinner with a light touch; the wet tools keep their size and lay down less.
    return this.pen.tool === 'pen' ? base * (0.35 + 0.65 * p) : this.pen.tool === 'pencil' ? base * (0.6 + 0.4 * p) : base;
  }
  private segment(x0: number, y0: number, x1: number, y1: number, p: number) {
    const b = this.bctx, r = Math.max(0.5, this.radius(p));
    b.globalAlpha = this.pen.tool === 'pencil' ? 0.35 + 0.65 * p : 1; b.lineWidth = r * 2;
    b.beginPath(); b.moveTo(x0, y0); b.lineTo(x1, y1); b.stroke();
    this.grow(Math.min(x0, x1) - r - 2, Math.min(y0, y1) - r - 2, Math.max(x0, x1) + r + 2, Math.max(y0, y1) + r + 2, false);
  }
  /** Paper grain for the pencil: the colour with a speckled see-through pattern, fixed to the page so strokes share it. */
  private pencilGrain(color: string) {
    const c = document.createElement('canvas'); c.width = c.height = 96; const g = c.getContext('2d')!, im = g.createImageData(96, 96), [r, gg, bl] = hexRgb(color);
    for (let i = 0; i < 96 * 96; i++) { const n = this.rand(); im.data.set([r, gg, bl, n < 0.22 ? 0 : Math.round(255 * Math.min(1, 0.45 + n * 0.7))], i * 4); }
    g.putImageData(im, 0, 0); return this.bctx.createPattern(c, 'repeat')!;
  }
  /** The finished line goes into the layer: over it, or for the marker multiplied with what's under it (as ink is). */
  private layDown() {
    const b = this.box; if (b.x1 < b.x0) return;
    const x = Math.max(0, Math.floor(b.x0)), y = Math.max(0, Math.floor(b.y0)), w = Math.min(this.W, Math.ceil(b.x1)) - x, h = Math.min(this.H, Math.ceil(b.y1)) - y;
    if (w <= 0 || h <= 0) return;
    const s = this.bctx.getImageData(x, y, w, h).data, A = this.strokeAlpha(), multiply = this.pen.tool === 'marker', L = this.L;
    for (let r = 0; r < h; r++) for (let q = 0; q < w; q++) {
      const j = (r * w + q) * 4, sa = s[j + 3] / 255 * A; if (sa <= 0) continue;
      const i = ((y + r) * this.W + x + q) * 4;
      if (multiply) {
        // Seen colour times the ink, written back as solid paint.
        const c = this.comp(i);
        L[i] = c[0] + (c[0] * s[j] / 255 - c[0]) * sa; L[i + 1] = c[1] + (c[1] * s[j + 1] / 255 - c[1]) * sa; L[i + 2] = c[2] + (c[2] * s[j + 2] / 255 - c[2]) * sa; L[i + 3] = 255;
      } else {
        const da = L[i + 3] / 255, oa = sa + da * (1 - sa);
        for (let k = 0; k < 3; k++) L[i + k] = (s[j + k] * sa + L[i + k] * da * (1 - sa)) / oa;
        L[i + 3] = oa * 255;
      }
    }
    this.bctx.clearRect(0, 0, this.W, this.H); this.mark(x, y, x + w, y + h);
  }

  // ---------- wet tools and the eraser ----------
  /** The colour seen at pixel offset i: the active layer over what's under it. */
  private comp(i: number, L = this.L): RGB {
    const B = this.below(), a = L[i + 3] / 255;
    return [L[i] * a + B[i] * (1 - a), L[i + 1] * a + B[i + 1] * (1 - a), L[i + 2] * a + B[i + 2] * (1 - a)];
  }
  private dab(cx: number, cy: number, p: number, ang: number) {
    const tool = this.pen.tool, r = Math.max(1, this.radius(p)), R = Math.ceil(r), o = this.pen.opacity, W = this.W, H = this.H, L = this.L;
    const x0 = Math.max(0, Math.floor(cx - R)), x1 = Math.min(W - 1, Math.ceil(cx + R)), y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(H - 1, Math.ceil(cy + R));
    if (x1 < x0 || y1 < y0) return;
    this.grow(x0, y0, x1 + 1, y1 + 1, true);
    // Soft round brush: full strength in the middle, fading over the outer part.
    const hard = tool === 'oil' ? 0.3 : tool === 'eraser' ? 0.5 : tool === 'water' ? 0.05 : 0.25, fall = (d: number) => d >= 1 ? 0 : d <= hard ? 1 : 1 - (d - hard) / (1 - hard);
    if (tool === 'eraser') {
      const k = o * (0.4 + 0.6 * p);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const w = fall(Math.hypot(x - cx, y - cy) / r); if (!w) continue;
        const i = (y * W + x) * 4; L[i + 3] *= 1 - w * k;
      }
      return;
    }
    // The patch the brush carries: what it passed over, sized to the brush.
    const D = 2 * R + 1;
    if (!this.carry || this.cr !== R) { this.carry = new Float32Array(D * D * 3); this.cr = R; this.fillCarry(cx, cy, R); }
    const C = this.carry;
    // Paint on the brush (oil, watercolour): its colour mixed, like pigment, with a little of what's under it.
    let paint: RGB | null = null, flow = 0;
    if (tool !== 'blend') {
      // What was there before this stroke is still wet: the new colour mixes into it, as it would on paper.
      const under = this.average(cx, cy, r);
      if (tool === 'oil') {
        // Oil is never laid down pure: it always takes in some of the wet paint it goes over, and more as it runs out.
        this.res = pigment(this.res, under, 0.08 * (1 - this.load * 0.5)); this.load *= 0.993;
        flow = o * (0.45 + 0.45 * this.load) * (0.6 + 0.4 * p); paint = pigment(this.res, under, 0.35);
      } else { this.res = pigment(this.res, under, 0.05); flow = o * 0.28 * (0.4 + 0.6 * p); paint = pigment(under, this.res, 0.5); }
    }
    // How much of the carried patch is wiped down, and how much of the page the patch then takes up.
    // Oil and watercolour drag colour along as they go (watercolour bleeds furthest), so neighbouring colours run together.
    const smear = tool === 'blend' ? o * (0.55 + 0.4 * p) : tool === 'oil' ? 0.45 + 0.35 * (1 - this.load) : 0.4, pick = tool === 'blend' ? 0.3 : tool === 'oil' ? 0.3 : 0.55;
    const cs = Math.cos(ang), sn = Math.sin(ang), br = this.bristle!;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      let w = fall(Math.hypot(x - cx, y - cy) / r); if (!w) continue;
      // Oil: streaks from the bristles, across the stroke's direction.
      if (tool === 'oil') w *= br[(Math.floor(((-(x - cx) * sn + (y - cy) * cs) / r + 1) * 31.5) & 63)];
      const i = (y * W + x) * 4, j = ((y - Math.round(cy) + R) * D + (x - Math.round(cx) + R)) * 3, c = this.comp(i);
      const inPatch = j >= 0 && j < C.length;
      let nr = c[0], ng = c[1], nb = c[2];
      if (inPatch) { const s = smear * w; nr += (C[j] - nr) * s; ng += (C[j + 1] - ng) * s; nb += (C[j + 2] - nb) * s; }
      if (paint) { const f = flow * w; nr += (paint[0] - nr) * f; ng += (paint[1] - ng) * f; nb += (paint[2] - nb) * f; }
      if (inPatch) { C[j] += (c[0] - C[j]) * pick; C[j + 1] += (c[1] - C[j + 1]) * pick; C[j + 2] += (c[2] - C[j + 2]) * pick; }
      // What's seen is written back as solid paint (the change itself fades out at the brush's edge).
      L[i] = nr; L[i + 1] = ng; L[i + 2] = nb; L[i + 3] = 255;
    }
  }
  private fillCarry(cx: number, cy: number, R: number) {
    const D = 2 * R + 1, C = this.carry!, X = Math.round(cx), Y = Math.round(cy);
    for (let y = 0; y < D; y++) for (let x = 0; x < D; x++) {
      const px = Math.min(this.W - 1, Math.max(0, X - R + x)), py = Math.min(this.H - 1, Math.max(0, Y - R + y)), c = this.comp((py * this.W + px) * 4), j = (y * D + x) * 3;
      C[j] = c[0]; C[j + 1] = c[1]; C[j + 2] = c[2];
    }
  }
  /** Average colour seen under the brush before this stroke (a few samples are plenty). */
  private average(cx: number, cy: number, r: number): RGB {
    let n = 0, sr = 0, sg = 0, sb = 0;
    for (let k = 0; k < 9; k++) {
      const a = k * 2.4, d = k ? r * 0.6 : 0, x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d);
      if (x < 0 || y < 0 || x >= this.W || y >= this.H) continue;
      const c = this.comp((y * this.W + x) * 4, this.before || this.L); sr += c[0]; sg += c[1]; sb += c[2]; n++;
    }
    return n ? [sr / n, sg / n, sb / n] : this.res;
  }

  // ---------- showing it ----------
  private grow(x0: number, y0: number, x1: number, y1: number, dirty: boolean) {
    const b = this.box; b.x0 = Math.min(b.x0, x0); b.y0 = Math.min(b.y0, y0); b.x1 = Math.max(b.x1, x1); b.y1 = Math.max(b.y1, y1);
    if (dirty) this.mark(x0, y0, x1, y1);
  }
  private mark(x0: number, y0: number, x1: number, y1: number) {
    const d = this.dirty; d.x0 = Math.min(d.x0, x0); d.y0 = Math.min(d.y0, y0); d.x1 = Math.max(d.x1, x1); d.y1 = Math.max(d.y1, y1);
  }
  /** The changed part of the layer goes on screen once per frame. */
  private show() { if (!this.raf) this.raf = requestAnimationFrame(() => { this.raf = 0; this.flush(); }); }
  private flush() {
    cancelAnimationFrame(this.raf); this.raf = 0;
    const d = this.dirty; if (d.x1 <= d.x0) return;
    this.put(this.lay, d); this.dirty = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  }
  private put(l: Layer, d: { x0: number; y0: number; x1: number; y1: number }) {
    const x = Math.max(0, Math.floor(d.x0)), y = Math.max(0, Math.floor(d.y0)), w = Math.min(this.W, Math.ceil(d.x1)) - x, h = Math.min(this.H, Math.ceil(d.y1)) - y;
    if (w > 0 && h > 0) l.vctx.putImageData(l.img, 0, 0, x, y, w, h);
  }
  /** Changes on a layer other than the active one (undo on another layer, restoring a draft) go on screen at once. */
  private pending = new Map<Layer, { x0: number; y0: number; x1: number; y1: number }>();
  private markLayer(l: Layer, x0: number, y0: number, x1: number, y1: number) {
    const d = this.pending.get(l) || { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    d.x0 = Math.min(d.x0, x0); d.y0 = Math.min(d.y0, y0); d.x1 = Math.max(d.x1, x1); d.y1 = Math.max(d.y1, y1); this.pending.set(l, d);
  }
  private flushAll() { this.flush(); this.pending.forEach((d, l) => this.put(l, d)); this.pending.clear(); }
}

/** Hue (0–360), saturation and brightness (0–1) of a colour, and back: for the colour wheel. */
export function hexHsv(hex: string): [number, number, number] {
  const [r, g, b] = hexRgb(hex).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  const h = !d ? 0 : mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, mx ? d / mx : 0, mx];
}
export function hsvHex(h: number, s: number, v: number): string {
  const f = (n: number) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return rgbHex([f(5) * 255, f(3) * 255, f(1) * 255]);
}
