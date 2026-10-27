// A sketchbook as a short vertical video (1080 × 1920, for Instagram, TikTok and the like): each page drawn in
// Fletora replays its strokes, sped up to a few seconds, and settles into the finished page; photo pages show for a
// moment; then fletora's mark. Recorded in the browser from a canvas (MP4 where the browser can, otherwise WebM),
// in real time, so it takes as long as the video lasts.
import { Painter } from './paint';
import type { Op } from './paint';
import { paperUrl } from './paper';
import type { Paper } from './paper';

const PAPER = '#F4F1E9', INK = '#222320', MARK = '#AD493A', MUTED = '#77756E';
const SERIF = '"Instrument Serif", Georgia, serif', SANS = '"Geist", Helvetica, Arial, sans-serif';
const W = 1080, H = 1920, FPS = 30;
interface Recording { v: 1; a: number; paper: Paper | null; layers: { v: boolean; o: number }[]; ops: Op[] }
export interface TimelapsePage { img: string; replay: string | null }
export interface Timelapse { blob: Blob; type: string; ext: 'mp4' | 'webm' }

const load = (src: string) => new Promise<HTMLImageElement>((ok, fail) => { const im = new Image(); if (!/^(data|blob):/.test(src)) im.crossOrigin = 'anonymous'; im.onload = () => ok(im); im.onerror = () => fail(new Error('image')); im.src = src; });
const fit = (ctx: CanvasRenderingContext2D, t: string, max: number) => { if (ctx.measureText(t).width <= max) return t; while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1); return t + '…'; };
const ease = (t: number) => t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;

/** The best format this browser can record. */
export function videoType(): { type: string; ext: 'mp4' | 'webm' } | null {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const type of ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'])
    if (MediaRecorder.isTypeSupported(type)) return { type, ext: type.startsWith('video/mp4') ? 'mp4' : 'webm' };
  return null;
}

