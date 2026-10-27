// The welcome, right after joining: four short slides, each showing the thing it's about (a page being
// straightened, the welcome painting being made, a sketchbook leafing itself, the ways to share), then the
// ways in: add your first pages, leaf through the welcome sketchbook, or look around.
import { Fragment, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { V } from '../App';
import { GUIDE_BOOK, GUIDE_REPLAY_PAGE } from '../data';
import { hover } from '../pseudo';
import { INK, MARK, MUTED, PAGE, PAPER, SANS, SERIF, label } from '../theme';
import { playRecording } from './Replay';
import type { Recording } from './Replay';
import { TurningBook } from './Screens';

const REDUCE = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const PAGE_A = 0.72;

const CSS = `
@keyframes wl-straighten { 0%, 18% { transform: perspective(1100px) rotateX(22deg) rotateZ(-8deg) scale(.82); } 46%, 100% { transform: none; } }
@keyframes wl-desk { 0%, 30% { background-color: #cdbb9c; padding: 9%; } 46%, 100% { background-color: rgba(205,187,156,0); padding: 0; } }
@keyframes wl-dots { 0%, 30% { opacity: 1; } 42%, 100% { opacity: 0; } }
@keyframes wl-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@keyframes wl-bind { 0%, 55% { transform: translateX(-4%) ; opacity: 0; } 70%, 100% { transform: none; opacity: 1; } }
`;

/** A photo of a page, tilted on a desk, straightening itself and binding next to the page before. */
function BindDemo({ h }: { h: number }) {
  const w = Math.round(h * PAGE_A), anim = (name: string): CSSProperties => (REDUCE ? {} : { animation: `${name} 5.5s cubic-bezier(.5,0,.25,1) infinite` });
  const dot = (pos: CSSProperties) => <span style={{ position: 'absolute', width: 14, height: 14, margin: -7, borderRadius: '50%', background: MARK, border: `2px solid ${PAPER}`, ...pos, ...anim('wl-dots'), ...(REDUCE ? { opacity: 0 } : {}) }} />;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: w, height: h, borderRadius: '6px 1px 1px 6px', overflow: 'hidden', boxShadow: '0 16px 36px rgba(20,20,30,.18)', ...anim('wl-bind') }}>
        <img src="/welcome/page-2.jpg" alt="" style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>
      <div style={{ width: w, height: h, position: 'relative', ...anim('wl-straighten') }}>
        <div style={{ position: 'absolute', inset: 0, boxSizing: 'border-box', borderRadius: 4, ...anim('wl-desk') }}>
          <div style={{ position: 'relative', width: '100%', height: '100%', boxShadow: '0 16px 36px rgba(20,20,30,.18)', borderRadius: '1px 6px 6px 1px' }}>
            <img src={GUIDE_REPLAY_PAGE} alt="" style={{ width: '100%', height: '100%', display: 'block', borderRadius: 'inherit' }} />
            {dot({ left: 0, top: 0 })}{dot({ right: 0, top: 0 })}{dot({ left: 0, bottom: 0 })}{dot({ right: 0, bottom: 0 })}
          </div>
        </div>
      </div>
    </div>
  );
}

/** The welcome painting, being painted: its real recorded strokes, again and again. */
function DrawDemo({ h }: { h: number }) {
  const box = useRef<HTMLDivElement>(null), [done, setDone] = useState(REDUCE), [run, setRun] = useState(0);
  useEffect(() => {
    if (REDUCE || !box.current) return;
    let stop: (() => void) | null = null, gone = false, again = 0 as unknown as ReturnType<typeof setTimeout>;
    fetch('/welcome/replay.json').then(r => r.json() as Promise<Recording>).then(rec => {
      if (gone || !box.current) return;
      setDone(false);
      stop = playRecording(box.current, rec, { speed: () => 2, playing: () => true, onDone: () => { setDone(true); again = setTimeout(() => setRun(n => n + 1), 2600); } });
    }).catch(() => setDone(true));
    return () => { gone = true; stop?.(); clearTimeout(again); };
  }, [run]);
  return (
    <div style={{ position: 'relative', width: Math.round(h * PAGE_A), height: h, borderRadius: '2px 8px 8px 2px', overflow: 'hidden', boxShadow: '0 20px 44px rgba(20,20,30,.2)', background: PAGE }}>
      <div ref={box} style={{ position: 'absolute', inset: 0 }} />
      <img src={GUIDE_REPLAY_PAGE} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: done ? 1 : 0, transition: 'opacity 1s ease', pointerEvents: 'none' }} />
    </div>
  );
}

