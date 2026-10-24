import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { V } from '../App';
import { hover } from '../pseudo';
import { INK, MARK, MUTED, PAPER, SANS, SERIF, label, pagePad } from '../theme';
import { MoreMenu } from './Overlays';
import { Verified } from './Verified';

const avatar = (bg: string, size: number): CSSProperties => ({ width: size, height: size, flexShrink: 0, borderRadius: '50%', background: bg, color: PAPER, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `500 ${Math.round(size * 0.36)}px ${SANS}` });
const btn = (filled: boolean): CSSProperties => ({ height: 38, padding: '0 16px', borderRadius: 2, border: filled ? 'none' : '1.5px solid rgba(var(--ink-rgb),.4)', background: filled ? INK : 'none', color: filled ? PAPER : INK, font: `500 14px ${SANS}`, cursor: 'pointer' });

/** Messages: your conversations and requests on the left (or the whole screen on a phone), the open one on the right. */
export function Messages({ v }: { v: V }) {
  const mob = !v.notMob, t = v.msThread, showList = !mob || !t, showThread = !!t;
  return (
    <div style={{ position: 'absolute', inset: '0 0 var(--tabbar, 0px) 0', zIndex: 4, background: PAPER, display: 'flex', flexDirection: 'column' }}>
      <div style={{ ...pagePad(mob, mob ? 0 : 24), flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: mob ? 14 : 22 }}>
        {showList && <h1 style={{ margin: 0, font: `400 ${mob ? 40 : 56}px/1 ${SERIF}`, letterSpacing: '-.02em' }}>Messages</h1>}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 0, borderTop: showList ? `1px solid ${INK}` : 'none' }}>
          {showList && <ChatList v={v} mob={mob} />}
          {showThread ? <Thread v={v} t={t} mob={mob} /> : !mob && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED, fontSize: 14 }}>Choose a conversation.</div>}
        </div>
      </div>
    </div>
  );
}

