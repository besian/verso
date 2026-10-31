import { Fragment, memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { V } from '../App';
import ClosedBook from '../ClosedBook';
import { hover } from '../pseudo';
import { earClip } from '../wear';
import { MoreMenu } from './Overlays';
import { COMMENT_ICON } from './Comments';
import { Verified } from './Verified';
import type { Wear } from '../wear';
import { INK, MARK, PAGE_EDGES, PAPER, SANS, SERIF, STONE, label } from '../theme';

const navLink: CSSProperties = { border: 'none', background: 'none', padding: '4px 0', cursor: 'pointer', ...label() };
const textBtn: CSSProperties = { height: 34, padding: 0, border: 'none', background: 'none', cursor: 'pointer', whiteSpace: 'nowrap', ...label(INK) };
const roundDark = (size: number, fs: number): CSSProperties => ({ width: size, height: size, borderRadius: '50%', border: 'none', background: INK, color: PAPER, font: `500 ${fs}px ${SANS}`, cursor: 'pointer' });
const iconAct: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, minHeight: 28 };
const HEART = 'M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z';
const BOOKMARK = 'M6.5 4h11v16.5L12 16.8l-5.5 3.7z';
const SHARE = 'M12 3.5v11.5M7.8 7.7 12 3.5l4.2 4.2M5.5 12.5v7h13v-7';
/** A small line icon (filled when on), sized to sit with the uppercase action labels. */
function Icon({ d, fill }: { d: string; fill?: boolean }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
}
const actLink: CSSProperties = { padding: 0, border: 'none', background: 'none', font: 'inherit', letterSpacing: 'inherit', textTransform: 'inherit', color: INK, cursor: 'pointer' };
const arrowBtn: CSSProperties = { width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(var(--ink-rgb),.12)', color: INK, font: `500 16px ${SANS}`, cursor: 'pointer' };

// Zoomed in, the bars and title fade out. Their fade is written straight onto the elements marked data-fade by the
// stage (see useFades), so that during animation frames (v.$frame) they needn't render at all: see frameState in App.
// (A custom property on the stage did the same, but changing it restyled every element on the screen each frame.)
const skipOnFrame = (_: { v: V }, next: { v: V }) => !!next.v.$frame;

const TopBar = memo(function TopBar({ v }: { v: V }) {
  return (
    <div data-fade="ui" style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: `${v.mTop}px ${v.mPad}px 12px`, background: PAPER, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, zIndex: 5 }}>
      {/* Viewing someone's sketchbook: the way back sits just under the logo. */}
      {v.isOther && v.notMob && !v.embed && (
        <button onClick={v.goExplore} title="Back to Explore" aria-label="Back to Explore" className={hover(`color:${MARK};border-color:${MARK}`)} style={{ position: 'absolute', left: v.mPad, top: 'calc(100% + 6px)', width: 36, height: 36, padding: 0, borderRadius: '50%', border: '1px solid rgba(var(--ink-rgb),.25)', background: 'none', color: INK, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
        </button>
      )}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: v.mNavGap }}>
        <button onClick={v.goHome} title="Home" style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', font: `400 30px/1 ${SERIF}`, letterSpacing: '-.01em', color: INK }}>fletora<span style={{ color: MARK }}>.</span></button>
        {/* Phones, signed in: navigation lives in the tab bar at the bottom; signed out, in the ☰ menu. */}
        {!v.tabBar && !v.navCompact && <div style={{ display: 'flex', gap: v.mGap }}>
          <button onClick={v.goExplore} className={hover(`color:${MARK}`)} style={{ ...navLink, borderBottom: `1px solid ${v.navExLine}`, color: v.navExFg }}>Explore</button>
          {v.hasAcct && <button onClick={v.goMine} className={hover(`color:${MARK}`)} style={{ ...navLink, borderBottom: `1px solid ${v.navMineLine}`, color: v.navMineFg, whiteSpace: 'nowrap' }}>{v.navMineLbl}</button>}
          {v.promoPlus && <button onClick={v.openPlusPage} className={hover(`color:${MARK}`)} style={{ ...navLink, borderBottom: `1px solid ${v.navPlusLine}`, color: v.navPlusFg }}>Plus</button>}
        </div>}
      </div>
      {/* Phones with the tab bar: the bell (and + New on your sketchbooks) up here, so the bar keeps four tabs. */}
      {v.tabBar && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {v.isMine && <button onClick={v.tbNew} className={hover(`color:${MARK}`)} style={textBtn}>{v.newLbl}</button>}
        <Bell v={v} />
      </div>}
      {!v.tabBar && <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {v.guideHint && <button onClick={v.openGuide} className={hover(`color:${MARK}`)} style={{ ...textBtn, color: STONE }}>New here? Take a look</button>}
        {v.isMine && <button onClick={v.newBook} className={hover(`color:${MARK}`)} style={textBtn}>{v.newLbl}</button>}
        {v.ntShow && <MsgBtn v={v} />}
        {v.ntShow && <Bell v={v} />}
        {v.hasAcct && <button onClick={v.openMe} title="Your profile" className={hover('transform:scale(1.06)')} style={{ width: 34, height: 34, flexShrink: 0, borderRadius: '50%', border: '1px solid rgba(var(--ink-rgb),.22)', boxSizing: 'border-box', padding: 0, background: v.meAvBg, color: PAPER, font: `500 11px ${SANS}`, cursor: 'pointer', boxShadow: v.meRing }}>{v.meInit}</button>}
        {v.noAcct && (
          <>
            {!v.navCompact && <button onClick={v.openSignin} className={hover(`color:${MARK}`)} style={{ ...textBtn, padding: '0 6px 0 0' }}>Sign in</button>}
            <button onClick={v.openMe} className={hover(`background:${MARK}`)} style={{ ...textBtn, padding: '0 14px', borderRadius: 2, background: INK, color: PAPER }}>Join</button>
            {v.navCompact && <NavMenu v={v} />}
          </>
        )}
      </div>}
    </div>
  );
}, skipOnFrame);