/** The welcome sketchbook, leafing through itself. */
function LeafDemo({ h }: { h: number }) {
  const pages = GUIDE_BOOK.images.map(u => `url("${u}") center/cover no-repeat ${PAGE}`);
  return <div style={{ position: 'relative', width: Math.round(h * PAGE_A * 2), height: h }}><TurningBook pages={pages} board={GUIDE_BOOK.color} /></div>;
}

/** Who sees it: public, link only or private, and a picture made for posting. */
function ShareDemo({ h }: { h: number }) {
  const opts: [string, string][] = [['Public', 'In Explore and on your profile'], ['Link only', 'For the people you send it to'], ['Private', 'Just for you, until you’re ready']];
  const [on, setOn] = useState(0);
  useEffect(() => { if (REDUCE) return; const t = setInterval(() => setOn(k => (k + 1) % 3), 1800); return () => clearInterval(t); }, []);
  const sh = Math.round(h * 0.92), sw = Math.round(sh * 9 / 16);
  return (
    <div style={{ display: 'flex', gap: Math.round(h * 0.08), alignItems: 'center' }}>
      <div aria-hidden="true" style={{ width: sw, height: sh, flexShrink: 0, borderRadius: 14, background: '#1f2a3d', boxShadow: '0 20px 44px rgba(20,20,30,.22)', padding: Math.round(sw * 0.1), boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: Math.round(sh * 0.035) }}>
        <img src={GUIDE_REPLAY_PAGE} alt="" style={{ width: '100%', aspectRatio: String(PAGE_A), display: 'block', borderRadius: 3 }} />
        <span style={{ font: `400 ${Math.round(sw * 0.09)}px/1.1 ${SERIF}`, color: '#f6f2ea' }}>A day by the sea</span>
        <span style={{ font: `500 ${Math.round(sw * 0.045)}px ${SANS}`, color: 'rgba(246,242,234,.7)' }}>fletora.studio</span>
      </div>
      <div role="radiogroup" aria-label="Who can see it" style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
        {opts.map(([t, d], k) => (
          <div key={t} role="radio" aria-checked={k === on} style={{ padding: '12px 16px', border: `1px solid ${k === on ? INK : 'rgba(var(--ink-rgb),.18)'}`, background: k === on ? INK : 'transparent', color: k === on ? PAPER : INK, transition: 'background .35s, color .35s, border-color .35s', display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ font: `500 15px ${SANS}` }}>{t}</span>
            <span style={{ font: `400 12.5px/1.35 ${SANS}`, opacity: 0.75 }}>{d}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// The journey, in the order people go through it: make a sketchbook, work in it, look through it, show it.
const SLIDES: { step: string; kicker: string; title: ReactNode; body: string; demo: (h: number) => ReactNode }[] = [
  { step: 'Bind', kicker: 'Step 1 · Start a sketchbook', title: <>Bind your <em style={{ color: MARK }}>pages.</em></>,
    body: 'Press Add pages and photograph the pages of a real sketchbook, or pick them from your camera roll. fletora straightens each one and binds them in order. No sketchbook to hand? Start with a blank page.', demo: h => <BindDemo h={h} /> },
  { step: 'Draw', kicker: 'Step 2 · Work on a page', title: <>Draw and <em style={{ color: MARK }}>paint.</em></>,
    body: 'Open any page and press Draw: pens, pencils, watercolour, oils, a brush and layers. Every stroke is recorded, so people can watch your page being made.', demo: h => <DrawDemo h={h} /> },
  { step: 'Leaf through', kicker: 'Step 3 · Look through it', title: <>Leaf <em style={{ color: MARK }}>through.</em></>,
    body: 'Your sketchbook turns page by page, like the real thing. Give a page a caption and a date, or type onto it with Text.', demo: h => <LeafDemo h={h} /> },
  { step: 'Share', kicker: 'Step 4 · Show people', title: <>Share it, <em style={{ color: MARK }}>or don’t.</em></>,
    body: 'Choose who sees each sketchbook: everyone in Explore, only people with the link, or just you. Change it any time, and make pictures of your pages for Instagram.', demo: h => <ShareDemo h={h} /> },
];

/** Where you are in the journey: the four steps in a line, the ones you've seen ticked. */
function StepRail({ at, go, mob }: { at: number; go: (k: number) => void; mob: boolean }) {
  return (
    <div role="tablist" aria-label="Steps" style={{ display: 'flex', alignItems: 'center', gap: mob ? 6 : 10, minWidth: 0 }}>
      {SLIDES.map((sl, k) => (
        <Fragment key={sl.step}>
          {k > 0 && <span aria-hidden="true" style={{ width: mob ? 10 : 28, height: 1, background: k <= at ? INK : 'rgba(var(--ink-rgb),.2)', flexShrink: 1, transition: 'background .3s' }} />}
          <button role="tab" aria-selected={k === at} onClick={() => go(k)} className={hover(`color:${INK}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 0, border: 'none', background: 'none', cursor: 'pointer', color: k <= at ? INK : MUTED, font: `${k === at ? 600 : 500} ${mob ? 12 : 13}px ${SANS}`, whiteSpace: 'nowrap', transition: 'color .3s' }}>
            <span style={{ width: mob ? 18 : 22, height: mob ? 18 : 22, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', font: `600 ${mob ? 10 : 11}px ${SANS}`,
              background: k < at ? INK : k === at ? MARK : 'none', color: k <= at ? PAPER : MUTED, border: k > at ? '1px solid rgba(var(--ink-rgb),.3)' : 'none', transition: 'background .3s' }}>{k < at ? '✓' : k + 1}</span>
            {(!mob || k === at) && sl.step}
          </button>
        </Fragment>
      ))}
    </div>
  );
}

/** Shown once, right after joining. */
export function Welcome({ v }: { v: V }) {
  const [i, setI] = useState(0), last = i === SLIDES.length - 1, mob = !v.notMob;
  const go = (k: number) => setI(Math.max(0, Math.min(SLIDES.length - 1, k)));
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') setI(k => Math.min(SLIDES.length - 1, k + 1)); if (e.key === 'ArrowLeft') setI(k => Math.max(0, k - 1)); };
    addEventListener('keydown', key); return () => removeEventListener('keydown', key);
  }, []);
  // Swipe between slides on touch screens.
  const sx = useRef<number | null>(null);
  const vw = window.innerWidth || 1200, vh = window.innerHeight || 800, s = SLIDES[i];
  // The demo takes what room is left: beside the words on larger screens, above them on phones.
  const wide = i === 2 ? 2 * PAGE_A : i === 3 ? 1.25 : 2 * PAGE_A;
  const h = Math.round(mob ? Math.min(vh * 0.4, (vw - 32) / wide) : Math.min(vh - 300, 560, (vw * 0.55 - 40) / wide));
  const btn: CSSProperties = { height: 48, padding: '0 24px', border: 'none', borderRadius: 2, background: INK, color: PAPER, font: `500 15px ${SANS}`, cursor: 'pointer', whiteSpace: 'nowrap' };
  const ghost: CSSProperties = { ...btn, background: 'none', color: INK, border: '1px solid rgba(var(--ink-rgb),.25)' };
  const link: CSSProperties = { padding: '4px 0', border: 'none', borderBottom: `1px solid ${INK}`, background: 'none', color: INK, font: `500 15px ${SANS}`, cursor: 'pointer' };
  return (
    <div role="dialog" aria-modal="true" aria-label="Welcome to fletora" onPointerDown={e => { sx.current = e.clientX; }} onPointerUp={e => { if (sx.current != null && mob && Math.abs(e.clientX - sx.current) > 50) go(i + (e.clientX < sx.current ? 1 : -1)); sx.current = null; }}
      style={{ position: 'absolute', inset: 0, zIndex: 25, background: PAPER, display: 'flex', flexDirection: 'column', boxSizing: 'border-box', padding: mob ? '16px 16px calc(16px + env(safe-area-inset-bottom))' : '28px 48px 36px', overflow: 'hidden' }}>
      <style>{CSS}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        {mob ? <StepRail at={i} go={go} mob /> : <span style={label(MARK, 11)}>Welcome, {v.welcomeName || 'artist'}</span>}
        {!mob && <StepRail at={i} go={go} mob={false} />}
        <button onClick={v.welcomeLater} className={hover(`color:${MARK}`)} style={{ border: 'none', background: 'none', color: MUTED, font: `500 14px ${SANS}`, cursor: 'pointer', padding: 6 }}>Skip</button>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: mob ? 'column' : 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: mob ? 22 : 64 }}>
        <div key={'d' + i} style={{ flexShrink: 0, display: 'flex', justifyContent: 'center', animation: REDUCE ? undefined : 'wl-in .4s ease' }}>{s.demo(h)}</div>
        <div key={'t' + i} style={{ display: 'flex', flexDirection: 'column', gap: mob ? 10 : 16, maxWidth: mob ? undefined : 420, width: mob ? '100%' : undefined }}>
          <span style={label(MARK, 11)}>{s.kicker}</span>
          <h1 style={{ margin: 0, font: `400 ${mob ? 44 : 72}px/.98 ${SERIF}`, letterSpacing: '-.02em' }}>{s.title}</h1>
          <p style={{ margin: 0, fontSize: mob ? 15 : 17, lineHeight: 1.55, color: MUTED }}>{s.body}</p>
          {i === 0 && <button onClick={v.openTour} className={hover('opacity:.75')} style={{ alignSelf: 'flex-start', padding: 0, border: 'none', background: 'none', font: `500 14px ${SANS}`, color: MARK, cursor: 'pointer', marginTop: mob ? 0 : 4 }}>▶ Watch the 1-minute tour</button>}
        </div>
      </div>
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: mob && last ? 'column' : 'row', alignItems: mob && last ? 'stretch' : 'center', justifyContent: mob && !last ? 'flex-end' : 'space-between', gap: 14, paddingTop: mob ? 14 : 20 }}>
        {!mob && (last ? <span style={{ fontSize: 14, color: MUTED }}>That’s the tour. Where would you like to start?</span> : <span />)}
        {last
          ? <div style={{ display: 'flex', flexDirection: mob ? 'column' : 'row', gap: mob ? 10 : 20, alignItems: mob ? 'stretch' : 'center' }}>
              <button onClick={v.welcomeLater} className={hover(`color:${MARK};border-color:${MARK}`)} style={{ ...link, alignSelf: mob ? 'center' : undefined, order: mob ? 3 : 0 }}>Look around</button>
              <button onClick={v.openGuide} className={hover(`border-color:${INK}`)} style={ghost}>Leaf through the welcome sketchbook</button>
              <button onClick={v.welcomeStart} autoFocus className={hover(`background:${MARK}`)} style={btn}>Add my first pages</button>
            </div>
          : <div style={{ display: 'flex', gap: 12 }}>
              {i > 0 && <button onClick={() => go(i - 1)} className={hover(`border-color:${INK}`)} style={ghost}>Back</button>}
              <button onClick={() => go(i + 1)} autoFocus className={hover(`background:${MARK}`)} style={btn}>{`Next: ${SLIDES[i + 1]?.step || ''}`}</button>
            </div>}
      </div>
    </div>
  );
}
