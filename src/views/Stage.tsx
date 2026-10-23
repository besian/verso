import type { CSSProperties, ReactNode } from 'react';
import type { V } from '../App';
import ClosedBook from '../ClosedBook';
import { hover } from '../pseudo';
import { earClip } from '../wear';
import type { Wear } from '../wear';
import { INK, MARK, PAGE_EDGES, PAPER, SANS, SERIF, STONE, label } from '../theme';

const navLink: CSSProperties = { border: 'none', background: 'none', padding: '4px 0', cursor: 'pointer', ...label() };
const textBtn: CSSProperties = { height: 34, padding: 0, border: 'none', background: 'none', cursor: 'pointer', whiteSpace: 'nowrap', ...label(INK) };
const roundDark = (size: number, fs: number): CSSProperties => ({ width: size, height: size, borderRadius: '50%', border: 'none', background: INK, color: PAPER, font: `500 ${fs}px ${SANS}`, cursor: 'pointer' });
const arrowBtn: CSSProperties = { width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(34,35,32,.12)', color: INK, font: `500 16px ${SANS}`, cursor: 'pointer' };

function TopBar({ v }: { v: V }) {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: `${v.mTop}px ${v.mPad}px 12px`, background: PAPER, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, zIndex: 5, opacity: v.uiOp, pointerEvents: v.uiPE }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: v.mNavGap }}>
        <button onClick={v.goHome} title="Home" style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', font: `400 30px/1 ${SERIF}`, letterSpacing: '-.01em', color: INK }}>verso<span style={{ color: MARK }}>.</span></button>
        <div style={{ display: 'flex', gap: v.mGap }}>
          <button onClick={v.goExplore} className={hover(`color:${MARK}`)} style={{ ...navLink, borderBottom: `1px solid ${v.navExLine}`, color: v.navExFg }}>Explore</button>
          {v.hasAcct && <button onClick={v.goMine} className={hover(`color:${MARK}`)} style={{ ...navLink, borderBottom: `1px solid ${v.navMineLine}`, color: v.navMineFg, whiteSpace: 'nowrap' }}>{v.navMineLbl}</button>}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {v.isOther && <button onClick={v.goExplore} className={hover(`color:${MARK}`)} style={textBtn}>← Explore</button>}
        {v.isMine && <button onClick={v.newBook} className={hover(`color:${MARK}`)} style={textBtn}>{v.newLbl}</button>}
        {v.hasAcct && <button onClick={v.openMe} title="Your profile" className={hover('transform:scale(1.06)')} style={{ width: 34, height: 34, flexShrink: 0, borderRadius: '50%', border: 'none', padding: 0, background: v.meAvBg, color: PAPER, font: `500 11px ${SANS}`, cursor: 'pointer', boxShadow: v.meRing }}>{v.meInit}</button>}
        {v.noAcct && (
          <>
            <button onClick={v.openSignin} className={hover(`color:${MARK}`)} style={{ ...textBtn, padding: '0 6px 0 0' }}>Sign in</button>
            <button onClick={v.openMe} className={hover(`background:${MARK}`)} style={{ ...textBtn, padding: '0 14px', borderRadius: 2, background: INK, color: PAPER }}>Join</button>
          </>
        )}
      </div>
    </div>
  );
}

