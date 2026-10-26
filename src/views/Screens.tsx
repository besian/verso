import { Fragment, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { V } from '../App';
import { SiteFooter } from './Footer';
import { InkWord } from './InkWord';
import ClosedBook from '../ClosedBook';
import { hover, wheelSideways } from '../pseudo';
import { CANVAS, INK, MARK, MUTED, PAGE_EDGES, PAPER, SANS, SERIF, STONE, label, pagePad, serif } from '../theme';
import { HandleField, MoreMenu, Notice, PlusTag, TextField } from './Overlays';
import { Popover } from './Popover';
import { Verified } from './Verified';

const screen = (overflowY: CSSProperties['overflowY'] = 'auto'): CSSProperties => ({ position: 'absolute', inset: '0 0 var(--tabbar, 0px) 0', zIndex: 4, background: PAPER, overflowX: 'hidden', overflowY });
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
        <h1 style={{ margin: 0, maxWidth: 1100, font: `400 ${mob ? 'clamp(40px, 12vw, 56px)' : 'clamp(48px, min(8.5vw, 12vh), 132px)'}/.92 ${SERIF}`, letterSpacing: '-.03em', textWrap: 'balance' } as CSSProperties}>Every great idea starts in <InkWord /></h1>
        {!mob && <p style={{ margin: 0, maxWidth: 480, fontSize: 'clamp(15px, 2vh, 18px)', lineHeight: 1.5, color: MUTED, textWrap: 'pretty' } as CSSProperties}>A home for sketchbooks, unfinished thoughts, and the creative process. Share your pages. Discover someone else’s world.</p>}
        <div style={{ display: 'flex', flexDirection: mob ? 'column' : 'row', gap: mob ? 14 : 28, alignItems: 'center', justifyContent: 'center', marginTop: mob ? 4 : 2, width: mob ? '100%' : undefined }}>
          {signedOut
            ? <button onClick={v.openMe} className={hoverMark} style={{ ...primaryBtn(mob ? 48 : 50, 15, 28), width: mob ? '100%' : undefined, maxWidth: 320 }}>Start your own sketchbook</button>
            : <button onClick={v.goExplore} className={hoverMark} style={{ ...primaryBtn(mob ? 48 : 50, 15, 28), width: mob ? '100%' : undefined, maxWidth: 320 }}>Explore sketchbooks ↗</button>}
          {signedOut
            ? <button onClick={v.goExplore} className={hoverLine} style={underlineBtn(15)}>Explore sketchbooks ↗</button>
            : <button onClick={v.startOwn} className={hoverLine} style={underlineBtn(15)}>Start your own →</button>}
        </div>
        {v.promoPlus && <button onClick={v.openPlusPage} className={'tap ' + hoverText} style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer', font: `500 13px ${SANS}`, color: MUTED }}><span style={{ ...label(MARK, 10), marginRight: 8 }}>Plus</span>{v.promoLine} <span style={{ color: INK, borderBottom: `1px solid ${INK}` }}>See what’s included</span></button>}
        {signedOut && <div style={{ fontSize: 13, color: STONE }}>Already a member? <button onClick={v.openSignin} className={'tap ' + hoverText} style={{ padding: 0, border: 'none', borderBottom: `1px solid ${STONE}`, background: 'none', color: INK, font: `500 13px ${SANS}`, cursor: 'pointer' }}>Sign in</button></div>}
        {v.hmPick && (
          <button onClick={v.hmPick.open} className={hover(`border-color:${MARK}`)} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8, maxWidth: '100%', padding: '7px 14px', border: '1px solid rgba(var(--ink-rgb),.2)', borderRadius: 20, background: 'none', color: INK, cursor: 'pointer', font: `500 13px ${SANS}` }}>
            <span style={label(MARK, 10)}>Staff pick</span>
            <span style={{ font: `italic 400 17px/1 ${SERIF}`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{v.hmPick.name}</span>
            <span style={{ color: MUTED, whiteSpace: 'nowrap' }}>by {v.hmPick.artist} →</span>
          </button>
        )}
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
                {sh.isPick && <span style={{ position: 'absolute', left: '50%', top: -11, transform: 'translateX(-50%)', padding: '3px 8px', borderRadius: 10, background: MARK, color: '#F6F2E8', font: `600 9px/1.2 ${SANS}`, letterSpacing: '.1em', textTransform: 'uppercase', whiteSpace: 'nowrap', boxShadow: '0 2px 6px rgba(0,0,0,.2)' }}>Staff pick</span>}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, ...label() }}>
          <span>{v.hmMixed ? (mob ? 'Artists you follow & more' : 'New from artists you follow and the community') : v.hmFollowing ? (mob ? 'From artists you follow' : 'New from artists you follow') : v.hmShelf.length ? (mob ? 'From the community' : 'From the community — open any book to leaf through it') : 'The shelf is empty — yours could be first'}</span>
          {v.hmShelf.length > 0 && <button onClick={v.goExplore} className={'tap ' + hoverText} style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer', whiteSpace: 'nowrap', ...label(INK) }}>View all →</button>}
        </div>
        <LegalLinks v={v} />
      </section>
    </div>
  );
}

