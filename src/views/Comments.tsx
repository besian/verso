import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { V } from '../App';
import { focus, hover } from '../pseudo';
import { INK, MARK, MUTED, PAPER, SANS, SERIF, STONE, label } from '../theme';

const linkBtn = (color: string): CSSProperties => ({ padding: 0, border: 'none', background: 'none', color, font: `500 12px ${SANS}`, cursor: 'pointer' });
const chip = (on: boolean): CSSProperties => ({ height: 30, padding: '0 12px', borderRadius: 15, border: `1px solid ${on ? INK : 'rgba(var(--ink-rgb),.2)'}`, background: on ? INK : 'transparent', color: on ? PAPER : INK, font: `500 12.5px ${SANS}`, cursor: 'pointer', whiteSpace: 'nowrap' });

export const COMMENT_ICON = 'M4.5 5.5h15v10h-8l-4.5 3.5v-3.5h-2.5z';

/**
 * Comments on the pages on show (or, switched over, on every page): a panel down the right on larger screens, a sheet
 * from the bottom on phones. It follows the book as pages are turned. Signed-in people can post on the page on show
 * (or pick one of the two); authors, the book's owner and moderators can delete; anyone else can report one.
 */
export function CommentsPanel({ v }: { v: V }) {
  const mob = !v.notMob, end = useRef<HTMLDivElement>(null);
  // New comments arrive at the bottom: keep them in view.
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [v.cmList.length]);
  const panel: CSSProperties = mob
    ? { position: 'absolute', left: 0, right: 0, bottom: 0, height: '62%', borderRadius: '14px 14px 0 0', borderTop: '1px solid rgba(var(--ink-rgb),.15)', boxShadow: '0 -16px 40px rgba(20,20,30,.18)' }
    // Below the top bar, so the bell and your profile stay in reach; zoomed in (the bar is hidden), full height.
    : { position: 'absolute', top: v.inFocus ? 0 : 68, right: 0, bottom: 0, width: 380, borderLeft: '1px solid rgba(var(--ink-rgb),.15)', borderTop: v.inFocus ? 'none' : '1px solid rgba(var(--ink-rgb),.15)', boxShadow: '-16px 0 40px rgba(20,20,30,.1)', transition: 'top .3s cubic-bezier(.2,.8,.2,1)' };
  return (
    <aside aria-label="Comments" onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()} style={{ ...panel, zIndex: 14, background: PAPER, display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      <div style={{ padding: mob ? '14px 16px 10px' : '22px 22px 12px', display: 'flex', flexDirection: 'column', gap: 10, borderBottom: '1px solid rgba(var(--ink-rgb),.12)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
          <h2 style={{ margin: 0, font: `400 ${mob ? 26 : 30}px/1 ${SERIF}`, letterSpacing: '-.01em' }}>Comments</h2>
          <button onClick={v.cmClose} aria-label="Close comments" className={hover(`color:${MARK}`)} style={{ ...linkBtn(INK), fontSize: 22, lineHeight: 1 }}>×</button>
        </div>
        <div role="radiogroup" aria-label="Which comments" style={{ display: 'flex', gap: 6 }}>
          <button role="radio" aria-checked={!v.cmAll} onClick={() => v.cmShowAll(false)} style={chip(!v.cmAll)}>On {v.cmWhere}{v.cmHere ? ` · ${v.cmHere}` : ''}</button>
          <button role="radio" aria-checked={v.cmAll} onClick={() => v.cmShowAll(true)} style={chip(v.cmAll)}>All pages · {v.cmCount}</button>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: mob ? '6px 16px' : '8px 22px' }}>
        {!v.cmList.length && (
          <div style={{ padding: '28px 0', textAlign: 'center', color: MUTED, fontSize: 14, lineHeight: 1.5 }}>
            <div style={{ font: `italic 400 22px/1.2 ${SERIF}`, color: INK, marginBottom: 6 }}>No comments yet</div>
            {v.cmAll ? 'Be the first to say something about these pages.' : `Be the first to say something about ${v.cmWhere}.`}
          </div>
        )}
        {v.cmList.map((c: V) => <CommentRow key={c.key} c={c} />)}
        <div ref={end} />
      </div>
      <div style={{ padding: mob ? '10px 16px calc(12px + env(safe-area-inset-bottom))' : '14px 22px 22px', borderTop: '1px solid rgba(var(--ink-rgb),.12)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {!v.cmSignedIn ? (
          <button onClick={v.cmSignin} className={hover(`background:${MARK}`)} style={{ height: 44, border: 'none', borderRadius: 2, background: INK, color: PAPER, font: `500 14px ${SANS}`, cursor: 'pointer' }}>Sign in to comment</button>
        ) : !v.cmCanPost ? (
          <span style={{ fontSize: 13, color: MUTED }}>Turn to a page to comment on it.</span>
        ) : (
          <>
            {v.cmReplying && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: MUTED }}>
                <span>Replying to <b style={{ color: INK, fontWeight: 600 }}>{v.cmReplying.name}</b></span>
                <button onClick={v.cmReplying.cancel} aria-label="Stop replying" className={hover(`color:${MARK}`)} style={{ ...linkBtn(STONE), fontSize: 16, lineHeight: 1 }}>×</button>
              </div>
            )}
            {v.cmSuggest.length > 0 && (
              // @mention suggestions for what's being typed.
              <div role="listbox" aria-label="Mention someone" style={{ display: 'flex', flexDirection: 'column', border: '1px solid rgba(var(--ink-rgb),.15)', borderRadius: 4, overflow: 'hidden' }}>
                {v.cmSuggest.map((p: V) => (
                  <button key={p.key} role="option" aria-selected={false} onMouseDown={e => e.preventDefault()} onClick={p.pick} className={hover('background:rgba(var(--ink-rgb),.06)')} style={{ display: 'flex', gap: 8, alignItems: 'baseline', padding: '8px 10px', border: 'none', background: 'none', color: INK, textAlign: 'left', cursor: 'pointer', font: `500 13px ${SANS}` }}>
                    {p.label}<span style={{ color: STONE, fontWeight: 400 }}>{p.handle}</span>
                  </button>
                ))}
              </div>
            )}
            {!v.cmReplying && v.cmTargets.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: MUTED }}>
                <span style={{ marginRight: 2 }}>On</span>
                {v.cmTargets.map((t: V) => <button key={t.key} onClick={t.pick} aria-pressed={t.on} style={{ ...chip(t.on), height: 26, padding: '0 10px', fontSize: 12 }}>{t.label}</button>)}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <textarea value={v.cmDraft} onChange={v.onCmDraft} onKeyDown={v.cmKey} rows={mob ? 1 : 2} placeholder={v.cmReplying ? `Reply to ${v.cmReplying.name}… (@ to mention)` : `Say something about ${v.cmTargetLbl}… (@ to mention)`} aria-label="Your comment"
                className={focus(`border-color:${INK}`)} style={{ flex: 1, minWidth: 0, resize: 'none', padding: '10px 12px', border: '1.5px solid rgba(var(--ink-rgb),.18)', borderRadius: 2, background: 'rgba(var(--ink-rgb),.04)', color: INK, font: `400 14.5px/1.45 ${SANS}`, outline: 'none', boxSizing: 'border-box', maxHeight: 140 }} />
              <button onClick={v.cmPost} disabled={!v.cmDraft.trim() || v.cmBusy} className={v.cmDraft.trim() ? hover(`background:${MARK}`) : undefined} style={{ height: 42, padding: '0 16px', border: 'none', borderRadius: 2, background: v.cmDraft.trim() ? INK : 'rgba(var(--ink-rgb),.15)', color: v.cmDraft.trim() ? PAPER : 'rgba(var(--ink-rgb),.5)', font: `500 14px ${SANS}`, cursor: v.cmDraft.trim() ? 'pointer' : 'default', flexShrink: 0 }}>{v.cmBusy ? '…' : 'Post'}</button>
            </div>
            {v.cmErr ? <span role="alert" style={{ fontSize: 12, color: MARK }}>{v.cmErr}</span> : v.cmLeft < 80 && <span style={{ fontSize: 12, color: STONE }}>{v.cmLeft} characters left</span>}
          </>
        )}
      </div>
    </aside>
  );
}

