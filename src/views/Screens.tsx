import type { CSSProperties, ReactNode } from 'react';
import type { V } from '../App';
import ClosedBook from '../ClosedBook';
import { hover } from '../pseudo';
import { CANVAS, INK, MARK, MUTED, PAGE_EDGES, PAPER, SANS, SERIF, SPINE, STONE, label, serif } from '../theme';

const screen = (overflowY: CSSProperties['overflowY'] = 'auto'): CSSProperties => ({ position: 'absolute', inset: 0, zIndex: 4, background: PAPER, overflowX: 'hidden', overflowY });
const primaryBtn = (h: number, fs: number, px: number): CSSProperties => ({ height: h, padding: `0 ${px}px`, border: 'none', background: INK, color: PAPER, font: `500 ${fs}px ${SANS}`, cursor: 'pointer', transition: 'background .25s' });
const underlineBtn = (fs: number, color = INK): CSSProperties => ({ padding: '4px 0', border: 'none', borderBottom: `1px solid ${color}`, background: 'none', color: INK, font: `500 ${fs}px ${SANS}`, cursor: 'pointer', transition: 'color .25s,border-color .25s' });
const hoverMark = hover(`background:${MARK}`);
const hoverLine = hover(`color:${MARK};border-color:${MARK}`);
const hoverText = hover(`color:${MARK}`);
const ruleTop = (c = INK): CSSProperties => ({ paddingTop: 14, borderTop: `1px solid ${c}` });

function Kicker() {
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'center', ...label() }}>
      <span style={{ color: MARK }}>Vol. 01</span><span style={{ width: 40, height: 1, background: STONE }} /><span>A place for the unfinished</span>
    </div>
  );
}

function Footer() {
  return (
    <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, flexWrap: 'wrap', ...ruleTop('rgba(34,35,32,.25)') }}>
      <span style={{ font: `400 22px ${SERIF}` }}>verso<span style={{ color: MARK }}>.</span> <em style={{ color: MUTED }}>A place for the unfinished.</em></span>
      <span style={label()}>© 2026</span>
    </footer>
  );
}

function Page({ v, children }: { v: V; children: ReactNode }) {
  return (
    <div style={screen()}>
      <div style={{ maxWidth: 1320, margin: '0 auto', boxSizing: 'border-box', padding: `${v.hmPadT}px ${v.hmPadX}px 40px`, display: 'flex', flexDirection: 'column', gap: v.hmGap }}>{children}</div>
    </div>
  );
}

/** A book standing on a canvas-coloured 4:5 panel, like a work on a gallery wall, with archive metadata below. */
function PanelCard({ b, labelFs, nameFs }: { b: V; labelFs: number; nameFs: number }) {
  return (
    <div onClick={b.open} style={{ display: 'flex', flexDirection: 'column', gap: 14, cursor: 'pointer', minWidth: 0 }}>
      <div style={{ position: 'relative', aspectRatio: '4/5', background: CANVAS, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <div className={hover('transform:translateY(-6px) rotate(-1deg)')} style={{ position: 'relative', aspectRatio: b.ar, width: `${b.tw}%`, transition: 'transform .6s cubic-bezier(.2,.8,.2,1)' }}>
          <ClosedBook size="sm" bg={b.color} board={b.color} label={b.name} labelStyle={{ padding: '8px 10px', font: `400 ${labelFs}px/1.1 ${SERIF}` }} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, ...label(STONE, 10) }}><span>{b.no}</span><span>{b.pg}</span></div>
        <div style={serif(nameFs)}>{b.name}</div>
        <div style={{ fontSize: 13, color: MUTED }}>by <span onClick={b.openArtist} className={hoverLine} style={{ color: INK, borderBottom: '1px solid rgba(34,35,32,.3)', cursor: 'pointer' }}>{b.artist}</span></div>
      </div>
    </div>
  );
}

function SectionHead({ n, title, onAll }: { n: string; title: string; onAll: () => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, ...ruleTop() }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'baseline', minWidth: 0 }}><span style={label(MARK)}>{n}</span><span style={serif(32, 1)}>{title}</span></div>
      <button onClick={onAll} className={hoverText} style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer', whiteSpace: 'nowrap', ...label(INK) }}>View all →</button>
    </div>
  );
}