export async function makeTimelapse(o: {
  canvas: HTMLCanvasElement; pages: TimelapsePage[]; aspect: number; title: string; artist: string; link: string;
  onProgress: (f: number) => void; signal: AbortSignal;
}): Promise<Timelapse> {
  const fmt = videoType(); if (!fmt) throw new Error('no-recorder');
  await Promise.all([document.fonts?.load(`72px ${SERIF}`), document.fonts?.load(`500 28px ${SANS}`)].map(p => p?.catch(() => undefined)));
  const c = o.canvas; c.width = W; c.height = H; const ctx = c.getContext('2d')!;
  // The page box: as large as fits above the caption.
  const boxW = W - 160, boxH = H - 640, pw = Math.min(boxW, boxH * o.aspect), ph = pw / o.aspect, px = (W - pw) / 2, py = 200 + (boxH - ph) / 2;
  const imgs = await Promise.all(o.pages.map(p => load(p.img).catch(() => null)));
  const recs = o.pages.map(p => { try { return p.replay ? JSON.parse(p.replay) as Recording : null; } catch { return null; } });
  const papers = await Promise.all(recs.map(r => r?.paper ? load(paperUrl(r.paper, o.aspect)).catch(() => null) : null));

  // Scenes, each with how long it lasts (ms) and how to draw a moment of it.
  type Scene = { ms: number; draw: (t: number, dt: number) => void };
  const scenes: Scene[] = [];
  const frame = (label: string, inner: () => void) => {
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.shadowColor = 'rgba(34,35,32,.22)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 28; ctx.fillStyle = '#f3efe6'; ctx.fillRect(px, py, pw, ph); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip(); inner(); ctx.restore();
    ctx.textAlign = 'center'; ctx.fillStyle = MUTED; ctx.font = `600 24px ${SANS}`; ctx.fillText(label.toUpperCase().split('').join(' '), W / 2, 130);
    ctx.fillStyle = INK; ctx.font = `400 76px ${SERIF}`; ctx.fillText(fit(ctx, o.title, W - 160), W / 2, py + ph + 130);
    ctx.fillStyle = MUTED; ctx.font = `500 30px ${SANS}`; ctx.fillText(fit(ctx, `by ${o.artist}`, W - 160), W / 2, py + ph + 190);
    mark(H - 110, 52);
  };
  const mark = (y: number, size: number) => {
    ctx.font = `400 ${size}px ${SERIF}`; const mw = ctx.measureText('fletora').width, dw = ctx.measureText('.').width, mx = W / 2 - (mw + dw) / 2;
    ctx.textAlign = 'left'; ctx.fillStyle = INK; ctx.fillText('fletora', mx, y); ctx.fillStyle = MARK; ctx.fillText('.', mx + mw, y); ctx.textAlign = 'center';
  };
  const n = o.pages.length;
  o.pages.forEach((_, i) => {
    const im = imgs[i], rec = recs[i], label = `Page ${i + 1} of ${n}`;
    if (!rec || !rec.ops.some(op => op.t === 's')) {
      // A photo page: a slow push in.
      scenes.push({ ms: 1600, draw: t => frame(label, () => { if (!im) return; const k = 1 + 0.04 * t; ctx.globalAlpha = Math.min(1, t * 4); ctx.drawImage(im, px - pw * (k - 1) / 2, py - ph * (k - 1) / 2, pw * k, ph * k); ctx.globalAlpha = 1; }) });
      return;
    }
    // A drawn page: its strokes in order, sped up to fit 3–7 seconds, then the finished page fades in.
    // Made when its page comes up and let go after, so a long sketchbook doesn't hold every page's layers at once.
    let painter: Painter | null = null;
    const P = () => { if (painter) return painter; const q = painter = new Painter(rec.a || o.aspect);
      q.setBase(g => { g.fillStyle = '#f3efe6'; g.fillRect(0, 0, q.W, q.H); const pap = papers[i]; if (pap) g.drawImage(pap, 0, 0, q.W, q.H); else if (im) { g.globalAlpha = 0.28; g.drawImage(im, 0, 0, q.W, q.H); g.globalAlpha = 1; } }, 'tl' + i); return q; };
    const strokes = rec.ops.filter(op => op.t === 's') as (Op & { t: 's' })[];
    const total = strokes.reduce((a, s) => { let d = 180; for (let k = 7; k < s.pts.length; k += 4) d += Math.min(250, s.pts[k]); return a + d; }, 0) || 1;
    const ms = Math.max(3000, Math.min(7000, total / 6)), speed = total / ms;
    let oi = 0, pi = 0, owed = 0, inStroke = false;
    const step = (dt: number) => {
      const p = P(); owed += dt * speed;
      while (owed > 0 && oi < rec.ops.length) {
        const op = rec.ops[oi];
        if (op.t === 'a') { p.addLayer(false); oi++; continue; }
        if (op.t === 'r') { p.removeLayer(op.l); oi++; continue; }
        if (op.t === 'c') { p.setActive(op.l); p.clear(); oi++; continue; }
        const pts = op.pts, pt = (k: number) => [pts[k] / 4095, pts[k + 1] / 4095, pts[k + 2] / 255] as const;
        if (!inStroke) { p.setActive(op.l); const [x, y, pr] = pt(0); p.begin(op.pen, x, y, pr, op.seed); pi = 4; inStroke = true; continue; }
        if (pi >= pts.length) { p.end(); inStroke = false; oi++; owed -= 180; continue; }
        const wait = Math.min(250, pts[pi + 3]); if (wait > owed) break;
        owed -= wait; const [x, y, pr] = pt(pi); p.move(x, y, pr); pi += 4;
      }
    };
    const bg = papers[i];
    scenes.push({ ms, draw: (_t, dt) => { step(dt); frame(label, () => {
      ctx.fillStyle = '#f3efe6'; ctx.fillRect(px, py, pw, ph);
      if (bg) ctx.drawImage(bg, px, py, pw, ph); else if (im) { ctx.globalAlpha = 0.28; ctx.drawImage(im, px, py, pw, ph); ctx.globalAlpha = 1; }
      P().drawLive(ctx, px, py, pw, ph);
    }); } });
    scenes.push({ ms: 900, draw: t => { if (painter) step(1e9); frame(label, () => {
      ctx.fillStyle = '#f3efe6'; ctx.fillRect(px, py, pw, ph); if (bg) ctx.drawImage(bg, px, py, pw, ph);
      painter?.drawLive(ctx, px, py, pw, ph); if (im) { ctx.globalAlpha = ease(Math.min(1, t * 1.6)); ctx.drawImage(im, px, py, pw, ph); ctx.globalAlpha = 1; }
      if (t >= 1) painter = null;
    }); } });
  });
  // The end: the mark and where to find it.
  scenes.push({ ms: 1800, draw: t => {
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = ease(Math.min(1, t * 2.5));
    mark(H / 2, 150); ctx.fillStyle = MUTED; ctx.font = `500 34px ${SANS}`; ctx.fillText(o.link.replace(/^https?:\/\//, ''), W / 2, H / 2 + 90); ctx.globalAlpha = 1;
  } });

  // Record in real time.
  const total = scenes.reduce((a, s) => a + s.ms, 0);
  scenes[0].draw(0, 0);
  const stream = c.captureStream(FPS), rec = new MediaRecorder(stream, { mimeType: fmt.type, videoBitsPerSecond: 8_000_000 }), chunks: Blob[] = [];
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  const done = new Promise<void>(ok => { rec.onstop = () => ok(); });
  rec.start(500);
  await new Promise<void>((ok, fail) => {
    let si = 0, inScene = 0, last = performance.now();
    const tick = (now: number) => {
      if (o.signal.aborted) { rec.stop(); return fail(new DOMException('Cancelled', 'AbortError')); }
      const dt = Math.min(100, now - last); last = now; inScene += dt;
      while (si < scenes.length && inScene >= scenes[si].ms) { scenes[si].draw(1, dt); inScene -= scenes[si].ms; si++; }
      if (si >= scenes.length) { o.onProgress(1); setTimeout(() => { rec.stop(); ok(); }, 300); return; }
      scenes[si].draw(inScene / scenes[si].ms, dt);
      o.onProgress((scenes.slice(0, si).reduce((a, s) => a + s.ms, 0) + inScene) / total);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await done; stream.getTracks().forEach(t => t.stop());
  return { blob: new Blob(chunks, { type: fmt.type.split(';')[0] }), type: fmt.type, ext: fmt.ext };
}
