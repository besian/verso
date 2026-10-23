import type { CSSProperties, ReactNode } from 'react';
import type { V } from '../App';
import ClosedBook from '../ClosedBook';
import { hover, wheelSideways } from '../pseudo';
import { CANVAS, INK, MARK, MUTED, PAGE_EDGES, PAPER, SANS, SERIF, STONE, label, serif } from '../theme';
import { HandleField, MoreMenu, Notice, TextField } from './Overlays';

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

/** Home page for everyone, sized to the window so it never scrolls: headline and actions,
 *  then a shelf of community sketchbooks along the bottom. */
export function HomeScreen({ v }: { v: V }) {
  const mob = v.hmMob, signedOut = v.isLanding;
  return (
    <div style={{ ...screen('hidden'), display: 'flex', flexDirection: 'column', boxSizing: 'border-box', padding: `${v.hmPadT}px ${v.hmPadX}px ${mob ? 16 : 22}px` }}>
      {/* Spare height is shared between the headline block and the shelf, each centred in its half. */}
      <section style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: mob ? 18 : 'clamp(14px, 2.6vh, 26px)' }}>
        <Kicker />
        <h1 style={{ margin: 0, maxWidth: 1100, font: `400 ${mob ? 'clamp(40px, 12vw, 56px)' : 'clamp(48px, min(8.5vw, 12vh), 132px)'}/.92 ${SERIF}`, letterSpacing: '-.03em', textWrap: 'balance' } as CSSProperties}>Every great idea starts <em style={{ color: MARK }}>somewhere.</em></h1>
        {!mob && <p style={{ margin: 0, maxWidth: 480, fontSize: 'clamp(15px, 2vh, 18px)', lineHeight: 1.5, color: MUTED, textWrap: 'pretty' } as CSSProperties}>A home for sketchbooks, unfinished thoughts, and the creative process. Share your pages. Discover someone else’s world.</p>}
        <div style={{ display: 'flex', flexDirection: mob ? 'column' : 'row', gap: mob ? 14 : 28, alignItems: 'center', justifyContent: 'center', marginTop: mob ? 4 : 2, width: mob ? '100%' : undefined }}>
          {signedOut
            ? <button onClick={v.openMe} className={hoverMark} style={{ ...primaryBtn(mob ? 48 : 50, 15, 28), width: mob ? '100%' : undefined, maxWidth: 320 }}>Start your own sketchbook</button>
            : <button onClick={v.goExplore} className={hoverMark} style={{ ...primaryBtn(mob ? 48 : 50, 15, 28), width: mob ? '100%' : undefined, maxWidth: 320 }}>Explore sketchbooks ↗</button>}
          {signedOut
            ? <button onClick={v.goExplore} className={hoverLine} style={underlineBtn(15)}>Explore sketchbooks ↗</button>
            : <button onClick={v.startOwn} className={hoverLine} style={underlineBtn(15)}>Start your own →</button>}
        </div>
        {signedOut && <div style={{ fontSize: 13, color: STONE }}>Already a member? <button onClick={v.openSignin} className={hoverText} style={{ padding: 0, border: 'none', borderBottom: `1px solid ${STONE}`, background: 'none', color: INK, font: `500 13px ${SANS}`, cursor: 'pointer' }}>Sign in</button></div>}
        {signedOut && <LegalLinks v={v} />}
      </section>
      <section style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10, paddingTop: mob ? 0 : 28 }}>
        <div style={{ overflow: 'hidden', paddingTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: v.hmShelfGap, boxSizing: 'border-box', padding: `0 12px ${v.hmMob ? 12 : 16}px`, borderBottom: `1px solid ${INK}` }}>
            {!v.hmShelf.length && (
              <div onClick={signedOut ? v.openMe : v.startOwn} className={hover(`border-color:${MARK};color:${MARK}`)} style={{ width: Math.round(v.hmShelfH * 0.72), height: v.hmShelfH, boxSizing: 'border-box', border: '2px dashed rgba(var(--ink-rgb),.35)', borderBottom: 'none', borderRadius: '2px 8px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 12, cursor: 'pointer', color: 'rgba(var(--ink-rgb),.7)', font: `400 ${mob ? 17 : 20}px/1.1 ${SERIF}` }}>Your sketchbook<br />goes here</div>
            )}
            {v.hmShelf.map((sh: V) => (
              <div key={sh.key} onClick={sh.open} title={sh.title} className={hover('transform:translateY(-12px)')} style={{ position: 'relative', flexShrink: 0, width: sh.w, height: sh.h, transform: `rotate(${sh.rot}deg)`, transformOrigin: '50% 100%', cursor: 'pointer', transition: 'transform .5s cubic-bezier(.2,.8,.2,1)' }}>
                <ClosedBook size="sm" bg={sh.bg} board={sh.color} label={sh.showLabel ? sh.name : null} labelStyle={{ padding: '6px 8px', font: `400 ${sh.fs}px/1.1 ${SERIF}` }} />
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, ...label() }}>
          <span>{v.hmFollowing ? (mob ? 'From artists you follow' : 'New from artists you follow') : v.hmShelf.length ? (mob ? 'From the community' : 'From the community — open any book to leaf through it') : 'The shelf is empty — yours could be first'}</span>
          {v.hmShelf.length > 0 && <button onClick={v.goExplore} className={hoverText} style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer', whiteSpace: 'nowrap', ...label(INK) }}>View all →</button>}
        </div>
      </section>
    </div>
  );
}

const chipStyle = (on: boolean): CSSProperties => ({ flexShrink: 0, height: 30, padding: '0 12px', borderRadius: 15, border: `1px solid ${on ? INK : 'rgba(var(--ink-rgb),.25)'}`, background: on ? INK : 'transparent', color: on ? PAPER : INK, font: `500 13px ${SANS}`, cursor: 'pointer', whiteSpace: 'nowrap' });
const segBtn = (bg: string, fg: string): CSSProperties => ({ height: 32, borderRadius: 2, border: 'none', background: bg, color: fg, font: `500 13px ${SANS}`, cursor: 'pointer' });
const iconSeg = (bg: string, fg: string): CSSProperties => ({ ...segBtn(bg, fg), width: 32, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' });
const segGroup: CSSProperties = { display: 'flex', gap: 2, padding: 3, border: '1px solid rgba(var(--ink-rgb),.2)' };
const stackEdge = (side: 'top' | 'bottom' | 'left' | 'right', bg: string, filter?: string): CSSProperties => {
  const h = side === 'top' || side === 'bottom';
  return h
    ? { position: 'absolute', left: 0, right: 0, [side === 'bottom' ? 'top' : 'bottom']: '100%', height: 14, transformOrigin: side === 'bottom' ? 'top' : 'bottom', transform: `rotateX(${side === 'bottom' ? -90 : 90}deg)`, background: bg }
    : { position: 'absolute', top: 0, bottom: 0, [side === 'right' ? 'left' : 'right']: '100%', width: 14, transformOrigin: side === 'right' ? 'left' : 'right', transform: `rotateY(${side === 'right' ? 90 : -90}deg)`, background: bg, filter };
};

export function Explore({ v }: { v: V }) {
  return (
    <div onScroll={v.onExScroll} style={screen(v.exOvY)}>
      <div style={{ maxWidth: 'none', height: v.exInnerH, minHeight: '100%', boxSizing: 'border-box', margin: '0 auto', padding: `${v.exPadT}px ${v.exPadX}px 28px`, display: 'flex', flexDirection: 'column', gap: v.exGap }}>
        {v.exGrid && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', paddingBottom: 18, borderBottom: `1px solid ${INK}` }}>
            <h1 style={{ margin: 0, ...serif(v.exH1, .95, '-.02em') }}>The <em>archive</em></h1>
            <span style={label()}>{v.exCountLbl}</span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: `1 1 ${v.exSearchBasis}`, minWidth: 200, maxWidth: v.exSearchMax, height: 40, display: 'flex', alignItems: 'center', gap: 10, padding: 0, borderBottom: '1px solid rgba(var(--ink-rgb),.35)', boxSizing: 'border-box' }}>
            <span style={{ fontSize: 15, color: 'rgba(var(--ink-rgb),.6)' }}>⌕</span>
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
        <div role="group" aria-label="Filter by medium" onWheel={wheelSideways} style={{ display: 'flex', gap: 6, overflowX: 'auto', margin: `0 -${v.exPadX}px`, padding: `2px ${v.exPadX}px 4px`, scrollbarWidth: 'none', maskImage: `linear-gradient(90deg,#000 calc(100% - ${v.exPadX + 24}px),transparent)` } as CSSProperties}>
          {v.exTag && <button onClick={v.clearLabel} title="Clear tag" style={{ ...chipStyle(true), background: MARK, borderColor: MARK }}>{v.exTag} ×</button>}
          {v.exMediums.map((m: V) => <button key={m.key} onClick={m.pick} aria-pressed={m.on} className={m.on ? undefined : hover('border-color:rgba(var(--ink-rgb),.6)')} style={chipStyle(m.on && !v.exTag)}>{m.label}</button>)}
        </div>
        {v.exPeople?.length > 0 && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={label()}>Artists</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 28px', paddingBottom: 18, borderBottom: '1px solid rgba(var(--ink-rgb),.2)' }}>
              {v.exPeople.map((p: V) => (
                <button key={p.key} onClick={p.open} className={hover(`color:${MARK}`)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 0, border: 'none', background: 'none', color: INK, cursor: 'pointer', textAlign: 'left', minWidth: 0 }}>
                  <span style={{ width: 40, height: 40, flexShrink: 0, borderRadius: '50%', background: p.avBg, color: PAPER, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `400 17px ${SERIF}` }}>{p.init}</span>
                  <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ ...serif(22, 1.1, 'normal'), color: 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                    <span style={{ fontSize: 13, color: MUTED }}>{p.handle}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
        {v.exNone && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center', fontSize: 14, color: 'rgba(var(--ink-rgb),.7)' }}>
            {v.exLoading ? 'Opening the archive…'
              : v.exEmpty ? <><span style={serif(34)}>The archive is <em style={{ color: MARK }}>empty.</em></span><span>No one has shared a sketchbook yet. Yours could be the first.</span></>
              : v.exNoneLbl}
          </div>
        )}
        {v.exGrid && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${v.exCols},minmax(0,1fr))`, gap: '44px 18px', width: '100%', alignItems: 'end' }}>
              {v.exploreList.map((xb: V) => (
                <div key={xb.key} onClick={xb.open} style={{ display: 'flex', flexDirection: 'column', gap: 20, cursor: 'pointer', minWidth: 0 }}>
                  <div className={hover('transform:translateY(-8px)')} style={{ position: 'relative', aspectRatio: xb.ar, width: `calc(${xb.wp}% - 7px)`, marginRight: 7, transition: 'transform .35s cubic-bezier(.2,.8,.2,1)' }}>
                    <ClosedBook bg={xb.bg} board={xb.color} label={xb.showLabel ? xb.name : null} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                    <span style={label(STONE, 10)}>{xb.no}</span>
                    <span style={{ ...serif(22, 1.1, 'normal'), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{xb.name}</span>
                    <span style={{ fontSize: 13, color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>by <span onClick={xb.openArtist} className={hoverText} style={{ color: INK, cursor: 'pointer', borderBottom: '1px solid rgba(var(--ink-rgb),.3)' }}>{xb.artist}</span> · {xb.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {v.exGrid && v.exCanMore && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
            <button onClick={v.loadMore} disabled={v.exBusy} className={hoverLine} style={{ ...underlineBtn(14), opacity: v.exBusy ? 0.5 : 1 }}>{v.exBusy ? 'Loading…' : 'Load more'}</button>
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
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '2px 10px 10px 2px', overflow: 'hidden', background: sk.bg }}>
                      <div style={{ position: 'absolute', right: '13%', top: 0, bottom: 0, width: 8, background: '#1d1d26' }} />
                      {sk.showLabel && <div className="cover-label" style={{ position: 'absolute', left: '16%', right: '26%', top: '14%', padding: '10px 12px', background: '#f6f2e9', borderRadius: 2, color: '#222320', fontSize: 15, fontWeight: 600 }}>{sk.name}</div>}
                      <div style={{ position: 'absolute', inset: 0, background: '#1c1d30', opacity: sk.shade }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: v.stInfoGap, minWidth: 220, maxWidth: 280, alignItems: v.stAlign, textAlign: v.stTA }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: MARK, letterSpacing: '.04em' }}>{v.stRank} · {v.stShape}</div>
              <div style={{ fontSize: v.stTitle, fontFamily: SERIF, fontWeight: 400, letterSpacing: '-.01em', lineHeight: 1.05 }}>{v.stName}</div>
              <div style={{ fontSize: 14, color: 'rgba(var(--ink-rgb),.75)' }}><span onClick={v.stArtistOpen} className={hover(`color:${INK}`)} style={{ cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3, textDecorationColor: 'rgba(var(--ink-rgb),.35)' }}>{v.stArtist}</span> · {v.stPages}</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: v.stBtnTop }}>
                <button onClick={v.stOpen} className={hover('transform:scale(1.05)')} style={{ height: 44, padding: '0 22px', borderRadius: 2, border: 'none', background: MARK, color: PAPER, font: `500 14px ${SANS}`, cursor: 'pointer' }}>Open</button>
                <button onClick={v.stUp} title="Put back" style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', background: INK, color: PAPER, font: `500 18px ${SANS}`, cursor: 'pointer', opacity: v.stUpOp }}>↓</button>
                <button onClick={v.stDown} title="Lift off" style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', background: INK, color: PAPER, font: `500 18px ${SANS}`, cursor: 'pointer', opacity: v.stDownOp }}>↑</button>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),.6)' }}>{v.stPos} · {v.stHint}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const actionBtn = (filled: boolean): CSSProperties => filled
  ? { height: 44, padding: '0 20px', borderRadius: 2, border: 'none', background: INK, color: PAPER, font: `500 14px ${SANS}`, cursor: 'pointer' }
  : { height: 44, padding: '0 18px', borderRadius: 2, border: '1.5px solid rgba(var(--ink-rgb),.5)', background: 'none', color: INK, font: `500 14px ${SANS}`, cursor: 'pointer' };

export function Profile({ v }: { v: V }) {
  return (
    <div style={screen()}>
      <div style={{ position: 'relative', height: v.pfBanH }}>
        {v.pfPreviewing && <div style={{ position: 'absolute', left: '50%', bottom: 20, transform: 'translateX(-50%)', padding: '6px 12px', border: `1px solid ${MARK}`, whiteSpace: 'nowrap', ...label(MARK) }}>Previewing as a visitor</div>}
      </div>
      <div style={{ position: 'relative', maxWidth: 1080, margin: '0 auto', padding: `0 ${v.pfPadX}px 48px`, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 40 }}>
        {v.pfMine && !v.acVerified && <VerifyBanner v={v} />}
        <div style={{ display: 'flex', flexDirection: v.pfDir, alignItems: v.pfAlign, gap: v.pfHeadGap, textAlign: v.pfTA }}>
          <div style={{ width: 112, height: 112, flexShrink: 0, borderRadius: '50%', background: v.pfAvBg, color: PAPER, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `400 44px ${SERIF}` }}>{v.pfInit}</div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8, paddingTop: v.pfInfoTop, alignItems: v.pfAlign }}>
            <div style={label(MARK)}>Artist profile</div>
            <div style={{ fontSize: v.pfNameSize, fontFamily: SERIF, fontWeight: 400, letterSpacing: '-.01em', lineHeight: 1.05, textWrap: 'balance' } as CSSProperties}>{v.pfName}</div>
            <div style={{ display: 'flex', gap: '4px 14px', flexWrap: 'wrap', justifyContent: v.pfJust, fontSize: 14, color: 'rgba(var(--ink-rgb),.7)' }}>
              <span>{v.pfHandle}</span>
              {v.pfHasLoc && <span>{v.pfLoc}</span>}
              {v.pfHasWeb && <a href={v.pfWebHref} target="_blank" rel="noopener noreferrer" style={{ color: MARK, textDecoration: 'none' }}>{v.pfWeb}</a>}
              <span>{v.pfJoined}</span>
            </div>
            {v.pfHasBio && <div style={{ fontSize: 15, lineHeight: 1.5, maxWidth: 560, textWrap: 'pretty', opacity: v.pfBioOp } as CSSProperties}>{v.pfBio}</div>}
            <div style={{ display: 'flex', gap: '6px 20px', flexWrap: 'wrap', justifyContent: v.pfJust, marginTop: 4 }}>
              {v.pfStats.map((st: V) => <span key={st.l} style={{ fontSize: 14, color: 'rgba(var(--ink-rgb),.7)' }}><b style={{ color: INK, fontWeight: 600 }}>{st.n}</b> {st.l}</span>)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: v.pfJust, flexShrink: 0, paddingTop: v.pfInfoTop }}>
            {v.pfMine && (
              <>
                <button onClick={v.editProfile} className={hoverMark} style={actionBtn(true)}>Edit profile</button>
                <button onClick={v.togglePreview} className={hover('background:rgba(var(--ink-rgb),.1)')} style={actionBtn(false)}>View as public</button>
                <button onClick={v.openSettings} className={hover('background:rgba(var(--ink-rgb),.1)')} style={actionBtn(false)}>Settings</button>
                {v.pfAdmin && <button onClick={v.openAdmin} className={hover('background:rgba(var(--ink-rgb),.1)')} style={actionBtn(false)}>Moderation</button>}
                <button onClick={v.signOut} className={hover(`color:${MARK}`)} style={{ ...actionBtn(false), border: 'none', padding: '0 6px' }}>Sign out</button>
              </>
            )}
            {v.pfPreviewing && <button onClick={v.togglePreview} className={hoverMark} style={actionBtn(true)}>Exit preview</button>}
            {v.pfOther && <button onClick={v.toggleFollow} style={{ height: 44, minWidth: 120, padding: '0 20px', borderRadius: 2, border: `1.5px solid ${v.folBd}`, background: v.folBg, color: v.folFg, font: `500 14px ${SANS}`, cursor: 'pointer' }}>{v.folLbl}</button>}
            {v.pfOther && <button onClick={v.pfShare} className={hover('background:rgba(var(--ink-rgb),.1)')} style={actionBtn(false)}>Share</button>}
            {v.pfOther && <span style={{ alignSelf: 'center' }}><MoreMenu open={v.pfMoreOpen} onToggle={v.pfMore} align="right" items={[{ label: 'Report artist', onClick: v.pfReport }, { label: v.pfBlockLbl, onClick: v.pfBlock, danger: true }]} /></span>}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {v.pfTabs ? (
            <div role="tablist" style={{ display: 'flex', alignItems: 'baseline', gap: v.notMob ? 28 : 18, flexWrap: 'wrap', paddingBottom: 12, borderBottom: `1px solid ${INK}` }}>
              {v.pfTabs.map((t: V) => (
                <button key={t.key} role="tab" aria-selected={t.on} onClick={t.pick} className={hover(`color:${INK}`)} style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: 0, border: 'none', background: 'none', cursor: 'pointer', color: t.on ? INK : 'rgba(var(--ink-rgb),.45)' }}>
                  <span style={{ ...serif(v.notMob ? 32 : 26, 1), color: 'inherit' }}>{t.label}</span>
                  <span style={{ fontSize: 13 }}>{t.n}</span>
                </button>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, paddingBottom: 12, borderBottom: `1px solid ${INK}` }}>
              <span style={serif(32, 1)}>{v.pfBooksLbl}</span>
              <span style={{ fontSize: 14, color: 'rgba(var(--ink-rgb),.6)' }}>{v.pfCount}</span>
            </div>
          )}
          {v.pfSuspended && <div style={{ fontSize: 14, color: MUTED }}>This account has been suspended for breaking the terms.</div>}
          {v.pfBlocked && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontSize: 14, color: MUTED }}>
              You’ve blocked this artist, so their sketchbooks are hidden.
              <button onClick={v.pfUnblock} className={hoverLine} style={underlineBtn(14)}>Unblock</button>
            </div>
          )}
          {v.pfEmptyNote && !v.pfBooks.length && <div style={{ fontSize: 14, color: MUTED }}>{v.pfEmptyNote}</div>}
          {v.pfPeople && (v.pfPeople.length ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px 32px' }}>
              {v.pfPeople.map((p: V) => (
                <button key={p.key} onClick={p.open} className={hover(`color:${MARK}`)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 0, border: 'none', background: 'none', color: INK, cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ width: 44, height: 44, flexShrink: 0, borderRadius: '50%', background: p.avBg, color: PAPER, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `400 18px ${SERIF}` }}>{p.init}</span>
                  <span style={{ display: 'flex', flexDirection: 'column' }}><span style={{ ...serif(22, 1.1, 'normal'), color: 'inherit' }}>{p.name}</span><span style={{ fontSize: 13, color: MUTED }}>{p.handle}</span></span>
                </button>
              ))}
            </div>
          ) : <div style={{ fontSize: 14, color: MUTED }}>You’re not following anyone yet. Follow artists from their profile to see their new pages on your home shelf.</div>)}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${v.pfCols},minmax(0,1fr))`, gap: '28px 18px', alignItems: 'end' }}>
            {v.pfBooks.map((pb: V) => (
              <div key={pb.key} onClick={pb.open} style={{ display: 'flex', flexDirection: 'column', gap: 20, cursor: 'pointer', minWidth: 0 }}>
                <div className={hover('transform:translateY(-8px)')} style={{ position: 'relative', aspectRatio: pb.ar, width: `calc(${pb.wp}% - 7px)`, marginRight: 7, transition: 'transform .35s cubic-bezier(.2,.8,.2,1)' }}>
                  <ClosedBook bg={pb.bg} board={pb.color} label={pb.showLabel ? pb.name : null} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                  <span style={{ ...serif(22, 1.1, 'normal'), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pb.name}</span>
                  <span style={{ fontSize: 13, color: 'rgba(var(--ink-rgb),.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pb.count}</span>
                </div>
              </div>
            ))}
            {v.pfShowNew && (
              <div onClick={v.pfNew} style={{ display: 'flex', flexDirection: 'column', gap: 20, cursor: 'pointer', minWidth: 0 }}>
                <div className={hover(`border-color:${MARK};color:${MARK}`)} style={{ aspectRatio: '.72', width: 'calc(78% - 7px)', boxSizing: 'border-box', border: '2px dashed rgba(var(--ink-rgb),.35)', borderRadius: '2px 10px 10px 2px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: 'rgba(var(--ink-rgb),.8)' }}>+ New</div>
                <div style={{ height: 38 }} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const AUTH_HEAD: Record<string, ReactNode> = {
  join: <>Start with a <em style={{ color: MARK }}>blank page.</em></>,
  signin: <>Welcome <em style={{ color: MARK }}>back.</em></>,
  reset: <>Forgot your <em style={{ color: MARK }}>password?</em></>,
};
const quietLink = (color = INK): CSSProperties => ({ padding: 0, border: 'none', borderBottom: `1px solid ${color}`, background: 'none', color: INK, font: `500 13px ${SANS}`, cursor: 'pointer' });

/** Sign in, create an account, or request a password reset, as a full page. */
export function AuthPage({ v }: { v: V }) {
  const mob = !v.notMob;
  return (
    <div style={screen()}>
      <div style={{ maxWidth: 1080, margin: '0 auto', boxSizing: 'border-box', padding: `${mob ? 96 : 140}px ${mob ? 16 : 40}px 48px`, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,360px),1fr))', gap: mob ? '40px' : '48px 96px', alignItems: 'start' }}>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', ...label() }}><span style={{ color: MARK }}>{v.suKicker}</span><span style={{ width: 40, height: 1, background: STONE }} /><span>verso.</span></div>
          <h1 style={{ margin: 0, ...serif(mob ? 56 : 96, .94, '-.025em'), textWrap: 'balance' } as CSSProperties}>{AUTH_HEAD[v.suMode]}</h1>
          <p style={{ margin: 0, maxWidth: 400, fontSize: 17, lineHeight: 1.55, color: MUTED, textWrap: 'pretty' } as CSSProperties}>{v.suSub}</p>
        </section>
        <form onSubmit={v.suSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 420, width: '100%', paddingTop: 20, borderTop: `1px solid ${INK}`, justifySelf: mob ? 'stretch' : 'end' }}>
          {v.suJoin && (
            <>
              <TextField label="Name" value={v.suName} onChange={v.onSuName} placeholder="Your name" autoComplete="name" />
              <HandleField value={v.suHandle} onChange={v.onSuHandle} placeholder="handle" />
            </>
          )}
          <TextField label="Email" value={v.suEmail} onChange={v.onSuEmail} type="email" placeholder="you@example.com" autoComplete="email" />
          {!v.suReset && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <TextField label="Password" value={v.suPw} onChange={v.onSuPw} type="password" placeholder="At least 6 characters" autoComplete={v.suJoin ? 'new-password' : 'current-password'} />
              {!v.suJoin && <button type="button" onClick={v.suToReset} className={hover(`color:${MARK}`)} style={{ alignSelf: 'flex-end', padding: 0, border: 'none', background: 'none', color: 'rgba(var(--ink-rgb),.75)', font: `500 13px ${SANS}`, cursor: 'pointer' }}>Forgot password?</button>}
            </div>
          )}
          <Notice err={v.suErr} info={v.suInfo} />
          {v.suJoin && <div style={{ fontSize: 12, lineHeight: 1.5, color: MUTED }}>By creating an account you agree to the <button type="button" onClick={v.openTerms} className={hoverLine} style={{ ...quietLink('rgba(var(--ink-rgb),.4)'), font: `500 12px ${SANS}` }}>Terms</button> and <button type="button" onClick={v.openPrivacy} className={hoverLine} style={{ ...quietLink('rgba(var(--ink-rgb),.4)'), font: `500 12px ${SANS}` }}>Privacy policy</button>. Your email is only used to sign in and is never shown.</div>}
          <button type="submit" disabled={v.suBusy} className={v.suBusy ? undefined : hover(`background:${MARK}`)} style={{ height: 50, marginTop: 4, border: 'none', borderRadius: 2, background: INK, color: PAPER, font: `500 15px ${SANS}`, cursor: v.suBusy ? 'progress' : 'pointer', opacity: v.suBusy ? 0.6 : v.suOk ? 1 : 0.55, transition: 'background .25s' }}>{v.suBusy ? 'One moment…' : v.suBtn}</button>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', fontSize: 13, color: MUTED }}>
            {v.suReset
              ? <button type="button" onClick={v.suToSignin} className={hoverLine} style={quietLink()}>← Back to sign in</button>
              : <span>{v.suSwitchQ} <button type="button" onClick={v.suSwitch} className={hoverLine} style={quietLink()}>{v.suSwitchLbl}</button></span>}
            <button type="button" onClick={v.closeAuth} className={hoverText} style={{ padding: 0, border: 'none', background: 'none', color: 'rgba(var(--ink-rgb),.75)', font: `500 13px ${SANS}`, cursor: 'pointer' }}>Not now</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function VerifyBanner({ v }: { v: V }) {
  return (
    <div role="status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px 20px', flexWrap: 'wrap', padding: '12px 16px', border: `1px solid ${MARK}`, fontSize: 14, color: INK }}>
      <span><b style={{ fontWeight: 600 }}>Confirm your email.</b> We sent a link to {v.acEmail}.</span>
      <span style={{ display: 'flex', gap: 16 }}>
        <button onClick={v.resendVerify} disabled={v.acBusy === 'verify'} className={hoverLine} style={underlineBtn(13)}>Resend</button>
        <button onClick={v.checkVerified} disabled={v.acBusy === 'verify'} className={hoverLine} style={underlineBtn(13)}>I’ve confirmed</button>
      </span>
    </div>
  );
}

function SettingsSection({ title, note, children }: { title: string; note?: ReactNode; children: ReactNode }) {
  return (
    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '14px 48px', paddingTop: 20, borderTop: `1px solid ${INK}` }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={serif(28, 1.1)}>{title}</span>
        {note && <span style={{ fontSize: 14, lineHeight: 1.5, color: MUTED, textWrap: 'pretty' } as CSSProperties}>{note}</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
    </section>
  );
}

const formBtn = (danger = false): CSSProperties => ({ alignSelf: 'flex-start', height: 44, padding: '0 20px', borderRadius: 2, border: danger ? `1.5px solid ${MARK}` : 'none', background: danger ? 'none' : INK, color: danger ? MARK : PAPER, font: `500 14px ${SANS}`, cursor: 'pointer' });

/** Account settings: email confirmation, email and password changes, account deletion. */
export function Settings({ v }: { v: V }) {
  const f = v.acF, on = v.onAc, mob = !v.notMob;
  return (
    <div style={screen()}>
      <div style={{ maxWidth: 1080, margin: '0 auto', boxSizing: 'border-box', padding: `${mob ? 84 : 108}px ${mob ? 16 : 40}px 48px`, display: 'flex', flexDirection: 'column', gap: 32 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={v.closeSettings} className={hoverText} style={{ alignSelf: 'flex-start', padding: 0, border: 'none', background: 'none', cursor: 'pointer', ...label(INK) }}>← Your profile</button>
          <h1 style={{ margin: 0, ...serif(mob ? 44 : 64, 1, '-.02em') }}>Account <em>settings</em></h1>
          <span style={{ display: 'flex', gap: 14, alignItems: 'baseline', flexWrap: 'wrap', fontSize: 14, color: MUTED }}>
            Signed in as {v.acEmail}
            <button onClick={v.signOut} className={hoverLine} style={underlineBtn(14)}>Sign out</button>
          </span>
        </div>
        {(v.acErr || v.acInfo) && <Notice err={v.acErr} info={v.acInfo} />}
        <SettingsSection title="Email" note={v.acVerified ? 'Your email is confirmed.' : <>Not confirmed yet. Open the link we sent to <b style={{ fontWeight: 600 }}>{v.acEmail}</b>.</>}>
          {!v.acVerified && (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <button onClick={v.resendVerify} disabled={v.acBusy === 'verify'} style={formBtn()}>Resend confirmation</button>
              <button onClick={v.checkVerified} disabled={v.acBusy === 'verify'} className={hoverLine} style={{ ...underlineBtn(14), alignSelf: 'center' }}>I’ve confirmed</button>
            </div>
          )}
          <form onSubmit={v.changeEmail} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <TextField label="New email" value={f.email} onChange={on.email} type="email" placeholder="you@example.com" autoComplete="email" />
            <TextField label="Current password" value={f.pwEmail} onChange={on.pwEmail} type="password" autoComplete="current-password" />
            <button type="submit" disabled={v.acBusy === 'email'} style={{ ...formBtn(), opacity: v.acBusy === 'email' ? 0.6 : 1 }}>{v.acBusy === 'email' ? 'Sending…' : 'Change email'}</button>
          </form>
        </SettingsSection>
        <SettingsSection title="Password">
          <form onSubmit={v.changePassword} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <TextField label="Current password" value={f.pwOld} onChange={on.pwOld} type="password" autoComplete="current-password" />
            <TextField label="New password" value={f.pwNew} onChange={on.pwNew} type="password" placeholder="At least 6 characters" autoComplete="new-password" />
            <button type="submit" disabled={v.acBusy === 'password'} style={{ ...formBtn(), opacity: v.acBusy === 'password' ? 0.6 : 1 }}>{v.acBusy === 'password' ? 'Saving…' : 'Change password'}</button>
          </form>
        </SettingsSection>
        <SettingsSection title="App" note="Install verso to open it from your home screen or dock, full screen, like any other app.">
          {v.inInstalled ? <span style={{ fontSize: 14, color: MUTED }}>You’re using the installed app.</span>
            : v.inCanPrompt ? <button onClick={v.inInstall} style={formBtn()}>Install verso</button>
            : v.inIOS ? <span style={{ fontSize: 14, lineHeight: 1.5, color: INK }}>In Safari, tap <b style={{ fontWeight: 600 }}>Share</b> (the square with an arrow), then <b style={{ fontWeight: 600 }}>Add to Home Screen</b>.</span>
            : <span style={{ fontSize: 14, lineHeight: 1.5, color: INK }}>Use your browser’s <b style={{ fontWeight: 600 }}>Install</b> option (in Chrome and Edge, the icon at the end of the address bar). On Android, open the browser menu and choose <b style={{ fontWeight: 600 }}>Install app</b>.</span>}
        </SettingsSection>
        <SettingsSection title="Your data" note="What we store about you and how it’s used.">
          <LegalLinks v={v} align="flex-start" />
        </SettingsSection>
        <SettingsSection title="Delete account" note="Permanently deletes your profile, handle, follows and every sketchbook with all its pages. This can’t be undone.">
          <form onSubmit={v.deleteAccount} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <TextField label={`Type your handle (${v.acHandle}) to confirm`} value={f.delHandle} onChange={on.delHandle} placeholder={v.acHandle} />
            <TextField label="Password" value={f.pwDel} onChange={on.pwDel} type="password" autoComplete="current-password" />
            <button type="submit" disabled={v.acBusy === 'delete'} className={hover(`background:${MARK};color:${PAPER}`)} style={{ ...formBtn(true), opacity: v.acBusy === 'delete' ? 0.6 : 1 }}>{v.acBusy === 'delete' ? 'Deleting…' : 'Delete my account'}</button>
          </form>
        </SettingsSection>
      </div>
    </div>
  );
}

function LegalLinks({ v, align = 'center' }: { v: V; align?: CSSProperties['justifyContent'] }) {
  return (
    <div style={{ display: 'flex', gap: 16, justifyContent: align, fontSize: 12, color: STONE }}>
      <button onClick={v.openPrivacy} className={hoverText} style={{ padding: 0, border: 'none', background: 'none', color: 'inherit', font: `500 12px ${SANS}`, cursor: 'pointer' }}>Privacy</button>
      <button onClick={v.openTerms} className={hoverText} style={{ padding: 0, border: 'none', background: 'none', color: 'inherit', font: `500 12px ${SANS}`, cursor: 'pointer' }}>Terms</button>
    </div>
  );
}