function Title({ v }: { v: V }) {
  return (
    <div style={{ position: 'relative', marginTop: v.mTitleTop, maxWidth: '100%', boxSizing: 'border-box', padding: `0 ${v.mPad}px`, display: 'flex', alignItems: 'center', gap: v.mGap, opacity: v.uiOp, pointerEvents: v.uiPE }}>
      {v.multi && <button onClick={v.prevBook} title="Previous sketchbook" style={{ ...arrowBtn, opacity: v.prevOp }}>‹</button>}
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', minWidth: 0, opacity: v.titleOp }}>
        <div style={{ fontSize: v.mTitleSize, fontFamily: SERIF, fontWeight: 400, letterSpacing: '-.01em', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.titleName}</div>
        <div style={label()}>
          {v.isOther
            ? <>by <button onClick={v.openArtist} title="View profile" className={hover(`color:${MARK};border-color:${MARK}`)} style={{ padding: 0, border: 'none', borderBottom: `1px solid ${INK}`, background: 'none', font: 'inherit', letterSpacing: 'inherit', textTransform: 'inherit', color: INK, cursor: 'pointer' }}>{v.artist}</button> · {v.otherPages} pages</>
            : v.bookMeta}
        </div>
      </div>
      {v.multi && <button onClick={v.nextBook} title="Next sketchbook" style={{ ...arrowBtn, opacity: v.nextOp }}>›</button>}
    </div>
  );
}

function Carousel({ v }: { v: V }) {
  return (
    <div style={{ position: 'absolute', left: '50%', top: '50%', width: 0, height: 0, transformStyle: 'preserve-3d', transform: v.sbBase, opacity: v.uiOp, pointerEvents: v.uiPE }}>
      {v.sideBooks.map((sb: V) => (
        <div key={sb.key} onPointerDown={sb.stop} onClick={sb.open} style={{ position: 'absolute', left: 0, top: sb.top, width: sb.w, height: sb.h, transform: sb.transform, opacity: sb.opacity, cursor: 'pointer' }}>
          <ClosedBook bg={sb.bg} board={sb.board} boardShadow="0 24px 40px rgba(34,35,32,.16)" band={8} shade={sb.shade}
            label={sb.showLabel ? sb.name : null} labelStyle={{ padding: '10px 12px', fontSize: 15 }} />
          <div style={{ position: 'absolute', top: 'calc(100% + 18px)', left: 0, right: 0, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 2, opacity: sb.labelOp }}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{sb.name}</div>
            <div style={{ fontSize: 14, color: 'rgba(34,35,32,.7)' }}>{sb.count}</div>
          </div>
        </div>
      ))}
      {v.showGhost && (
        <div onPointerDown={v.stopPD} onClick={v.newBook} className={hover('border-color:rgba(34,35,32,.7)')} style={{ position: 'absolute', left: 0, top: v.ghostTop, width: v.ghostW, height: v.ghostH, transform: v.ghostT, border: '2px dashed rgba(34,35,32,.35)', borderRadius: '4px 12px 12px 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 500, color: 'rgba(34,35,32,.75)', cursor: 'pointer', boxSizing: 'border-box' }}>+ New sketchbook</div>
      )}
    </div>
  );
}

// The folded-over flap of a dog-eared corner: a right triangle of the page's underside, lit
// from the fold, casting a small shadow onto the page.
const EAR_SHAPE = { tl: 'polygon(100% 0, 0 100%, 100% 100%)', tr: 'polygon(0 0, 100% 100%, 0 100%)', bl: 'polygon(0 0, 100% 0, 100% 100%)', br: 'polygon(0 0, 100% 0, 0 100%)' };
const EAR_LIGHT = { tl: '135deg', tr: '225deg', bl: '45deg', br: '315deg' };
function DogEar({ ear }: { ear?: Wear['ear'] }) {
  if (!ear) return null;
  const c = ear.corner;
  return (
    <div style={{ position: 'absolute', width: ear.size, height: ear.size, [c[0] === 't' ? 'top' : 'bottom']: 0, [c[1] === 'l' ? 'left' : 'right']: 0, filter: 'drop-shadow(-1px 2px 2.5px rgba(40,30,20,.42))', pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, clipPath: EAR_SHAPE[c], background: `linear-gradient(${EAR_LIGHT[c]}, #faf7f0 0%, #e8e0cf 55%, #d4c8b0 100%)` }} />
    </div>
  );
}
function PageWear({ overlay }: { overlay?: string }) {
  return overlay ? <div style={{ ...fill, background: overlay, mixBlendMode: 'multiply', pointerEvents: 'none' }} /> : null;
}

const leafNum: CSSProperties = { position: 'absolute', bottom: 12, fontSize: 11, color: 'rgba(40,40,60,.45)' };
const fill: CSSProperties = { position: 'absolute', inset: 0 };

function FrontFace({ leaf, onClick, style }: { leaf: V; onClick?: () => void; style?: CSSProperties }) {
  return (
    <div onClick={onClick} style={{ ...fill, backfaceVisibility: 'hidden', borderRadius: '2px 10px 10px 2px', overflow: 'hidden', background: leaf.frontBg, boxShadow: 'inset 6px 0 10px -6px rgba(0,0,0,.35)', clipPath: earClip(leaf.wearF?.ear), ...style }}>
      <PageWear overlay={leaf.overlayF} />
      <DogEar ear={leaf.wearF?.ear} />
      {leaf.isCoverAny && <div style={{ position: 'absolute', right: '13%', top: 0, bottom: 0, width: 8, background: '#1d1d26', boxShadow: '-2px 0 3px rgba(0,0,0,.25),2px 0 3px rgba(0,0,0,.25)', pointerEvents: 'none' }} />}
      {leaf.isCover && <div className="cover-label" style={{ position: 'absolute', left: '16%', right: '26%', top: '14%', padding: '10px 12px', background: '#f6f2e9', borderRadius: 2, boxShadow: '0 1px 2px rgba(0,0,0,.2)', color: INK, fontSize: 15, fontWeight: 600, letterSpacing: '-.01em', pointerEvents: 'none' }}>{leaf.label}</div>}
      <div style={{ ...fill, background: '#000', opacity: leaf.shadeF, pointerEvents: 'none' }} />
      <div style={{ ...leafNum, right: 14 }}>{leaf.numF}</div>
    </div>
  );
}

function BackFace({ leaf, onClick, style }: { leaf: V; onClick?: () => void; style?: CSSProperties }) {
  return (
    <div onClick={onClick} style={{ ...fill, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', borderRadius: '10px 2px 2px 10px', overflow: 'hidden', background: leaf.backBg, boxShadow: 'inset -6px 0 10px -6px rgba(0,0,0,.35)', clipPath: earClip(leaf.wearB?.ear), ...style }}>
      <PageWear overlay={leaf.overlayB} />
      <DogEar ear={leaf.wearB?.ear} />
      {leaf.isBackCover && <div style={{ position: 'absolute', left: '13%', top: 0, bottom: 0, width: 8, background: '#1d1d26', boxShadow: '-2px 0 3px rgba(0,0,0,.25),2px 0 3px rgba(0,0,0,.25)', pointerEvents: 'none' }} />}
      <div style={{ ...fill, background: '#000', opacity: leaf.shadeB, pointerEvents: 'none' }} />
      <div style={{ ...leafNum, left: 14 }}>{leaf.numB}</div>
    </div>
  );
}

const CURL_SEGS = 10;
/**
 * A leaf mid-turn, bent like paper: split into vertical strips, each rotated a little more than
 * the one before it (nested, so the bends add up toward the outer edge). Each strip shows its
 * slice of the full front and back faces, with a soft shadow that deepens along the curl.
 */
function CurledLeaf({ leaf, W, H }: { leaf: V; W: number; H: number }) {
  const n = CURL_SEGS, s = W / n;
  const seg = (k: number): ReactNode => (
    <div style={{ position: 'absolute', left: k ? s : 0, top: 0, width: s + 0.75, height: H, transformOrigin: '0 50%', transformStyle: 'preserve-3d', transform: k ? `rotateY(${leaf.curl}deg)` : undefined }}>
      <div style={{ ...fill, overflow: 'hidden', backfaceVisibility: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: -k * s, width: W, height: H }}><FrontFace leaf={leaf} style={{ backfaceVisibility: 'visible' }} /></div>
        <div style={{ ...fill, background: `rgba(30,24,16,${(leaf.curlAmt * 0.16 * k / n).toFixed(3)})`, pointerEvents: 'none' }} />
      </div>
      <div style={{ ...fill, overflow: 'hidden', backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
        <div style={{ position: 'absolute', top: 0, left: -(W - (k + 1) * s), width: W, height: H }}><BackFace leaf={leaf} style={{ transform: 'none', backfaceVisibility: 'visible' }} /></div>
        <div style={{ ...fill, background: `rgba(30,24,16,${(leaf.curlAmt * 0.12 * k / n).toFixed(3)})`, pointerEvents: 'none' }} />
      </div>
      {k < n - 1 && seg(k + 1)}
    </div>
  );
  return <>{seg(0)}</>;
}

function Book3D({ v }: { v: V }) {
  return (
    <div style={{ position: 'relative', width: 0, height: v.H, transformStyle: 'preserve-3d', transform: v.bookTransform, opacity: v.bookOp }}>
      <div style={{ position: 'absolute', left: v.shadowLeft, top: 0, width: v.shadowW, height: v.H, transform: 'translateZ(-2px) translateY(26px)', background: 'rgba(34,35,32,.16)', filter: 'blur(22px)', borderRadius: 2, opacity: v.openShadowOp }} />
      <div style={{ position: 'absolute', left: v.bodyLeft, top: 0, width: v.W, height: v.H, transform: 'translateZ(-1px)', opacity: v.bodyOp, pointerEvents: 'none' }}>
        <div style={{ ...fill, transform: v.bodyBack ? 'translate(-7px,6px)' : 'translate(7px,6px)', borderRadius: v.bodyBack ? '11px 3px 3px 11px' : '3px 11px 11px 3px', background: v.boardColor, filter: 'brightness(.6)', boxShadow: '0 24px 40px rgba(34,35,32,.16)' }} />
        <div style={{ position: 'absolute', top: 3, bottom: -3, left: v.bodyBack ? -4 : 4, right: v.bodyBack ? 4 : -4, borderRadius: v.bodyBack ? '9px 2px 2px 9px' : '2px 9px 9px 2px', background: PAGE_EDGES }} />
      </div>
      {v.leaves.map((leaf: V) => (
        <div key={leaf.key} style={{ position: 'absolute', left: 0, top: 0, width: v.W, height: v.H, transformOrigin: '0 50%', transformStyle: 'preserve-3d', transform: leaf.transform }}>
          {leaf.curl
            ? <CurledLeaf leaf={leaf} W={v.W} H={v.H} />
            : <><FrontFace leaf={leaf} onClick={leaf.openFront} /><BackFace leaf={leaf} onClick={leaf.openBack} /></>}
        </div>
      ))}
    </div>
  );
}

function Controls({ v }: { v: V }) {
  return (
    <div style={{ position: 'relative', zIndex: 2, display: 'flex', gap: 12, marginBottom: `calc(${v.mBottom}px + env(safe-area-inset-bottom))`, flexShrink: 0, padding: 6, opacity: v.ctrlOp, transform: `translateY(${v.ctrlY}px)`, pointerEvents: v.ctrlPE, transition: 'opacity .35s,transform .35s cubic-bezier(.2,.8,.2,1)' }}>
      <button onClick={v.zoomOut} title="Zoom out" className={hover('transform:scale(1.08)')} style={roundDark(44, 22)}>−</button>
      {v.notOther && <button onClick={v.openManager} title="Pages" className={hover('transform:scale(1.06)')} style={{ width: 88, height: 44, borderRadius: 22, border: 'none', background: MARK, color: PAPER, font: `500 20px ${SANS}`, cursor: 'pointer' }}>✎</button>}
      <button onClick={v.zoomIn} title="Zoom in" className={hover('transform:scale(1.08)')} style={roundDark(44, 22)}>+</button>
    </div>
  );
}

const kbd: CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 22, height: 22, padding: '0 5px', boxSizing: 'border-box', border: '1px solid rgba(34,35,32,.28)', borderBottomWidth: 2, borderRadius: 4, background: 'rgba(244,241,233,.85)', color: INK, font: `500 13px/1 ${SANS}`, letterSpacing: 0 };

/** Quiet key reference in the corner of the book view (desktop only). */
function KeyGuide({ v }: { v: V }) {
  const rows: [string[], string][] = [[['←', '→'], 'Turn pages'], [['↑'], 'Open · zoom in'], [['↓'], 'Zoom out · close']];
  if (v.multi) rows.push([['⇧', '←', '→'], 'Switch sketchbook']);
  return (
    <div aria-label="Keyboard shortcuts" style={{ position: 'absolute', left: 24, bottom: 24, zIndex: 2, display: 'flex', flexDirection: 'column', gap: 7, opacity: v.uiOp, pointerEvents: 'none', ...label(STONE, 10) }}>
      {rows.map(([keys, what]) => (
        <div key={what} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'flex', gap: 3, minWidth: 74 }}>{keys.map(k => <span key={k} style={kbd}>{k}</span>)}</span>
          <span>{what}</span>
        </div>
      ))}
    </div>
  );
}

/** App shell: focus backdrop, top bar, book title, the 3D stage and its controls. Screens and overlays render as children above it. */
export default function Stage({ v, children }: { v: V; children: ReactNode }) {
  return (
    <div onDragOver={v.onDragOver} onDrop={v.onDrop} onMouseMove={v.wake} onPointerDown={v.wake} style={{ position: 'fixed', inset: 0, background: PAPER, color: INK, fontFamily: SANS, display: 'flex', flexDirection: 'column', alignItems: 'center', userSelect: 'none' }}>
      <div style={{ ...fill, overflow: 'hidden', pointerEvents: 'none', opacity: v.fz }}>
        <div ref={v.bgRefA} style={{ position: 'absolute', inset: '-25%', background: v.focusBg, filter: 'blur(80px) saturate(1.5)', transition: 'background .9s' }} />
        <div ref={v.bgRefB} style={{ position: 'absolute', inset: '-25%', background: v.focusBg, filter: 'blur(110px) saturate(1.3)', opacity: .55, mixBlendMode: 'screen', transition: 'background .9s' }} />
        <div style={{ ...fill, background: 'rgba(244,241,233,.74)' }} />
      </div>
      <TopBar v={v} />
      <Title v={v} />
      <div ref={v.stageRef} onPointerDown={v.onDown} onPointerMove={v.onMove} onPointerUp={v.onUp} onPointerCancel={v.onUp} onWheel={v.onWheel} style={{ position: 'relative', flex: 1, minHeight: 0, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', perspective: 2200, cursor: 'grab', touchAction: 'none' }}>
        <Carousel v={v} />
        <Book3D v={v} />
      </div>
      <div style={{ marginBottom: 14, fontSize: 13, color: 'rgba(34,35,32,.75)', opacity: v.emptyOp, transition: 'opacity .3s', pointerEvents: 'none' }}>Open pages to add your drawings, or drop images here</div>
      <Controls v={v} />
      {v.notMob && (v.isMine || v.isOther) && <KeyGuide v={v} />}
      {v.showHandle && <button onClick={v.toggleMenu} className={hover('background:rgba(244,241,233,.95)')} style={{ position: 'absolute', right: 24, bottom: 24, zIndex: 3, height: 34, padding: '0 14px', borderRadius: 2, border: 'none', background: 'rgba(244,241,233,.75)', color: INK, font: `500 13px ${SANS}`, cursor: 'pointer' }}>{v.handleLbl}</button>}
      {v.showRail && (
        <div style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', zIndex: 3, display: 'flex', flexDirection: 'column', gap: 10, padding: 6, borderRadius: 2, background: 'rgba(244,241,233,.7)', opacity: v.railOp }}>
          <button onClick={v.zoomOut} title="Exit focus" style={roundDark(40, 20)}>−</button>
          <button onClick={v.openManager} title="Pages" style={roundDark(40, 15)}>▦</button>
        </div>
      )}
      {children}
    </div>
  );
}