const chipStyle = (on: boolean): CSSProperties => ({ flexShrink: 0, height: 34, padding: '0 12px', borderRadius: 15, border: `1px solid ${on ? INK : 'rgba(var(--ink-rgb),.25)'}`, background: on ? INK : 'transparent', color: on ? PAPER : INK, font: `500 13px ${SANS}`, cursor: 'pointer', whiteSpace: 'nowrap' });
const segBtn = (bg: string, fg: string): CSSProperties => ({ height: 32, borderRadius: 2, border: 'none', background: bg, color: fg, font: `500 13px ${SANS}`, cursor: 'pointer' });
const iconSeg = (bg: string, fg: string): CSSProperties => ({ ...segBtn(bg, fg), width: 32, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' });
const segGroup: CSSProperties = { display: 'flex', gap: 2, padding: 3, border: '1px solid rgba(var(--ink-rgb),.2)' };
const stackEdge = (side: 'top' | 'bottom' | 'left' | 'right', bg: string, filter?: string): CSSProperties => {
  const h = side === 'top' || side === 'bottom';
  return h
    ? { position: 'absolute', left: 0, right: 0, [side === 'bottom' ? 'top' : 'bottom']: '100%', height: 14, transformOrigin: side === 'bottom' ? 'top' : 'bottom', transform: `rotateX(${side === 'bottom' ? -90 : 90}deg)`, background: bg }
    : { position: 'absolute', top: 0, bottom: 0, [side === 'right' ? 'left' : 'right']: '100%', width: 14, transformOrigin: side === 'right' ? 'left' : 'right', transform: `rotateY(${side === 'right' ? 90 : -90}deg)`, background: bg, filter };
};

/** Signed in: Explore shows everyone's sketchbooks, or the latest pages from artists you follow. */
function ExploreTabs({ v }: { v: V }) {
  if (!v.exTabs) return null;
  const tab = (on: boolean, l: string, go: () => void) => (
    <button role="tab" aria-selected={on} onClick={go} className={hover(`color:${MARK}`)} style={{ padding: '4px 0', border: 'none', borderBottom: `1.5px solid ${on ? INK : 'transparent'}`, background: 'none', cursor: 'pointer', ...label(on ? INK : STONE, 11) }}>{l}</button>
  );
  return <div role="tablist" aria-label="Explore" style={{ display: 'flex', gap: 24 }}>{tab(!v.exFollowing, 'Everyone', v.exTabAll)}{tab(v.exFollowing, 'Following', v.exTabFollowing)}</div>;
}

/** The Following tab: one entry per recently updated sketchbook, with its latest pages to tap straight into. */
function FollowingFeed({ v }: { v: V }) {
  const mob = !v.notMob;
  return (
    <div style={screen('auto')}>
      <div style={{ minHeight: '100%', boxSizing: 'border-box', padding: `${v.exPadT}px ${v.exPadX}px 28px`, display: 'flex', flexDirection: 'column', gap: v.exGap }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', paddingBottom: 18, borderBottom: `1px solid ${INK}` }}>
          <h1 style={{ margin: 0, ...serif(v.exH1, .95, '-.02em') }}><em>Following</em></h1>
          <ExploreTabs v={v} />
        </div>
        {v.exFeedLoading ? <div style={{ padding: '40px 0', textAlign: 'center', color: MUTED, fontSize: 14 }}>Opening sketchbooks…</div>
          : !v.exFeed.length ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center', padding: '40px 0', color: MUTED, fontSize: 14 }}>
              <span style={serif(34)}>{v.exFeedNoFollows ? <>Follow some <em style={{ color: MARK }}>artists.</em></> : <>Nothing new <em style={{ color: MARK }}>yet.</em></>}</span>
              <span style={{ maxWidth: 380, lineHeight: 1.5 }}>{v.exFeedNoFollows ? 'Follow artists from their profiles, and their newest pages show up here.' : 'When the artists you follow add pages, they show up here.'}</span>
              <button onClick={v.exTabAll} className={hoverLine} style={underlineBtn(14)}>Explore everyone’s sketchbooks ↗</button>
            </div>
          ) : v.exFeed.map((f: V) => (
            <article key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: v.exGap, borderBottom: '1px solid rgba(var(--ink-rgb),.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <button onClick={f.openArtist} aria-label={`${f.artist}’s profile`} style={{ width: 38, height: 38, flexShrink: 0, borderRadius: '50%', border: '1px solid rgba(var(--ink-rgb),.15)', boxSizing: 'border-box', padding: 0, background: f.av || INK, color: PAPER, font: `600 12px ${SANS}`, cursor: 'pointer' }}>{f.av ? '' : f.init}</button>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: 14, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <button onClick={f.openArtist} className={hoverText} style={{ padding: 0, border: 'none', background: 'none', color: INK, font: `600 14px ${SANS}`, cursor: 'pointer' }}>{f.artist}</button>
                    <span style={{ color: MUTED }}> · {f.when}</span>
                  </span>
                  <button onClick={f.open} className={hoverText} style={{ padding: 0, border: 'none', background: 'none', textAlign: 'left', color: INK, cursor: 'pointer', ...serif(mob ? 22 : 26, 1.1, 'normal'), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{f.name}</button>
                </div>
                {f.mature && <span style={label(MUTED, 10)}>Mature</span>}
                <span style={{ fontSize: 13, color: MUTED, flexShrink: 0 }}>{!mob && f.meta}</span>
              </div>
              <div onWheel={wheelSideways} style={{ display: 'flex', gap: mob ? 8 : 12, overflowX: 'auto', margin: `0 -${v.exPadX}px`, padding: `2px ${v.exPadX}px 6px`, scrollbarWidth: 'none' } as CSSProperties}>
                {f.pages.map((pg: V) => (
                  <button key={pg.key} onClick={pg.open} title={`Page ${pg.num}`} aria-label={`Open page ${pg.num} of ${f.name}`} className={hover('transform:translateY(-4px)')}
                    style={{ position: 'relative', flexShrink: 0, width: pg.w, height: pg.h, padding: 0, border: 'none', borderRadius: '2px 6px 6px 2px', background: pg.bg, boxShadow: '0 8px 20px rgba(34,35,32,.14), inset 0 0 0 1px rgba(34,35,32,.08)', cursor: 'pointer', transition: 'transform .3s cubic-bezier(.2,.8,.2,1)' }}>
                    <span style={{ position: 'absolute', right: 6, bottom: 5, padding: '1px 5px', borderRadius: 3, background: 'rgba(246,242,233,.85)', color: '#3a3830', font: `500 10px ${SANS}` }}>{pg.num}</span>
                  </button>
                ))}
              </div>
            </article>
          ))}
        <SiteFooter v={v} />
      </div>
    </div>
  );
}

export function Explore({ v }: { v: V }) {
  if (v.exFollowing) return <FollowingFeed v={v} />;
  return (
    <div onScroll={v.onExScroll} style={screen(v.exOvY)}>
      <div style={{ maxWidth: 'none', height: v.exInnerH, minHeight: '100%', boxSizing: 'border-box', margin: '0 auto', padding: `${v.exPadT}px ${v.exPadX}px 28px`, display: 'flex', flexDirection: 'column', gap: v.exGap }}>
        {v.exGrid && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', paddingBottom: 18, borderBottom: `1px solid ${INK}` }}>
            <h1 style={{ margin: 0, ...serif(v.exH1, .95, '-.02em') }}><em>Explore</em></h1>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 24, flexWrap: 'wrap' }}><ExploreTabs v={v} /><span style={label()}>{v.exCountLbl}</span></div>
          </div>
        )}
        {!v.exGrid && <ExploreTabs v={v} />}
        {/* One row: search, then surprise, sort, medium and view. Phones put sort and medium on a short second row. */}
        {(() => {
          const sortItems = [{ key: 'trend', label: 'Featured', on: v.sTrBg !== 'transparent', pick: v.sortTrend }, { key: 'new', label: 'Recent', on: v.sNewBg !== 'transparent', pick: v.sortNew }];
          const med = v.exMediums.find((m: V) => m.on && m.key), medLbl = med ? med.label : 'Medium';
          const sort = <Pick label={sortItems.find(i => i.on)?.label || 'Featured'} title="Sort" items={sortItems} touch={v.isTouch} />;
          const medium = <Pick label={medLbl} title="Filter by medium" items={v.exMediums} touch={v.isTouch} active={!!med} />;
          const cont = v.exContent.find((c: V) => c.on), content = <Pick label={cont?.key === 'all' ? 'All content' : cont?.key === 'only' ? 'Mature only' : 'Content'} title="Mature work" items={v.exContent} touch={v.isTouch} active={cont?.key !== 'hide'} />;
          const surprise = <button onClick={v.surprise} title="Surprise me: open a random sketchbook" aria-label="Surprise me" className={hover(`border-color:${INK};color:${MARK}`)} style={{ ...toolBtn(false), width: 40, padding: 0, justifyContent: 'center', fontSize: 16 }}>✦</button>;
          const tag = v.exTag && <button onClick={v.clearLabel} title="Clear tag" style={{ ...toolBtn(true), background: MARK, borderColor: MARK, color: PAPER }}>{v.exTag} ×</button>;
          const view = (
            <div style={{ ...segGroup, flexShrink: 0 }}>
              <button onClick={v.viewGrid} title="Grid" style={iconSeg(v.vGridBg, v.vGridFg)}>▦</button>
              <button onClick={v.viewStack} title="Stack" style={iconSeg(v.vStackBg, v.vStackFg)}>≡</button>
            </div>
          );
          const search = (
            <div style={{ flex: v.notMob ? `1 1 ${v.exSearchBasis}` : '1 1 0', minWidth: v.notMob ? 200 : 0, maxWidth: v.exSearchMax, height: 40, display: 'flex', alignItems: 'center', gap: 10, padding: 0, borderBottom: '1px solid rgba(var(--ink-rgb),.35)', boxSizing: 'border-box' }}>
              <span style={{ fontSize: 15, color: 'rgba(var(--ink-rgb),.6)' }}>⌕</span>
              <input value={v.exQ} onChange={v.onExQ} placeholder="Search sketchbooks or artists" style={{ flex: 1, minWidth: 0, height: '100%', border: 'none', outline: 'none', background: 'none', color: INK, font: `500 14px ${SANS}` }} />
            </div>
          );
          return v.notMob ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {search}{tag}<div style={{ flex: 1, minWidth: 0 }} />{surprise}{sort}{medium}{content}{view}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{search}{surprise}{view}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>{sort}{medium}{content}{tag}</div>
            </div>
          );
        })()}
        {v.exArchive?.length > 0 && (
          // From the archive: historical sketchbooks, a row you can scroll sideways.
          <section style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 22, borderBottom: '1px solid rgba(var(--ink-rgb),.2)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ ...serif(v.notMob ? 30 : 26, 1, '-.01em') }}>From the <em>archive</em></span>
              <span style={{ fontSize: 13, color: MUTED }}>Sketchbooks of the old masters, page by page.</span>
            </div>
            <div onWheel={wheelSideways} style={{ display: 'flex', gap: v.notMob ? 28 : 18, alignItems: 'flex-end', overflowX: 'auto', margin: `0 -${v.exPadX}px`, padding: `6px ${v.exPadX}px 4px`, scrollbarWidth: 'none' } as CSSProperties}>
              {v.exArchive.map((b: V) => {
                const h = v.notMob ? 170 : 130, w = Math.round(h * b.a);
                return (
                  <button key={b.key} onClick={b.open} className={hover('transform:translateY(-4px)')} style={{ flexShrink: 0, width: Math.max(w + 7, 120), display: 'flex', flexDirection: 'column', gap: 10, padding: 0, border: 'none', background: 'none', color: INK, textAlign: 'left', cursor: 'pointer', transition: 'transform .3s cubic-bezier(.2,.8,.2,1)' }}>
                    <span style={{ position: 'relative', width: w, height: h, display: 'block' }}><ClosedBook bg={b.bg} board={b.color} label={b.showLabel ? b.name : null} /></span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, width: '100%' }}>
                      <span style={{ ...serif(18, 1.15, 'normal'), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.artist}</span>
                      <span style={{ fontSize: 12, color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{[b.years, b.name].filter(Boolean).join(' · ')}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}
        {v.exPeople?.length > 0 && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={label()}>Artists</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 28px', paddingBottom: 18, borderBottom: '1px solid rgba(var(--ink-rgb),.2)' }}>
              {v.exPeople.map((p: V) => (
                <button key={p.key} onClick={p.open} className={hover(`color:${MARK}`)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 0, border: 'none', background: 'none', color: INK, cursor: 'pointer', textAlign: 'left', minWidth: 0 }}>
                  <span style={{ width: 40, height: 40, flexShrink: 0, borderRadius: '50%', border: '1px solid rgba(var(--ink-rgb),.22)', boxSizing: 'border-box', background: p.avBg, color: PAPER, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `400 17px ${SERIF}` }}>{p.init}</span>
                  <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ ...serif(22, 1.1, 'normal'), color: 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}{p.verified && <Verified size={14} />}</span>
                    <span style={{ fontSize: 13, color: MUTED }}>{p.handle}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
        {v.exNone && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center', fontSize: 14, color: 'rgba(var(--ink-rgb),.7)' }}>
            {v.exLoading ? 'Opening sketchbooks…'
              : v.exEmpty ? <><span style={serif(34)}>Nothing here <em style={{ color: MARK }}>yet.</em></span><span>No one has shared a sketchbook yet. Yours could be the first.</span></>
              : v.exNoneLbl}
          </div>
        )}
        {/* Fletora Plus, for people without it; it can be closed (it stays away for a month). */}
        {v.exPromo && (
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px 24px', flexWrap: 'wrap', padding: '16px 48px 16px 20px', background: 'rgba(173,73,58,.07)', borderLeft: `2px solid ${MARK}` }}>
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', fontSize: 14, lineHeight: 1.5 }}>
              <span style={label(MARK, 10)}>Fletora Plus</span>
              <span>Unlimited sketchbooks, 300 pages each, PDFs, stats and drawing together with up to five people. <span style={{ color: MUTED }}>{v.promoTrial ? 'Free for 14 days when you join, no card needed.' : `From ${'£5'} a month, paid yearly.`}</span></span>
            </span>
            <button onClick={v.openPlusPage} className={hover(`background:${MARK}`)} style={{ height: 38, padding: '0 18px', border: 'none', borderRadius: 2, background: INK, color: PAPER, font: `500 13px ${SANS}`, cursor: 'pointer', whiteSpace: 'nowrap' }}>{v.promoTrial ? 'Start free' : 'See Plus'}</button>
            <button onClick={v.hidePromo} aria-label="Close" title="Close" className={hover(`color:${MARK}`)} style={{ position: 'absolute', right: 8, top: 8, width: 28, height: 28, padding: 0, border: 'none', background: 'none', color: MUTED, font: `400 18px/1 ${SANS}`, cursor: 'pointer' }}>×</button>
          </div>
        )}
        {v.exGrid && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${v.exCols},minmax(0,1fr))`, gap: '44px 18px', width: '100%', alignItems: 'end' }}>
              {v.exploreList.map((xb: V) => (
                <div key={xb.key} onClick={xb.open} style={{ display: 'flex', flexDirection: 'column', gap: 20, cursor: 'pointer', minWidth: 0 }}>
                  <div className={hover('transform:translateY(-8px)')} style={{ position: 'relative', aspectRatio: xb.ar, width: `calc(${xb.wp}% - 7px)`, marginRight: 7, transition: 'transform .35s cubic-bezier(.2,.8,.2,1)' }}>
                    <ClosedBook bg={xb.bg} board={xb.color} label={xb.showLabel ? xb.name : null} />
                    {xb.mature && <span style={matureBadge}>Mature</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                    {v.notMob && <span style={label(STONE, 10)}>{xb.no}</span>}
                    <span style={{ ...serif(22, 1.1, 'normal'), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{xb.name}</span>
                    <span style={{ fontSize: 13, color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>by <span onClick={xb.openArtist} className={hoverText} style={{ color: INK, cursor: 'pointer', borderBottom: '1px solid rgba(var(--ink-rgb),.3)' }}>{xb.artist}</span>{xb.verified && <Verified size={12} />} · {xb.count}</span>
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
        {!v.exStack && <SiteFooter v={v} />}
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
              <div style={{ fontSize: 12, fontWeight: 600, color: MARK, letterSpacing: '.04em' }}>{v.stRank} · {v.stShape}{v.stMature && ' · Mature'}</div>
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

/** One sketchbook on the profile shelf: covers share a height scaled by shape (not by column width), sitting on a common line so titles align. */
function ShelfBook({ pb, zone, fit }: { pb: V; zone: number; fit?: boolean }) {
  // fit: the item is exactly as wide as its cover, so the shelf's gaps are even whatever the shapes (see Profile).
  const w = Math.round(zone * 0.94 * pb.s * pb.a);
  return (
    <div onClick={pb.open} style={{ display: 'flex', flexDirection: 'column', gap: 14, cursor: 'pointer', minWidth: 0, width: fit ? w + 7 : undefined }}>
      <div style={{ height: zone, display: 'flex', alignItems: 'flex-end' }}>
        <div className={hover('transform:translateY(-6px)')} style={{ position: 'relative', width: `min(calc(100% - 7px), ${Math.round(zone * 0.94 * pb.s * pb.a)}px)`, aspectRatio: String(pb.a), transition: 'transform .35s cubic-bezier(.2,.8,.2,1)' }}>
          <ClosedBook bg={pb.bg} board={pb.color} label={pb.showLabel ? pb.name : null} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
        <span style={{ ...serif(20, 1.15, 'normal'), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pb.name}</span>
        <span style={{ fontSize: 13, color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pb.count}</span>
        {pb.moveTo && (pb.native
          // Phones keep the system picker, which suits touch.
          ? <select value={pb.col} onClick={e => e.stopPropagation()} onChange={e => pb.moveTo(e.target.value)} aria-label={`Collection for ${pb.name}`} style={{ marginTop: 4, maxWidth: '100%', height: 34, padding: '0 6px', border: '1px solid rgba(var(--ink-rgb),.2)', borderRadius: 2, background: PAPER, color: INK, font: `500 13px ${SANS}`, cursor: 'pointer' }}>
              <option value="">No collection</option>
              {pb.cols.map((c: string) => <option key={c} value={c}>{c}</option>)}
              <option value="__new">New collection…</option>
            </select>
          : <CollectionPick pb={pb} />
        )}
      </div>
    </div>
  );
}

/** Desktop collection picker: a dropdown that can't be clipped by the card or the bottom of the screen. */
function CollectionPick({ pb }: { pb: V }) {
  const anchor = useRef<HTMLSpanElement>(null);
  return (
    <span ref={anchor} style={{ position: 'relative', alignSelf: 'flex-start', marginTop: 4 }} onClick={e => e.stopPropagation()}>
    <button onClick={pb.toggleMenu} aria-haspopup="menu" aria-expanded={pb.menuOpen} className={hover(`border-color:${INK}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, maxWidth: 180, height: 30, padding: '0 10px', border: '1px solid rgba(var(--ink-rgb),.2)', borderRadius: 2, background: 'none', color: pb.col ? INK : MUTED, font: `500 12px ${SANS}`, cursor: 'pointer' }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pb.col || 'Add to collection'}</span><span aria-hidden="true">▾</span>
    </button>
    {pb.menuOpen && <Popover anchor={anchor}>
      <span role="menu" onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', minWidth: 200, padding: 6, background: PAPER, border: `1px solid ${INK}`, boxShadow: '0 12px 30px rgba(34,35,32,.14)' }}>
        {[['', 'No collection'], ...pb.cols.map((c: string) => [c, c])].map(([c, l]: string[]) => (
          <button key={c || '-'} role="menuitemradio" aria-checked={pb.col === c} onClick={() => pb.moveTo(c)} className={hover('background:rgba(var(--ink-rgb),.07)')} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, textAlign: 'left', padding: '9px 10px', border: 'none', background: 'none', color: INK, font: `500 13px ${SANS}`, cursor: 'pointer' }}>
            <span>{l}</span>{pb.col === c && <span style={{ color: MARK }}>✓</span>}
          </button>
        ))}
        <span style={{ height: 1, margin: '4px 0', background: 'rgba(var(--ink-rgb),.12)' }} />
        <button role="menuitem" onClick={() => pb.moveTo('__new')} className={hover('background:rgba(var(--ink-rgb),.07)')} style={{ textAlign: 'left', padding: '9px 10px', border: 'none', background: 'none', color: INK, font: `500 13px ${SANS}`, cursor: 'pointer' }}>+ New collection…</button>
      </span>
    </Popover>}
  </span>
  );
}

const toolBtn = (on: boolean): CSSProperties => ({ height: 40, padding: '0 12px', display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0, boxSizing: 'border-box', border: `1px solid ${on ? INK : 'rgba(var(--ink-rgb),.2)'}`, borderRadius: 2, background: 'none', color: INK, font: `500 13px ${SANS}`, cursor: 'pointer', whiteSpace: 'nowrap' });
/** A compact dropdown for the Explore toolbar: the system picker on touch screens, our own menu elsewhere. */
/** Marks a Mature sketchbook's cover in Explore. */
const matureBadge: CSSProperties = { position: 'absolute', bottom: 12, left: 10, padding: '3px 7px', borderRadius: 3, background: 'rgba(34,35,32,.82)', color: '#F6F2E8', font: `600 10px/1.2 ${SANS}`, letterSpacing: '.08em', textTransform: 'uppercase', pointerEvents: 'none' };

function Pick({ label, title, items, touch, active }: { label: string; title: string; items: { key: string; label: string; on: boolean; pick: () => void }[]; touch: boolean; active?: boolean }) {
  const [open, setOpen] = useState(false), anchor = useRef<HTMLSpanElement>(null);
  useEffect(() => { if (!open) return; const close = () => setOpen(false); addEventListener('click', close); return () => removeEventListener('click', close); }, [open]);
  const chev = <span aria-hidden="true" style={{ fontSize: 10, color: 'rgba(var(--ink-rgb),.6)' }}>▾</span>;
  if (touch) return (
    <label title={title} style={{ ...toolBtn(!!active), position: 'relative' }}>
      {label}{chev}
      <select aria-label={title} value={items.find(i => i.on)?.key ?? ''} onChange={e => items.find(i => i.key === e.target.value)?.pick()} style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer' }}>
        {items.map(i => <option key={i.key} value={i.key}>{i.label}</option>)}
      </select>
    </label>
  );
  return (
    <span ref={anchor} onClick={e => e.stopPropagation()} style={{ display: 'inline-flex', flexShrink: 0 }}>
      <button onClick={() => setOpen(o => !o)} title={title} aria-haspopup="menu" aria-expanded={open} className={hover(`border-color:${INK}`)} style={toolBtn(!!active || open)}>{label}{chev}</button>
      {open && <Popover anchor={anchor} align="right">
        <span role="menu" style={{ display: 'flex', flexDirection: 'column', minWidth: 180, maxHeight: 360, overflowY: 'auto', padding: 6, background: PAPER, border: `1px solid ${INK}`, boxShadow: '0 12px 30px rgba(34,35,32,.14)' }}>
          {items.map(i => (
            <button key={i.key || '-'} role="menuitemradio" aria-checked={i.on} onClick={() => { i.pick(); setOpen(false); }} className={hover('background:rgba(var(--ink-rgb),.07)')} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, textAlign: 'left', padding: '9px 10px', border: 'none', background: 'none', color: INK, font: `500 13px ${SANS}`, cursor: 'pointer' }}>
              <span>{i.label}</span>{i.on && <span style={{ color: MARK }}>✓</span>}
            </button>
          ))}
        </span>
      </Popover>}
    </span>
  );
}

const quietBtn: CSSProperties = { padding: '0 4px', border: 'none', background: 'none', color: MUTED, font: `500 14px ${SANS}`, cursor: 'pointer' };

export function Profile({ v }: { v: V }) {
  const mob = !v.notMob, wide = v.pfWide, zone = mob ? 150 : 200;
  // A slim bar: photo, name and details on the left, actions at the end; the sketchbooks start right below.
  const meta = [<span key="h">{v.pfHandle}</span>, v.pfHasLoc && <span key="l">{v.pfLoc}</span>, v.pfHasWeb && <a key="w" href={v.pfWebHref} target="_blank" rel="noopener noreferrer" style={{ color: MARK, textDecoration: 'none' }}>{v.pfWeb}</a>,
    ...v.pfSocials.map((x: V) => <a key={x.key} href={x.href} target="_blank" rel="noopener noreferrer me" style={{ color: MARK, textDecoration: 'none' }}>{x.label}</a>),
    v.pfMail && <a key="m" href={`mailto:${v.pfMail}`} style={{ color: MARK, textDecoration: 'none' }}>Email</a>, v.pfJoined && <span key="j">{v.pfJoined}</span>]
    .filter(Boolean).flatMap((x, i) => i ? [<span key={'d' + i} aria-hidden="true" style={{ color: 'rgba(var(--ink-rgb),.3)' }}>·</span>, x] : [x]);
  const small = (primary: boolean): CSSProperties => ({ ...actionBtn(primary), height: 38, padding: '0 16px', ...(mob ? { flex: '1 1 0' } : {}) });
  const iconBtn: CSSProperties = { width: 38, height: 38, flexShrink: 0, padding: 0, borderRadius: 2, border: '1.5px solid rgba(var(--ink-rgb),.35)', background: 'none', color: INK, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
  const actions = (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, ...(mob ? { width: '100%' } : {}) }}>
      {v.pfMine && (
        <>
          <button onClick={v.editProfile} className={hoverMark} style={small(true)}>Edit profile</button>
          <button onClick={v.openSettings} title="Settings" aria-label="Settings" className={hover('background:rgba(var(--ink-rgb),.08)')} style={iconBtn}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
          </button>
          <MoreMenu open={v.pfMoreOpen} onToggle={v.pfMore} align="right" items={[
            { label: 'View as public', onClick: v.togglePreview },
            ...(v.pfAdmin ? [{ label: 'Moderation', onClick: v.openAdmin }] : []),
            { label: 'Contact us', onClick: v.openContact },
            { label: 'Sign out', onClick: v.signOut, danger: true },
          ]} />
        </>
      )}
      {v.pfPreviewing && <button onClick={v.togglePreview} className={hoverMark} style={small(true)}>Exit preview</button>}
      {v.pfOther && <button onClick={v.toggleFollow} style={{ height: 38, minWidth: 112, padding: '0 20px', borderRadius: 2, border: `1.5px solid ${v.folBd}`, background: v.folBg, color: v.folFg, font: `500 14px ${SANS}`, cursor: 'pointer', ...(mob ? { flex: '1 1 0' } : {}) }}>{v.folLbl}</button>}
      {v.pfOther && v.pfCanMessage && <button onClick={v.pfMessage} className={hover('background:rgba(var(--ink-rgb),.08)')} style={small(false)}>Message</button>}
      {v.pfOther && <button onClick={v.pfShare} className={hover('background:rgba(var(--ink-rgb),.08)')} style={small(false)}>Share</button>}
      {v.pfOther && <MoreMenu open={v.pfMoreOpen} onToggle={v.pfMore} align="right" items={[...(v.pfCanGift ? [{ label: v.pfGiftLbl, onClick: v.pfGift }] : []), { label: 'Report artist', onClick: v.pfReport }, { label: v.pfBlockLbl, onClick: v.pfBlock, danger: true }]} />}
    </div>
  );
  const header = (
    <header style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {v.pfPreviewing && <div style={{ alignSelf: 'flex-start', padding: '5px 10px', border: `1px solid ${MARK}`, ...label(MARK, 10) }}>Previewing as a visitor</div>}
      {v.pfMine && !v.acVerified && <VerifyBanner v={v} />}
      <div style={{ display: 'flex', alignItems: mob ? 'flex-start' : 'center', gap: mob ? 14 : 20, flexWrap: mob ? 'wrap' : 'nowrap' }}>
        <div style={{ width: mob ? 56 : 72, height: mob ? 56 : 72, flexShrink: 0, borderRadius: '50%', border: '1px solid rgba(var(--ink-rgb),.22)', boxSizing: 'border-box', background: v.pfAvBg, color: PAPER, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `400 ${mob ? 22 : 28}px ${SERIF}` }}>{v.pfInit}</div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px 12px', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', ...serif(mob ? 30 : 36, 1.05, '-.01em') }}>{v.pfName}{v.pfVerified && <Verified size={mob ? 20 : 22} />}{v.pfPlus && <span title="Fletora Plus" style={{ marginLeft: 10, display: 'inline-flex' }}><PlusTag /></span>}</h1>
            <div style={{ display: 'flex', gap: '2px 7px', flexWrap: 'wrap', fontSize: 13, color: MUTED }}>{meta}</div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: mob ? '2px 12px' : '2px 16px', fontSize: 14, color: MUTED }}>
            {v.pfStats.map((st: V) => <span key={st.l} style={{ whiteSpace: 'nowrap' }}><b style={{ color: INK, fontWeight: 600 }}>{st.n}</b> {st.l}</span>)}
          </div>
          {v.pfHasBio && <p style={{ margin: '2px 0 0', maxWidth: 640, fontSize: 14, lineHeight: 1.5, color: INK, opacity: v.pfBioOp, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as CSSProperties}>{v.pfBio}</p>}
        </div>
        {actions}
      </div>
    </header>
  );
  return (
    <div style={screen()}>
      <div style={{ ...pagePad(mob, 56), display: 'flex', flexDirection: 'column', gap: mob ? 24 : 32, minHeight: '100%', paddingBottom: 20 }}>
        {header}

        <section style={{ display: 'flex', flexDirection: 'column', gap: mob ? 20 : 28 }}>
          {v.pfTabs ? (
            <div role="tablist" style={{ display: 'flex', alignItems: 'baseline', gap: mob ? 20 : 32, borderBottom: '1px solid rgba(var(--ink-rgb),.2)', overflowX: 'auto', scrollbarWidth: 'none' } as CSSProperties}>
              {v.pfTabs.map((t: V) => (
                <button key={t.key} role="tab" aria-selected={t.on} onClick={t.pick} className={hover(`color:${INK}`)} style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexShrink: 0, padding: '0 0 12px', marginBottom: -1, border: 'none', borderBottom: `2px solid ${t.on ? INK : 'transparent'}`, background: 'none', cursor: 'pointer', color: t.on ? INK : 'rgba(var(--ink-rgb),.45)' }}>
                  <span style={{ ...serif(mob ? 24 : 28, 1), color: 'inherit' }}>{t.label}</span>
                  <span style={{ fontSize: 13 }}>{t.n}</span>
                </button>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, paddingBottom: 12, borderBottom: '1px solid rgba(var(--ink-rgb),.2)' }}>
              <span style={serif(mob ? 24 : 28, 1)}>{v.pfBooksLbl}</span>
              <span style={{ fontSize: 13, color: MUTED }}>{v.pfCount}</span>
            </div>
          )}
          {v.pfSuspended && <div style={{ fontSize: 14, color: MUTED }}>This account has been suspended for breaking the terms.</div>}
          {v.pfBlocked && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontSize: 14, color: MUTED }}>
              You’ve blocked this artist, so their sketchbooks are hidden.
              <button onClick={v.pfUnblock} className={hoverLine} style={underlineBtn(14)}>Unblock</button>
            </div>
          )}
          {v.pfColl && (
            <div role="group" aria-label="Collections" style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' } as CSSProperties}>
              {['', ...v.pfColl].map((c: string) => <button key={c || 'all'} onClick={() => v.pfPickCol(c)} aria-pressed={v.pfColOn === c} style={chipStyle(v.pfColOn === c)}>{c || 'All saved'}</button>)}
              <button onClick={v.pfNewCol} className={hover(`border-color:${INK}`)} style={{ ...chipStyle(false), borderStyle: 'dashed' }}>+ New collection</button>
            </div>
          )}
          {v.pfEmptyNote && !v.pfBooks.length && <div style={{ fontSize: 14, color: MUTED }}>{v.pfEmptyNote}</div>}
          {v.pfOther && !v.pfBooks.length && !v.pfBlocked && !v.pfSuspended && <div style={{ fontSize: 14, color: MUTED }}>No public sketchbooks yet.</div>}
          {v.pfPeople && (v.pfPeople.length ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))', gap: '18px 32px' }}>
              {v.pfPeople.map((p: V) => (
                <button key={p.key} onClick={p.open} className={hover(`color:${MARK}`)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 0, border: 'none', background: 'none', color: INK, cursor: 'pointer', textAlign: 'left', minWidth: 0 }}>
                  <span style={{ width: 44, height: 44, flexShrink: 0, borderRadius: '50%', border: '1px solid rgba(var(--ink-rgb),.22)', boxSizing: 'border-box', background: p.avBg, color: PAPER, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `400 18px ${SERIF}` }}>{p.init}</span>
                  <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}><span style={{ ...serif(22, 1.1, 'normal'), color: 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}{p.verified && <Verified size={14} />}</span><span style={{ fontSize: 13, color: MUTED }}>{p.handle}</span></span>
                </button>
              ))}
            </div>
          ) : <div style={{ fontSize: 14, color: MUTED }}>You’re not following anyone yet. Follow artists from their profile to see their new pages on your home shelf.</div>)}
          {(v.pfBooks.length > 0 || v.pfShowNew) && (
            // Phones: two even columns. Wider screens: a row of books each as wide as its cover with even gaps between
            // (equal columns left a big gap after tall, narrow covers and a small one after wide ones).
            <div style={mob ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '28px 16px' } : { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: '40px 44px' }}>
              {v.pfBooks.map((pb: V) => <ShelfBook key={pb.key} fit={!mob} pb={pb.moveTo ? { ...pb, cols: v.pfColl || [], native: v.isTouch || mob, menuOpen: v.colMenu === pb.key, toggleMenu: () => v.toggleColMenu(pb.key) } : pb} zone={zone} />)}
              {v.pfShowNew && (
                <div onClick={v.pfNew} style={{ display: 'flex', flexDirection: 'column', gap: 14, cursor: 'pointer', minWidth: 0, width: mob ? undefined : Math.round(zone * 0.94 * 0.72) + 7 }}>
                  <div style={{ height: zone, display: 'flex', alignItems: 'flex-end' }}>
                    <div className={hover(`border-color:${MARK};color:${MARK}`)} style={{ width: `min(100%, ${Math.round(zone * 0.94 * 0.72)}px)`, aspectRatio: '.72', boxSizing: 'border-box', border: '1.5px dashed rgba(var(--ink-rgb),.35)', borderRadius: '2px 10px 10px 2px', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 500, color: MUTED }}>
                      <span style={{ fontSize: 26, fontWeight: 300, lineHeight: 1 }}>+</span>New
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
        <SiteFooter v={v} />
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

/** What the sign-in panel lists, by mode. */
const AUTH_POINTS: Record<string, string[]> = {
  join: ['A home for every sketchbook: public, private or shared with a friend.', 'Leaf through other artists’ pages, unfinished ones and all.', 'Fletora Plus free for 14 days when you join. No card needed.'],
  signin: ['Your sketchbooks, just as you left them.', 'New pages from the artists you follow.', 'Messages and invitations waiting for you.'],
  reset: [],
};
/** A few closed sketchbooks fanned out at the foot of the sign-in panel. */
const AUTH_BOOKS: [string, string, number, number][] = [['#2f4a7a', 'Lisbon, spring', -9, 0], ['#d9a42b', 'Life room', 4, 1], ['#b8243a', 'sketchbook', -2, 2], ['#3f7a5a', 'Studies', 8, 3]];

/** Sign in, create an account, or request a password reset. Wide screens: a panel with what fletora. offers on the
 *  left, the form centred on the right, filling the screen. Phones: stacked. */
export function AuthPage({ v }: { v: V }) {
  const mob = !v.notMob, points = AUTH_POINTS[v.suMode] || [];
  const panel = (
    <section style={{ display: 'flex', flexDirection: 'column', gap: mob ? 16 : 26, minWidth: 0, ...(mob ? {} : { padding: '52px 52px 0', background: 'rgba(var(--ink-rgb),.045)', borderRadius: 2, overflow: 'hidden', alignSelf: 'stretch' }) }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', ...label() }}><span style={{ color: MARK }}>{v.suKicker}</span><span style={{ width: 40, height: 1, background: STONE }} /><span>fletora.</span></div>
      <h1 style={{ margin: 0, font: `400 ${mob ? '52px' : 'clamp(64px, 6.4vw, 104px)'}/.94 ${SERIF}`, letterSpacing: '-.025em', textWrap: 'balance' } as CSSProperties}>{AUTH_HEAD[v.suMode]}</h1>
      <p style={{ margin: 0, maxWidth: 440, fontSize: mob ? 16 : 17, lineHeight: 1.55, color: MUTED, textWrap: 'pretty' } as CSSProperties}>{v.suSub}</p>
      {!mob && points.length > 0 && (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 440 }}>
          {points.map(t => <li key={t} style={{ display: 'flex', gap: 12, alignItems: 'baseline', fontSize: 15, lineHeight: 1.5 }}><span aria-hidden="true" style={{ color: MARK, ...serif(18, 1) }}>✓</span>{t}</li>)}
        </ul>
      )}
      {!mob && (
        // Decoration: a little stack of sketchbooks resting at the bottom of the panel.
        <div aria-hidden="true" style={{ position: 'relative', flex: 1, minHeight: 190, marginTop: 8 }}>
          {AUTH_BOOKS.map(([c, name, rot, k]) => (
            <div key={name} style={{ position: 'absolute', bottom: -34, left: 4 + k * 104, width: 140, height: 194, transform: `rotate(${rot}deg)`, transformOrigin: '50% 100%' }}>
              <ClosedBook size="sm" bg={c} board={c} label={name} labelStyle={{ padding: '6px 8px', font: `400 14px/1.1 ${SERIF}` }} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
  return (
    <div style={screen()}>
      <div style={{ ...pagePad(mob), display: 'flex', flexDirection: 'column', gap: mob ? 28 : 32, minHeight: '100%', paddingBottom: 20, ...(mob ? {} : { paddingTop: 92 }) }}>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: mob ? 'minmax(0,1fr)' : 'minmax(0,1.05fr) minmax(0,1fr)', gap: mob ? 28 : 'clamp(40px, 6vw, 110px)', alignItems: 'center' }}>
          {panel}
          <div style={{ display: 'flex', justifyContent: 'center', padding: mob ? 0 : '32px 0' }}>
          <form onSubmit={v.suSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 420, width: '100%' }}>
            {!v.suReset && <GoogleButton v={v} />}
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
                {!v.suJoin && <button type="button" onClick={v.suToReset} className={'tap ' + hover(`color:${MARK}`)} style={{ alignSelf: 'flex-end', padding: 0, border: 'none', background: 'none', color: 'rgba(var(--ink-rgb),.75)', font: `500 13px ${SANS}`, cursor: 'pointer' }}>Forgot password?</button>}
              </div>
            )}
            <Notice err={v.suErr} info={v.suInfo} />
            {!v.suReset && <div style={{ fontSize: 12, lineHeight: 1.5, color: MUTED }}>By {v.suJoin ? 'creating an account' : 'continuing'} you agree to the <button type="button" onClick={v.openTerms} className={hoverLine} style={{ ...quietLink('rgba(var(--ink-rgb),.4)'), font: `500 12px ${SANS}` }}>Terms</button> and <button type="button" onClick={v.openPrivacy} className={hoverLine} style={{ ...quietLink('rgba(var(--ink-rgb),.4)'), font: `500 12px ${SANS}` }}>Privacy policy</button>. Your email is only used to sign in and is never shown.</div>}
            <button type="submit" disabled={v.suBusy} className={v.suBusy ? undefined : hover(`background:${MARK}`)} style={{ height: 50, marginTop: 4, border: 'none', borderRadius: 2, background: INK, color: PAPER, font: `500 15px ${SANS}`, cursor: v.suBusy ? 'progress' : 'pointer', opacity: v.suBusy ? 0.6 : v.suOk ? 1 : 0.55, transition: 'background .25s' }}>{v.suBusy ? 'One moment…' : v.suBtn}</button>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', fontSize: 13, color: MUTED }}>
              {v.suReset
                ? <button type="button" onClick={v.suToSignin} className={'tap ' + hoverLine} style={quietLink()}>← Back to sign in</button>
                : <span>{v.suSwitchQ} <button type="button" onClick={v.suSwitch} className={'tap ' + hoverLine} style={quietLink()}>{v.suSwitchLbl}</button></span>}
              <button type="button" onClick={v.closeAuth} className={'tap ' + hoverText} style={{ padding: 0, border: 'none', background: 'none', color: 'rgba(var(--ink-rgb),.75)', font: `500 13px ${SANS}`, cursor: 'pointer' }}>Not now</button>
            </div>
          </form>
          </div>
        </div>
        <SiteFooter v={v} />
      </div>
    </div>
  );
}

/** Sign in or join with Google, above the email form. */
function GoogleButton({ v }: { v: V }) {
  return (
    <>
      <button type="button" onClick={v.suGoogle} disabled={v.suBusy} className={hover('background:rgba(var(--ink-rgb),.06)')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, height: 50, border: '1.5px solid rgba(var(--ink-rgb),.35)', borderRadius: 2, background: 'none', color: INK, font: `500 15px ${SANS}`, cursor: v.suBusy ? 'progress' : 'pointer', opacity: v.suBusy ? 0.6 : 1 }}>
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
        Continue with Google
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: MUTED }}>
        <span style={{ flex: 1, height: 1, background: 'rgba(var(--ink-rgb),.15)' }} />or with email<span style={{ flex: 1, height: 1, background: 'rgba(var(--ink-rgb),.15)' }} />
      </div>
    </>
  );
}

