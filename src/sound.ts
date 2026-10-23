// Page-turn sound, synthesised so there's nothing to download: a soft swish of filtered noise
// that rises as the page lifts and falls as it lands, then a faint tap as it settles.
import * as store from './storage';

let ctx: AudioContext | null = null;
let on = store.loadSound();
let lastAt = 0;

export const soundOn = () => on;
export function setSound(v: boolean) { on = v; store.saveSound(v); if (v) pageTurn(1); }

function audio(): AudioContext | null {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function noise(c: AudioContext, secs: number) {
  const n = Math.ceil(c.sampleRate * secs), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
  // White noise with occasional crackles, like paper fibres catching.
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * 0.6 + (Math.random() < 0.0015 ? (Math.random() * 2 - 1) : 0);
  const src = c.createBufferSource(); src.buffer = buf; return src;
}

/** Plays one turn; `pages` > 1 (flipping several at once) makes a longer riffle. */
export function pageTurn(pages = 1) {
  if (!on || performance.now() - lastAt < 60) return;
  const c = audio(); if (!c) return;
  lastAt = performance.now();
  const t = c.currentTime + 0.01, dur = 0.34 + Math.min(4, pages - 1) * 0.1, vary = 0.85 + Math.random() * 0.3;
  const out = c.createGain(); out.gain.value = 0.22; out.connect(c.destination);

  const swish = noise(c, dur), band = c.createBiquadFilter(), hp = c.createBiquadFilter(), env = c.createGain();
  band.type = 'bandpass'; band.Q.value = 0.9;
  band.frequency.setValueAtTime(700 * vary, t);
  band.frequency.exponentialRampToValueAtTime(3200 * vary, t + dur * 0.4);
  band.frequency.exponentialRampToValueAtTime(1100 * vary, t + dur);
  hp.type = 'highpass'; hp.frequency.value = 250;
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(1, t + dur * 0.35);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  swish.connect(band).connect(hp).connect(env).connect(out);
  swish.start(t); swish.stop(t + dur);

  const tap = noise(c, 0.08), lp = c.createBiquadFilter(), tEnv = c.createGain(), t2 = t + dur * 0.88;
  lp.type = 'lowpass'; lp.frequency.value = 500;
  tEnv.gain.setValueAtTime(0.0001, t2);
  tEnv.gain.exponentialRampToValueAtTime(0.7, t2 + 0.008);
  tEnv.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.07);
  tap.connect(lp).connect(tEnv).connect(out);
  tap.start(t2); tap.stop(t2 + 0.08);
}
