import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { V } from '../App';
import { Painter } from '../paint';
import type { Op } from '../paint';
import { paperUrl } from '../paper';
import type { Paper } from '../paper';
import { hover } from '../pseudo';
import { INK, MARK, PAPER, SANS, SERIF, label } from '../theme';

export interface Recording { v: 1; a: number; paper: Paper | null; layers: { v: boolean; o: number }[]; ops: Op[] }
const SPEEDS = [1, 2, 4, 8];
const loadImg = (src: string) => new Promise<HTMLImageElement>((ok, fail) => { const im = new Image(); if (!src.startsWith('data:') && !src.startsWith('blob:')) im.crossOrigin = 'anonymous'; im.onload = () => ok(im); im.onerror = fail; im.src = src; });

/** Plays a recording's strokes into `el` (a canvas on its paper, or on a faint copy of the finished page `img`),
 *  at `speed()` times real time while `playing()`. Returns a function that stops it. */
export function playRecording(el: HTMLElement, rec: Recording, o: { img?: string; speed: () => number; playing: () => boolean; onProg?: (f: number) => void; onDone?: () => void }) {
  let stop = false, raf = 0; el.innerHTML = '';
  const aspect = rec.a || 0.7, p = new Painter(aspect), W = p.W, H = p.H;
  (async () => {
    const base = document.createElement('canvas'); base.width = W; base.height = H; Object.assign(base.style, { position: 'absolute', inset: '0', width: '100%', height: '100%' });
    const g = base.getContext('2d')!; g.fillStyle = '#f3efe6'; g.fillRect(0, 0, W, H);
    try {
      if (rec.paper) g.drawImage(await loadImg(paperUrl(rec.paper, aspect)), 0, 0, W, H);
      else if (o.img) { g.globalAlpha = 0.28; g.drawImage(await loadImg(o.img), 0, 0, W, H); g.globalAlpha = 1; }
    } catch { /* plain paper */ }
    if (stop) return;
    p.setBase(ctx => ctx.drawImage(base, 0, 0), 'replay');
    el.append(base, p.el);
    // Strokes in order; a short pause between them, and long pauses within one shortened.
    const strokes = rec.ops.filter(op => op.t === 's').length || 1;
    let oi = 0, pi = 0, owed = 0, last = performance.now(), doneStrokes = 0, inStroke = false;
    const step = (now: number) => {
      if (stop) return;
      const dt = now - last; last = now;
      if (o.playing()) owed += dt * o.speed();
      while (owed > 0 && oi < rec.ops.length) {
        const op = rec.ops[oi];
        if (op.t === 'a') { p.addLayer(false); oi++; continue; }
        if (op.t === 'r') { p.removeLayer(op.l); oi++; continue; }
        if (op.t === 'c') { p.setActive(op.l); p.clear(); oi++; continue; }
        const pts = op.pts, pt = (k: number) => [pts[k] / 4095, pts[k + 1] / 4095, pts[k + 2] / 255] as const;
        if (!inStroke) { p.setActive(op.l); const [x, y, pr] = pt(0); p.begin(op.pen, x, y, pr, op.seed); pi = 4; inStroke = true; continue; }
        if (pi >= pts.length) { p.end(); inStroke = false; oi++; doneStrokes++; owed -= 180; continue; }
        const wait = Math.min(250, pts[pi + 3]); if (wait > owed) break;
        owed -= wait; const [x, y, pr] = pt(pi); p.move(x, y, pr); pi += 4;
      }
      o.onProg?.(doneStrokes / strokes);
      if (oi >= rec.ops.length) {
        rec.layers.forEach((l, i) => { p.setVisible(i, l.v); p.setOpacity(i, l.o); });
        o.onProg?.(1); o.onDone?.(); return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  })();
  return () => { stop = true; cancelAnimationFrame(raf); };
}

/**
 * Watch a page being drawn: its strokes played back with the same brushes, in order, then the finished page.
 * A blank page replays on its paper; a photo page on a faint copy of the finished page (the photo underneath
 * isn't kept separately), which is why the finished page fades in at the end.
 */
export function ReplayPlayer({ v }: { v: V }) {
  const r = v.rpState, box = useRef<HTMLDivElement>(null);
  const [speed, setSpeed] = useState(2), [playing, setPlaying] = useState(true), [done, setDone] = useState(false), [prog, setProg] = useState(0), [run, setRun] = useState(0);
  const speedRef = useRef(speed), playRef = useRef(playing); speedRef.current = speed; playRef.current = playing;
  const rec: Recording | null = (() => { try { return r?.data ? JSON.parse(r.data) : null; } catch { return null; } })();
  const aspect = rec?.a || 0.7;
  useEffect(() => {
    if (!rec || !box.current) return;
    setDone(false); setProg(0); setPlaying(true);
    return playRecording(box.current, rec, { img: r?.img, speed: () => speedRef.current, playing: () => playRef.current, onProg: setProg, onDone: () => setDone(true) });
  }, [r?.data, run]);
  const vw = window.innerWidth || 1200, vh = window.innerHeight || 800, W = Math.round(Math.min(vw * 0.9, (vh - 200) * aspect)), H = Math.round(W / aspect);
  const btn = (on: boolean): CSSProperties => ({ height: 34, minWidth: 34, padding: '0 12px', borderRadius: 17, border: `1px solid ${on ? INK : 'rgba(var(--ink-rgb),.25)'}`, background: on ? INK : 'none', color: on ? PAPER : INK, font: `500 13px ${SANS}`, cursor: 'pointer' });
  return (
    <div role="dialog" aria-label="Replay" style={{ position: 'absolute', inset: 0, zIndex: 40, background: PAPER, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 16, boxSizing: 'border-box' }}>
      <button onClick={v.rpClose} aria-label="Close replay" className={hover(`color:${MARK}`)} style={{ position: 'absolute', top: 14, right: 16, border: 'none', background: 'none', color: INK, fontSize: 26, cursor: 'pointer' }}>×</button>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={label(MARK, 10)}>Replay</span>
        <span style={{ font: `400 ${v.notMob ? 30 : 24}px/1.1 ${SERIF}` }}>{r?.title}</span>
      </div>
      {v.rpPages?.length > 1 && (
        // Both pages of the spread were drawn here: switch between them.
        <div role="tablist" aria-label="Page" style={{ display: 'flex', gap: 2, padding: 3, border: '1px solid rgba(var(--ink-rgb),.2)' }}>
          {v.rpPages.map((p: V) => <button key={p.key} role="tab" aria-selected={p.on} onClick={p.pick} style={{ height: 32, padding: '0 16px', border: 'none', borderRadius: 2, background: p.on ? INK : 'transparent', color: p.on ? PAPER : INK, font: `500 13px ${SANS}`, cursor: 'pointer' }}>{p.label}</button>)}
        </div>
      )}
      <div style={{ position: 'relative', width: W, height: H, borderRadius: '2px 8px 8px 2px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(20,20,30,.25)', background: '#f3efe6' }}>
        {!rec && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'rgba(var(--ink-rgb),.6)' }}>{r?.err || 'Loading the strokes…'}</div>}
        <div ref={box} style={{ position: 'absolute', inset: 0 }} />
        {r?.img && <img src={r.img} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill', opacity: done ? 1 : 0, transition: 'opacity 1.2s ease', pointerEvents: 'none' }} />}
      </div>
      <div style={{ width: W, maxWidth: '100%', height: 3, background: 'rgba(var(--ink-rgb),.12)', borderRadius: 2, overflow: 'hidden' }}><div style={{ width: `${prog * 100}%`, height: '100%', background: MARK }} /></div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        {done
          ? <button onClick={() => setRun(n => n + 1)} style={btn(true)}>↺ Watch again</button>
          : <button onClick={() => setPlaying(x => !x)} aria-label={playing ? 'Pause' : 'Play'} style={btn(true)}>{playing ? '❚❚ Pause' : '▶ Play'}</button>}
        <span style={{ width: 8 }} />
        {SPEEDS.map(x => <button key={x} onClick={() => setSpeed(x)} aria-pressed={speed === x} style={btn(speed === x)}>{x}×</button>)}
        {/* As a video file (the replay sped up, framed for Instagram and TikTok; see timelapse.ts). */}
        {rec && r?.at != null && v.bkCanVideo && <><span style={{ width: 8 }} /><button onClick={() => v.bkTimelapse(r.all?.length ? r.all : r.at)} style={btn(false)}>↓ Download video</button></>}
      </div>
    </div>
  );
}