/** Phones, signed out: Explore, Plus and Sign in behind one menu button, so the bar is just the logo and Join. */
function NavMenu({ v }: { v: V }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    addEventListener('pointerdown', close); addEventListener('scroll', close, true);
    return () => { removeEventListener('pointerdown', close); removeEventListener('scroll', close, true); };
  }, [open]);
  const item = (label: string, on: () => void, active = false) => (
    <button key={label} role="menuitem" onClick={() => { setOpen(false); on(); }} className={hover('background:rgba(var(--ink-rgb),.06)')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '14px 16px', border: 'none', background: 'none', color: active ? MARK : INK, font: `500 15px ${SANS}`, cursor: 'pointer' }}>{label}</button>
  );
  return (
    <span style={{ position: 'relative' }} onPointerDown={e => e.stopPropagation()}>
      <button onClick={() => setOpen(o => !o)} aria-label="Menu" aria-haspopup="menu" aria-expanded={open} style={{ width: 40, height: 40, marginRight: -8, padding: 0, border: 'none', background: 'none', color: INK, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">{open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}</svg>
      </button>
      {open && (
        <span role="menu" style={{ position: 'absolute', right: -8, top: 'calc(100% + 8px)', zIndex: 30, width: 220, padding: 6, background: PAPER, border: `1px solid ${INK}`, boxShadow: '0 14px 34px rgba(34,35,32,.16)' }}>
          {item('Explore', v.goExplore, v.navExFg === INK)}
          {v.promoPlus && item('Fletora Plus', v.openPlusPage, v.navPlusFg === INK)}
          {item('Feedback', v.openFeedback)}
          <span style={{ display: 'block', height: 1, margin: '4px 10px', background: 'rgba(var(--ink-rgb),.12)' }} />
          {item('Sign in', v.openSignin)}
        </span>
      )}
    </span>
  );
}

const TB_ICONS: Record<string, ReactNode> = {
  msgs: <path d="M4.5 5.5h15v10h-8l-4.5 3.5v-3.5h-2.5z" />,
  explore: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>,
  mine: <><path d="M6 3.5h11a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H6z" /><path d="M6 3.5v17M14.5 3.5v17" /></>,
};
/** Phones, signed in: Explore, your sketchbooks, a new one, notifications and your profile, within thumb reach. */
const TabBar = memo(function TabBar({ v }: { v: V }) {
  const item = (k: string, label: string, on: boolean, onClick: () => void, icon: ReactNode) => (
    <button key={k} onClick={onClick} aria-current={on ? 'page' : undefined} style={{ flex: 1, minWidth: 0, height: 56, padding: 0, border: 'none', background: 'none', color: on ? INK : STONE, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, cursor: 'pointer', font: `500 10px ${SANS}`, letterSpacing: '.06em', textTransform: 'uppercase' }}>
      {icon}<span>{label}</span>
    </button>
  );
  const svg = (k: string) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{TB_ICONS[k]}</svg>;
  return (
    <nav data-fade="ui" aria-label="Main" onClick={e => e.stopPropagation()} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 12, display: 'flex', alignItems: 'stretch', padding: '0 6px env(safe-area-inset-bottom)', background: PAPER, borderTop: '1px solid rgba(var(--ink-rgb),.14)' }}>
      {item('explore', 'Explore', v.tbOn === 'explore', v.goExplore, svg('explore'))}
      {item('mine', 'Yours', v.tbOn === 'mine', v.goMine, svg('mine'))}
      {item('msgs', 'Messages', !!v.isMessagesMode, v.ntOpenMsgs, <span style={{ position: 'relative', display: 'flex' }}>{svg('msgs')}
        {v.ntMsgs > 0 && <span style={{ position: 'absolute', top: -5, right: -9, minWidth: 16, height: 16, padding: '0 4px', boxSizing: 'border-box', borderRadius: 8, background: MARK, color: PAPER, font: `600 10px/16px ${SANS}`, textAlign: 'center' }}>{v.ntMsgs > 9 ? '9+' : v.ntMsgs}</span>}</span>)}
      {item('me', 'You', v.tbOn === 'me', v.openMe, <span style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid rgba(var(--ink-rgb),.22)', boxSizing: 'border-box', background: v.meAvBg, color: PAPER, font: `600 9px/24px ${SANS}`, textAlign: 'center', letterSpacing: 0, boxShadow: v.tbOn === 'me' ? `0 0 0 1.5px ${PAPER}, 0 0 0 3px ${INK}` : 'none' }}>{v.meInit}</span>)}
    </nav>
  );
}, skipOnFrame);

/** First few times on a touch screen: how to turn pages and zoom. */
const SwipeHint = memo(function SwipeHint({ v }: { v: V }) {
  // Zero-height wrapper: the hint floats above the controls, so showing or hiding it never moves the book.
  return <div style={{ position: 'relative', height: 0, width: '100%', zIndex: 2 }}><div data-fade="op" role="status" style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', padding: '7px 14px', borderRadius: 16, background: 'rgba(var(--ink-rgb),.08)', fontSize: 13, color: INK, pointerEvents: 'none' }}>Swipe to turn pages · pinch to zoom in</div></div>;
}, skipOnFrame);

/** Messages, next to the bell: opens your conversations, with a count of unread ones and requests. */
function MsgBtn({ v, sheet }: { v: V; sheet?: boolean }) {
  const on = v.isMessagesMode;
  return (
    <button onClick={v.ntOpenMsgs} title="Messages" aria-label={`Messages${v.ntMsgs ? `, ${v.ntMsgs} new` : ''}`} aria-current={on ? 'page' : undefined} className={hover(`color:${MARK}`)} style={{ position: 'relative', width: sheet ? 48 : 34, height: sheet ? 48 : 34, padding: 0, border: 'none', background: 'none', color: sheet && !on ? STONE : INK, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={sheet ? 22 : 19} height={sheet ? 22 : 19} viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4.5 5.5h15v10h-8l-4.5 3.5v-3.5h-2.5z" /></svg>
      {v.ntMsgs > 0 && <span style={{ position: 'absolute', top: 3, right: 2, minWidth: 16, height: 16, padding: '0 4px', boxSizing: 'border-box', borderRadius: 8, background: MARK, color: PAPER, font: `600 10px/16px ${SANS}`, textAlign: 'center' }}>{v.ntMsgs > 9 ? '9+' : v.ntMsgs}</span>}
    </button>
  );
}

/** Notification bell with unread count and a dropdown of recent likes, follows and goals. */
function Bell({ v, sheet }: { v: V; sheet?: boolean }) {
  return (
    <span style={{ position: sheet ? 'static' : 'relative', display: 'inline-flex' }} onClick={e => e.stopPropagation()}>
      <button onClick={v.ntToggle} title="Notifications" aria-label={`Notifications${v.ntUnread ? `, ${v.ntUnread} new` : ''}`} aria-expanded={v.ntOpen} className={hover(`color:${MARK}`)} style={{ position: 'relative', width: sheet ? 48 : 34, height: sheet ? 48 : 34, padding: 0, border: 'none', background: 'none', color: sheet && !v.ntOpen ? STONE : INK, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width={sheet ? 22 : 19} height={sheet ? 22 : 19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z" /><path d="M10 20.5a2.2 2.2 0 0 0 4 0" /></svg>
        {v.ntUnread > 0 && <span style={{ position: 'absolute', top: 3, right: 2, minWidth: 16, height: 16, padding: '0 4px', boxSizing: 'border-box', borderRadius: 8, background: MARK, color: PAPER, font: `600 10px/16px ${SANS}`, textAlign: 'center' }}>{v.ntUnread > 9 ? '9+' : v.ntUnread}</span>}
      </button>
      {v.ntOpen && (
        <div role="dialog" aria-label="Notifications" style={{ ...(sheet
          ? { position: 'absolute', left: 8, right: 8, bottom: 'calc(100% + 8px)', maxHeight: '65vh' } as CSSProperties
          : { position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 'min(340px, calc(100vw - 24px))', maxHeight: '60vh' } as CSSProperties), overflowY: 'auto', zIndex: 30, background: PAPER, border: `1px solid ${INK}`, boxShadow: '0 16px 40px rgba(34,35,32,.16)' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(var(--ink-rgb),.15)', ...label(INK) }}>Notifications</div>
          <button onClick={v.ntOpenMsgs} className={hover('background:rgba(var(--ink-rgb),.06)')} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 14px', border: 'none', borderBottom: '1px solid rgba(var(--ink-rgb),.15)', background: v.ntMsgs ? 'rgba(173,73,58,.06)' : 'none', color: INK, font: `500 14px ${SANS}`, textAlign: 'left', cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4.5 5.5h15v10h-8l-4.5 3.5v-3.5h-2.5z" /></svg>
            <span style={{ flex: 1 }}>Messages</span>
            <span style={{ fontSize: 12, color: v.ntMsgs ? MARK : 'rgba(var(--ink-rgb),.55)' }}>{v.ntMsgLbl} →</span>
          </button>
          {v.ntInvites.map((iv: V) => (
            <div key={iv.key} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px', borderBottom: '1px solid rgba(var(--ink-rgb),.08)', background: 'rgba(173,73,58,.06)', font: `400 14px/1.4 ${SANS}` }}>
              <span><b style={{ fontWeight: 600 }}>{iv.who}</b> invited you to draw in <i>{iv.book}</i></span>
              <span style={{ display: 'flex', gap: 8 }}>
                <button onClick={iv.accept} className={hover(`background:${MARK}`)} style={{ height: 30, padding: '0 14px', border: 'none', borderRadius: 2, background: INK, color: PAPER, font: `500 13px ${SANS}`, cursor: 'pointer' }}>Accept</button>
                <button onClick={iv.decline} className={hover('background:rgba(var(--ink-rgb),.08)')} style={{ height: 30, padding: '0 12px', border: '1px solid rgba(var(--ink-rgb),.3)', borderRadius: 2, background: 'none', color: INK, font: `500 13px ${SANS}`, cursor: 'pointer' }}>Decline</button>
              </span>
            </div>
          ))}
          {!v.ntItems.length && !v.ntInvites.length && <div style={{ padding: '18px 14px', fontSize: 14, color: 'rgba(var(--ink-rgb),.65)' }}>Nothing yet. Likes and new followers show up here.</div>}
          {v.ntItems.map((n: V) => (
            <button key={n.key} onClick={n.open} className={hover('background:rgba(var(--ink-rgb),.06)')} style={{ display: 'flex', gap: 10, width: '100%', textAlign: 'left', padding: '12px 14px', border: 'none', borderBottom: '1px solid rgba(var(--ink-rgb),.08)', background: n.unread ? 'rgba(173,73,58,.06)' : 'none', color: INK, font: `400 14px/1.4 ${SANS}`, cursor: 'pointer' }}>
              <span style={{ flexShrink: 0, width: 8, height: 8, marginTop: 6, borderRadius: '50%', background: n.unread ? MARK : 'transparent' }} />
              <span style={{ flex: 1, minWidth: 0 }}>{n.goal ? <b style={{ fontWeight: 600 }}>🎉 {n.text}</b> : <><b style={{ fontWeight: 600 }}>{n.who}</b> {n.text}</>}</span>
              <span style={{ flexShrink: 0, fontSize: 12, color: 'rgba(var(--ink-rgb),.55)' }}>{n.when}</span>
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

const Title = memo(function Title({ v }: { v: V }) {
  return (
    <div data-fade="ui" style={{ position: 'relative', marginTop: v.mTitleTop, maxWidth: '100%', boxSizing: 'border-box', padding: `0 ${v.mPad}px`, display: 'flex', alignItems: 'center', gap: v.mGap }}>
      {v.multi && <button onClick={v.prevBook} title="Previous sketchbook" style={{ ...arrowBtn, opacity: v.prevOp }}>‹</button>}
      <div data-fade="title" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', minWidth: 0 }}>
        <div style={{ fontSize: v.mTitleSize, fontFamily: SERIF, fontWeight: 400, letterSpacing: '-.01em', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.titleName}</div>
        <div style={label()}>
          {v.isOther && (v.bkArch || v.bkGuide)
            ? <>by {v.artist}{v.bkArch?.years ? ` · ${v.bkArch.years}` : ''} · {v.otherPages} pages</>
            : v.isOther
            ? <>by <button onClick={v.openArtist} title="View profile" className={'tap ' + hover(`color:${MARK};border-color:${MARK}`)} style={{ padding: 0, border: 'none', borderBottom: `1px solid ${INK}`, background: 'none', font: 'inherit', letterSpacing: 'inherit', textTransform: 'inherit', color: INK, cursor: 'pointer' }}>{v.artist}</button>{v.bkVerified && <Verified size={13} />} · {v.otherPages} pages{v.otherMature && ' · Mature'}{v.bkMediums && ` · ${v.bkMediums}`}</>
            : <>{v.bookMeta}{v.bkMediums && ` · ${v.bkMediums}`}</>}
        </div>
        {v.bkTags.length > 0 && (
          <div style={{ display: 'flex', gap: '2px 12px', flexWrap: 'wrap', justifyContent: 'center', fontSize: 13, color: 'rgba(var(--ink-rgb),.7)' }}>
            {v.bkTags.map((t: V) => <button key={t.key} onClick={t.open} className={'tap ' + hover(`color:${MARK}`)} style={{ padding: 0, border: 'none', background: 'none', color: INK, font: `500 13px ${SANS}`, cursor: 'pointer' }}>{t.label}</button>)}
          </div>
        )}
        {v.bkArch && (
          // From the archive: where the pages come from, and a few words about the sketchbook.
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, maxWidth: 520 }}>
            {v.bkArch.url ? <a href={v.bkArch.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: MARK, textDecoration: 'none' }}>{v.bkArch.source} ↗</a> : <span style={{ fontSize: 12, color: STONE }}>{v.bkArch.source}</span>}
            {v.notMob && v.bkArch.note && <span style={{ fontSize: 13, lineHeight: 1.45, color: 'rgba(var(--ink-rgb),.7)', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' } as CSSProperties}>{v.bkArch.note}</span>}
          </div>
        )}
        {(v.isOther || v.isMine) && (
          // Like, save and share as icons side by side; embed, report and the rest under ⋯.
          <div style={{ display: 'flex', gap: v.notMob ? 14 : 18, alignItems: 'center', marginTop: v.notMob ? 2 : 6, ...label(INK, v.notMob ? 10 : 11) }}>
            {(v.bkArch || v.bkGuide) && v.isOther ? null : v.isOther
              ? <button onClick={v.bkLike} aria-pressed={v.bkLiked} title={v.bkLiked ? 'Unlike' : 'Like'} aria-label={`${v.bkLiked ? 'Unlike' : 'Like'}, ${v.bkLikes} likes`} className={'tap ' + hover(`color:${MARK}`)} style={{ ...actLink, ...iconAct, color: v.bkLiked ? MARK : INK }}><Icon d={HEART} fill={v.bkLiked} />{v.bkLikes}</button>
              : <span title="Likes" style={iconAct}><Icon d={HEART} />{v.bkLikes}</span>}
            {v.isOther && !v.bkGuide && <button onClick={v.bkSave} aria-pressed={v.bkSaved} title={v.bkSaved ? 'Saved' : 'Save'} aria-label={v.bkSaved ? 'Saved' : 'Save'} className={'tap ' + hover(`color:${MARK}`)} style={{ ...actLink, ...iconAct, color: v.bkSaved ? MARK : INK }}><Icon d={BOOKMARK} fill={v.bkSaved} /></button>}
            {v.cmOn && <button onClick={v.cmToggle} title="Comments" aria-label={`Comments, ${v.cmCount}`} aria-pressed={v.cmOpen} className={'tap ' + hover(`color:${MARK}`)} style={{ ...actLink, ...iconAct, color: v.cmOpen ? MARK : INK }}><Icon d={COMMENT_ICON} fill={v.cmOpen} />{v.cmCount}</button>}
            {v.rpAt != null && (
              // A labelled pill, so it reads as "this page can be watched being drawn", not just another icon.
              <button onClick={v.rpOpen} title={v.rpLbl} aria-label={v.rpLbl} className={'tap ' + hover(`background:${MARK};color:${PAPER}`)}
                style={{ ...actLink, ...iconAct, gap: 5, height: 26, padding: '0 11px 0 8px', border: `1px solid ${MARK}`, borderRadius: 13, color: MARK, transition: 'background .15s, color .15s' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 3.5v17l15-8.5z" /></svg>Replay
              </button>
            )}
            {((v.isOther && !v.bkGuide) || v.bkCanShare) && <button onClick={v.bkShare} title="Share" aria-label="Share" className={'tap ' + hover(`color:${MARK}`)} style={{ ...actLink, ...iconAct }}><Icon d={SHARE} /></button>}
            <MoreMenu open={v.bkMoreOpen} onToggle={v.bkMore} items={[
              ...(v.bkArch?.url ? [{ label: `View at the source ↗`, onClick: () => window.open(v.bkArch.url, '_blank', 'noopener') }] : []),
              ...(v.cmOn ? [{ label: 'Share page as a picture', onClick: v.bkShareImage }] : []),
              ...(v.cmOn && v.bkCanVideo ? [{ label: 'Make a timelapse video', onClick: v.bkTimelapse }] : []),
              ...((v.isOther && !v.bkGuide) || v.bkCanShare ? [{ label: 'Embed on a website', onClick: v.bkEmbed }] : []),
              { label: v.sndOn ? 'Turn page sounds off' : 'Turn page sounds on', onClick: v.toggleSound },
              ...(v.bkIsAdmin && !v.bkGuide ? [{ label: v.bkArchLbl, onClick: v.bkArchEdit }] : []),
              ...(v.isOther && !v.bkGuide ? [...(v.bkIsAdmin ? [{ label: v.bkPickLbl, onClick: v.bkPick }] : []), ...(v.bkArch ? [] : [{ label: 'Report sketchbook', onClick: v.bkReport }, { label: v.bkBlockLbl, onClick: v.bkBlock, danger: true }])] : [])]} />
          </div>
        )}
      </div>
      {v.multi && <button onClick={v.nextBook} title="Next sketchbook" style={{ ...arrowBtn, opacity: v.nextOp }}>›</button>}
    </div>
  );
}, skipOnFrame);

/** Inside an embed: the sketchbook's name and artist, linking back to fletora. */
const EmbedTitle = memo(function EmbedTitle({ v }: { v: V }) {
  return (
    <div data-fade="ui" style={{ marginTop: 14, padding: '0 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textAlign: 'center', maxWidth: '100%', boxSizing: 'border-box' }}>
      <div style={{ ...{ font: `400 ${v.notMob ? 30 : 24}px/1.1 ${SERIF}` }, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.titleName}</div>
      <a href={v.embedHref} target="_blank" rel="noopener" style={{ ...label(INK, 10), textDecoration: 'none' }}>by {v.artist} · open on fletora<span style={{ color: MARK }}>.</span> ↗</a>
    </div>
  );
}, skipOnFrame);

function Carousel({ v }: { v: V }) {
  return (
    <div style={{ position: 'absolute', left: '50%', top: '50%', width: 0, height: 0, transformStyle: 'preserve-3d', transform: v.sbBase, opacity: v.uiOp, pointerEvents: v.uiPE }}>
      {v.sideBooks.map((sb: V) => (
        <div key={sb.key} onPointerDown={sb.stop} onClick={sb.open} style={{ position: 'absolute', left: 0, top: sb.top, width: sb.w, height: sb.h, transform: sb.transform, opacity: sb.opacity, cursor: 'pointer' }}>
          <ClosedBook bg={sb.bg} board={sb.board} hasBand={sb.hasBand} boardShadow={sb.shadow} band={8}
            label={sb.showLabel ? sb.name : null} labelStyle={{ padding: '10px 12px', fontSize: 'clamp(10px, 8cqw, 15px)' }} />
          <div style={{ position: 'absolute', top: 'calc(100% + 18px)', left: 0, right: 0, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 2, opacity: sb.labelOp }}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{sb.name}</div>
            <div style={{ fontSize: 14, color: 'rgba(var(--ink-rgb),.7)' }}>{sb.count}</div>
          </div>
        </div>
      ))}
      {v.showGhost && (
        <div onPointerDown={v.stopPD} onClick={v.newBook} className={hover('border-color:rgba(var(--ink-rgb),.7)')} style={{ position: 'absolute', left: 0, top: v.ghostTop, width: v.ghostW, height: v.ghostH, transform: v.ghostT, border: '2px dashed rgba(var(--ink-rgb),.35)', borderRadius: '4px 12px 12px 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 500, color: 'rgba(var(--ink-rgb),.75)', cursor: 'pointer', boxSizing: 'border-box' }}>+ New sketchbook</div>
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
  // Multiply blending costs a lot to composite in 3D on phones; plain blending looks nearly the same for these faint tints.
  return overlay ? <div style={{ ...fill, background: overlay, mixBlendMode: TOUCH ? undefined : 'multiply', pointerEvents: 'none' }} /> : null;
}

const leafNum: CSSProperties = { position: 'absolute', bottom: 12, fontSize: 11, color: 'rgba(40,40,60,.45)' };

/** Caption and date written along the bottom margin, on a scrap of paper so it reads over drawings. */
function PageNote({ text, fs, side }: { text: string; fs: number; side: 'L' | 'R' }) {
  if (!text) return null;
  return (
    <div style={{ position: 'absolute', bottom: Math.round(fs * 0.8), [side === 'R' ? 'left' : 'right']: Math.round(fs * 1.4), maxWidth: '68%', padding: `${Math.round(fs * 0.2)}px ${Math.round(fs * 0.5)}px`, background: 'rgba(246,242,233,.9)', boxShadow: '0 1px 2px rgba(40,30,20,.18)', transform: `rotate(${side === 'R' ? -0.8 : 0.8}deg)`, font: `italic 400 ${fs}px/1.25 ${SERIF}`, color: '#3a3830', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', pointerEvents: 'none' }}>{text}</div>
  );
}
const fill: CSSProperties = { position: 'absolute', inset: 0 };

function FrontFace({ leaf, onClick, style }: { leaf: V; onClick?: () => void; style?: CSSProperties }) {
  return (
    <div onClick={onClick} style={{ ...fill, backfaceVisibility: 'hidden', borderRadius: '2px 10px 10px 2px', overflow: 'hidden', background: leaf.frontBg, boxShadow: 'inset 6px 0 10px -6px rgba(0,0,0,.35)', clipPath: earClip(leaf.wearF?.ear), ...style }}>
      <PageWear overlay={leaf.overlayF} />
      <DogEar ear={leaf.wearF?.ear} />
      {leaf.isCoverAny && leaf.hasBand && <div style={{ position: 'absolute', right: '13%', top: 0, bottom: 0, width: 8, background: '#1d1d26', boxShadow: '-2px 0 3px rgba(0,0,0,.25),2px 0 3px rgba(0,0,0,.25)', pointerEvents: 'none' }} />}
      {leaf.isCover && <div className="cover-label" style={{ position: 'absolute', left: '16%', right: '26%', top: '14%', padding: '10px 12px', background: '#f6f2e9', borderRadius: 2, boxShadow: '0 1px 2px rgba(0,0,0,.2)', color: '#222320', fontSize: 15, fontWeight: 600, letterSpacing: '-.01em', pointerEvents: 'none' }}>{leaf.label}</div>}
      <PageNote text={leaf.noteF} fs={leaf.noteFs} side="R" />
      <div style={{ ...fill, background: '#000', opacity: leaf.shadeF, pointerEvents: 'none', willChange: 'opacity' }} />
      <div style={{ ...leafNum, right: 14 }}>{leaf.numF}</div>
    </div>
  );
}

function BackFace({ leaf, onClick, style }: { leaf: V; onClick?: () => void; style?: CSSProperties }) {
  return (
    <div onClick={onClick} style={{ ...fill, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', borderRadius: '10px 2px 2px 10px', overflow: 'hidden', background: leaf.backBg, boxShadow: 'inset -6px 0 10px -6px rgba(0,0,0,.35)', clipPath: earClip(leaf.wearB?.ear), ...style }}>
      <PageWear overlay={leaf.overlayB} />
      <DogEar ear={leaf.wearB?.ear} />
      {leaf.isBackCover && leaf.hasBand && <div style={{ position: 'absolute', left: '13%', top: 0, bottom: 0, width: 8, background: '#1d1d26', boxShadow: '-2px 0 3px rgba(0,0,0,.25),2px 0 3px rgba(0,0,0,.25)', pointerEvents: 'none' }} />}
      <PageNote text={leaf.noteB} fs={leaf.noteFs} side="L" />
      <div style={{ ...fill, background: '#000', opacity: leaf.shadeB, pointerEvents: 'none', willChange: 'opacity' }} />
      <div style={{ ...leafNum, left: 14 }}>{leaf.numB}</div>
    </div>
  );
}

// Phones get half the strips: each strip is another pair of layers to draw.
const TOUCH = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
const CURL_SEGS = TOUCH ? 4 : 12;
/**
 * A leaf mid-turn, bent like paper: split into vertical strips, each rotated a little more than
 * the one before it (nested, so the bends add up toward the outer edge). Each strip shows its
 * slice of the front and back, with a soft shadow that deepens along the curl.
 */
function CurledLeaf({ leaf, W, H }: { leaf: V; W: number; H: number }) {
  // Bend grows toward the outer edge (strip k turns by k/Σk of the total), so the curve is flat at the spine.
  const n = CURL_SEGS, s = W / n, step = leaf.curl * 2 / (n * (n - 1));
  // Covers keep their full faces (label, elastic band). Inner pages draw each strip as one image layer (photo and
  // wear in a single background) plus one shade layer: the full faces' half-dozen layers per strip were the
  // biggest cost of turning a page on phones.
  const full = leaf.isCoverAny || leaf.isBackCover;
  const side = (back: boolean, k: number) => {
    const shade = Math.min(0.6, +(back ? leaf.shadeB : leaf.shadeF) + leaf.curlAmt * (back ? 0.16 : 0.22) * (k / n) ** 2);
    const left = back ? -(W - (k + 1) * s) : -k * s;
    return (
      <div style={{ ...fill, overflow: 'hidden', backfaceVisibility: 'hidden', transform: back ? 'rotateY(180deg)' : undefined }}>
        {full
          ? <div style={{ position: 'absolute', top: 0, left, width: W, height: H }}>{back ? <BackFace leaf={leaf} style={{ transform: 'none', backfaceVisibility: 'visible' }} /> : <FrontFace leaf={leaf} style={{ backfaceVisibility: 'visible' }} />}</div>
          : <div style={{ position: 'absolute', top: 0, left, width: W, height: H, borderRadius: back ? '10px 2px 2px 10px' : '2px 10px 10px 2px', background: (back ? leaf.overlayB : leaf.overlayF) ? `${back ? leaf.overlayB : leaf.overlayF},${back ? leaf.backBg : leaf.frontBg}` : back ? leaf.backBg : leaf.frontBg }} />}
        <div style={{ ...fill, background: '#1e1810', opacity: full ? +(leaf.curlAmt * (back ? 0.16 : 0.22) * (k / n) ** 2).toFixed(3) : +shade.toFixed(3), pointerEvents: 'none', willChange: 'opacity' }} />
      </div>
    );
  };
  const seg = (k: number): ReactNode => (
    <div style={{ position: 'absolute', left: k ? s : 0, top: 0, width: s + 1.25, height: H, transformOrigin: '0 50%', transformStyle: 'preserve-3d', transform: k ? `rotateY(${(step * k).toFixed(3)}deg)` : undefined }}>
      {side(false, k)}
      {side(true, k)}
      {k < n - 1 && seg(k + 1)}
    </div>
  );
  return <>{seg(0)}</>;
}

/** A leaf's faces (and curl strips). Most frames of a turn only rotate leaves, so the faces render again only when
 *  something drawn on them changes: their click handlers read live state, so an older copy of them is fine. */
const LeafFaces = memo(function LeafFaces({ leaf, W, H }: { leaf: V; W: number; H: number }) {
  return (
    <>
      {/* Curl strips stay built for the leaves that may turn next and are only shown mid-turn (building them on the
          first frame of a turn made it hitch); the flat faces show the rest of the time. */}
      {(leaf.curlable || leaf.curl) && <div style={{ ...fill, transformStyle: 'preserve-3d', visibility: leaf.curl ? 'visible' : 'hidden' }}><CurledLeaf leaf={leaf} W={W} H={H} /></div>}
      <FrontFace leaf={leaf} onClick={leaf.openFront} style={leaf.curl ? HIDDEN : undefined} />
      <BackFace leaf={leaf} onClick={leaf.openBack} style={leaf.curl ? HIDDEN : undefined} />
    </>
  );
}, (a, b) => a.W === b.W && a.H === b.H && Object.keys(b.leaf).every(k => k === 'transform' || typeof b.leaf[k] === 'function' || a.leaf[k] === b.leaf[k]));
const HIDDEN: CSSProperties = { visibility: 'hidden' };

function Book3D({ v }: { v: V }) {
  return (
    <div style={{ position: 'relative', width: 0, height: v.H, transformStyle: 'preserve-3d', transform: v.bookTransform, opacity: v.bookOp, willChange: 'transform' }}>
      <div style={{ position: 'absolute', left: v.shadowLeft, top: 0, width: v.shadowW, height: v.H, transform: 'translateZ(-2px) translateY(26px) scale(1.12)', background: 'radial-gradient(closest-side, rgba(var(--ink-rgb),.17), rgba(var(--ink-rgb),.08) 60%, transparent)', opacity: v.openShadowOp }} />
      <div style={{ position: 'absolute', left: v.bodyLeft, top: 0, width: v.W, height: v.H, transform: 'translateZ(-1px)', opacity: v.bodyOp, pointerEvents: 'none' }}>
        <div style={{ ...fill, transform: v.bodyBack ? 'translate(-7px,6px)' : 'translate(7px,6px)', borderRadius: v.bodyBack ? '11px 3px 3px 11px' : '3px 11px 11px 3px', background: v.boardColor, filter: 'brightness(.6)', boxShadow: '0 24px 40px rgba(34,35,32,.16)' }} />
        <div style={{ position: 'absolute', top: 3, bottom: -3, left: v.bodyBack ? -4 : 4, right: v.bodyBack ? 4 : -4, borderRadius: v.bodyBack ? '9px 2px 2px 9px' : '2px 9px 9px 2px', background: PAGE_EDGES }} />
      </div>
      {v.leaves.map((leaf: V) => (
        <div key={leaf.key} style={{ position: 'absolute', left: 0, top: 0, width: v.W, height: v.H, transformOrigin: '0 50%', transformStyle: 'preserve-3d', transform: leaf.transform, willChange: 'transform' }}>
          <LeafFaces leaf={leaf} W={v.W} H={v.H} />
        </div>
      ))}
    </div>
  );
}

const Controls = memo(function Controls({ v }: { v: V }) {
  // One thing at a time. Open: your Pages button (on larger screens, zoom out and in either side of it; on phones
  // tapping a page zooms in). Zoomed in: the way back out, and the comments, as the title row is hidden then.
  const z = v.inFocus, comments = z && v.cmOn;
  return (
    <div style={{ position: 'relative', zIndex: 2, display: 'flex', gap: 12, minHeight: 44, marginBottom: `calc(${v.mBottom}px + env(safe-area-inset-bottom))`, flexShrink: 0, padding: 6, opacity: v.ctrlOp, transform: `translateY(${v.ctrlY}px)`, pointerEvents: v.ctrlPE, transition: 'opacity .35s,transform .35s cubic-bezier(.2,.8,.2,1)' }}>
      {(z || v.notMob) && <button onClick={v.zoomOut} title={z ? 'Zoom out' : 'Smaller'} aria-label="Zoom out" className={hover('transform:scale(1.08)')} style={roundDark(44, 22)}>−</button>}
      {!z && v.notOther && <button onClick={v.openManager} title="Pages" aria-label="Pages" className={hover('transform:scale(1.06)')} style={{ width: 88, height: 44, borderRadius: 22, border: 'none', background: MARK, color: PAPER, font: `500 20px ${SANS}`, cursor: 'pointer' }}>✎</button>}
      {!z && v.notMob && <button onClick={v.zoomIn} title="Zoom in" aria-label="Zoom in" className={hover('transform:scale(1.08)')} style={roundDark(44, 22)}>+</button>}
      {comments && <button onClick={v.cmToggle} title="Comments" aria-label={`Comments, ${v.cmCount}`} aria-pressed={v.cmOpen} className={hover('transform:scale(1.08)')} style={{ ...roundDark(44, 14), position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: v.cmOpen ? MARK : INK }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={COMMENT_ICON} /></svg>
        {v.cmCount > 0 && <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, padding: '0 5px', boxSizing: 'border-box', borderRadius: 9, background: MARK, color: PAPER, font: `600 10px/18px ${SANS}`, boxShadow: `0 0 0 2px ${PAPER}` }}>{v.cmCount > 99 ? '99+' : v.cmCount}</span>}
      </button>}
    </div>
  );
}, skipOnFrame);

const kbd: CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 22, height: 22, padding: '0 5px', boxSizing: 'border-box', border: '1px solid rgba(var(--ink-rgb),.28)', borderBottomWidth: 2, borderRadius: 4, background: 'rgba(var(--paper-rgb),.85)', color: INK, font: `500 13px/1 ${SANS}`, letterSpacing: 0 };

/** Quiet key reference in the corner of the book view; compact labels on mid-size windows so it clears the controls. */
const KeyGuide = memo(function KeyGuide({ v }: { v: V }) {
  const full = v.vw >= 1000;
  const rows: [string[], string, string][] = [[['←', '→'], 'Turn pages', 'Turn'], [['↑'], 'Open · zoom in', 'Open · zoom'], [['↓'], 'Zoom out · close', 'Zoom out · close']];
  if (v.multi) rows.push([['⇧', '←', '→'], 'Switch sketchbook', 'Switch book']);
  return (
    <div data-fade="op" aria-label="Keyboard shortcuts" style={{ position: 'absolute', left: full ? 24 : 16, bottom: full ? 24 : 18, zIndex: 2, display: 'grid', gridTemplateColumns: 'auto auto', columnGap: full ? 14 : 10, rowGap: full ? 7 : 5, alignItems: 'center', pointerEvents: 'none', ...label(STONE, full ? 10 : 9) }}>
      {rows.map(([keys, long, short]) => (
        <Fragment key={long}>
          <span style={{ display: 'flex', gap: 3 }}>{keys.map(k => <span key={k} style={full ? kbd : { ...kbd, minWidth: 18, height: 18, fontSize: 11 }}>{k}</span>)}</span>
          <span style={{ whiteSpace: 'nowrap' }}>{full ? long : short}</span>
        </Fragment>
      ))}
    </div>
  );
}, skipOnFrame);

/** App shell: focus backdrop, top bar, book title, the 3D stage and its controls. Screens and overlays render as children above it. */
export default function Stage({ v, children }: { v: V; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  // Every render, so anything just shown starts at the right fade.
  useLayoutEffect(() => {
    root.current?.querySelectorAll<HTMLElement>('[data-fade]').forEach(el => {
      const k = el.dataset.fade, op = String(k === 'title' ? v.titleOp : v.uiOp);
      if (el.style.opacity !== op) el.style.opacity = op;
      if (k === 'ui' && el.style.pointerEvents !== v.uiPE) el.style.pointerEvents = v.uiPE;
    });
  });
  return (
    <div ref={root} onDragOver={v.onDragOver} onDrop={v.onDrop} onMouseMove={v.wake} onPointerDown={v.wake} onClick={v.closeMore} style={{ ['--tabbar' as string]: v.tabBar ? 'calc(57px + env(safe-area-inset-bottom))' : '0px', position: 'fixed', inset: 0, boxSizing: 'border-box', paddingRight: v.cmSide ? 380 : 0, background: PAPER, color: INK, fontFamily: SANS, display: 'flex', flexDirection: 'column', alignItems: 'center', userSelect: 'none' }}>
      {/* Focus backdrop, only while zoomed: a tiny pre-blurred copy of the page stretched across the screen.
          (A CSS blur on a screen-sized layer had to be recomputed every frame and made zooming stutter.) */}
      {+v.fz > 0.001 && (
        <div style={{ ...fill, overflow: 'hidden', pointerEvents: 'none', opacity: v.fz, willChange: 'opacity' }}>
          <div ref={v.bgRefA} style={{ position: 'absolute', inset: '-25%', background: v.focusBg, willChange: 'transform' }} />
          <div style={{ ...fill, background: 'rgba(var(--paper-rgb),.74)' }} />
        </div>
      )}
      {!v.embed && <TopBar v={v} />}
      {v.embed ? <EmbedTitle v={v} /> : <Title v={v} />}
      <div ref={v.stageRef} onPointerDown={v.onDown} onPointerMove={v.onMove} onPointerUp={v.onUp} onPointerCancel={v.onUp} onWheel={v.onWheel} style={{ position: 'relative', flex: 1, minHeight: 0, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', perspective: 2200, cursor: 'grab', touchAction: 'none' }}>
        <Carousel v={v} />
        <Book3D v={v} />
      </div>
      <div style={{ marginBottom: 14, fontSize: 13, color: 'rgba(var(--ink-rgb),.75)', opacity: v.emptyOp, transition: 'opacity .3s', pointerEvents: 'none' }}>{v.isTouch ? 'Tap ✎ to add your drawings' : 'Open pages to add your drawings, or drop images here'}</div>
      {v.swipeHint && <SwipeHint v={v} />}
      <Controls v={v} />
      <div style={{ height: 'var(--tabbar)', flexShrink: 0 }} />
      {v.notMob && (v.isMine || v.isOther) && !v.embed && <KeyGuide v={v} />}
      {v.showHandle && <button onClick={v.toggleMenu} className={hover('background:rgba(var(--paper-rgb),.95)')} style={{ position: 'absolute', right: 24, bottom: 24, zIndex: 3, height: 34, padding: '0 14px', borderRadius: 2, border: 'none', background: 'rgba(var(--paper-rgb),.75)', color: INK, font: `500 13px ${SANS}`, cursor: 'pointer' }}>{v.handleLbl}</button>}
      {v.showRail && (
        <div style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', zIndex: 3, display: 'flex', flexDirection: 'column', gap: 10, padding: 6, borderRadius: 2, background: 'rgba(var(--paper-rgb),.7)', opacity: v.railOp }}>
          <button onClick={v.zoomOut} title="Exit focus" style={roundDark(40, 20)}>−</button>
          <button onClick={v.openManager} title="Pages" style={roundDark(40, 15)}>▦</button>
        </div>
      )}
      {children}
      {v.tabBar && <TabBar v={v} />}
    </div>
  );
}