/** A quiet one-line reminder to confirm the email address, with what happened when you press Resend. */
function VerifyBanner({ v }: { v: V }) {
  return (
    <div role="status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px 18px', flexWrap: 'wrap', padding: '9px 14px', background: 'rgba(173,73,58,.07)', borderLeft: `2px solid ${MARK}`, fontSize: 13, lineHeight: 1.45, color: INK }}>
      <span><b style={{ fontWeight: 600 }}>Confirm your email</b> <span style={{ color: MUTED }}>· {v.vfErr || v.vfMsg || `we sent a link to ${v.acEmail}. Check spam too.`}</span></span>
      <span style={{ display: 'flex', gap: 16 }}>
        <button onClick={v.resendVerify} disabled={v.acBusy === 'verify' || v.vfCooldown} className={'tap ' + hoverLine} style={{ ...underlineBtn(13), opacity: v.vfCooldown ? 0.45 : 1 }}>{v.vfCooldown ? 'Sent' : 'Resend'}</button>
        <button onClick={v.checkVerified} disabled={v.acBusy === 'verify'} className={'tap ' + hoverLine} style={underlineBtn(13)}>I’ve confirmed</button>
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
      <div style={{ ...pagePad(mob), display: 'flex', flexDirection: 'column', gap: 32, minHeight: '100%', paddingBottom: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={v.closeSettings} className={'tap ' + hoverText} style={{ alignSelf: 'flex-start', padding: 0, border: 'none', background: 'none', cursor: 'pointer', ...label(INK) }}>← Your profile</button>
          <h1 style={{ margin: 0, ...serif(mob ? 44 : 64, 1, '-.02em') }}>Account <em>settings</em></h1>
          <span style={{ display: 'flex', gap: 14, alignItems: 'baseline', flexWrap: 'wrap', fontSize: 14, color: MUTED }}>
            Signed in as {v.acEmail}
            <button onClick={v.signOut} className={hoverLine} style={underlineBtn(14)}>Sign out</button>
          </span>
        </div>
        {(v.acErr || v.acInfo) && <Notice err={v.acErr} info={v.acInfo} />}
        <SettingsSection title="Plan" note={v.acTrial ? 'Everything in Plus, free while the trial lasts. Afterwards you’re back on the free plan, and nothing you’ve made is deleted.' : v.acGift ? 'A gift from Fletora: everything in Plus, free.' : v.acPlus ? 'Your plan, card and receipts are on the billing page.' : 'Plus adds unlimited sketchbooks, link-only sketchbooks, stats, more handwriting and more.'}>
          <span style={{ fontSize: 14, lineHeight: 1.5, color: v.acPastDue ? MARK : INK }}>{v.acTrial ? v.acTrialLine : v.acGift ? v.acGiftLine : v.acPastDue ? 'Your last payment didn’t go through. Update your card to keep Plus.' : v.acPlan}</span>
          {v.acTrial ? <button onClick={v.keepPlus} style={formBtn()}>Keep Plus</button> : v.acGift ? <button onClick={v.seePlus} className={hoverLine} style={{ ...underlineBtn(14), alignSelf: 'flex-start' }}>What’s included</button>
            : v.acPlus ? <button onClick={v.openBilling} style={formBtn()}>Manage billing</button> : <button onClick={v.seePlus} style={formBtn()}>See Plus</button>}
        </SettingsSection>
        <SettingsSection title="Email" note={v.acVerified ? 'Your email is confirmed.' : <>Not confirmed yet. Open the link we sent to <b style={{ fontWeight: 600 }}>{v.acEmail}</b>.</>}>
          {!v.acVerified && (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <button onClick={v.resendVerify} disabled={v.acBusy === 'verify'} style={formBtn()}>Resend confirmation</button>
              <button onClick={v.checkVerified} disabled={v.acBusy === 'verify'} className={hoverLine} style={{ ...underlineBtn(14), alignSelf: 'center' }}>I’ve confirmed</button>
            </div>
          )}
          {v.acPw ? (
            <form onSubmit={v.changeEmail} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <TextField label="New email" value={f.email} onChange={on.email} type="email" placeholder="you@example.com" autoComplete="email" />
              <TextField label="Current password" value={f.pwEmail} onChange={on.pwEmail} type="password" autoComplete="current-password" />
              <button type="submit" disabled={v.acBusy === 'email'} style={{ ...formBtn(), opacity: v.acBusy === 'email' ? 0.6 : 1 }}>{v.acBusy === 'email' ? 'Sending…' : 'Change email'}</button>
            </form>
          ) : <span style={{ fontSize: 14, lineHeight: 1.5 }}>You sign in with Google as <b style={{ fontWeight: 600 }}>{v.acEmail}</b>. To use a different email, change it in your Google account.</span>}
        </SettingsSection>
        {v.acPw && <SettingsSection title="Password">
          <form onSubmit={v.changePassword} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <TextField label="Current password" value={f.pwOld} onChange={on.pwOld} type="password" autoComplete="current-password" />
            <TextField label="New password" value={f.pwNew} onChange={on.pwNew} type="password" placeholder="At least 6 characters" autoComplete="new-password" />
            <button type="submit" disabled={v.acBusy === 'password'} style={{ ...formBtn(), opacity: v.acBusy === 'password' ? 0.6 : 1 }}>{v.acBusy === 'password' ? 'Saving…' : 'Change password'}</button>
          </form>
        </SettingsSection>}
        <SettingsSection title="Appearance" note="Dark keeps your sketchbooks on paper, on a desk at night.">
          <div role="radiogroup" aria-label="Theme" style={{ display: 'flex', gap: 2, padding: 3, border: '1px solid rgba(var(--ink-rgb),.2)', alignSelf: 'flex-start' }}>
            {([['light', 'Light'], ['dark', 'Dark']] as const).map(([k, l]) => {
              const on = (k === 'dark') === v.isDark;
              return <button key={k} role="radio" aria-checked={on} onClick={() => v.setTheme(k)} style={{ height: 36, padding: '0 20px', border: 'none', borderRadius: 2, background: on ? INK : 'transparent', color: on ? PAPER : INK, font: `500 14px ${SANS}`, cursor: 'pointer' }}>{l}</button>;
            })}
          </div>
        </SettingsSection>
        <SettingsSection title="App" note="Install fletora to open it from your home screen or dock, full screen, like any other app.">
          {v.inInstalled ? <span style={{ fontSize: 14, color: MUTED }}>You’re using the installed app.</span>
            : v.inCanPrompt ? <button onClick={v.inInstall} style={formBtn()}>Install fletora</button>
            : v.inIOS ? <span style={{ fontSize: 14, lineHeight: 1.5, color: INK }}>In Safari, tap <b style={{ fontWeight: 600 }}>Share</b> (the square with an arrow), then <b style={{ fontWeight: 600 }}>Add to Home Screen</b>.</span>
            : <span style={{ fontSize: 14, lineHeight: 1.5, color: INK }}>Use your browser’s <b style={{ fontWeight: 600 }}>Install</b> option (in Chrome and Edge, the icon at the end of the address bar). On Android, open the browser menu and choose <b style={{ fontWeight: 600 }}>Install app</b>.</span>}
        </SettingsSection>
        <SettingsSection title="Weekly email" note="On Mondays: new pages from people you follow, and the likes, comments and followers your work got that week. Only sent when there’s something new.">
          <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={v.wkOn} onChange={v.wkToggle} style={{ width: 18, height: 18, accentColor: MARK }} />
            Send me the weekly email
          </label>
        </SettingsSection>
        <SettingsSection title="Mature work" note="Sketchbooks with drawn nudity are labelled Mature and kept out of Explore and other people’s profiles unless you choose to see them. 18 and over only.">
          <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={v.mtOn} onChange={v.mtToggle} style={{ width: 18, height: 18, accentColor: MARK }} />
            Show Mature sketchbooks
          </label>
        </SettingsSection>
        <SettingsSection title="Your data" note="What we store about you and how it’s used. Download a copy of everything we hold about your account at any time.">
          <button onClick={v.exportData} disabled={v.acBusy === 'export'} style={{ ...formBtn(), opacity: v.acBusy === 'export' ? 0.6 : 1 }}>{v.acBusy === 'export' ? 'Gathering…' : 'Download my data'}</button>
          {v.anOffered && (
            <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14, cursor: 'pointer' }}>
              <input type="checkbox" checked={v.anOn} onChange={v.anToggle} style={{ width: 18, height: 18, accentColor: MARK }} />
              Help improve fletora. with anonymous usage statistics
            </label>
          )}
        </SettingsSection>
        <SettingsSection title="Delete account" note={`Permanently deletes your profile, handle, follows and every sketchbook with all its pages.${v.acHasBilling ? ' A Plus subscription is cancelled straight away.' : ''} This can’t be undone.`}>
          <form onSubmit={v.deleteAccount} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <TextField label={`Type your handle (${v.acHandle}) to confirm`} value={f.delHandle} onChange={on.delHandle} placeholder={v.acHandle} />
            {v.acPw ? <TextField label="Password" value={f.pwDel} onChange={on.pwDel} type="password" autoComplete="current-password" />
              : <span style={{ fontSize: 13, color: MUTED }}>Google will ask you to confirm it’s you.</span>}
            <button type="submit" disabled={v.acBusy === 'delete'} className={hover(`background:${MARK};color:${PAPER}`)} style={{ ...formBtn(true), opacity: v.acBusy === 'delete' ? 0.6 : 1 }}>{v.acBusy === 'delete' ? 'Deleting…' : 'Delete my account'}</button>
          </form>
        </SettingsSection>
        <SiteFooter v={v} />
      </div>
    </div>
  );
}