/** A comment, with its replies under it (one level). */
function CommentRow({ c, reply }: { c: V; reply?: boolean }) {
  const av = reply ? 26 : 32;
  return (
    <div style={{ display: 'flex', gap: reply ? 10 : 12, padding: reply ? '10px 0 0' : '14px 0', borderBottom: reply ? 'none' : '1px solid rgba(var(--ink-rgb),.08)' }}>
      <button onClick={c.openAuthor} aria-label={`${c.name}’s profile`} style={{ width: av, height: av, flexShrink: 0, borderRadius: '50%', border: '1px solid rgba(var(--ink-rgb),.15)', boxSizing: 'border-box', padding: 0, background: c.av || INK, color: PAPER, font: `600 ${reply ? 10 : 11}px ${SANS}`, cursor: 'pointer' }}>{c.av ? '' : c.initials}</button>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={c.openAuthor} className={hover(`color:${MARK}`)} style={{ ...linkBtn(INK), font: `600 13.5px ${SANS}` }}>{c.name}</button>
          <span style={{ fontSize: 12, color: STONE }}>{c.when}</span>
          {c.showPage && <button onClick={c.goPage} className={hover(`color:${MARK}`)} style={{ ...linkBtn(MARK), ...label(MARK, 10) }}>{c.page}</button>}
        </div>
        <div style={{ fontSize: 14.5, lineHeight: 1.5, color: INK, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
          {c.parts.map((p: V) => p.open ? <button key={p.key} onClick={p.open} className={hover('text-decoration:underline')} style={{ ...linkBtn(MARK), font: 'inherit', fontWeight: 500 }}>{p.text}</button> : <span key={p.key}>{p.text}</span>)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 2 }}>
          <button onClick={c.like} aria-pressed={c.liked} aria-label={`${c.liked ? 'Unlike' : 'Like'} comment, ${c.likes} ${c.likes === 1 ? 'like' : 'likes'}`} className={hover(`color:${MARK}`)}
            style={{ ...linkBtn(c.liked ? MARK : STONE), display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill={c.liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z" /></svg>
            {c.likes > 0 ? c.likes : 'Like'}
          </button>
          <button onClick={c.reply} className={hover(`color:${MARK}`)} style={linkBtn(STONE)}>Reply</button>
          {c.canDelete && <button onClick={c.del} className={hover(`color:${MARK}`)} style={linkBtn(STONE)}>Delete</button>}
          {c.canReport && <button onClick={c.report} className={hover(`color:${MARK}`)} style={linkBtn(STONE)}>Report</button>}
        </div>
        {c.replies?.length > 0 && <div style={{ display: 'flex', flexDirection: 'column', marginTop: 2, paddingLeft: 2, borderLeft: '2px solid rgba(var(--ink-rgb),.08)', paddingInlineStart: 12 }}>{c.replies.map((r: V) => <CommentRow key={r.key} c={r} reply />)}</div>}
      </div>
    </div>
  );
}