function ChatList({ v, mob }: { v: V; mob: boolean }) {
  const tab = (k: 'chats' | 'requests', l: string) => (
    <button role="tab" aria-selected={v.msTab === k} onClick={() => v.msSetTab(k)} style={{ padding: '12px 0', border: 'none', borderBottom: `2px solid ${v.msTab === k ? INK : 'transparent'}`, background: 'none', color: v.msTab === k ? INK : MUTED, cursor: 'pointer', ...label(v.msTab === k ? INK : MUTED, 11) }}>{l}</button>
  );
  return (
    <div style={{ width: mob ? '100%' : 320, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0, borderRight: mob ? 'none' : '1px solid rgba(var(--ink-rgb),.14)' }}>
      <div role="tablist" style={{ display: 'flex', gap: 22, borderBottom: '1px solid rgba(var(--ink-rgb),.14)' }}>
        {tab('chats', 'Chats')}{tab('requests', v.msReqCount ? `Requests · ${v.msReqCount}` : 'Requests')}
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {!v.msList.length && <p style={{ margin: '18px 4px', fontSize: 14, lineHeight: 1.5, color: MUTED, maxWidth: 300 }}>{v.msEmpty}</p>}
        {v.msList.map((c: V) => (
          <button key={c.key} onClick={c.open} className={hover('background:rgba(var(--ink-rgb),.05)')} style={{ display: 'flex', gap: 12, alignItems: 'center', width: '100%', padding: '14px 10px 14px 4px', border: 'none', borderBottom: '1px solid rgba(var(--ink-rgb),.08)', background: c.on ? 'rgba(var(--ink-rgb),.07)' : 'none', color: INK, textAlign: 'left', cursor: 'pointer' }}>
            <span style={avatar(c.avBg, 44)}>{c.init}</span>
            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ font: `${c.unread ? 600 : 500} 15px ${SANS}`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}{c.verified && <Verified size={13} />}</span>
                <span style={{ flexShrink: 0, fontSize: 12, color: MUTED }}>{c.when}</span>
              </span>
              <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: c.unread ? INK : MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.preview}</span>
                {c.unread && <span aria-label="Unread" style={{ width: 8, height: 8, borderRadius: '50%', background: MARK, flexShrink: 0 }} />}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Thread({ v, t, mob }: { v: V; t: V; mob: boolean }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [t.msgs.length]);
  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: mob ? '0 0 12px' : '12px 0 12px 22px', borderBottom: '1px solid rgba(var(--ink-rgb),.14)' }}>
        {mob && <button onClick={t.back} aria-label="Back to messages" className="tap" style={{ padding: '6px 6px 6px 0', border: 'none', background: 'none', color: INK, font: `500 20px ${SANS}`, cursor: 'pointer' }}>←</button>}
        <button onClick={t.openProfile} style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, padding: 0, border: 'none', background: 'none', color: INK, cursor: 'pointer', textAlign: 'left' }}>
          <span style={avatar(t.avBg, 38)}>{t.init}</span>
          <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ font: `500 15px ${SANS}`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}{t.verified && <Verified size={13} />}</span>
            {t.handle && <span style={{ fontSize: 12, color: MUTED }}>{t.handle}</span>}
          </span>
        </button>
        <span style={{ flex: 1 }} />
        {!t.isNew && <MoreMenu open={t.moreOpen} onToggle={t.more} align="right" items={[{ label: 'Report', onClick: t.reportChat }, { label: `Block ${t.name}`, onClick: t.block, danger: true }]} />}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: mob ? '14px 0' : '18px 22px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {t.isNew && <p style={{ margin: 'auto 0 8px', textAlign: 'center', fontSize: 13, lineHeight: 1.5, color: MUTED }}>Say hello to {t.name}. If they don’t follow you, your first message arrives as a request they can accept.</p>}
        {t.msgs.map((m: V) => (
          <div key={m.key} style={{ display: 'flex', flexDirection: 'column', alignItems: m.mine ? 'flex-end' : 'flex-start', gap: 4 }}>
            {m.stamp && <span style={{ alignSelf: 'center', margin: '10px 0 4px', fontSize: 11, color: MUTED }}>{m.stamp}</span>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, maxWidth: '78%', flexDirection: m.mine ? 'row-reverse' : 'row' }}>
              <div style={{ padding: '9px 13px', borderRadius: m.mine ? '14px 14px 3px 14px' : '14px 14px 14px 3px', background: m.mine ? INK : 'rgba(var(--ink-rgb),.08)', color: m.mine ? PAPER : INK, fontSize: 15, lineHeight: 1.4, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', opacity: m.pending ? 0.6 : 1 }}>{m.text}</div>
              {m.report && <button onClick={m.report} title="Report this message" aria-label="Report this message" className={hover(`color:${MARK}`)} style={{ flexShrink: 0, width: 24, height: 24, padding: 0, border: 'none', background: 'none', color: 'rgba(var(--ink-rgb),.35)', fontSize: 13, cursor: 'pointer' }}>⚑</button>}
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>

      {t.askMe ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: mob ? '12px 0 16px' : '16px 22px', borderTop: '1px solid rgba(var(--ink-rgb),.14)' }}>
          <span style={{ fontSize: 14, lineHeight: 1.45 }}><b style={{ fontWeight: 600 }}>{t.name}</b> wants to message you. They won’t know you’ve seen this unless you accept.</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={t.accept} className={hover(`background:${MARK}`)} style={btn(true)}>Accept</button>
            <button onClick={t.decline} style={btn(false)}>Decline</button>
            <button onClick={t.block} style={{ ...btn(false), color: MARK, borderColor: 'rgba(173,73,58,.5)' }}>Block</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: mob ? '10px 0 12px' : '14px 22px', borderTop: '1px solid rgba(var(--ink-rgb),.14)' }}>
          {t.waiting && <span style={{ fontSize: 12, color: MUTED }}>Sent as a request. {t.name} will see your messages if they accept.</span>}
          {v.msErr && <span role="alert" style={{ fontSize: 13, color: MARK }}>{v.msErr}</span>}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea value={v.msDraft} onChange={v.onMsgDraft} onKeyDown={v.msKey} rows={1} placeholder="Write a message" aria-label="Message"
              style={{ flex: 1, minHeight: 44, maxHeight: 140, padding: '11px 14px', boxSizing: 'border-box', resize: 'none', borderRadius: 2, border: '1.5px solid rgba(var(--ink-rgb),.14)', background: 'rgba(var(--ink-rgb),.06)', color: INK, font: `400 15px/1.4 ${SANS}`, outline: 'none', fieldSizing: 'content' } as CSSProperties} />
            <button onClick={v.msSend} disabled={!v.msCanSend} className={v.msCanSend ? hover(`background:${MARK}`) : undefined} style={{ ...btn(true), height: 44, opacity: v.msCanSend ? 1 : 0.4 }}>{v.msBusy ? 'Sending…' : 'Send'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