/** Billing: Fletora Plus, its renewal and changing it, the card it's charged to, and receipts. */
export function BillingPage({ v }: { v: V }) {
  const mob = !v.notMob;
  const head = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <button onClick={v.openSettings} className={'tap ' + hoverText} style={{ alignSelf: 'flex-start', padding: 0, border: 'none', background: 'none', cursor: 'pointer', ...label(INK) }}>← Account settings</button>
      <h1 style={{ margin: 0, ...serif(mob ? 44 : 64, 1, '-.02em') }}>Billing</h1>
    </div>
  );
  if (!v.acPlus || !v.bdShow) return (
    <div style={screen()}><div style={{ ...pagePad(mob), display: 'flex', flexDirection: 'column', gap: 32, minHeight: '100%', paddingBottom: 20 }}>
      {head}
      <SettingsSection title="Plan" note={v.acGift ? 'A gift from Fletora. There’s nothing to pay and no card on file.' : v.acTrial ? 'A free trial. There’s nothing to pay and no card on file.' : undefined}>
        <span style={{ fontSize: 14, lineHeight: 1.5 }}>{v.acTrial ? v.acTrialLine : v.acGift ? v.acGiftLine : v.acPlan}</span>
        <button onClick={v.acTrial ? v.keepPlus : v.seePlus} style={formBtn()}>{v.acTrial ? 'Keep Plus' : v.acGift ? 'What’s included' : 'See Plus'}</button>
      </SettingsSection>
      <SiteFooter v={v} />
    </div></div>
  );
  return (
    <div style={screen()}>
      <div style={{ ...pagePad(mob), display: 'flex', flexDirection: 'column', gap: 32, minHeight: '100%', paddingBottom: 20 }}>
        {head}
        {!v.bdReady ? (v.bdErr ? (
          // Couldn't load the details: say what we know, and offer Stripe's page instead.
          <SettingsSection title="Plan">
            <span style={{ fontSize: 14, lineHeight: 1.5 }}>{v.acPlan}</span>
            <Notice err={v.bdErr} />
            <button onClick={v.manageBilling} disabled={v.acBusy === 'billing'} className={hoverLine} style={{ ...underlineBtn(14), alignSelf: 'flex-start' }}>{v.acBusy === 'billing' ? 'Opening…' : 'Manage on Stripe instead'}</button>
          </SettingsSection>
        ) : <span style={{ fontSize: 14, color: MUTED }}>Loading your plan…</span>) : (
          <>
            {(v.acErr || v.acInfo) && <Notice err={v.acErr} info={v.acInfo} />}
            <SettingsSection title="Plan" note={v.bdPlan}>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}><span style={serif(26, 1.1)}>Fletora Plus</span></span>
              <span style={{ fontSize: 14, lineHeight: 1.5, color: v.bdWarn ? MARK : INK }}>{v.bdNext}</span>
              <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 18px', fontSize: 14 }}>
                {v.bdDates.map((d: V) => <Fragment key={d.key}><dt style={{ color: MUTED }}>{d.label}</dt><dd style={{ margin: 0 }}>{d.value}</dd></Fragment>)}
              </dl>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                {v.bdCancelling
                  ? <button onClick={v.bdResume} disabled={v.bdBusy} style={formBtn()}>{v.bdBusy ? 'One moment…' : 'Keep Plus'}</button>
                  : <>
                      {v.bdCanSwitch && <button onClick={v.bdAskSwitch} style={formBtn()}>Switch to yearly · save 29%</button>}
                      <button onClick={v.bdAskCancel} className={hoverLine} style={{ ...underlineBtn(14), color: MARK, borderColor: MARK }}>Cancel Plus</button>
                    </>}
              </div>
            </SettingsSection>
            <SettingsSection title="Payment method" note="The card Plus is charged to.">
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontSize: 14 }}>{v.bdCardLbl}</span>{v.bdCardAdded && <span style={{ fontSize: 13, color: MUTED }}>{v.bdCardAdded}</span>}</span>
              <button onClick={v.bdCard} disabled={v.acBusy === 'card'} style={{ ...formBtn(), opacity: v.acBusy === 'card' ? 0.6 : 1 }}>{v.acBusy === 'card' ? 'Opening…' : 'Change card'}</button>
            </SettingsSection>
            <SettingsSection title="Payments" note="Each payment, the card it was charged to, and its receipt (sent by Stripe, who sell Plus on Fletora’s behalf).">
              {v.bdInvoices.length ? v.bdInvoices.map((i: V) => (
                <div key={i.key} style={{ display: 'grid', gridTemplateColumns: mob ? '1fr auto' : '1fr auto 1fr auto auto', gap: mob ? '2px 14px' : 14, alignItems: 'baseline', fontSize: 14, paddingBottom: 10, borderBottom: '1px solid rgba(var(--ink-rgb),.1)' }}>
                  <span>{i.date}</span><span>{i.amount}</span>
                  <span style={{ color: MUTED }}>{i.card}</span><span style={{ color: i.bad ? MARK : MUTED }}>{i.status}</span>
                  {i.url ? <a href={i.url} target="_blank" rel="noopener noreferrer" style={{ color: INK, ...(mob ? { gridColumn: '1 / -1' } : {}) }}>Receipt</a> : <span />}
                </div>
              )) : <span style={{ fontSize: 14, color: MUTED }}>No payments yet.</span>}
            </SettingsSection>
          </>
        )}
        <SiteFooter v={v} />
      </div>
    </div>
  );
}

function LegalLinks({ v, align = 'center' }: { v: V; align?: CSSProperties['justifyContent'] }) {
  return (
    <div style={{ display: 'flex', gap: 16, justifyContent: align, fontSize: 12, color: STONE }}>
      <button onClick={v.openPrivacy} className={'tap ' + hoverText} style={{ padding: 0, border: 'none', background: 'none', color: 'inherit', font: `500 12px ${SANS}`, cursor: 'pointer' }}>Privacy</button>
      <button onClick={v.openTerms} className={'tap ' + hoverText} style={{ padding: 0, border: 'none', background: 'none', color: 'inherit', font: `500 12px ${SANS}`, cursor: 'pointer' }}>Terms</button>
      <button onClick={v.openContact} className={'tap ' + hoverText} style={{ padding: 0, border: 'none', background: 'none', color: 'inherit', font: `500 12px ${SANS}`, cursor: 'pointer' }}>Contact</button>
    </div>
  );
}