const STEPS = [
  ['01', 'Bind a sketchbook', 'Pick a shape — pocket, portrait, square, landscape or panorama — and give it a name and a cover.'],
  ['02', 'Fill the pages', 'Drop in scans or phone photos of your pages. Crop and straighten each one as it goes in.'],
  ['03', 'Leave it open', 'Anyone can leaf through your pages and follow along, long before the work is finished.'],
];

/** Signed-out homepage. */
export function Landing({ v }: { v: V }) {
  return (
    <Page v={v}>
      <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 28 }}>
        <Kicker />
        <h1 style={{ margin: 0, maxWidth: 1100, ...serif(v.ldH1, .92, '-.03em'), textWrap: 'balance' } as CSSProperties}>Every great idea starts <em style={{ color: MARK }}>somewhere.</em></h1>
        <p style={{ margin: 0, maxWidth: 480, fontSize: 18, lineHeight: 1.55, color: MUTED, textWrap: 'pretty' } as CSSProperties}>A home for sketchbooks, unfinished thoughts, and the creative process. Share your pages. Discover someone else’s world.</p>
        <div style={{ display: 'flex', gap: 28, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', marginTop: 6 }}>
          <button onClick={v.openMe} className={hoverMark} style={primaryBtn(52, 15, 28)}>Start your own sketchbook</button>
          <button onClick={v.goExplore} className={hoverLine} style={underlineBtn(15)}>Explore sketchbooks ↗</button>
        </div>
        <div style={{ fontSize: 13, color: STONE }}>Free to join. Already a member? <button onClick={v.openSignin} className={hoverText} style={{ padding: 0, border: 'none', borderBottom: `1px solid ${STONE}`, background: 'none', color: INK, font: `500 13px ${SANS}`, cursor: 'pointer' }}>Sign in</button></div>
      </section>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ overflowX: 'auto', overflowY: 'hidden', paddingTop: 48 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: v.ldShelfJust, gap: v.ldShelfGap, width: 'max-content', minWidth: '100%', boxSizing: 'border-box', padding: '0 12px', borderBottom: `1px solid ${INK}` }}>
            {v.ldShelf.map((sh: V) => (
              <div key={sh.key} onClick={sh.open} title={sh.title} className={hover('transform:translateY(-14px)')} style={{ position: 'relative', flexShrink: 0, width: sh.w, height: sh.h, transform: `rotate(${sh.rot}deg)`, transformOrigin: '50% 100%', cursor: 'pointer', transition: 'transform .5s cubic-bezier(.2,.8,.2,1)' }}>
                <ClosedBook size="sm" bg={sh.color} board={sh.color} label={sh.name} labelStyle={{ padding: '6px 8px', font: `400 ${sh.fs}px/1.1 ${SERIF}` }} />
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', ...label() }}><span>From the community — open any book to leaf through it</span><span>No account needed to look</span></div>
      </section>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}><span style={label(MARK)}>How it works</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${v.ldStepCols},minmax(0,1fr))`, gap: '40px 32px' }}>
          {STEPS.map(([n, t, d]) => (
            <div key={n} style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 16, borderTop: `1px solid ${INK}` }}>
              <span style={label(MARK)}>{n}</span>
              <div style={serif(34)}>{t}</div>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: MUTED, maxWidth: 340, textWrap: 'pretty' } as CSSProperties}>{d}</p>
            </div>
          ))}
        </div>
      </section>
      <section style={{ display: 'grid', gridTemplateColumns: v.ldQuoteCols, gap: '24px 48px', padding: `${v.ldQuotePad}px 0`, borderTop: '1px solid rgba(34,35,32,.25)', borderBottom: '1px solid rgba(34,35,32,.25)' }}>
        <span style={{ ...label(), paddingTop: 12 }}>Why “verso”</span>
        <p style={{ margin: 0, font: `italic 400 ${v.ldQuote}px/1.08 ${SERIF}`, letterSpacing: '-.015em', textWrap: 'balance' } as CSSProperties}>The verso is the back of the page — the side nobody frames. It’s where the trying happens.</p>
      </section>
      <section style={{ display: 'flex', flexDirection: v.ldCtaDir, justifyContent: 'space-between', alignItems: v.ldCtaAlign, gap: 28 }}>
        <h2 style={{ margin: 0, ...serif(v.ldCta, .95, '-.025em') }}>Your next page<br />starts <em style={{ color: MARK }}>here.</em></h2>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={v.openMe} className={hoverMark} style={primaryBtn(52, 15, 28)}>Join verso</button>
          <button onClick={v.openSignin} className={hoverLine} style={{ ...underlineBtn(15), transition: undefined }}>Sign in</button>
        </div>
      </section>
      <Footer />
    </Page>
  );
}

/** Signed-in homepage. */
export function Home({ v }: { v: V }) {
  return (
    <Page v={v}>
      <section style={{ display: 'grid', gridTemplateColumns: v.hmHeroCols, gap: '56px 72px', alignItems: 'end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, minWidth: 0 }}>
          <Kicker />
          <h1 style={{ margin: 0, ...serif(v.hmH1, .94, '-.025em'), textWrap: 'balance' } as CSSProperties}>Every great idea starts <em style={{ color: MARK }}>somewhere.</em></h1>
          <p style={{ margin: 0, maxWidth: 440, fontSize: 17, lineHeight: 1.55, color: MUTED, textWrap: 'pretty' } as CSSProperties}>A home for sketchbooks, unfinished thoughts, and the creative process. Share your pages. Discover someone else’s world.</p>
          <div style={{ display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
            <button onClick={v.goExplore} className={hoverMark} style={primaryBtn(50, 14, 24)}>Explore sketchbooks ↗</button>
            <button onClick={v.startOwn} className={hoverLine} style={underlineBtn(14)}>Start your own →</button>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0, width: '100%', maxWidth: 520, justifySelf: v.hmHeroJustify }}>
          <div style={label()}>On the desk this week</div>
          {v.hmHero.map((b: V) => <PanelCard key={b.key} b={b} labelFs={18} nameFs={30} />)}
        </div>
      </section>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        <SectionHead n="01" title="Featured sketchbooks" onAll={v.goExplore} />
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${v.hmFeatCols},minmax(0,1fr))`, gap: '48px 28px' }}>
          {v.hmFeat.map((b: V) => <PanelCard key={b.key} b={b} labelFs={15} nameFs={27} />)}
        </div>
      </section>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        <SectionHead n="02" title="From the community" onAll={v.goExplore} />
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${v.hmCommCols},minmax(0,1fr))`, gap: '48px 24px' }}>
          {v.hmComm.map((b: V) => <PanelCard key={b.key} b={b} labelFs={13} nameFs={25} />)}
        </div>
      </section>
      <Footer />
    </Page>
  );
}

const segBtn = (bg: string, fg: string): CSSProperties => ({ height: 32, borderRadius: 2, border: 'none', background: bg, color: fg, font: `500 13px ${SANS}`, cursor: 'pointer' });
const iconSeg = (bg: string, fg: string): CSSProperties => ({ ...segBtn(bg, fg), width: 32, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' });
const segGroup: CSSProperties = { display: 'flex', gap: 2, padding: 3, border: '1px solid rgba(34,35,32,.2)' };
const stackEdge = (side: 'top' | 'bottom' | 'left' | 'right', bg: string, filter?: string): CSSProperties => {
  const h = side === 'top' || side === 'bottom';
  return h
    ? { position: 'absolute', left: 0, right: 0, [side === 'bottom' ? 'top' : 'bottom']: '100%', height: 14, transformOrigin: side === 'bottom' ? 'top' : 'bottom', transform: `rotateX(${side === 'bottom' ? -90 : 90}deg)`, background: bg }
    : { position: 'absolute', top: 0, bottom: 0, [side === 'right' ? 'left' : 'right']: '100%', width: 14, transformOrigin: side === 'right' ? 'left' : 'right', transform: `rotateY(${side === 'right' ? 90 : -90}deg)`, background: bg, filter };
};

export function Explore({ v }: { v: V }) {
  return (
    <div style={screen(v.exOvY)}>
      <div style={{ maxWidth: 'none', height: v.exInnerH, minHeight: '100%', boxSizing: 'border-box', margin: '0 auto', padding: `${v.exPadT}px ${v.exPadX}px 28px`, display: 'flex', flexDirection: 'column', gap: v.exGap }}>
        {v.exGrid && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', paddingBottom: 18, borderBottom: `1px solid ${INK}` }}>
            <h1 style={{ margin: 0, ...serif(v.exH1, .95, '-.02em') }}>The <em>archive</em></h1>
            <span style={label()}>{v.exCountLbl}</span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: `1 1 ${v.exSearchBasis}`, minWidth: 200, maxWidth: v.exSearchMax, height: 40, display: 'flex', alignItems: 'center', gap: 10, padding: 0, borderBottom: '1px solid rgba(34,35,32,.35)', boxSizing: 'border-box' }}>
            <span style={{ fontSize: 15, color: 'rgba(34,35,32,.6)' }}>⌕</span>
            <input value={v.exQ} onChange={v.onExQ} placeholder="Search sketchbooks or artists" style={{ flex: 1, minWidth: 0, height: '100%', border: 'none', outline: 'none', background: 'none', color: INK, font: `500 14px ${SANS}` }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }} />
          <div style={segGroup}>
            <button onClick={v.sortTrend} style={{ ...segBtn(v.sTrBg, v.sTrFg), padding: '0 14px' }}>Featured</button>
            <button onClick={v.sortNew} style={{ ...segBtn(v.sNewBg, v.sNewFg), padding: '0 14px' }}>Recent</button>
          </div>
          <div style={segGroup}>
            <button onClick={v.viewGrid} title="Grid" style={iconSeg(v.vGridBg, v.vGridFg)}>▦</button>
            <button onClick={v.viewStack} title="Stack" style={iconSeg(v.vStackBg, v.vStackFg)}>≡</button>
          </div>
        </div>
        {v.exNone && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'rgba(34,35,32,.7)' }}>No sketchbooks match “{v.exQ}”</div>}
        {v.exGrid && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${v.exCols},minmax(0,1fr))`, gap: '28px 18px', width: '100%', alignItems: 'end' }}>
              {v.exploreList.map((xb: V) => (
                <div key={xb.key} onClick={xb.open} style={{ display: 'flex', flexDirection: 'column', gap: 8, cursor: 'pointer', minWidth: 0 }}>
                  <div className={hover('transform:translateY(-8px)')} style={{ position: 'relative', aspectRatio: xb.ar, width: `calc(${xb.wp}% - 7px)`, marginRight: 7, transition: 'transform .35s cubic-bezier(.2,.8,.2,1)' }}>
                    <ClosedBook bg={xb.color} board={xb.color} label={xb.name} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                    <span style={label(STONE, 10)}>{xb.no}</span>
                    <span style={{ ...serif(22, 1.1, 'normal'), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{xb.name}</span>
                    <span style={{ fontSize: 13, color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>by <span onClick={xb.openArtist} className={hoverText} style={{ color: INK, cursor: 'pointer', borderBottom: '1px solid rgba(34,35,32,.3)' }}>{xb.artist}</span> · {xb.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {v.exStack && (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: v.stDir, alignItems: 'center', justifyContent: 'center', gap: v.stGap }}>
            <div onWheel={v.stackWheel} onPointerDown={v.stDown0} onPointerUp={v.stUp0} style={{ position: 'relative', width: 440, maxWidth: v.stMaxW, flex: v.stFlex, height: 'min(560px,100%)', minHeight: 0, perspective: 1300, touchAction: 'none' }}>
              <div style={{ position: 'absolute', left: '50%', top: '70%', width: 380, height: 110, transform: 'translate(-50%,-50%)', background: 'radial-gradient(ellipse at center,rgba(34,35,32,.18),transparent 70%)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', left: '50%', top: '38%', width: 0, height: 0, transformStyle: 'preserve-3d', transform: v.stackT }}>
                {v.stackList.map((sk: V) => (
                  <div key={sk.key} onClick={sk.click} style={{ position: 'absolute', left: sk.l, top: sk.tp, width: sk.w, height: sk.h, transformStyle: 'preserve-3d', transform: sk.t, opacity: sk.op, cursor: 'pointer' }}>
                    <div style={{ position: 'absolute', inset: 0, transform: 'translateZ(-14px)', borderRadius: '2px 10px 10px 2px', background: sk.color, filter: 'brightness(.55)' }} />
                    <div style={stackEdge('bottom', PAGE_EDGES)} />
                    <div style={stackEdge('top', PAGE_EDGES)} />
                    <div style={stackEdge('right', 'repeating-linear-gradient(90deg,#f3efe6 0 2px,#d8d1c1 2px 3px)')} />
                    <div style={stackEdge('left', sk.color, 'brightness(.7)')} />
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '2px 10px 10px 2px', overflow: 'hidden', background: sk.color }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '7%', background: SPINE }} />
                      <div style={{ position: 'absolute', right: '13%', top: 0, bottom: 0, width: 8, background: '#1d1d26' }} />
                      <div style={{ position: 'absolute', left: '16%', right: '26%', top: '14%', padding: '10px 12px', background: '#f6f2e9', borderRadius: 2, color: INK, fontSize: 15, fontWeight: 600 }}>{sk.name}</div>
                      <div style={{ position: 'absolute', inset: 0, background: '#1c1d30', opacity: sk.shade }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: v.stInfoGap, minWidth: 220, maxWidth: 280, alignItems: v.stAlign, textAlign: v.stTA }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: MARK, letterSpacing: '.04em' }}>{v.stRank} · {v.stShape}</div>
              <div style={{ fontSize: v.stTitle, fontFamily: SERIF, fontWeight: 400, letterSpacing: '-.01em', lineHeight: 1.05 }}>{v.stName}</div>
              <div style={{ fontSize: 14, color: 'rgba(34,35,32,.75)' }}><span onClick={v.stArtistOpen} className={hover(`color:${INK}`)} style={{ cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3, textDecorationColor: 'rgba(34,35,32,.35)' }}>{v.stArtist}</span> · {v.stPages}</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: v.stBtnTop }}>
                <button onClick={v.stOpen} className={hover('transform:scale(1.05)')} style={{ height: 44, padding: '0 22px', borderRadius: 2, border: 'none', background: MARK, color: PAPER, font: `500 14px ${SANS}`, cursor: 'pointer' }}>Open</button>
                <button onClick={v.stUp} title="Put back" style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', background: INK, color: PAPER, font: `500 18px ${SANS}`, cursor: 'pointer', opacity: v.stUpOp }}>↓</button>
                <button onClick={v.stDown} title="Lift off" style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', background: INK, color: PAPER, font: `500 18px ${SANS}`, cursor: 'pointer', opacity: v.stDownOp }}>↑</button>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(34,35,32,.6)' }}>{v.stPos} · {v.stHint}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const actionBtn = (filled: boolean): CSSProperties => filled
  ? { height: 44, padding: '0 20px', borderRadius: 2, border: 'none', background: INK, color: PAPER, font: `500 14px ${SANS}`, cursor: 'pointer' }
  : { height: 44, padding: '0 18px', borderRadius: 2, border: '1.5px solid rgba(34,35,32,.5)', background: 'none', color: INK, font: `500 14px ${SANS}`, cursor: 'pointer' };

export function Profile({ v }: { v: V }) {
  return (
    <div style={screen()}>
      <div style={{ position: 'relative', height: v.pfBanH }}>
        {v.pfPreviewing && <div style={{ position: 'absolute', left: '50%', bottom: 20, transform: 'translateX(-50%)', padding: '6px 12px', border: `1px solid ${MARK}`, whiteSpace: 'nowrap', ...label(MARK) }}>Previewing as a visitor</div>}
      </div>
      <div style={{ position: 'relative', maxWidth: 1080, margin: '0 auto', padding: `0 ${v.pfPadX}px 48px`, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 40 }}>
        <div style={{ display: 'flex', flexDirection: v.pfDir, alignItems: v.pfAlign, gap: v.pfHeadGap, textAlign: v.pfTA }}>
          <div style={{ width: 112, height: 112, flexShrink: 0, borderRadius: '50%', background: v.pfAvBg, color: PAPER, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `400 44px ${SERIF}` }}>{v.pfInit}</div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8, paddingTop: v.pfInfoTop, alignItems: v.pfAlign }}>
            <div style={label(MARK)}>Artist profile</div>
            <div style={{ fontSize: v.pfNameSize, fontFamily: SERIF, fontWeight: 400, letterSpacing: '-.01em', lineHeight: 1.05, textWrap: 'balance' } as CSSProperties}>{v.pfName}</div>
            <div style={{ display: 'flex', gap: '4px 14px', flexWrap: 'wrap', justifyContent: v.pfJust, fontSize: 14, color: 'rgba(34,35,32,.7)' }}>
              <span>{v.pfHandle}</span>
              {v.pfHasLoc && <span>{v.pfLoc}</span>}
              {v.pfHasWeb && <a href={v.pfWebHref} target="_blank" rel="noopener noreferrer" style={{ color: MARK, textDecoration: 'none' }}>{v.pfWeb}</a>}
              <span>{v.pfJoined}</span>
            </div>
            {v.pfHasBio && <div style={{ fontSize: 15, lineHeight: 1.5, maxWidth: 560, textWrap: 'pretty', opacity: v.pfBioOp } as CSSProperties}>{v.pfBio}</div>}
            <div style={{ display: 'flex', gap: '6px 20px', flexWrap: 'wrap', justifyContent: v.pfJust, marginTop: 4 }}>
              {v.pfStats.map((st: V) => <span key={st.l} style={{ fontSize: 14, color: 'rgba(34,35,32,.7)' }}><b style={{ color: INK, fontWeight: 600 }}>{st.n}</b> {st.l}</span>)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0, paddingTop: v.pfInfoTop }}>
            {v.pfMine && (
              <>
                <button onClick={v.editProfile} className={hoverMark} style={actionBtn(true)}>Edit profile</button>
                <button onClick={v.togglePreview} className={hover('background:rgba(34,35,32,.1)')} style={actionBtn(false)}>View as public</button>
              </>
            )}
            {v.pfPreviewing && <button onClick={v.togglePreview} className={hoverMark} style={actionBtn(true)}>Exit preview</button>}
            {v.pfOther && <button onClick={v.toggleFollow} style={{ height: 44, minWidth: 120, padding: '0 20px', borderRadius: 2, border: `1.5px solid ${v.folBd}`, background: v.folBg, color: v.folFg, font: `500 14px ${SANS}`, cursor: 'pointer' }}>{v.folLbl}</button>}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, paddingBottom: 12, borderBottom: `1px solid ${INK}` }}>
            <span style={serif(32, 1)}>{v.pfBooksLbl}</span>
            <span style={{ fontSize: 14, color: 'rgba(34,35,32,.6)' }}>{v.pfCount}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${v.pfCols},minmax(0,1fr))`, gap: '28px 18px', alignItems: 'end' }}>
            {v.pfBooks.map((pb: V) => (
              <div key={pb.key} onClick={pb.open} style={{ display: 'flex', flexDirection: 'column', gap: 10, cursor: 'pointer', minWidth: 0 }}>
                <div className={hover('transform:translateY(-8px)')} style={{ position: 'relative', aspectRatio: pb.ar, width: `calc(${pb.wp}% - 7px)`, marginRight: 7, transition: 'transform .35s cubic-bezier(.2,.8,.2,1)' }}>
                  <ClosedBook bg={pb.bg} board={pb.color} label={pb.showLabel ? pb.name : null} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ ...serif(22, 1.1, 'normal'), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pb.name}</span>
                  <span style={{ fontSize: 13, color: 'rgba(34,35,32,.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pb.count}</span>
                </div>
              </div>
            ))}
            {v.pfShowNew && (
              <div onClick={v.pfNew} style={{ display: 'flex', flexDirection: 'column', gap: 10, cursor: 'pointer', minWidth: 0 }}>
                <div className={hover(`border-color:${MARK};color:${MARK}`)} style={{ aspectRatio: '.72', width: 'calc(78% - 7px)', boxSizing: 'border-box', border: '2px dashed rgba(34,35,32,.35)', borderRadius: '2px 10px 10px 2px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: 'rgba(34,35,32,.8)' }}>+ New</div>
                <div style={{ height: 38 }} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
