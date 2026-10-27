import type { CSSProperties } from 'react';
import type { V } from '../App';
import { hover } from '../pseudo';
import { INK, MARK, MUTED, PAPER, SANS, SERIF, label } from '../theme';

/** The sketchbook's timelapse video: drawing itself while it records, then ready to watch, share or save. */
export function TimelapseModal({ v }: { v: V }) {
  const t = v.tlState, making = t.phase === 'making', vh = window.innerHeight || 800, vw = window.innerWidth || 400;
  // 9:16, as tall as fits with the text and buttons.
  const h = Math.max(240, Math.min(vh - 230, (vw - 32) * 16 / 9)), w = h * 9 / 16;
  const btn = (primary: boolean): CSSProperties => ({ height: 44, padding: '0 20px', border: primary ? 'none' : '1px solid rgba(var(--ink-rgb),.3)', borderRadius: 2, background: primary ? MARK : 'none', color: primary ? PAPER : INK, font: `500 14px ${SANS}`, cursor: 'pointer' });
  return (
    <div role="dialog" aria-label="Timelapse video" style={{ position: 'absolute', inset: 0, zIndex: 40, background: PAPER, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 16, boxSizing: 'border-box' }}>
      {!making && <button onClick={v.tlClose} aria-label="Close" className={hover(`color:${MARK}`)} style={{ position: 'absolute', top: 14, right: 16, border: 'none', background: 'none', color: INK, fontSize: 26, cursor: 'pointer' }}>×</button>}
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={label(MARK, 10)}>Timelapse</span>
        <span style={{ font: `400 ${v.notMob ? 28 : 22}px/1.1 ${SERIF}` }}>{t.title}</span>
      </div>
      <div style={{ position: 'relative', width: w, height: h, boxShadow: '0 20px 50px rgba(20,20,30,.22)', background: '#f3efe6', overflow: 'hidden' }}>
        {t.phase === 'done' && t.url
          ? <video src={t.url} autoPlay loop muted playsInline controls style={{ width: '100%', height: '100%', display: 'block', background: PAPER }} />
          : <div ref={v.tlMount} style={{ position: 'absolute', inset: 0 }} />}
        {making && !t.pages && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: MUTED, background: PAPER }}>Gathering the pages…</div>}
        {t.phase === 'error' && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', fontSize: 14, color: MUTED, background: PAPER }}>Couldn’t make the video. Try again.</div>}
      </div>
      {making && (
        <>
          <div style={{ width: w, maxWidth: '100%', height: 3, background: 'rgba(var(--ink-rgb),.12)', borderRadius: 2, overflow: 'hidden' }}><div style={{ width: `${Math.round(t.progress * 100)}%`, height: '100%', background: MARK, transition: 'width .2s linear' }} /></div>
          <span style={{ fontSize: 13, color: MUTED, textAlign: 'center', maxWidth: 420, lineHeight: 1.5 }}>
            {t.pages ? `Recording ${t.pages} ${t.pages === 1 ? 'page' : 'pages'}${t.drawn ? `, ${t.drawn} drawn in fletora` : ''}. Keep this tab open; it takes as long as the video.` : 'Getting the pages and their strokes.'}
          </span>
          <button onClick={v.tlCancel} style={btn(false)}>Cancel</button>
        </>
      )}
      {t.phase === 'done' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={v.tlShare} className={hover(`background:${INK}`)} style={btn(true)}>{v.tlCanShare ? 'Share video' : 'Download video'}</button>
          <button onClick={v.tlClose} style={btn(false)}>Done</button>
        </div>
      )}
    </div>
  );
}
