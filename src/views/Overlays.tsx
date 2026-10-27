import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { loadStripe } from '@stripe/stripe-js/pure'; // pure: Stripe.js loads only when checkout opens, not on every page
import type { Appearance, StripeCheckoutLoadActionsSuccess, StripeCheckoutSession, StripeElements } from '@stripe/stripe-js';
import type { CSSProperties, ChangeEventHandler, MouseEventHandler, ReactNode } from 'react';
import { Popover } from './Popover';
import type { V } from '../App';
import { focus, hover, wheelSideways } from '../pseudo';
import { INK, MARK, MUTED, PAPER, SANS, SERIF, pagePad } from '../theme';
import { TEXT_FONT, TEXT_INK } from '../handwriting';
import { PAPERS, PAPER_PREVIEW } from '../paper';
import { COLORS as DRAW_COLORS, TOOLS as DRAW_TOOLS, hexHsv, hsvHex } from '../paint';

const field: CSSProperties = { height: 44, padding: '0 14px', borderRadius: 2, border: '1.5px solid rgba(var(--ink-rgb),.14)', background: 'rgba(var(--ink-rgb),.06)', color: INK, font: `500 14px ${SANS}`, outline: 'none', width: '100%', boxSizing: 'border-box' };
const fieldLabel: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'rgba(var(--ink-rgb),.75)' };
const focusMark = focus(`border-color:${MARK}`);
const ghostBtn: CSSProperties = { borderRadius: 2, border: '1.5px solid rgba(var(--ink-rgb),.5)', background: 'none', color: INK, font: `500 13px ${SANS}`, cursor: 'pointer' };
const hoverTint = hover('background:rgba(var(--ink-rgb),.1)');
const linkBtn = (color: string): CSSProperties => ({ background: 'none', border: 'none', color, font: `500 13px ${SANS}`, cursor: 'pointer', padding: 0 });
const heading: CSSProperties = { fontSize: 38, fontFamily: SERIF, fontWeight: 400, letterSpacing: '-.01em' };

function Modal({ onClose, pad, maxWidth, gap = 18, shadow, z = 20, children }: { onClose: MouseEventHandler; pad: number; maxWidth: number; gap?: number; shadow?: string; z?: number; children: ReactNode }) {
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: z, background: 'rgba(var(--canvas-rgb),.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, boxSizing: 'border-box' }}>
      <div style={{ background: PAPER, border: `1px solid ${INK}`, padding: pad, display: 'flex', flexDirection: 'column', gap, maxWidth, width: '100%', boxSizing: 'border-box', maxHeight: '100%', overflow: 'auto', boxShadow: shadow }}>{children}</div>
    </div>
  );
}

export function TextField({ label, value, onChange, ...rest }: { label: string; value: string; onChange: ChangeEventHandler<HTMLInputElement>; type?: string; placeholder?: string; autoComplete?: string; autoFocus?: boolean }) {
  return <label style={fieldLabel}>{label}<input value={value} onChange={onChange} {...rest} className={focusMark} style={field} /></label>;
}

/** A longer answer, styled like TextField. */
export function TextArea({ label, value, onChange, ...rest }: { label: string; value: string; onChange: ChangeEventHandler<HTMLTextAreaElement>; placeholder?: string; rows?: number; maxLength?: number }) {
  return <label style={fieldLabel}>{label}<textarea value={value} onChange={onChange} {...rest} className={focusMark} style={{ ...field, height: 'auto', minHeight: 140, padding: '12px 14px', lineHeight: 1.5, resize: 'vertical' }} /></label>;
}

export function HandleField({ value, onChange, placeholder }: { value: string; onChange: ChangeEventHandler<HTMLInputElement>; placeholder?: string }) {
  return (
    <label style={fieldLabel}>Handle
      <div style={{ display: 'flex', alignItems: 'center', height: 44, padding: '0 14px', borderRadius: 2, border: '1.5px solid rgba(var(--ink-rgb),.14)', background: 'rgba(var(--ink-rgb),.06)', boxSizing: 'border-box' }}>
        <span style={{ fontSize: 14, color: 'rgba(var(--ink-rgb),.5)' }}>@</span>
        <input value={value} onChange={onChange} placeholder={placeholder} style={{ flex: 1, minWidth: 0, height: '100%', padding: '0 0 0 2px', border: 'none', outline: 'none', background: 'none', color: INK, font: `500 14px ${SANS}` }} />
      </div>
    </label>
  );
}

/** Inline error (accent red) or confirmation line inside a form. */
export function Notice({ err, info }: { err?: string; info?: string }) {
  if (!err && !info) return null;
  return <div role={err ? 'alert' : 'status'} style={{ fontSize: 13, lineHeight: 1.45, color: err ? MARK : MUTED }}>{err || info}</div>;
}

export function EditProfile({ v }: { v: V }) {
  const grid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14 };
  const save = <button onClick={v.pfSave} disabled={v.dBusy} style={{ height: v.notMob ? 44 : 40, padding: '0 22px', borderRadius: 2, border: 'none', background: MARK, color: PAPER, font: `500 ${v.notMob ? 14 : 15}px ${SANS}`, cursor: v.dBusy ? 'progress' : 'pointer', opacity: v.dBusy ? 0.6 : 1 }}>{v.dBusy ? 'Saving…' : 'Save'}</button>;
  // You (picture, name, handle, bio), and how people reach you.
  const you = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 80, height: 80, flexShrink: 0, borderRadius: '50%', border: '1px solid rgba(var(--ink-rgb),.22)', boxSizing: 'border-box', background: v.dAvBg, color: PAPER, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 600 }}>{v.dInit}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={v.pickAv} className={hoverTint} style={{ ...ghostBtn, height: 40, padding: '0 14px' }}>Upload photo</button>
          {v.dHasAv && <button onClick={v.removeAv} style={{ ...linkBtn(MARK), height: 40, padding: '0 8px' }}>Remove</button>}
        </div>
      </div>
      <div style={grid}>
        <TextField label="Name" value={v.dName} onChange={v.onDName} />
        <HandleField value={v.dHandle} onChange={v.onDHandle} />
      </div>
      <label style={fieldLabel}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Bio</span><span style={{ color: 'rgba(var(--ink-rgb),.5)' }}>{v.dBioCount}</span></div>
        <textarea value={v.dBio} onChange={v.onDBio} maxLength={160} rows={3} placeholder="What do you draw?" className={focusMark} style={{ ...field, height: undefined, padding: '12px 14px', font: `500 14px/1.45 ${SANS}`, resize: 'none' }} />
      </label>
    </>
  );
  const reach = (
    <>
      <div style={grid}>
        <TextField label="Location" value={v.dLoc} onChange={v.onDLoc} placeholder="City" />
        <TextField label="Website" value={v.dWeb} onChange={v.onDWeb} placeholder="yoursite.com" />
      </div>
      <TextField label="Contact email (shown on your profile)" value={v.dMail} onChange={v.onDMail} placeholder="hello@yoursite.com" type="email" />
      <SocialFields v={v} />
    </>
  );
  const account = (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 160, gap: v.notMob ? 0 : 6 }}>
      <span style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),.6)' }}>Signed in as {v.dEmail}</span>
      <span style={{ display: 'flex', gap: v.notMob ? 14 : 24 }}>
        <button onClick={v.signOut} className="tap" style={{ ...linkBtn(MARK), padding: '2px 0' }}>Sign out</button>
        <button onClick={v.openSettings} className="tap" style={{ ...linkBtn('rgba(var(--ink-rgb),.75)'), padding: '2px 0' }}>Account settings</button>
      </span>
    </div>
  );
  // Phones: a full screen with Cancel and Save at the top, like the sketchbook editor.
  if (!v.notMob) return (
    <div role="dialog" aria-label="Edit profile" style={{ position: 'absolute', inset: 0, zIndex: 20, background: PAPER, display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid rgba(var(--ink-rgb),.12)' }}>
        <button onClick={v.pfCancel} style={{ justifySelf: 'start', height: 40, padding: '0 4px', border: 'none', background: 'none', color: INK, font: `500 15px ${SANS}`, cursor: 'pointer' }}>Cancel</button>
        <span style={{ font: `400 20px/1 ${SERIF}` }}>Edit profile</span>
        <span style={{ justifySelf: 'end' }}>{save}</span>
      </header>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 16px calc(32px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {you}{reach}
        <Notice err={v.dErr} />
        <div style={{ paddingTop: 16, borderTop: '1px solid rgba(var(--ink-rgb),.12)' }}>{account}</div>
      </div>
    </div>
  );
  // Larger screens: two columns (you on the left, how to reach you on the right), so it fits without scrolling.
  const col: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 };
  return (
    <Modal onClose={v.pfClose} pad={v.mModalPad} maxWidth={860}>
      <div style={{ ...heading, fontSize: 34 }}>Edit profile</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 32, alignItems: 'start' }}>
        <div style={col}>{you}</div>
        <div style={col}>{reach}</div>
      </div>
      <Notice err={v.dErr} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', paddingTop: 14, borderTop: '1px solid rgba(var(--ink-rgb),.12)' }}>
        {account}
        <button onClick={v.pfCancel} className={hoverTint} style={{ ...ghostBtn, height: 44, padding: '0 18px', fontSize: 14 }}>Cancel</button>
        {save}
      </div>
    </Modal>
  );
}

export function NewBookPicker({ v }: { v: V }) {
  return (
    <Modal onClose={v.closePick} pad={v.mModalPad} maxWidth={760} gap={20} shadow="0 30px 60px rgba(10,10,30,.5)">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-.01em' }}>New sketchbook</div>
        <div style={{ fontSize: 13, color: 'rgba(var(--ink-rgb),.7)' }}>Pick a shape and size</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit,minmax(${v.mOptMin}px,1fr))`, gap: 10 }}>
        {v.shapeOpts.map((so: V) => (
          <button key={so.key} onClick={so.pick} style={{ height: v.mOptH, border: 'none', borderRadius: 2, background: so.bg, boxShadow: so.ring, color: INK, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 12, padding: '14px 8px', font: `500 13px ${SANS}` }}>
            <div style={{ width: so.w, height: so.h, maxWidth: '100%', borderRadius: '2px 7px 7px 2px', background: so.c, boxShadow: '4px 4px 0 rgba(0,0,0,.25)' }} />
            <span>{so.label}</span>
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button onClick={v.cancelPick} style={{ height: 40, padding: '0 18px', borderRadius: 2, border: '1.5px solid rgba(var(--ink-rgb),.4)', background: 'none', color: INK, font: `500 14px ${SANS}`, cursor: 'pointer' }}>Cancel</button>
        <button onClick={v.createBook} className={hover('transform:scale(1.04)')} style={{ height: 40, padding: '0 22px', borderRadius: 2, border: 'none', background: MARK, color: PAPER, font: `500 14px ${SANS}`, cursor: 'pointer' }}>Create</button>
      </div>
    </Modal>
  );
}

const chip = (on: boolean): CSSProperties => ({ height: 36, padding: '0 13px', borderRadius: 16, border: `1px solid ${on ? INK : 'rgba(var(--ink-rgb),.25)'}`, background: on ? INK : 'transparent', color: on ? PAPER : INK, font: `500 13px ${SANS}`, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 });
const sectionLbl: CSSProperties = { fontSize: 13, fontWeight: 500, color: INK };
const hint: CSSProperties = { fontSize: 13, lineHeight: 1.45, color: 'rgba(var(--ink-rgb),.6)' };
const Row = ({ label, note, children }: { label: string; note?: ReactNode; children: ReactNode }) => (
  <section style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 22, borderBottom: '1px solid rgba(var(--ink-rgb),.1)' }}>
    <span style={sectionLbl}>{label}</span>
    {children}
    {note && <span style={hint}>{note}</span>}
  </section>
);

/** Edit a sketchbook. Changes stay a draft until Save; Cancel puts everything back.
 *  Pages: the drawings (tap one for its caption, date and actions). Details: cover, visibility,
 *  mediums, tags. Share: draw together with one other person. */
export function Manager({ v }: { v: V }) {
  const tabs = ([['pages', 'Pages'], ['details', 'Details'], ...(v.canShare ? [['share', 'Share']] : [])] as [string, string][]);
  const pad = v.notMob ? 40 : 16, pg = v.mgPage != null ? v.pagesList[v.mgPage] : null;
  return (
    <div onDragOver={v.onDragOver} onDrop={v.onDrop} style={{ position: 'absolute', inset: 0, background: PAPER, zIndex: 15, display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12, padding: `${v.notMob ? 18 : 12}px ${pad}px`, borderBottom: '1px solid rgba(var(--ink-rgb),.12)' }}>
        <button onClick={v.mgCancel} className={hover(`color:${MARK}`)} style={{ justifySelf: 'start', height: 40, padding: '0 4px', border: 'none', background: 'none', color: INK, font: `500 15px ${SANS}`, cursor: 'pointer' }}>Cancel</button>
        <span style={{ font: `400 ${v.notMob ? 24 : 20}px/1 ${SERIF}` }}>Edit sketchbook</span>
        <button onClick={v.mgSave} className={hover(`background:${MARK}`)} style={{ justifySelf: 'end', height: 40, padding: '0 22px', borderRadius: 2, border: 'none', background: v.mgChanged ? MARK : INK, color: PAPER, font: `500 15px ${SANS}`, cursor: 'pointer', transition: 'background .2s' }}>Save</button>
      </header>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <div style={{ boxSizing: 'border-box', padding: `${v.notMob ? 28 : 18}px ${pad}px 48px`, display: 'flex', flexDirection: 'column', gap: v.notMob ? 24 : 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <input value={v.bookName} onChange={v.onName} readOnly={v.isCollab} aria-label="Sketchbook name" className={v.isCollab ? undefined : focus(`border-color:${INK}`)} style={{ background: 'none', border: 'none', borderBottom: `1.5px solid ${v.isCollab ? 'transparent' : 'rgba(var(--ink-rgb),.2)'}`, color: INK, font: `400 ${v.notMob ? 48 : 36}px/1.1 ${SERIF}`, letterSpacing: '-.01em', padding: '0 0 4px', outline: 'none', width: '100%', maxWidth: 560, boxSizing: 'border-box' }} />
            <span style={hint}>{v.mgSummary}</span>
          </div>
          <div role="tablist" style={{ display: 'flex', gap: 24, borderBottom: '1px solid rgba(var(--ink-rgb),.15)' }}>
            {tabs.map(([k, l]) => (
              <button key={k} role="tab" aria-selected={v.mgTab === k} onClick={() => v.setMgTab(k)} style={{ padding: '8px 0 12px', marginBottom: -1, border: 'none', borderBottom: `2px solid ${v.mgTab === k ? INK : 'transparent'}`, background: 'none', color: v.mgTab === k ? INK : 'rgba(var(--ink-rgb),.5)', font: `500 15px ${SANS}`, cursor: 'pointer' }}>{l}</button>
            ))}
          </div>

          {v.mgTab === 'pages' && (
            <>
              <span style={hint}>{v.isTouch ? 'Tap a page to caption, move or change it.' : 'Click a page to caption or change it. Drag to reorder.'}</span>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill,minmax(${v.notMob ? 160 : 120}px,1fr))`, gap: v.notMob ? 22 : 14 }}>
                {v.pagesList.map((p: V, i: number) => (
                  <div key={i} draggable onDragStart={p.dragStart} onDragOver={p.dragOver} onDrop={p.drop} onClick={() => v.openPage(i)} style={{ display: 'flex', flexDirection: 'column', gap: 8, cursor: 'pointer', minWidth: 0 }}>
                    <div className={hover(`box-shadow:0 0 0 2px ${INK},0 10px 24px rgba(10,10,30,.3)`)} style={{ position: 'relative', aspectRatio: v.pgAspect, borderRadius: '2px 8px 8px 2px', background: p.bg, boxShadow: '0 10px 24px rgba(10,10,30,.3)' }}>
                      <span style={{ position: 'absolute', left: 8, top: 8, minWidth: 22, height: 22, padding: '0 6px', boxSizing: 'border-box', borderRadius: 11, background: 'rgba(246,242,233,.92)', color: '#222320', font: `500 12px/22px ${SANS}`, textAlign: 'center' }}>{p.num}</span>
                      {(p.spread || p.filler) && <span style={{ position: 'absolute', left: 8, bottom: 8, right: 8, height: 22, padding: '0 8px', boxSizing: 'border-box', borderRadius: 11, background: 'rgba(246,242,233,.92)', color: p.filler ? 'rgba(34,35,32,.6)' : '#222320', font: `500 11px/22px ${SANS}`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.filler ? 'Blank, before a spread' : p.spread}</span>}
                    </div>
                    <span style={{ fontSize: 13, color: p.caption ? INK : 'rgba(var(--ink-rgb),.45)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontStyle: p.caption ? 'italic' : 'normal' }}>{p.caption || 'Add a caption'}</span>
                  </div>
                ))}
                {v.isTouch ? (
                  // Touch screens: photograph a page straight from the camera, or pick from the library.
                  <div style={{ aspectRatio: v.pgAspect, borderRadius: '2px 8px 8px 2px', border: '2px dashed rgba(var(--ink-rgb),.3)', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'stretch', justifyContent: 'center', padding: 10, boxSizing: 'border-box' }}>
                    <button onClick={v.pickCamera} style={{ height: 40, border: 'none', borderRadius: 2, background: INK, color: PAPER, font: `500 13px ${SANS}`, cursor: 'pointer' }}>Take photo</button>
                    <button onClick={v.pick} style={{ ...ghostBtn, height: 40, fontSize: 13 }}>Choose photos</button>
                  </div>
                ) : <button onClick={v.pick} className={hover(`border-color:${INK};color:${INK}`)} style={{ aspectRatio: v.pgAspect, borderRadius: '2px 8px 8px 2px', border: '2px dashed rgba(var(--ink-rgb),.3)', background: 'none', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', justifyContent: 'center', color: 'rgba(var(--ink-rgb),.7)', font: `500 14px ${SANS}`, cursor: 'pointer', padding: 12 }}>
                  <span style={{ fontSize: 28, fontWeight: 300, lineHeight: 1 }}>+</span>Add pages
                  <span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(var(--ink-rgb),.55)' }}>or drop images</span>
                </button>}
                {/* A blank page to write or draw on. */}
                <div style={{ aspectRatio: v.pgAspect, borderRadius: '2px 8px 8px 2px', border: '2px dashed rgba(var(--ink-rgb),.3)', display: 'flex', flexDirection: 'column', gap: 8, padding: 10, boxSizing: 'border-box', justifyContent: 'center' }}>
                  <span style={{ textAlign: 'center', font: `500 13px ${SANS}`, color: 'rgba(var(--ink-rgb),.7)' }}>Blank page</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {PAPERS.map(([k, l]) => (
                      <button key={k} onClick={() => v.addBlank(k)} title={`${l} page`} className={hover(`border-color:${INK}`)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 3, padding: 3, border: '1px solid rgba(var(--ink-rgb),.2)', borderRadius: 2, background: 'none', color: INK, font: `500 11px ${SANS}`, cursor: 'pointer' }}>
                        <span style={{ height: 26, background: PAPER_PREVIEW[k], borderRadius: 1 }} />{l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {v.mgTab === 'details' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 640 }}>
              {v.isCollab ? (<>
                <Row label="Shared with you">
                  <span style={{ fontSize: 14, lineHeight: 1.5 }}>This is {v.shOwner}’s sketchbook ({v.shOwnerHandle}). You can add, caption and change pages; {v.shOwner} looks after the rest.</span>
                  <button onClick={v.shLeave} disabled={v.shBusy} style={{ ...linkBtn(MARK), alignSelf: 'flex-start' }}>Leave sketchbook</button>
                </Row>
                <PdfRow v={v} />
              </>) : (
                <>
                  <Row label="Cover">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      {v.swatches.map((c: V) => <button key={c.key} onClick={c.pick} aria-label={`Cover colour ${c.c}`} style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: c.c, boxShadow: c.ring, cursor: 'pointer', padding: 0 }} />)}
                      <button onClick={v.pickCover} className={hoverTint} style={{ ...ghostBtn, height: 32, padding: '0 12px', marginLeft: 4 }}>{v.hasCoverImg ? 'Change image' : 'Use an image'}</button>
                      {v.hasCoverImg && <button onClick={v.removeCover} style={linkBtn(MARK)}>Remove image</button>}
                      <input ref={v.coverRef} type="file" accept="image/*" onChange={v.onCoverFile} style={{ display: 'none' }} />
                    </div>
                  </Row>
                  <Row label="Who can see it" note={v.bookHidden ? <span style={{ color: MARK }}>Hidden by moderators for breaking the terms. Only you can see it.</span> : VIS_NOTE[v.bookVis]}>
                    <div role="radiogroup" aria-label="Who can see this sketchbook" style={{ display: 'flex', gap: 2, padding: 3, border: '1px solid rgba(var(--ink-rgb),.2)', alignSelf: 'flex-start', opacity: v.bookHidden ? 0.45 : 1 }}>
                      {([['public', 'Public'], ['link', 'Link only'], ['private', 'Private']] as const).map(([k, name]) => (
                        <button key={k} role="radio" aria-checked={v.bookVis === k} disabled={v.bookHidden} onClick={() => v.setVis(k)} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 14px', border: 'none', borderRadius: 2, background: v.bookVis === k ? INK : 'transparent', color: v.bookVis === k ? PAPER : INK, font: `500 13px ${SANS}`, cursor: v.bookHidden ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                          {name}{k === 'link' && !v.stPlus && <PlusTag on={v.bookVis === k} />}
                        </button>
                      ))}
                    </div>
                  </Row>
                  {v.mtShow && (
                    <Row label="Mature" note={v.mtLock ? 'Labelled by the upload check because a drawing shows nudity. Write to us if you think that’s wrong.' : 'Label it if it has drawn nudity. Mature sketchbooks are kept out of Explore and lists for people who haven’t chosen to see them.'}>
                      <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14, cursor: v.mtLock ? 'not-allowed' : 'pointer', opacity: v.mtLock ? 0.7 : 1 }}>
                        <input type="checkbox" checked={v.mtBook} disabled={v.mtLock} onChange={v.mtBookToggle} style={{ width: 18, height: 18, accentColor: MARK }} />
                        Mature sketchbook
                      </label>
                    </Row>
                  )}
                  {v.stOwn && <StatsRow v={v} />}
                  {v.stOwn && (
                    <Row label="Pin to your profile" note={v.pinOn ? 'It’s the first sketchbook people see on your profile.' : 'Show this sketchbook first on your profile.'}>
                      <button onClick={v.togglePin} className={hoverTint} style={{ ...ghostBtn, alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 14px' }}>
                        {v.pinOn ? 'Unpin' : 'Pin this sketchbook'}{!v.stPlus && <PlusTag />}
                      </button>
                    </Row>
                  )}
                  <Row label="Mediums" note="Pick up to four. People can filter Explore by medium.">
                    <div role="group" aria-label="Mediums" onWheel={wheelSideways} style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2, maskImage: 'linear-gradient(90deg,#000 calc(100% - 32px),transparent)' } as CSSProperties}>
                      {v.mgMediums.map((m: V) => <button key={m.key} onClick={m.pick} aria-pressed={m.on} className={m.on ? undefined : hover('border-color:rgba(var(--ink-rgb),.6)')} style={chip(m.on)}>{m.label}</button>)}
                    </div>
                  </Row>
                  <Row label="Tags" note="Up to 8, e.g. portraits, lisbon, figure-drawing. Press Enter or a comma to add one.">
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, minHeight: 44, padding: '6px 8px', border: '1.5px solid rgba(var(--ink-rgb),.14)', background: 'rgba(var(--ink-rgb),.06)', boxSizing: 'border-box' }}>
                      {v.mgTags.map((t: V) => (
                        <span key={t.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, height: 28, padding: '0 4px 0 10px', borderRadius: 14, background: PAPER, border: '1px solid rgba(var(--ink-rgb),.2)', fontSize: 13 }}>
                          {t.label}<button onClick={t.remove} aria-label={`Remove ${t.label}`} className={hover(`color:${MARK}`)} style={{ width: 22, height: 22, padding: 0, border: 'none', background: 'none', color: 'rgba(var(--ink-rgb),.6)', font: `500 15px/1 ${SANS}`, cursor: 'pointer' }}>×</button>
                        </span>
                      ))}
                      {!v.mgTagFull && <input value={v.tagDraft} onChange={v.onTagDraft} onKeyDown={v.onTagKey} onBlur={v.commitTag} placeholder={v.mgTags.length ? 'Add a tag' : 'Add tags'} aria-label="Add a tag" style={{ flex: 1, minWidth: 120, height: 30, border: 'none', outline: 'none', background: 'none', color: INK, font: `500 14px ${SANS}` }} />}
                    </div>
                  </Row>
                  <PdfRow v={v} />
                  <button onClick={v.deleteBook} className={hover('text-decoration:underline')} style={{ ...linkBtn(MARK), alignSelf: 'flex-start', padding: '4px 0' }}>Delete this sketchbook</button>
                </>
              )}
            </div>
          )}

          {v.mgTab === 'share' && <div style={{ maxWidth: 640 }}><SharePanel v={v} /></div>}
        </div>
      </div>
      {pg && <PageSheet v={v} pg={pg} />}
    </div>
  );
}

/** Download the sketchbook as a PDF (Plus). */
function PdfRow({ v }: { v: V }) {
  return (
    <Row label="Download as PDF" note="A title page, then every page with its caption and date. Unsaved changes aren’t included until you Save.">
      <button onClick={v.mgPdf} disabled={!!v.mgPdfBusy} className={hoverTint} style={{ ...ghostBtn, alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 14px', opacity: v.mgPdfBusy ? 0.7 : 1 }}>
        {v.mgPdfBusy ? `Making PDF… ${v.mgPdfBusy}` : 'Download PDF'}{!v.mgPdfPlus && <PlusTag />}
      </button>
    </Row>
  );
}

const VIS_NOTE: Record<string, string> = {
  public: 'Anyone can find it in Explore and on your profile.',
  link: 'Hidden from Explore and your profile. Anyone you send the link to can open it.',
  private: 'Only you can see it.',
};

/** A small "Plus" label on options that need Fletora Plus. */
export function PlusTag({ on }: { on?: boolean }) {
  return <span style={{ padding: '2px 5px', borderRadius: 2, border: `1px solid ${on ? PAPER : MARK}`, color: on ? PAPER : MARK, font: `600 9px/1 ${SANS}`, letterSpacing: '.08em', textTransform: 'uppercase' }}>Plus</span>;
}

/** Views, likes and saves, and where views came from. Without Plus, the total views and an invitation. */
function StatsRow({ v }: { v: V }) {
  if (!v.stReady) return <Row label="Stats"><span style={hint}>Loading…</span></Row>;
  if (!v.stPlus) return (
    <Row label="Stats">
      <span style={{ fontSize: 14, lineHeight: 1.5 }}>{v.stTeaser} See likes, saves and where visitors came from with Plus.</span>
      <button onClick={v.stUpgrade} className={hoverTint} style={{ ...ghostBtn, alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 14px' }}>See stats <PlusTag /></button>
    </Row>
  );
  return (
    <Row label="Stats" note="Views are counted once per visit and don’t include your own.">
      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
        {v.stTotals.map((t: V) => <span key={t.l} style={{ display: 'flex', flexDirection: 'column' }}><span style={{ font: `400 32px/1 ${SERIF}` }}>{t.n}</span><span style={hint}>{t.l}</span></span>)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 420 }}>
        {v.stFrom.map((f: V) => (
          <div key={f.key} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 40px', alignItems: 'center', gap: 10, fontSize: 13 }}>
            <span>{f.label}</span>
            <span style={{ height: 6, background: 'rgba(var(--ink-rgb),.08)', borderRadius: 3, overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: `${Math.round(f.share * 100)}%`, background: INK, borderRadius: 3 }} /></span>
            <span style={{ textAlign: 'right', color: 'rgba(var(--ink-rgb),.7)' }}>{f.n}</span>
          </div>
        ))}
      </div>
    </Row>
  );
}

/** Stripe's checkout form, mounted inside the Plus sheet. Paying sends the browser on to /settings. */
function EmbeddedCheckout({ v }: { v: V }) {
  const box = useRef<HTMLDivElement>(null), [ready, setReady] = useState(false);
  useEffect(() => {
    let co: { destroy(): void } | null = null, gone = false;
    loadStripe(v.plStripeKey)
      .then(stripe => { if (!stripe) throw new Error('Stripe.js didn’t load'); return stripe.createEmbeddedCheckoutPage({ fetchClientSecret: () => Promise.resolve(v.plSecret) }); })
      .then(c => { if (gone) return c.destroy(); co = c; c.mount(box.current!); setReady(true); })
      .catch(e => { console.error('embedded checkout', e); if (!gone) v.plEmbedFailed(); });
    return () => { gone = true; co?.destroy(); };
  }, [v.plSecret]);
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <button onClick={v.plBack} className="tap" style={{ ...linkBtn('rgba(var(--ink-rgb),.75)'), padding: '4px 0' }}>← Back</button>
        <span style={{ fontSize: 13, color: 'rgba(var(--ink-rgb),.65)' }}>{v.plSummary}</span>
      </div>
      {v.plWhy.length > 0 && <span style={{ fontSize: 12, lineHeight: 1.45, color: MARK, overflowWrap: 'anywhere' }}>Test mode: Stripe refused Fletora’s own form. {v.plWhy.join(' · ')}</span>}
      {!ready && <span style={{ ...hint, textAlign: 'center', padding: '40px 0' }}>Loading secure checkout…</span>}
      {/* Stripe draws its own light form; a white card keeps it from looking pasted onto the paper (and works in dark mode). */}
      <div ref={box} style={{ minHeight: ready ? 0 : 1, background: '#fff', borderRadius: 4, overflow: 'hidden' }} />
    </>
  );
}

/** Stripe's card fields drawn in Fletora's colours and type (they live in Stripe's iframe, so they get real
 *  colours rather than our CSS variables). */
const STRIPE_FONTS = [{ cssSrc: 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=swap' }];
function stripeLook(dark: boolean): Appearance {
  const ink = dark ? '236,231,219' : '34,35,32', mark = dark ? '#D7705B' : '#AD493A';
  return {
    theme: dark ? 'night' : 'stripe',
    variables: { colorPrimary: mark, colorBackground: dark ? '#1A1B18' : '#F4F1E9', colorText: `rgb(${ink})`, colorTextSecondary: `rgba(${ink},.65)`, colorDanger: mark, fontFamily: "'Geist', sans-serif", fontSizeBase: '15px', borderRadius: '2px', spacingUnit: '4px' },
    rules: {
      '.Input': { backgroundColor: `rgba(${ink},.06)`, border: `1.5px solid rgba(${ink},.14)`, boxShadow: 'none' },
      '.Input:focus': { borderColor: mark, boxShadow: 'none' },
      '.Label': { fontSize: '13px', color: `rgba(${ink},.75)` },
      '.Tab': { backgroundColor: 'transparent', border: `1.5px solid rgba(${ink},.14)`, boxShadow: 'none' },
      '.Tab--selected': { borderColor: `rgb(${ink})`, boxShadow: 'none' },
    },
  };
}

/** Checkout on Fletora's own page: the order, then Stripe's card fields (only they ever see the card), then Pay. */
function FletoraCheckout({ v }: { v: V }) {
  const box = useRef<HTMLDivElement>(null);
  const [sess, setSess] = useState<StripeCheckoutSession | null>(null), [actions, setActions] = useState<StripeCheckoutLoadActionsSuccess | null>(null);
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false), [code, setCode] = useState(''), [codeOpen, setCodeOpen] = useState(false);
  useEffect(() => {
    let gone = false, pe: { destroy(): void } | null = null;
    loadStripe(v.plStripeKey).then(async stripe => {
      if (!stripe) throw new Error('Stripe.js didn’t load');
      const co = stripe.initCheckoutElementsSdk({ clientSecret: v.plSecret, elementsOptions: { appearance: stripeLook(v.plDark), fonts: STRIPE_FONTS } });
      co.on('change', ss => { if (!gone) setSess(ss); });
      const r = await co.loadActions();
      if (r.type !== 'success') throw new Error(r.error.message);
      if (gone) return;
      setActions(r.actions); setSess(r.actions.getSession());
      const el = co.createPaymentElement({ layout: 'tabs' }); el.mount(box.current!); pe = el;
    }).catch(e => { console.error('checkout', e); if (!gone) v.plEmbedFailed(); });
    return () => { gone = true; pe?.destroy(); };
  }, [v.plSecret]);
  const pay = async () => {
    if (!actions || busy) return;
    setBusy(true); setErr('');
    const r = await actions.confirm({ redirect: 'if_required' }).catch(e => ({ type: 'error' as const, error: { message: (e as Error).message } }));
    if (r.type === 'success') v.plPaid(); else { setErr(r.error.message); setBusy(false); }
  };
  const promo = async () => {
    if (!actions || !code.trim()) return;
    const r = await actions.applyPromotionCode(code.trim());
    if (r.type === 'error') setErr(r.error.message); else { setErr(''); setCodeOpen(false); }
  };
  const t = sess?.total, every = sess?.recurring?.interval === 'year' ? 'year' : 'month', vat = t?.taxInclusive.minorUnitsAmount ? t.taxInclusive.amount : '';
  const row: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 14 };
  return (
    <>
      <button onClick={v.plBack} className="tap" style={{ ...linkBtn('rgba(var(--ink-rgb),.75)'), alignSelf: 'flex-start', padding: '4px 0' }}>← Back</button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ font: `600 11px ${SANS}`, letterSpacing: '.14em', textTransform: 'uppercase', color: MARK }}>Checkout</span>
        <span style={{ ...heading, fontSize: v.notMob ? 34 : 30, lineHeight: 1.05 }}>Fletora Plus, {every === 'year' ? 'yearly' : 'monthly'}</span>
      </div>
      {!sess ? <span style={{ ...hint, padding: '24px 0' }}>Loading…</span> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 14, borderBottom: '1px solid rgba(var(--ink-rgb),.14)' }}>
          {t?.discount.minorUnitsAmount ? <div style={row}><span>Discount</span><span>−{t.discount.amount}</span></div> : null}
          <div style={{ ...row, fontSize: 18, fontWeight: 500 }}><span>Today</span><span>{t?.total.amount}</span></div>
          <span style={hint}>{vat ? `Includes ${vat} VAT. ` : ''}Then {sess.recurring?.dueNext?.total?.amount || t?.total.amount} every {every}, until you cancel.</span>
          {sess.email && <span style={hint}>Receipts go to {sess.email}.</span>}
        </div>
      )}
      <div ref={box} />
      {sess && (codeOpen ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={code} onChange={e => setCode(e.target.value)} placeholder="Promotion code" aria-label="Promotion code" className={focusMark} style={{ ...field, flex: 1 }} />
          <button onClick={promo} className={hoverTint} style={{ ...ghostBtn, height: 44, padding: '0 16px' }}>Apply</button>
        </div>
      ) : <button onClick={() => setCodeOpen(true)} className="tap" style={{ ...linkBtn('rgba(var(--ink-rgb),.75)'), alignSelf: 'flex-start' }}>Have a promotion code?</button>)}
      <Notice err={err} />
      <button onClick={pay} disabled={!sess?.canConfirm || busy} className={busy ? undefined : hover(`background:${INK}`)} style={{ height: 50, border: 'none', borderRadius: 2, background: MARK, color: PAPER, font: `500 15px ${SANS}`, cursor: busy ? 'progress' : 'pointer', opacity: !sess?.canConfirm || busy ? 0.55 : 1 }}>{busy ? 'Paying…' : `Pay ${t?.total.amount || ''}`}</button>
      <span style={{ fontSize: 12, lineHeight: 1.5, color: 'rgba(var(--ink-rgb),.6)' }}>Plus is sold by Stripe as merchant of record, who take the payment and handle tax and receipts. It renews automatically; cancel anytime in Settings. By paying you agree to Fletora’s Terms.</span>
    </>
  );
}

/** After paying on our page. */
function PlusThanks({ v }: { v: V }) {
  return (
    <>
      <span style={{ font: `600 11px ${SANS}`, letterSpacing: '.14em', textTransform: 'uppercase', color: MARK }}>Fletora Plus</span>
      <span style={{ ...heading, lineHeight: 1.05 }}>Thank you. Plus is on.</span>
      <span style={{ fontSize: 15, lineHeight: 1.55 }}>Link-only sketchbooks, stats and pinning are in each sketchbook’s Details, and you have more room for sketchbooks and pages. Your receipt is on its way by email, and you can manage Plus in Settings.</span>
      <button onClick={v.plClose} className={hover(`background:${MARK}`)} style={{ height: 48, border: 'none', borderRadius: 2, background: INK, color: PAPER, font: `500 15px ${SANS}`, cursor: 'pointer' }}>Back to my sketchbooks</button>
    </>
  );
}

/** Change the card Plus is charged to, with Stripe's card fields on our page. */
export function CardModal({ v }: { v: V }) {
  const box = useRef<HTMLDivElement>(null), ref = useRef<{ stripe: Awaited<ReturnType<typeof loadStripe>>; elements: StripeElements } | null>(null);
  const [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [err, setErr] = useState('');
  useEffect(() => {
    let gone = false, pe: { destroy(): void } | null = null;
    loadStripe(v.plStripeKey).then(stripe => {
      if (!stripe || gone) return;
      const elements = stripe.elements({ clientSecret: v.cardSecret, appearance: stripeLook(v.plDark), fonts: STRIPE_FONTS });
      const el = elements.create('payment', { layout: 'tabs' }); el.mount(box.current!); el.on('ready', () => setReady(true));
      pe = el; ref.current = { stripe, elements };
    }).catch(e => setErr((e as Error).message));
    return () => { gone = true; pe?.destroy(); };
  }, [v.cardSecret]);
  const save = async () => {
    const r = ref.current; if (!r?.stripe || busy) return;
    setBusy(true); setErr('');
    const res = await r.stripe.confirmSetup({ elements: r.elements, redirect: 'if_required', confirmParams: { return_url: location.origin + '/billing' } });
    if (res.error) { setErr(res.error.message || 'That card didn’t work.'); setBusy(false); return; }
    try { await v.cardSaved(res.setupIntent.id); } catch { setErr('Saved with Stripe, but couldn’t switch Plus to it. Try again.'); setBusy(false); }
  };
  return (
    <Modal onClose={() => {}} pad={v.mModalPad} maxWidth={480} gap={16} z={40} shadow="0 30px 60px rgba(10,10,30,.35)">
      <span style={{ ...heading, fontSize: 32 }}>Change card</span>
      <span style={hint}>Plus will be charged to this card from now on.</span>
      {!ready && <span style={hint}>Loading…</span>}
      <div ref={box} />
      <Notice err={err} />
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={v.cardClose} className={hoverTint} style={{ ...ghostBtn, height: 44, padding: '0 18px', fontSize: 14 }}>Cancel</button>
        <button onClick={save} disabled={!ready || busy} style={{ height: 44, padding: '0 22px', border: 'none', borderRadius: 2, background: INK, color: PAPER, font: `500 14px ${SANS}`, cursor: 'pointer', opacity: !ready || busy ? 0.55 : 1 }}>{busy ? 'Saving…' : 'Save card'}</button>
      </div>
    </Modal>
  );
}

/** Moderators: give someone Plus for free, for a while or for good, or take a gift back. */
export function GiftModal({ v }: { v: V }) {
  const opt = (months: number, l: string) => (
    <button key={months} onClick={() => v.gfGive(months)} disabled={v.gfBusy} className={hoverTint} style={{ ...ghostBtn, height: 44, padding: '0 16px', fontSize: 14, opacity: v.gfBusy ? 0.6 : 1 }}>{l}</button>
  );
  return (
    <Modal onClose={e => { if (e.target === e.currentTarget) v.gfClose(); }} pad={v.mModalPad} maxWidth={460} gap={16} z={40} shadow="0 30px 60px rgba(10,10,30,.35)">
      <span style={{ font: `600 11px ${SANS}`, letterSpacing: '.14em', textTransform: 'uppercase', color: MARK }}>Moderators</span>
      <span style={{ ...heading, fontSize: 32, lineHeight: 1.05 }}>Give {v.gfName} Plus</span>
      <span style={{ fontSize: 14, lineHeight: 1.5 }}>{v.gfNow || 'Free, with no card needed. They get everything in Plus straight away, and it ends by itself.'}</span>
      {v.gfPaid ? null : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {opt(1, '1 month')}{opt(3, '3 months')}{opt(12, '12 months')}{opt(0, 'For good')}
          </div>
          {v.gfHas && <button onClick={() => v.gfGive(-1)} disabled={v.gfBusy} style={{ ...linkBtn(MARK), alignSelf: 'flex-start' }}>Remove their Plus</button>}
        </>
      )}
      <button onClick={v.gfClose} className="tap" style={{ ...linkBtn('rgba(var(--ink-rgb),.75)'), alignSelf: 'center', padding: 4 }}>Close</button>
    </Modal>
  );
}

/** Asks once before any analytics cookies are set (UK PECR); the choice can be changed in Settings → Your data. */
export function ConsentBar({ v }: { v: V }) {
  return (
    <div role="region" aria-label="Analytics" style={{ position: 'absolute', left: 12, right: 12, bottom: 'calc(var(--tabbar, 0px) + 12px)', zIndex: 30, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <div style={{ pointerEvents: 'auto', maxWidth: 560, width: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: '10px 16px', flexWrap: 'wrap', padding: '12px 14px', background: PAPER, border: `1px solid ${INK}`, boxShadow: '0 12px 30px rgba(10,10,30,.18)', fontSize: 13, lineHeight: 1.45 }}>
        <span style={{ flex: '1 1 260px' }}>Can fletora. use anonymous analytics (cookies) to see how the site is used? Nothing is shared for advertising. <button onClick={v.openPrivacy} style={{ ...linkBtn(INK), font: `500 13px ${SANS}`, textDecoration: 'underline' }}>Privacy</button></span>
        <span style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => v.anChoose(false)} className={hoverTint} style={{ ...ghostBtn, height: 36, padding: '0 14px' }}>No thanks</button>
          <button onClick={() => v.anChoose(true)} style={{ height: 36, padding: '0 16px', border: 'none', borderRadius: 2, background: INK, color: PAPER, font: `500 13px ${SANS}`, cursor: 'pointer' }}>Allow</button>
        </span>
      </div>
    </div>
  );
}

/** A save that didn't go through: the changes are kept in this browser until it does. */
export function UnsavedBar({ v }: { v: V }) {
  return (
    <div role="alert" style={{ position: 'absolute', left: 12, right: 12, top: 'calc(env(safe-area-inset-top) + 72px)', zIndex: 31, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <div style={{ pointerEvents: 'auto', maxWidth: 560, width: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: '8px 14px', flexWrap: 'wrap', padding: '10px 12px 10px 14px', background: PAPER, border: `1px solid ${MARK}`, borderLeftWidth: 3, boxShadow: '0 12px 30px rgba(10,10,30,.16)', fontSize: 13.5, lineHeight: 1.45 }}>
        <span style={{ flex: '1 1 240px' }}><b style={{ fontWeight: 600 }}>{v.usText}</b> Your changes are kept on this device until it works.{v.usWhy && <span style={{ display: 'block', fontSize: 12, color: 'rgba(var(--ink-rgb),.6)', marginTop: 2, overflowWrap: 'anywhere' }}>Reason: {v.usWhy}</span>}</span>
        <button onClick={v.usRetry} disabled={v.usBusy} style={{ height: 34, padding: '0 16px', border: 'none', borderRadius: 2, background: INK, color: PAPER, font: `500 13px ${SANS}`, cursor: v.usBusy ? 'progress' : 'pointer', opacity: v.usBusy ? 0.6 : 1 }}>{v.usBusy ? 'Saving…' : 'Try again'}</button>
      </div>
    </div>
  );
}

/** Fletora's own "are you sure?" in place of the browser's. */
export function AskModal({ v }: { v: V }) {
  const q = v.askQ;
  return (
    <Modal onClose={e => { if (e.target === e.currentTarget) v.askNo(); }} pad={v.mModalPad} maxWidth={440} gap={16} z={50} shadow="0 30px 60px rgba(10,10,30,.35)">
      <span role="heading" aria-level={2} style={{ ...heading, fontSize: 30, lineHeight: 1.1 }}>{q.title}</span>
      <span style={{ fontSize: 15, lineHeight: 1.55 }}>{q.text}</span>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        {!q.notice && <button onClick={v.askNo} autoFocus className={hoverTint} style={{ ...ghostBtn, height: 44, padding: '0 18px', fontSize: 14 }}>Cancel</button>}
        <button onClick={v.askYes} style={{ height: 44, padding: '0 20px', border: 'none', borderRadius: 2, background: q.danger ? MARK : INK, color: PAPER, font: `500 14px ${SANS}`, cursor: 'pointer' }}>{q.yes}</button>
      </div>
    </Modal>
  );
}

/** Asks before cancelling Plus or switching it to yearly. */
export function PlanConfirm({ v }: { v: V }) {
  const cancel = v.bdAsk === 'cancel';
  return (
    <Modal onClose={e => { if (e.target === e.currentTarget) v.bdNo(); }} pad={v.mModalPad} maxWidth={440} gap={16} z={40} shadow="0 30px 60px rgba(10,10,30,.35)">
      <span style={{ ...heading, fontSize: 32 }}>{cancel ? 'Cancel Plus?' : 'Switch to yearly?'}</span>
      <span style={{ fontSize: 15, lineHeight: 1.55 }}>{cancel
        ? `You keep Plus until ${v.bdEnd} and won’t be charged again. After that, link-only sketchbooks become private and the free plan’s limits apply to anything new. Nothing you’ve made is deleted.`
        : `Your year starts today at ${v.bdYearPrice}, less credit for what’s left of this month, charged to your saved card now.`}</span>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <button onClick={v.bdNo} className={hoverTint} style={{ ...ghostBtn, height: 44, padding: '0 18px', fontSize: 14 }}>{cancel ? 'Keep Plus' : 'Not now'}</button>
        <button onClick={cancel ? v.bdCancel : v.bdSwitch} disabled={v.bdBusy} style={{ height: 44, padding: '0 20px', border: 'none', borderRadius: 2, background: cancel ? MARK : INK, color: PAPER, font: `500 14px ${SANS}`, cursor: 'pointer', opacity: v.bdBusy ? 0.6 : 1 }}>{v.bdBusy ? 'One moment…' : cancel ? 'Cancel Plus' : 'Switch to yearly'}</button>
      </div>
    </Modal>
  );
}

/** Stripe's checkout as a page of its own that the browser scrolls. Browsers (iPhones, and Safari on computers)
 *  don't pass a scroll from inside Stripe's form (an iframe) on to a scrolling box around it, only to the page, so
 *  the page scrolls while it's open. */
function CheckoutPage({ v }: { v: V }) {
  useEffect(() => {
    const els = [document.documentElement, document.body], was = els.map(e => [e.style.overflow, e.style.height]);
    els.forEach(e => { e.style.overflow = 'auto'; e.style.height = 'auto'; }); scrollTo(0, 0);
    return () => els.forEach((e, i) => { [e.style.overflow, e.style.height] = was[i]; });
  }, []);
  return createPortal(
    <div role="dialog" aria-label="Checkout" style={{ position: 'absolute', top: 0, left: 0, right: 0, minHeight: '100%', zIndex: 1000, background: PAPER, color: INK, fontFamily: SANS, boxSizing: 'border-box', padding: v.notMob ? '32px 24px 64px' : '14px 12px calc(32px + env(safe-area-inset-bottom))' }}>
      <div style={{ maxWidth: v.plUi === 'elements' ? 520 : 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {v.plUi === 'elements' ? <FletoraCheckout v={v} /> : <EmbeddedCheckout v={v} />}
      </div>
    </div>, document.body);
}

/** Fletora Plus: what it adds, monthly or yearly, then Stripe's checkout (in the sheet, or on Stripe's page). */
export function PlusModal({ v }: { v: V }) {
  if (v.plDone) return (
    <Modal onClose={e => { if (e.target === e.currentTarget) v.plClose(); }} pad={v.mModalPad} maxWidth={480} gap={18} z={40} shadow="0 30px 60px rgba(10,10,30,.35)">
      <PlusThanks v={v} />
    </Modal>
  );
  // Stripe's whole form is a tall iframe: always a page of its own. Our own form stays in the sheet on computers.
  if (v.plSecret && (!v.notMob || v.plUi !== 'elements')) return <CheckoutPage v={v} />;
  if (v.plSecret) return (
    // Clicking outside doesn't close it mid-payment; Back does.
    <Modal onClose={() => {}} pad={v.notMob ? (v.plUi === 'elements' ? v.mModalPad : 24) : 12} maxWidth={v.plUi === 'elements' ? 520 : 640} gap={v.plUi === 'elements' ? 16 : 14} z={40} shadow="0 30px 60px rgba(10,10,30,.35)">
      {v.plUi === 'elements' ? <FletoraCheckout v={v} /> : <EmbeddedCheckout v={v} />}
    </Modal>
  );
  return (
    <Modal onClose={e => { if (e.target === e.currentTarget) v.plClose(); }} pad={v.mModalPad} maxWidth={520} gap={20} z={40} shadow="0 30px 60px rgba(10,10,30,.35)">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ font: `600 11px ${SANS}`, letterSpacing: '.14em', textTransform: 'uppercase', color: MARK }}>Fletora Plus</span>
        <span style={{ ...heading, fontSize: v.notMob ? 38 : 32, lineHeight: 1.05 }}>More room for your sketchbooks.</span>
        {v.plReason && <span style={{ fontSize: 14, color: 'rgba(var(--ink-rgb),.7)' }}>{v.plReason}</span>}
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {v.plPerks.map((pk: V) => (
          <li key={pk.key} style={{ display: 'flex', gap: 10, fontSize: 14, lineHeight: 1.4 }}>
            <span aria-hidden="true" style={{ color: MARK, fontWeight: 600 }}>✓</span>
            <span><b style={{ fontWeight: 600 }}>{pk.title}</b> <span style={{ color: 'rgba(var(--ink-rgb),.6)' }}>{pk.note}</span></span>
          </li>
        ))}
      </ul>
      {v.plHave ? (
        <span style={{ fontSize: 14 }}>You have Plus. Thank you for supporting Fletora. Manage it in Settings.</span>
      ) : (
        <>
          <div role="radiogroup" aria-label="Plan" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {v.plPlans.map((pl: V) => {
              const on = v.plPlan === pl.key;
              return (
                <button key={pl.key} role="radio" aria-checked={on} onClick={() => v.plSetPlan(pl.key)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, padding: '12px 14px', borderRadius: 2, border: `1.5px solid ${on ? INK : 'rgba(var(--ink-rgb),.2)'}`, background: on ? 'rgba(var(--ink-rgb),.05)' : 'none', color: INK, cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ font: `500 15px ${SANS}` }}>{pl.label}</span>
                  <span style={{ fontSize: 13, color: 'rgba(var(--ink-rgb),.65)' }}>{pl.note}</span>
                </button>
              );
            })}
          </div>
          <Notice err={v.plErr} />
          <button onClick={v.plBuy} disabled={v.plBusy} className={v.plBusy ? undefined : hover(`background:${INK}`)} style={{ height: 48, border: 'none', borderRadius: 2, background: MARK, color: PAPER, font: `500 15px ${SANS}`, cursor: v.plBusy ? 'progress' : 'pointer', opacity: v.plBusy ? 0.6 : 1 }}>{v.plBusy ? 'Opening checkout…' : 'Continue to payment'}</button>
          <span style={{ fontSize: 12, lineHeight: 1.5, color: 'rgba(var(--ink-rgb),.6)' }}>Renews automatically. Cancel anytime in Settings and keep Plus until the end of the period you’ve paid for. Payments are handled by Stripe.</span>
        </>
      )}
      <button onClick={v.plClose} className="tap" style={{ ...linkBtn('rgba(var(--ink-rgb),.75)'), alignSelf: 'center', padding: 4 }}>{v.plHave ? 'Close' : 'Not now'}</button>
    </Modal>
  );
}

/** One page: bigger preview, its caption and date, and what you can do with it. */
function PageSheet({ v, pg }: { v: V; pg: V }) {
  const first = v.mgPage === 0, last = v.mgPage === v.pagesList.length - 1, mob = !v.notMob;
  const act: CSSProperties = { ...ghostBtn, height: 44, padding: '0 18px', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 };
  const move = (off: boolean): CSSProperties => ({ ...ghostBtn, width: 36, height: 36, padding: 0, fontSize: 16, opacity: off ? 0.35 : 1, cursor: off ? 'default' : 'pointer' });
  const icon = (d: string) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
  const note = pg.spread ? 'Half of a picture across two pages: moving or removing it moves or removes both halves.'
    : pg.filler ? 'A blank page that keeps the spread after it on facing pages. It goes away by itself when it’s no longer needed.' : '';
  return (
    <div onClick={e => { if (e.target === e.currentTarget) v.closePage(); }} style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'rgba(var(--canvas-rgb),.88)', display: 'flex', alignItems: mob ? 'flex-end' : 'center', justifyContent: 'center', padding: mob ? 0 : 24 }}>
      <div role="dialog" aria-label={`Page ${pg.num}`} style={{ background: PAPER, border: mob ? 'none' : `1px solid ${INK}`, borderTop: `1px solid ${INK}`, width: '100%', maxWidth: 760, maxHeight: '100%', overflowY: 'auto', boxSizing: 'border-box', padding: mob ? '20px 16px calc(20px + env(safe-area-inset-bottom))' : 32, display: 'grid', gridTemplateColumns: mob ? '1fr' : '240px minmax(0, 1fr)', gap: mob ? 18 : 32, alignItems: 'start' }}>
        <div style={{ width: mob ? '46%' : '100%', justifySelf: 'center', aspectRatio: v.pgAspect, borderRadius: '2px 8px 8px 2px', background: pg.bg, boxShadow: '0 10px 24px rgba(10,10,30,.25)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0, alignSelf: 'stretch' }}>
          {/* Title, where it sits in the book, and moving it earlier or later. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ font: `400 30px/1 ${SERIF}`, flex: 1 }}>Page {pg.num}</span>
            <span style={hint}>{v.mgPage + 1} of {v.pagesList.length}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={pg.left} disabled={first} aria-label="Move earlier" title="Move earlier" className={first ? undefined : hoverTint} style={move(first)}>←</button>
              <button onClick={pg.right} disabled={last} aria-label="Move later" title="Move later" className={last ? undefined : hoverTint} style={move(last)}>→</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: 12 }}>
            <label style={fieldLabel}>Caption
              <input value={pg.caption} onChange={pg.onCaption} maxLength={140} placeholder="Where, what, who" autoFocus={v.notMob} className={focusMark} style={field} />
            </label>
            <label style={fieldLabel}>Date
              <input type="date" value={pg.date} onChange={pg.onDate} className={focusMark} style={{ ...field, color: pg.date ? INK : 'rgba(var(--ink-rgb),.5)' }} />
            </label>
          </div>
          <span style={{ ...hint, marginTop: -8 }}>Shown in the page’s margin in the book.{note && ' ' + note}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {!pg.filler && <button onClick={() => { v.closePage(); pg.edit(); }} className={hoverTint} style={{ ...act, flex: 1 }}>{icon('M4.5 19.5l1.2-4.2L15.5 5.5l3 3-9.8 9.8zM13.5 7.5l3 3')}Edit</button>}
            {!pg.filler && <button onClick={pg.save} className={hoverTint} style={{ ...act, flex: 1 }}>{icon('M12 4v11M7 10.5l5 5 5-5M5 19.5h14')}Download</button>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 14, borderTop: '1px solid rgba(var(--ink-rgb),.12)' }}>
            {pg.filler ? <span /> : <button onClick={() => { v.closePage(); pg.remove(); }} className="tap" style={linkBtn(MARK)}>{pg.spread ? 'Remove both pages' : 'Remove page'}</button>}
            <button onClick={v.closePage} style={{ height: 44, padding: '0 28px', borderRadius: 2, border: 'none', background: INK, color: PAPER, font: `500 14px ${SANS}`, cursor: 'pointer' }}>Done</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Who draws in the sketchbook: the people in it, invitations waiting, and inviting someone (one person, or five with Plus). */
function SharePanel({ v }: { v: V }) {
  const who = (m: V) => <><b style={{ fontWeight: 600 }}>{m.name}</b> <span style={{ color: 'rgba(var(--ink-rgb),.6)' }}>{m.handle}</span></>;
  const line: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', fontSize: 14, padding: '8px 0', borderBottom: '1px solid rgba(var(--ink-rgb),.08)' };
  return (
    <Row label="Draw together" note={`${v.shPlus ? 'Up to five people' : 'One other person'} can add and caption pages. Invitations are sent straight away, without needing Save.`}>
      {(v.shPeople.length > 0 || v.shInvites.length > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {v.shPeople.map((m: V) => (
            <div key={m.key} style={line}><span>{who(m)}</span><button onClick={m.remove} disabled={v.shBusy} style={linkBtn(MARK)}>Stop sharing</button></div>
          ))}
          {v.shInvites.map((m: V) => (
            <div key={m.key} style={line}><span>{who(m)} <span style={{ color: 'rgba(var(--ink-rgb),.6)' }}>· invited</span></span><button onClick={m.cancel} disabled={v.shBusy} style={linkBtn('rgba(var(--ink-rgb),.75)')}>Cancel invitation</button></div>
          ))}
        </div>
      )}
      {v.shRoom ? (
        <form onSubmit={v.shInviteSend} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 220px' }}><HandleField value={v.shDraft} onChange={v.onShDraft} placeholder="their handle" /></div>
          <button type="submit" disabled={v.shBusy || !v.shDraft} style={{ height: 44, padding: '0 20px', borderRadius: 2, border: 'none', background: INK, color: PAPER, font: `500 14px ${SANS}`, cursor: 'pointer', opacity: v.shBusy || !v.shDraft ? 0.5 : 1 }}>{v.shBusy ? 'Inviting…' : 'Invite'}</button>
        </form>
      ) : v.shPlus ? (
        <span style={hint}>Shared with as many people as a sketchbook can be ({v.shLimit}).</span>
      ) : (
        <button onClick={v.shMore} className={hoverTint} style={{ ...ghostBtn, alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 14px' }}>Invite more people <PlusTag /></button>
      )}
      <Notice err={v.shErr} />
    </Row>
  );
}

function Slider({ name, lbl, min, max, step, value, onChange }: { name: string; lbl: string; min: number; max: number; step: number; value: number; onChange: ChangeEventHandler<HTMLInputElement> }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{name}</span><span style={{ color: 'rgba(var(--ink-rgb),.7)' }}>{lbl}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={onChange} style={{ width: '100%', accentColor: INK }} />
    </label>
  );
}

const ED_TOOLS: [string, string, number, number, number, string][] = [
  ['scale', 'Zoom', 0.3, 4, 0.01, 'scaleLbl'], ['rot', 'Rotate', -180, 180, 0.5, 'rotLbl'], ['skx', 'Skew ↔', -30, 30, 0.5, 'skxLbl'], ['sky', 'Skew ↕', -30, 30, 0.5, 'skyLbl'],
];
const ED_ON: Record<string, string> = { scale: 'onScale', rot: 'onRot', skx: 'onSkx', sky: 'onSky' };
const ADJ_SHORT: Record<string, string> = { bri: 'Light', con: 'Contrast', sat: 'Colour', warm: 'Warmth', white: 'Whites' };

/** Everything on the page: paper and image (with the colour matrix), drawing and typed text. */
/** The paint layer's canvases (kept by the Painter, so they live on between renders). */
function PaintView({ el }: { el: HTMLElement }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.append(el); return () => el.remove(); }, [el]);
  return <div ref={ref} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />;
}

function Layers({ v, inPad }: { v: V; inPad?: boolean }) {
  return (
    <>
      {/* Same paper and the same colour matrix the saved page gets. */}
      <div style={{ position: 'absolute', inset: 0, background: '#f3efe6', filter: v.edAdjusted && !v.edPeek ? 'url(#ed-adjust)' : undefined, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: v.bw, height: v.bh, transform: `translate(-50%,-50%) ${v.edTransform}`, background: v.edBg }} />
      </div>
      {v.edPaint && !inPad && <PaintView el={v.edPaint} />}
      {v.edMarks.length > 0 && (
        <svg width={v.fw} height={v.fh} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} aria-hidden="true">
          {v.edMarks.map((m: V, i: number) => <path key={i} d={m.d} fill="none" stroke={m.color} strokeWidth={m.w} strokeOpacity={m.alpha} strokeLinecap="round" strokeLinejoin="round" />)}
        </svg>
      )}
      {v.edTexts.map((t: V) => (
        <div key={t.id} data-tid={inPad ? undefined : t.id} style={{ position: 'absolute', left: t.left, top: t.top, width: t.width, font: t.font, lineHeight: `${t.lineH}px`, color: t.color, textAlign: t.align, whiteSpace: 'pre', pointerEvents: v.edWrite && !inPad ? 'auto' : 'none', cursor: 'grab', outline: inPad ? 'none' : t.sel ? `1.5px dashed ${MARK}` : v.edWrite ? '1px dashed rgba(34,35,32,.25)' : 'none', outlineOffset: 4 }}>
          {t.empty ? <div style={{ height: t.lineH, color: 'rgba(34,35,32,.35)' }}>Type here</div> : t.lines.map((l: string, i: number) => <div key={i} style={{ height: t.lineH }}>{l}</div>)}
        </div>
      ))}
      {v.edWrite && (
        <svg width={v.fw} height={v.fh} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} aria-hidden="true">
          {v.edInkPaths.map((d: string, i: number) => <path key={i} d={d} fill="none" stroke={TEXT_INK} strokeWidth={inPad ? 1.6 : 2.6} strokeLinecap="round" strokeLinejoin="round" opacity={v.inkBusy ? 0.35 : 1} />)}
        </svg>
      )}
    </>
  );
}

/** The page-shaped frame: the image (dragged, pinched, twisted) under a thirds grid in Fit; a canvas in Draw and Write. */
/** Drawing zoomed in: how far, with zoom out / in and a way straight back (phones show it only while zoomed). */
function ZoomChip({ v }: { v: V }) {
  const b: CSSProperties = { width: 28, height: 28, padding: 0, border: 'none', borderRadius: 14, background: 'none', color: '#F6F2E8', font: `500 16px ${SANS}`, cursor: 'pointer' };
  return (
    <div onPointerDown={e => e.stopPropagation()} style={{ position: 'absolute', right: 8, bottom: 8, display: 'flex', alignItems: 'center', gap: 2, padding: 2, borderRadius: 16, background: 'rgba(34,35,32,.78)', color: '#F6F2E8', font: `500 12px ${SANS}` }}>
      {v.notMob && <button onClick={v.zoomOutDraw} aria-label="Zoom out" style={b}>−</button>}
      <button onClick={v.zoomResetDraw} title="Back to the whole page" aria-label={`Zoom ${v.edZoomPct}, back to the whole page`} style={{ ...b, width: 'auto', padding: '0 8px', fontSize: 12 }}>{v.edZoomPct}</button>
      {v.notMob && <button onClick={v.zoomInDraw} aria-label="Zoom in" style={b}>+</button>}
    </div>
  );
}

function EditFrame({ v, radius, shadow, wheel }: { v: V; radius: string; shadow: string; wheel?: boolean }) {
  const pen = v.edDraw || (v.edWrite && !v.edPad), t = v.edTurn;
  // Drawing: pinch on a trackpad and scroll need a listener that can stop the browser zooming the whole page.
  const wheelRef = useRef<HTMLDivElement | null>(null), handler = useRef(v.drawWheel); handler.current = v.drawWheel;
  const frameWheel = (el: HTMLDivElement | null) => {
    if (wheelRef.current === el) return;
    const h = (e: WheelEvent) => handler.current?.(e);
    wheelRef.current?.removeEventListener('wheel', (wheelRef.current as unknown as { _wh: EventListener })._wh);
    wheelRef.current = el; if (el) { (el as unknown as { _wh: EventListener })._wh = h as EventListener; el.addEventListener('wheel', h, { passive: false }); }
  };
  // Turned on screen (Draw): a box the turned page fits, with the page rotated and scaled inside it.
  if (t.q) return (
    <div style={{ width: t.bw, height: t.bh, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'width .25s, height .25s' }}>
      <div style={{ flexShrink: 0, transform: `rotate(${t.q * 90}deg) scale(${t.k})`, transition: 'transform .25s' }}><EditFrame v={{ ...v, edTurn: { q: 0 } }} radius={radius} shadow={shadow} wheel={wheel} /></div>
    </div>
  );
  return (
    <div ref={frameWheel} onPointerDown={v.edDown} onPointerMove={v.edMove} onPointerUp={v.edUp} onPointerCancel={v.edUp} onWheel={wheel && v.edMode === 'fit' ? v.edWheel : undefined} style={{ position: 'relative', width: v.fw, height: v.fh, flexShrink: 0, overflow: 'hidden', borderRadius: radius, boxShadow: shadow, cursor: pen && !v.edWrite ? 'crosshair' : v.edWrite ? 'text' : v.edMode === 'pick' ? 'default' : 'move', touchAction: 'none' }}>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <filter id="ed-adjust" colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values={v.edFx} /></filter>
      </svg>
      {/* Zoomed in while drawing: the page (photo, paint and text) is scaled and moved inside the frame. */}
      <div style={{ position: 'absolute', inset: 0, transformOrigin: '0 0', transform: v.edZoomT || undefined }}><Layers v={v} /></div>
      {v.edDraw && (v.edZoomed || v.notMob) && <ZoomChip v={v} />}
      {v.edMode === 'fit' && <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(var(--ink-rgb),.35) 1px,transparent 1px),linear-gradient(90deg,rgba(var(--ink-rgb),.35) 1px,transparent 1px)', backgroundSize: '33.34% 33.34%', mixBlendMode: 'difference', opacity: .5 }} />}
      {/* Profile photo: everything outside the circle is dimmed, as it won't show. */}
      {v.edAvatar && <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', boxShadow: '0 0 0 9999px rgba(20,20,22,.5)', outline: '1.5px solid rgba(255,255,255,.85)', pointerEvents: 'none' }} />}
      {v.edPad && <div style={{ position: 'absolute', ...v.padRect, boxSizing: 'border-box', border: `1.5px solid ${MARK}`, borderRadius: 2, background: 'rgba(173,73,58,.06)', pointerEvents: 'none' }} />}
      {v.inkBusy && <span style={{ position: 'absolute', left: '50%', top: 12, transform: 'translateX(-50%)', padding: '5px 12px', borderRadius: 12, background: 'rgba(34,35,32,.8)', color: '#F6F2E8', font: `500 12px ${SANS}` }}>Reading your writing…</span>}
      {v.edPeek && <span style={{ position: 'absolute', left: 8, top: 8, padding: '3px 8px', borderRadius: 10, background: 'rgba(34,35,32,.75)', color: '#F6F2E8', font: `500 11px ${SANS}` }}>Original</span>}
      {/* Two pages: where the picture is cut, at the book's fold. */}
      {v.edSpread && <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 0, borderLeft: '1.5px dashed rgba(246,242,233,.9)', boxShadow: '0 0 0 .5px rgba(34,35,32,.35)', pointerEvents: 'none' }} />}
    </div>
  );
}

/** A new picture: on one page, or across two (cut down the middle onto facing pages). */
function SpreadSwitch({ v, height = 34 }: { v: V; height?: number }) {
  if (!v.edCanSpread) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div role="radiogroup" aria-label="Pages" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, padding: 3, border: '1px solid rgba(var(--ink-rgb),.2)' }}>
        {([[false, 'One page'], [true, 'Across two pages']] as const).map(([on, l]) => (
          <button key={l} role="radio" aria-checked={v.edSpread === on} onClick={() => v.setSpread(on)} style={{ height, border: 'none', borderRadius: 2, background: v.edSpread === on ? INK : 'transparent', color: v.edSpread === on ? PAPER : INK, font: `500 13px ${SANS}`, cursor: 'pointer', whiteSpace: 'nowrap' }}>{l}</button>
        ))}
      </div>
      {v.edSpread && <span style={{ fontSize: 12, lineHeight: 1.45, color: 'rgba(var(--ink-rgb),.6)' }}>{v.edSpreadNote}</span>}
    </div>
  );
}

/** Write mode's zoom pad: a magnified strip of the page (the red box) to write in comfortably. It slides along as you write. */
function WritePad({ v }: { v: V }) {
  return (
    <div onPointerDown={v.padDown} onPointerMove={v.padMove} onPointerUp={v.padUp} onPointerCancel={v.padUp} aria-label="Writing pad" style={{ position: 'relative', width: v.padW, height: v.padH, flexShrink: 0, overflow: 'hidden', borderRadius: 4, border: `1.5px solid ${MARK}`, boxSizing: 'border-box', cursor: 'crosshair', touchAction: 'none', background: '#f3efe6' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: v.fw, height: v.fh, transformOrigin: '0 0', transform: v.padInner, pointerEvents: 'none' }}>
        <Layers v={v} inPad />
      </div>
      {v.padGuide > 0 && <div style={{ position: 'absolute', left: 10, right: 10, top: `${v.padGuide * 100}%`, borderTop: '1px dashed rgba(34,35,32,.3)', pointerEvents: 'none' }} />}
    </div>
  );
}

const MODE_NAMES: Record<string, string> = { fit: 'Fit', adjust: 'Adjust', draw: 'Draw', write: 'Text' };
const TITLES: Record<string, string> = { fit: 'Fit your page', adjust: 'Adjust', draw: 'Draw', write: 'Text', pick: 'New page' };

function ModeSwitch({ v, height = 36 }: { v: V; height?: number }) {
  if (v.edMode === 'pick') return null;
  const modes = v.edAvatar ? ['fit', 'adjust'] : v.edBlank ? ['draw', 'write'] : ['fit', 'adjust', 'draw', 'write'];
  return (
    <div role="tablist" aria-label="Editor" style={{ display: 'grid', gridTemplateColumns: `repeat(${modes.length}, 1fr)`, gap: 2, padding: 3, border: '1px solid rgba(var(--ink-rgb),.2)' }}>
      {modes.map(k => (
        <button key={k} role="tab" aria-selected={v.edMode === k} onClick={() => v.setEdMode(k)} style={{ height, border: 'none', borderRadius: 2, background: v.edMode === k ? INK : 'transparent', color: v.edMode === k ? PAPER : INK, font: `500 14px ${SANS}`, cursor: 'pointer' }}>{MODE_NAMES[k]}{k === 'adjust' && v.edAdjusted ? ' •' : ''}</button>
      ))}
    </div>
  );
}

/** A new blank page starts with a choice: draw on it, or write. */
function PickMode({ v, mob }: { v: V; mob?: boolean }) {
  const card: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start', textAlign: 'left', padding: mob ? '14px 16px' : '18px 18px', border: '1.5px solid rgba(var(--ink-rgb),.25)', borderRadius: 2, background: 'none', color: INK, cursor: 'pointer' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {([['draw', 'Draw', 'Pen, pencil, marker, watercolour and oil'], ['write', 'Text', 'Type words onto the page']] as const).map(([k, l, d]) => (
        <button key={k} onClick={() => v.setEdMode(k)} className={hover(`border-color:${INK}`)} style={card}>
          <span style={{ font: `400 24px/1.1 ${SERIF}` }}>{l}</span>
          <span style={{ font: `400 13px ${SANS}`, color: 'rgba(var(--ink-rgb),.65)' }}>{d}</span>
        </button>
      ))}
    </div>
  );
}

/** Draw mode: tool, colour and size, undo and clear. */
function DrawTools({ v, outline, mob }: { v: V; outline: CSSProperties; mob?: boolean }) {
  const [wheel, setWheel] = useState(false);
  const chip = (on: boolean): CSSProperties => ({ flex: '1 0 auto', height: 34, padding: '0 12px', border: `1px solid ${on ? INK : 'rgba(var(--ink-rgb),.2)'}`, borderRadius: 17, background: on ? INK : 'transparent', color: on ? PAPER : INK, font: `500 13px ${SANS}`, cursor: 'pointer', whiteSpace: 'nowrap' });
  const dot = (c: string, on: boolean, size: number): CSSProperties => ({ width: size, height: size, flexShrink: 0, borderRadius: '50%', padding: 0, cursor: 'pointer', background: c, border: '1px solid rgba(34,35,32,.25)', boxShadow: on ? `0 0 0 2px ${PAPER}, 0 0 0 4px ${INK}` : 'none' });
  const swatches = [...v.recentColors, ...DRAW_COLORS.map(([c]) => c).filter(c => !v.recentColors.includes(c))].slice(0, mob ? 7 : 9);
  const names = Object.fromEntries(DRAW_COLORS);
  const strength = v.penTool === 'blend' || v.penTool === 'eraser';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: mob ? 12 : 16 }}>
      {!mob && <div style={{ display: 'flex', gap: 8 }}><PageButtons v={v} labels /></div>}
      {/* Every brush in view: four to a row on phones, wrapping beside the page on larger screens. */}
      <div role="tablist" aria-label="Brush" style={mob ? { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 } : { display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {DRAW_TOOLS.map(([k, l]) => <button key={k} role="tab" aria-selected={v.penTool === k} onClick={() => v.setTool(k)} style={mob ? { ...chip(v.penTool === k), height: 32, padding: 0, fontSize: 12.5, minWidth: 0 } : chip(v.penTool === k)}>{l}</button>)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, opacity: v.penNoColor ? 0.45 : 1 }}>
        <div role="radiogroup" aria-label="Colour" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {swatches.map(c => <button key={c} role="radio" aria-checked={v.penColor === c} title={names[c] || c} aria-label={names[c] || c} onClick={() => v.setColor(c)} style={dot(c, v.penColor === c && !wheel, mob ? 28 : 28)} />)}
          <button onClick={() => setWheel(w => !w)} title="Colour wheel" aria-label="Colour wheel" aria-expanded={wheel} style={{ ...dot('conic-gradient(red, yellow, lime, cyan, blue, magenta, red)', wheel, mob ? 30 : 28) }} />
          <button onClick={v.toggleEyedrop} title="Pick a colour from the page" aria-label="Pick a colour from the page" aria-pressed={v.edEyedrop} style={{ width: 32, height: 32, flexShrink: 0, padding: 0, borderRadius: '50%', border: `1px solid ${v.edEyedrop ? INK : 'rgba(var(--ink-rgb),.25)'}`, background: v.edEyedrop ? INK : 'none', color: v.edEyedrop ? PAPER : INK, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19.6 4.4a2.2 2.2 0 0 0-3.1 0l-2.3 2.3-1.1-1.1-1.5 1.5 5.3 5.3 1.5-1.5-1.1-1.1 2.3-2.3a2.2 2.2 0 0 0 0-3.1zM12.4 8.4l-7.2 7.2-.7 3.9 3.9-.7 7.2-7.2" /></svg>
          </button>
        </div>
        {v.edEyedrop && <span style={{ fontSize: 12, color: MARK }}>Tap the page to pick up a colour.</span>}
        {wheel && <ColourWheel color={v.penColor} onChange={v.setColor} size={mob ? 92 : 160} />}
      </div>
      {/* Phones: one line per slider, and the colour wheel takes their place while it's open, so the page stays big. */}
      {mob ? !wheel && <>
        <InlineSlider name="Size" lbl={String(v.penSize)} min={1} max={40} value={v.penSize} onChange={v.onPenSize} />
        <InlineSlider name={strength ? 'Strength' : 'Opacity'} lbl={`${v.penOpacity}%`} min={5} max={100} value={v.penOpacity} onChange={v.onPenOpacity} />
      </> : <>
        <Slider name={v.penTool === 'eraser' ? 'Eraser size' : 'Size'} lbl={String(v.penSize)} min={1} max={40} step={1} value={v.penSize} onChange={v.onPenSize} />
        <Slider name={strength ? 'Strength' : 'Opacity'} lbl={`${v.penOpacity}%`} min={5} max={100} step={1} value={v.penOpacity} onChange={v.onPenOpacity} />
      </>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={v.undoMark} disabled={!v.hasMarks} style={{ ...outline, opacity: v.hasMarks ? 1 : 0.4 }}>Undo</button>
        <button onClick={v.clearMarks} style={outline}>Clear</button>
      </div>
    </div>
  );
}

function InlineSlider({ name, lbl, min, max, value, onChange }: { name: string; lbl: string; min: number; max: number; value: number; onChange: ChangeEventHandler<HTMLInputElement> }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
      <span style={{ width: 64, color: 'rgba(var(--ink-rgb),.7)' }}>{name}</span>
      <input type="range" min={min} max={max} step={1} value={value} onChange={onChange} style={{ flex: 1, accentColor: INK, height: 26 }} />
      <span style={{ width: 40, textAlign: 'right', color: 'rgba(var(--ink-rgb),.7)' }}>{lbl}</span>
    </label>
  );
}

/** Hue round the wheel and strength of colour out from the middle, with brightness on a slider below it. */
function ColourWheel({ color, onChange, size }: { color: string; onChange: (c: string) => void; size: number }) {
  const [h, s, val] = hexHsv(color), [hue, setHue] = useState(h), sat = s, bri = val;
  // Greys have no hue of their own: keep the last one so brightening a grey doesn't jump to red.
  useEffect(() => { if (s > 0.02 && val > 0.02) setHue(h); }, [h, s, val]);
  const at = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect(), dx = e.clientX - r.left - r.width / 2, dy = e.clientY - r.top - r.height / 2;
    const nh = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360, ns = Math.min(1, Math.hypot(dx, dy) / (r.width / 2));
    // Picking a hue from a near-black colour (the default ink) means wanting to see it: start it bright.
    setHue(nh); onChange(hsvHex(nh, ns, bri < 0.3 ? 1 : bri));
  };
  const a = hue * Math.PI / 180, mx = size / 2 + Math.sin(a) * sat * size / 2, my = size / 2 - Math.cos(a) * sat * size / 2;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div role="slider" aria-label="Colour" aria-valuetext={color}
        onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); at(e); }} onPointerMove={e => { if (e.buttons) at(e); }}
        style={{ position: 'relative', width: size, height: size, flexShrink: 0, borderRadius: '50%', cursor: 'crosshair', touchAction: 'none',
          background: 'radial-gradient(circle closest-side, #fff, rgba(255,255,255,0)), conic-gradient(red, yellow, lime, cyan, blue, magenta, red)', boxShadow: 'inset 0 0 0 1px rgba(34,35,32,.15)' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#000', opacity: 1 - bri, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', left: mx - 8, top: my - 8, width: 16, height: 16, borderRadius: '50%', border: '2px solid #fff', boxShadow: '0 0 0 1px rgba(0,0,0,.4)', background: color, boxSizing: 'border-box', pointerEvents: 'none' }} />
      </div>
      <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, minWidth: 0 }}>
        <span style={{ display: 'flex', justifyContent: 'space-between' }}><span>Brightness</span><span style={{ width: 22, height: 22, borderRadius: '50%', background: color, border: '1px solid rgba(34,35,32,.25)' }} /></span>
        <input type="range" min={5} max={100} step={1} value={Math.round(bri * 100)} onChange={e => onChange(hsvHex(hue, sat, parseFloat(e.target.value) / 100))}
          style={{ width: '100%', accentColor: INK, background: `linear-gradient(90deg, #000, ${hsvHex(hue, sat, 1)})`, borderRadius: 6, height: 8, appearance: 'none', WebkitAppearance: 'none' } as CSSProperties} />
        <span style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),.6)', fontVariantNumeric: 'tabular-nums' }}>{color.toUpperCase()}</span>
      </label>
    </div>
  );
}

/** Hold to see the image without adjustments. */
const PeekBtn = ({ v, style }: { v: V; style: CSSProperties }) => (
  <button onPointerDown={v.peekOn} onPointerUp={v.peekOff} onPointerLeave={v.peekOff} onPointerCancel={v.peekOff} onContextMenu={e => e.preventDefault()} disabled={!v.edAdjusted} style={{ ...style, opacity: v.edAdjusted ? 1 : 0.4, touchAction: 'none', userSelect: 'none' }}>Hold to compare</button>
);

/** Text mode controls: how to add text, or the selected text to type into and style (font, size, colour,
 *  alignment, bold, italic), and remove. Style buttons keep the cursor in the text box. */
function WriteTools({ v, outline, mob }: { v: V; outline: CSSProperties; mob?: boolean }) {
  const t = v.selText;
  const keep = (e: { preventDefault(): void }) => e.preventDefault();
  const sq = (on: boolean): CSSProperties => ({ width: 32, height: 32, flexShrink: 0, padding: 0, borderRadius: 2, border: `1px solid ${on ? INK : 'rgba(var(--ink-rgb),.22)'}`, background: on ? INK : 'none', color: on ? PAPER : INK, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' });
  const alignIcon = (a: string) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d={a === 'left' ? 'M4 6h16M4 10h10M4 14h16M4 18h10' : a === 'center' ? 'M4 6h16M7 10h10M4 14h16M7 18h10' : 'M4 6h16M10 10h10M4 14h16M10 18h10'} /></svg>;
  if (t) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: mob ? 10 : 14 }}>
      <textarea key={t.id} autoFocus value={t.text} onChange={t.onText} rows={mob ? 2 : 3} placeholder="Type here" aria-label="Text" className={focusMark} style={{ ...field, height: 'auto', padding: '10px 12px', resize: 'vertical', font: `400 15px/1.4 ${SANS}` }} />
      {/* Fonts, each shown in itself. */}
      <div role="radiogroup" aria-label="Font" onWheel={wheelSideways} style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', ...(mob ? {} : { flexWrap: 'wrap' }) } as CSSProperties}>
        {t.fonts.map((f: V) => <button key={f.key} role="radio" aria-checked={f.on} onMouseDown={keep} onClick={f.pick} style={{ ...chip(f.on), height: 34, font: `400 ${f.key === 'serif' ? 18 : f.key === 'hand' ? 19 : 14}px ${f.css}` }}>{f.label}</button>)}
      </div>
      <Slider name="Size" lbl={t.sizeLbl} min={20} max={120} step={1} value={t.size} onChange={t.onSize} />
      {!mob && <Slider name="Width" lbl={`${t.width}%`} min={15} max={100} step={1} value={t.width} onChange={t.onWidth} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: mob ? 4 : 5, flexWrap: 'wrap' }}>
        {t.aligns.map((a: V) => <button key={a.key} onMouseDown={keep} onClick={a.pick} aria-pressed={a.on} aria-label={`Align ${a.key}`} title={`Align ${a.key}`} style={sq(a.on)}>{alignIcon(a.key)}</button>)}
        {!mob && <span style={{ width: 4 }} />}
        <button onMouseDown={keep} onClick={t.toggleBold} aria-pressed={t.bold} aria-label="Bold" title="Bold" style={{ ...sq(t.bold), font: `700 15px ${SANS}` }}>B</button>
        <button onMouseDown={keep} onClick={t.toggleItalic} aria-pressed={t.italic} aria-label="Italic" title="Italic" style={{ ...sq(t.italic), font: `italic 400 18px ${SERIF}` }}>I</button>
        {!mob && <span style={{ width: 4 }} />}
        {t.colors.map((c: V) => <button key={c.key} onMouseDown={keep} onClick={c.pick} aria-pressed={c.on} aria-label={c.name} title={c.name} style={{ width: mob ? 22 : 24, height: mob ? 22 : 24, flexShrink: 0, borderRadius: '50%', padding: 0, cursor: 'pointer', background: c.key, border: '1px solid rgba(34,35,32,.25)', boxShadow: c.on ? `0 0 0 2px ${PAPER}, 0 0 0 3.5px ${INK}` : 'none' }} />)}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={t.remove} style={{ ...outline, color: MARK }}>Remove text</button>
        <button onClick={t.done} style={outline}>Done</button>
      </div>
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: mob ? 8 : 14 }}>
      {!mob && <span style={{ fontSize: 12, lineHeight: 1.45, color: 'rgba(var(--ink-rgb),.6)' }}>Tap the page where you want text, then type. Tap text to change it; drag it to move it.</span>}
      <button onClick={v.addTextBox} style={{ ...outline, flex: 'none', height: mob ? 42 : 40, border: 'none', background: MARK, color: PAPER }}>+ Add text</button>
    </div>
  );
}

/** Phone layout: top bar, full-width frame (drag, pinch, twist), the mode's controls, big action button. */
function MobileEditor({ v }: { v: V }) {
  const adjust = v.edMode === 'adjust', write = v.edMode === 'write', draw = v.edMode === 'draw', pick = v.edMode === 'pick';
  const tools: { key: string; name: string; min: number; max: number; step: number; value: number; lbl: string; onChange: ChangeEventHandler<HTMLInputElement> }[] = adjust
    ? v.edAdj.map((a: V) => ({ key: a.key, name: ADJ_SHORT[a.key], min: a.min, max: a.max, step: 1, value: a.value, lbl: a.lbl, onChange: a.onChange }))
    : ED_TOOLS.filter(([k]) => !v.edAvatar || k === 'scale' || k === 'rot').map(([k, n, min, max, step, lbl]) => ({ key: k, name: n, min, max, step, value: v[k], lbl: v[lbl], onChange: v[ED_ON[k]] }));
  const tool = tools.find(t => t.key === (adjust ? v.edAdjTool : v.edTool)) || tools[0];
  const choose = (k: string) => adjust ? v.setEdAdjTool(k) : v.setEdTool(k);
  const bar: CSSProperties = { background: 'none', border: 'none', padding: '8px 0', color: INK, font: `500 15px ${SANS}`, cursor: 'pointer' };
  const outline: CSSProperties = { flex: 1, height: 42, borderRadius: 2, border: '1.5px solid rgba(var(--ink-rgb),.5)', background: 'none', color: INK, font: `500 14px ${SANS}`, cursor: 'pointer' };
  const [wheel, setWheel] = useState(false);
  const hint = pick ? 'Choose how to fill this page' : draw ? '' : write ? (v.selText ? 'Type below · drag the text to move it' : 'Tap the page where you want text') : adjust ? 'Whites cleans up the grey of a photographed page' : 'Drag to move · pinch to zoom · twist to rotate';
  return (
    <div style={{ position: 'absolute', inset: 0, background: PAPER, zIndex: 20, display: 'flex', flexDirection: 'column', boxSizing: 'border-box', padding: '0 16px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))', overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8, padding: '12px 0 8px' }}>
        <button onClick={v.cancelEdit} style={{ ...bar, justifySelf: 'start', color: 'rgba(var(--ink-rgb),.75)' }}>Cancel</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ font: `400 22px/1.1 ${SERIF}` }}>{v.edAvatar && v.edMode === 'fit' ? 'Your photo' : TITLES[v.edMode]}</div>
          <div style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),.65)' }}>{v.edTitle}</div>
        </div>
        {v.applyLbl === 'Add to sketchbook' && !v.edOne ? <button onClick={v.skipEdit} style={{ ...bar, justifySelf: 'end', color: 'rgba(var(--ink-rgb),.75)' }}>Skip</button> : <span />}
      </div>
      {/* The page gets whatever room is left here (measured: see frame() in App). */}
      <div ref={v.edAreaRef} style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <EditFrame v={v} radius="2px 8px 8px 2px" shadow="0 12px 30px rgba(10,10,30,.25)" />
        {v.edPad && <WritePad v={v} />}
        {hint && <div style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),.6)' }}>{hint}</div>}
        {draw && v.edEyedrop && <span style={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', padding: '5px 12px', borderRadius: 12, background: 'rgba(34,35,32,.85)', color: '#F6F2E8', font: `500 12px ${SANS}`, whiteSpace: 'nowrap' }}>Tap the page to pick up a colour</span>}
        {draw && v.layersOpen && !wheel && (
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 6, padding: 12, background: PAPER, border: '1px solid rgba(var(--ink-rgb),.18)', borderRadius: 6, boxShadow: '0 10px 30px rgba(20,20,30,.22)' }}>
            <LayersList v={v} onDone={v.toggleLayers} />
          </div>
        )}
        {draw && wheel && (
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 6, padding: 12, background: PAPER, border: '1px solid rgba(var(--ink-rgb),.18)', borderRadius: 6, boxShadow: '0 10px 30px rgba(20,20,30,.22)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <ColourWheel color={v.penColor} onChange={v.setColor} size={112} />
            <button onClick={() => setWheel(false)} style={{ ...outline, flex: 'none', height: 36 }}>Done</button>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: draw ? 10 : 12, paddingTop: 10 }}>
        {draw ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ flex: 1, minWidth: 0 }}><ModeSwitch v={v} height={32} /></div>
            <PageButtons v={v} />
          </div>
        ) : <ModeSwitch v={v} height={34} />}
        {pick ? <PickMode v={v} mob /> : draw ? <DrawBar v={v} wheel={wheel} setWheel={setWheel} /> : write ? <WriteTools v={v} outline={outline} mob /> : <>
        {!adjust && <SpreadSwitch v={v} height={32} />}
        <div role="tablist" aria-label={adjust ? 'Adjustment' : 'Tool'} style={{ display: 'flex', gap: 4, overflowX: 'auto', scrollbarWidth: 'none' } as CSSProperties}>
          {tools.map(t => (
            <button key={t.key} role="tab" aria-selected={t.key === tool.key} onClick={() => choose(t.key)} style={{ flex: '1 0 auto', height: 34, padding: '0 10px', border: `1px solid ${t.key === tool.key ? INK : 'rgba(var(--ink-rgb),.2)'}`, borderRadius: 17, background: t.key === tool.key ? INK : 'transparent', color: t.key === tool.key ? PAPER : INK, font: `500 13px ${SANS}`, cursor: 'pointer', whiteSpace: 'nowrap' }}>{t.name}{adjust && t.value !== 0 ? ' •' : ''}</button>
          ))}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
          <span style={{ width: 64, color: 'rgba(var(--ink-rgb),.7)' }}>{tool.name}</span>
          <input type="range" min={tool.min} max={tool.max} step={tool.step} value={tool.value} onChange={tool.onChange} style={{ flex: 1, accentColor: INK, height: 28 }} />
          <span style={{ width: 48, textAlign: 'right', color: 'rgba(var(--ink-rgb),.7)' }}>{tool.lbl}</span>
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          {adjust ? <PeekBtn v={v} style={outline} /> : <button onClick={v.rot90} style={outline}>Rotate 90°</button>}
          <button onClick={v.resetEd} style={outline}>{adjust ? 'Reset colour' : 'Reset'}</button>
        </div>
        {!adjust && <AutoNote v={v} />}
        </>}
        {!pick && <button onClick={v.applyEdit} style={{ height: draw ? 46 : 52, borderRadius: 2, border: 'none', background: INK, color: PAPER, font: `500 16px ${SANS}`, cursor: 'pointer' }}>{v.applyLbl}</button>}
      </div>
    </div>
  );
}

/** Larger screens, Draw: the brushes and page tools in a column beside the page, each named on hover. */
function DeskToolbar({ v }: { v: V }) {
  const icon = (d: string) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
  // Shorter screens get slightly smaller buttons, so the whole bar fits beside the page.
  const sz = (window.innerHeight || 900) < 860 ? 36 : 44;
  const btn = (on: boolean, off?: boolean): CSSProperties => ({ width: sz, height: sz, padding: 0, border: 'none', borderRadius: sz > 40 ? 12 : 10, background: on ? INK : 'transparent', color: on ? PAPER : INK, opacity: off ? 0.35 : 1, cursor: off ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s, color .15s' });
  const hov = hover('background:rgba(var(--ink-rgb),.08)');
  const item = (key: string, label: string, d: string, on: boolean, onClick: () => void, off?: boolean) => (
    <button key={key} onClick={onClick} disabled={off} aria-label={label} aria-pressed={on} data-tip={label} className={'tip ' + (on || off ? '' : hov)} style={btn(on, off)}>{icon(d)}</button>
  );
  const line = <span style={{ height: 1, margin: '4px 8px', background: 'rgba(var(--ink-rgb),.14)' }} />;
  return (
    <div role="toolbar" aria-label="Brushes" aria-orientation="vertical" style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 6, background: PAPER, border: '1px solid rgba(var(--ink-rgb),.14)', borderRadius: 18, boxShadow: '0 12px 32px rgba(20,20,30,.12)' }}>
      {DRAW_TOOLS.map(([k, l]) => item(k, l, BRUSH_ICONS[k], v.penTool === k, () => v.setTool(k)))}
      {line}
      {item('pick', 'Pick a colour from the page', 'M19.6 4.4a2.2 2.2 0 0 0-3.1 0l-2.3 2.3-1.1-1.1-1.5 1.5 5.3 5.3 1.5-1.5-1.1-1.1 2.3-2.3a2.2 2.2 0 0 0 0-3.1zM12.4 8.4l-7.2 7.2-.7 3.9 3.9-.7 7.2-7.2', v.edEyedrop, v.toggleEyedrop)}
      {item('undo', 'Undo', 'M9 5L4 10l5 5M4 10h10a5 5 0 0 1 0 10h-3', false, v.undoMark, !v.hasMarks)}
      {item('redo', 'Redo', 'M15 5l5 5-5 5M20 10H10a5 5 0 0 0 0 10h3', false, v.redoMark, !v.hasRedo)}
      {item('layers', 'Layers', 'M12 4l8.5 4.5L12 13 3.5 8.5zM3.5 12.5L12 17l8.5-4.5M3.5 16.5L12 21l8.5-4.5', v.layersOpen, v.toggleLayers)}
      {item('clear', 'Clear the drawing', 'M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13', false, v.clearMarks)}
      {line}
      {item('turn', 'Turn the page to draw sideways', 'M20 11a8 8 0 1 0-2.3 5.7M20 4.5V11h-6.5', v.edTurned, v.turnView)}
      {v.edCanSpread && item('spread', 'Draw across two pages', 'M3.5 5.5h8v13h-8zM12.5 5.5h8v13h-8z', v.edSpread, v.toggleDrawSpread)}
    </div>
  );
}

/** Larger screens, Draw: the chosen brush, the colour wheel, size and opacity. */
function DrawPanel({ v }: { v: V }) {
  const tool = DRAW_TOOLS.find(([k]) => k === v.penTool)?.[1] || '', strength = v.penTool === 'blend' || v.penTool === 'eraser';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid rgba(var(--ink-rgb),.14)', borderRadius: 10 }}>
        <span style={{ width: 22, height: 22, borderRadius: '50%', background: v.penNoColor ? 'transparent' : v.penColor, border: '1px solid rgba(34,35,32,.25)', flexShrink: 0 }} />
        <span style={{ font: `500 14px ${SANS}` }}>{tool}</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(var(--ink-rgb),.6)' }}>{v.edEyedrop ? 'Tap the page to pick a colour' : v.penNoColor ? 'No colour' : v.penColor.toUpperCase()}</span>
      </div>
      <div style={{ opacity: v.penNoColor ? 0.4 : 1, pointerEvents: v.penNoColor ? 'none' : undefined }}>
        <ColourWheel color={v.penColor} onChange={v.setColor} size={176} />
      </div>
      <Slider name={v.penTool === 'eraser' ? 'Eraser size' : 'Size'} lbl={String(v.penSize)} min={1} max={40} step={1} value={v.penSize} onChange={v.onPenSize} />
      <Slider name={strength ? 'Strength' : 'Opacity'} lbl={`${v.penOpacity}%`} min={5} max={100} step={1} value={v.penOpacity} onChange={v.onPenOpacity} />
    </div>
  );
}

/** Draw: turn the page on screen to draw sideways, and draw across two pages. */
function PageButtons({ v, labels }: { v: V; labels?: boolean }) {
  const b = (on: boolean): CSSProperties => ({ height: labels ? 36 : 40, minWidth: labels ? 0 : 40, flex: labels ? 1 : 'none', padding: labels ? '0 12px' : 0, border: `1px solid ${on ? INK : 'rgba(var(--ink-rgb),.2)'}`, borderRadius: labels ? 2 : 0, background: on ? INK : 'none', color: on ? PAPER : INK, font: `500 13px ${SANS}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxSizing: 'border-box' });
  const svg = (d: string) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
  return (
    <>
      <button onClick={v.turnView} title="Turn the page to draw sideways" aria-label="Turn the page to draw sideways" aria-pressed={v.edTurned} style={b(v.edTurned)}>
        {svg('M20 11a8 8 0 1 0-2.3 5.7M20 4.5V11h-6.5')}{labels && 'Turn page'}
      </button>
      {v.edCanSpread && <button onClick={v.toggleDrawSpread} title="Draw across two pages" aria-label="Draw across two pages" aria-pressed={v.edSpread} style={b(v.edSpread)}>
        {svg('M3.5 5.5h8v13h-8zM12.5 5.5h8v13h-8z')}{labels && 'Two pages'}
      </button>}
    </>
  );
}

/** The layers, top first: show or hide, choose which one you draw on, its opacity; add one, delete one, clear one. */
export function LayersList({ v, onDone }: { v: V; onDone?: () => void }) {
  const eye = (on: boolean) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{on ? <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></> : <><path d="M3 3l18 18M10.6 6a9.6 9.6 0 0 1 1.4-.1c6 0 9.5 6.1 9.5 6.1a16 16 0 0 1-2.6 3.3M6.6 6.7C4 8.3 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1" /></>}</svg>;
  const small: CSSProperties = { padding: 0, border: 'none', background: 'none', color: INK, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {v.layers.map((l: V) => (
        <div key={l.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 6, border: `1px solid ${l.active ? INK : 'rgba(var(--ink-rgb),.15)'}`, background: l.active ? 'rgba(var(--ink-rgb),.05)' : 'none' }}>
          <button onClick={l.toggle} aria-label={l.visible ? `Hide ${l.name}` : `Show ${l.name}`} aria-pressed={l.visible} style={{ ...small, width: 28, height: 28, opacity: l.visible ? 1 : 0.45 }}>{eye(l.visible)}</button>
          <button onClick={l.pick} aria-pressed={l.active} style={{ ...small, justifyContent: 'flex-start', flex: '0 0 auto', minWidth: 64, font: `${l.active ? 600 : 500} 13px ${SANS}` }}>{l.name}</button>
          <input type="range" min={0} max={100} step={1} value={l.opacity} onChange={l.onOpacity} aria-label={`${l.name} opacity`} style={{ flex: 1, minWidth: 0, accentColor: INK, height: 22 }} />
          <span style={{ width: 34, textAlign: 'right', fontSize: 12, color: 'rgba(var(--ink-rgb),.6)' }}>{l.opacity}%</span>
          {l.canRemove && <button onClick={l.remove} aria-label={`Delete ${l.name}`} className={hover(`color:${MARK}`)} style={{ ...small, width: 24, height: 24, fontSize: 18 }}>×</button>}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
        <button onClick={v.addLayer} disabled={!v.canAddLayer} style={{ flex: 1, height: 34, border: '1px solid rgba(var(--ink-rgb),.3)', borderRadius: 2, background: 'none', color: INK, font: `500 13px ${SANS}`, cursor: v.canAddLayer ? 'pointer' : 'default', opacity: v.canAddLayer ? 1 : 0.4 }}>+ Add layer</button>
        <button onClick={v.clearMarks} style={{ flex: 1, height: 34, border: '1px solid rgba(var(--ink-rgb),.3)', borderRadius: 2, background: 'none', color: INK, font: `500 13px ${SANS}`, cursor: 'pointer' }}>Clear layer</button>
        {onDone && <button onClick={onDone} style={{ flex: 1, height: 34, border: 'none', borderRadius: 2, background: INK, color: PAPER, font: `500 13px ${SANS}`, cursor: 'pointer' }}>Done</button>}
      </div>
    </div>
  );
}

const BRUSH_ICONS: Record<string, string> = {
  pen: 'M4.5 19.5l1.2-4.2L15.5 5.5l3 3-9.8 9.8zM13.5 7.5l3 3',
  pencil: 'M4.5 19.5l1-3.8L16 5.2a1.9 1.9 0 0 1 2.8 2.8L8.3 18.5zM14.2 7l2.8 2.8M5.5 15.7l2.8 2.8',
  marker: 'M8.5 15.5l-4 4h5l1.3-1.3M8.5 15.5l7.8-7.8 3.3 3.3-7.8 7.8zM14.8 6.2l3 -3 3 3-3 3',
  brush: 'M14.5 3.5l6 6-7.2 5.6-4.4-4.4zM8.6 11l4.4 4.4M8.9 15.1c-1.6-1.6-4.2-.6-4.4 1.7-.2 1.8-.9 2.8-2 3.2 2.6 1 6.6.6 7.6-1.9.4-1.1-.2-2.4-1.2-3z',
  water: 'M12 3.5c3.2 4.2 5.8 7.4 5.8 10.4a5.8 5.8 0 0 1-11.6 0c0-3 2.6-6.2 5.8-10.4z',
  oil: 'M20.5 3.5l-6.5 6.5M15.5 12l-3.5-3.5M12 8.5c-2.3-.5-4.8 1.1-5.2 3.7-.3 2-1.3 3.7-3.3 4.8 3.8 1.9 9.8 1.2 10-3.8z',
  blend: 'M3.5 9.5c2.5-3 4.5 3 8.5 0s6-3 8.5 0M3.5 15c2.5-3 4.5 3 8.5 0s6-3 8.5 0',
  eraser: 'M9 19.5h11M4.8 14.7l8.5-8.5a1.5 1.5 0 0 1 2.1 0l3.9 3.9a1.5 1.5 0 0 1 0 2.1l-7 7H9.4zM9.4 10.1l6 6',
};
/** Phones, Draw: a toolbar of brushes with undo and clear, a row of colours, and size and opacity side by side. */
function DrawBar({ v, wheel, setWheel }: { v: V; wheel: boolean; setWheel: (f: (w: boolean) => boolean) => void }) {
  const icon = (d: string) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
  const btn = (on: boolean, off?: boolean): CSSProperties => ({ width: 38, height: 38, flexShrink: 0, padding: 0, border: 'none', borderRadius: 10, background: on ? INK : 'none', color: on ? PAPER : INK, opacity: off ? 0.35 : 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' });
  const dot = (c: string, on: boolean): CSSProperties => ({ width: 28, height: 28, flexShrink: 0, borderRadius: '50%', padding: 0, cursor: 'pointer', background: c, border: '1px solid rgba(34,35,32,.25)', boxShadow: on ? `0 0 0 2px ${PAPER}, 0 0 0 3.5px ${INK}` : 'none' });
  const names = Object.fromEntries(DRAW_COLORS), swatches = [...v.recentColors, ...DRAW_COLORS.map(([c]) => c).filter(c => !v.recentColors.includes(c))].slice(0, 7);
  const strength = v.penTool === 'blend' || v.penTool === 'eraser';
  const tool = DRAW_TOOLS.find(([k]) => k === v.penTool)?.[1] || '';
  const slider = (name: string, lbl: string, min: number, max: number, value: number, onChange: ChangeEventHandler<HTMLInputElement>) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, fontSize: 12, color: 'rgba(var(--ink-rgb),.7)' }}>
      <span style={{ flexShrink: 0 }}>{name}</span>
      <input type="range" min={min} max={max} step={1} value={value} onChange={onChange} aria-valuetext={lbl} style={{ flex: 1, minWidth: 0, accentColor: INK, height: 26 }} />
    </label>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div role="toolbar" aria-label={`Brushes · ${tool}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 3, border: '1px solid rgba(var(--ink-rgb),.15)', borderRadius: 13 }}>
        {DRAW_TOOLS.map(([k, l]) => <button key={k} onClick={() => v.setTool(k)} title={l} aria-label={l} aria-pressed={v.penTool === k} style={btn(v.penTool === k)}>{icon(BRUSH_ICONS[k])}</button>)}
        <span style={{ width: 1, height: 24, background: 'rgba(var(--ink-rgb),.15)', flexShrink: 0 }} />
        <button onClick={v.toggleLayers} title="Layers" aria-label="Layers" aria-pressed={v.layersOpen} style={btn(v.layersOpen)}>{icon('M12 4l8.5 4.5L12 13 3.5 8.5zM3.5 12.5L12 17l8.5-4.5M3.5 16.5L12 21l8.5-4.5')}</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 3px' }}>
        <button onClick={v.undoMark} disabled={!v.hasMarks} title="Undo" aria-label="Undo" style={{ ...btn(false, !v.hasMarks), width: 32, height: 32 }}>{icon('M9 5L4 10l5 5M4 10h10a5 5 0 0 1 0 10h-3')}</button>
        <button onClick={v.redoMark} disabled={!v.hasRedo} title="Redo" aria-label="Redo" style={{ ...btn(false, !v.hasRedo), width: 32, height: 32 }}>{icon('M15 5l5 5-5 5M20 10H10a5 5 0 0 0 0 10h3')}</button>
        <span style={{ width: 1, height: 22, background: 'rgba(var(--ink-rgb),.15)', flexShrink: 0 }} />
        <div role="radiogroup" aria-label="Colour" style={{ display: 'contents' }}>
        {swatches.slice(0, 5).map(c => <button key={c} role="radio" aria-checked={v.penColor === c} title={names[c] || c} aria-label={names[c] || c} onClick={() => v.setColor(c)} style={{ ...dot(c, v.penColor === c && !wheel), opacity: v.penNoColor ? 0.4 : 1 }} />)}
        <button onClick={() => setWheel(w => !w)} title="Colour wheel" aria-label="Colour wheel" aria-expanded={wheel} style={dot('conic-gradient(red, yellow, lime, cyan, blue, magenta, red)', wheel)} />
        </div>
        <button onClick={v.toggleEyedrop} title="Pick a colour from the page" aria-label="Pick a colour from the page" aria-pressed={v.edEyedrop} style={{ ...btn(v.edEyedrop), width: 32, height: 32, borderRadius: '50%', border: `1px solid ${v.edEyedrop ? INK : 'rgba(var(--ink-rgb),.25)'}` }}>{icon('M19.6 4.4a2.2 2.2 0 0 0-3.1 0l-2.3 2.3-1.1-1.1-1.5 1.5 5.3 5.3 1.5-1.5-1.1-1.1 2.3-2.3a2.2 2.2 0 0 0 0-3.1zM12.4 8.4l-7.2 7.2-.7 3.9 3.9-.7 7.2-7.2')}</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {slider('Size', String(v.penSize), 1, 40, v.penSize, v.onPenSize)}
        {slider(strength ? 'Strength' : 'Opacity', `${v.penOpacity}%`, 5, 100, v.penOpacity, v.onPenOpacity)}
      </div>
    </div>
  );
}

/** After a photo of a page was straightened and cropped automatically: says so, and offers it again after a Reset or a change. */
function AutoNote({ v }: { v: V }) {
  if (!v.edAuto) return null;
  return v.edAutoOn
    ? <span style={{ fontSize: 12, lineHeight: 1.45, color: 'rgba(var(--ink-rgb),.6)' }}>Straightened and cropped to the page for you. Reset shows the photo as you took it.</span>
    : <button onClick={v.autoFit} className={hover(`color:${MARK}`)} style={{ ...linkBtn(INK), alignSelf: 'flex-start', fontSize: 13 }}>Straighten and crop automatically</button>;
}

/** The page editor: Fit (crop, zoom, rotate, skew), Adjust (light and colour), Draw, and Text (typed words on the page). */
export function Editor({ v }: { v: V }) {
  if (v.edMob) return <MobileEditor v={v} />;
  const outline: CSSProperties = { flex: 1, height: 36, borderRadius: 2, border: '1.5px solid rgba(var(--ink-rgb),.5)', background: 'none', color: INK, font: `500 13px ${SANS}`, cursor: 'pointer' };
  const adjust = v.edMode === 'adjust', write = v.edMode === 'write', draw = v.edMode === 'draw', pick = v.edMode === 'pick';
  const sub = pick ? 'draw or add text' : draw ? 'pens, paint and colour' : write ? 'type onto the page' : adjust ? 'light and colour' : 'drag to move, scroll or pinch to zoom';
  return (
    <div style={{ position: 'absolute', inset: 0, background: PAPER, zIndex: 20, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) clamp(340px, 28vw, 440px)', alignItems: 'center', gap: 56, padding: '24px 48px', boxSizing: 'border-box', overflow: 'auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          {draw && (
            <div style={{ position: 'relative', zIndex: 3 }}>
              <DeskToolbar v={v} />
              {/* Layers open as a card beside the toolbar, over the page, so the side panel never grows past the screen. */}
              {v.layersOpen && (
                <div role="dialog" aria-label="Layers" style={{ position: 'absolute', left: 'calc(100% + 12px)', bottom: 0, width: 320, padding: 14, background: PAPER, border: '1px solid rgba(var(--ink-rgb),.14)', borderRadius: 14, boxShadow: '0 16px 40px rgba(20,20,30,.2)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Layers</span>
                  <LayersList v={v} onDone={v.toggleLayers} />
                </div>
              )}
            </div>
          )}
          <EditFrame v={v} radius="2px 10px 10px 2px" shadow="0 30px 70px rgba(10,10,30,.5)" wheel />
        </div>
        {v.edPad && <WritePad v={v} />}
      </div>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={heading}>{v.edAvatar && v.edMode === 'fit' ? 'Your photo' : TITLES[v.edMode]}</div>
          <div style={{ fontSize: 13, color: 'rgba(var(--ink-rgb),.7)' }}>{v.edTitle} · {sub}</div>
        </div>
        <ModeSwitch v={v} />
        {pick ? <PickMode v={v} /> : draw ? <DrawPanel v={v} /> : write ? <WriteTools v={v} outline={outline} /> : adjust ? (
          <>
            {v.edAdj.map((a: V) => <Slider key={a.key} name={a.label} lbl={a.lbl} min={a.min} max={a.max} step={1} value={a.value} onChange={a.onChange} />)}
            <span style={{ fontSize: 12, lineHeight: 1.45, color: 'rgba(var(--ink-rgb),.6)', marginTop: -8 }}>Whites cleans up the grey of a photographed page. Settings carry over to the next image.</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <PeekBtn v={v} style={outline} />
              <button onClick={v.resetEd} style={outline}>Reset colour</button>
            </div>
          </>
        ) : (
          <>
            <SpreadSwitch v={v} />
            <Slider name="Zoom" lbl={v.scaleLbl} min={0.3} max={4} step={0.01} value={v.scale} onChange={v.onScale} />
            <Slider name="Rotate" lbl={v.rotLbl} min={-180} max={180} step={0.5} value={v.rot} onChange={v.onRot} />
            {!v.edAvatar && <Slider name="Skew horizontal" lbl={v.skxLbl} min={-30} max={30} step={0.5} value={v.skx} onChange={v.onSkx} />}
            {!v.edAvatar && <Slider name="Skew vertical" lbl={v.skyLbl} min={-30} max={30} step={0.5} value={v.sky} onChange={v.onSky} />}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={v.rot90} style={outline}>Rotate 90°</button>
              <button onClick={v.resetEd} style={outline}>Reset</button>
            </div>
            <AutoNote v={v} />
          </>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {!pick && <button onClick={v.applyEdit} style={{ height: 44, borderRadius: 2, border: 'none', background: INK, color: PAPER, font: `500 14px ${SANS}`, cursor: 'pointer' }}>{v.applyLbl}</button>}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {v.edOne ? <span /> : <button onClick={v.skipEdit} style={linkBtn('rgba(var(--ink-rgb),.75)')}>Skip image</button>}
            <button onClick={v.cancelEdit} style={linkBtn('rgba(var(--ink-rgb),.75)')}>{v.edOne ? 'Cancel' : 'Cancel all'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Edit profile: one row per social link (platform, handle, remove), and a button to add another. */
function SocialFields({ v }: { v: V }) {
  const anchor = useRef<HTMLSpanElement>(null);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span style={{ ...fieldLabel, gap: 0 }}>Social links</span>
      {v.dSocials.map((x: V) => (
        <div key={x.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 92, flexShrink: 0, font: `500 13px ${SANS}` }}>{x.label}</span>
          <input value={x.value} onChange={x.onChange} placeholder={x.hint} aria-label={`${x.label} handle`} autoFocus={!x.value} className={focusMark} style={{ ...field, flex: 1, minWidth: 0 }} />
          <button onClick={x.remove} title={`Remove ${x.label}`} aria-label={`Remove ${x.label}`} className={hover(`color:${MARK}`)} style={{ width: 36, height: 36, flexShrink: 0, padding: 0, border: 'none', background: 'none', color: 'rgba(var(--ink-rgb),.55)', font: `400 20px ${SANS}`, cursor: 'pointer' }}>×</button>
        </div>
      ))}
      {v.dSocialAdd.length > 0 && (v.isTouch
        // Phones: the system picker. Elsewhere: our own menu.
        ? <select value="" onChange={e => v.dSocialAdd.find((o: V) => o.key === e.target.value)?.add()} aria-label="Add a social link" style={{ ...field, alignSelf: 'flex-start', width: 'auto', paddingRight: 30 }}>
            <option value="" disabled>+ Add a social link</option>
            {v.dSocialAdd.map((o: V) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        : <span ref={anchor} style={{ alignSelf: 'flex-start' }} onClick={e => e.stopPropagation()}>
            <button onClick={v.toggleSocialMenu} aria-haspopup="menu" aria-expanded={v.dSocialMenu} className={hoverTint} style={{ ...ghostBtn, height: 40, padding: '0 14px' }}>+ Add a social link</button>
            {v.dSocialMenu && <Popover anchor={anchor}>
              <span role="menu" style={{ display: 'flex', flexDirection: 'column', minWidth: 200, padding: 6, background: PAPER, border: `1px solid ${INK}`, boxShadow: '0 12px 30px rgba(34,35,32,.14)' }}>
                {v.dSocialAdd.map((o: V) => <button key={o.key} role="menuitem" onClick={o.add} className={hover('background:rgba(var(--ink-rgb),.07)')} style={{ textAlign: 'left', padding: '9px 10px', border: 'none', background: 'none', color: INK, font: `500 13px ${SANS}`, cursor: 'pointer' }}>{o.label}</button>)}
              </span>
            </Popover>}
          </span>)}
    </div>
  );
}

/** Small dropdown under a ⋯ button: report, block and the like. */
export function MoreMenu({ open, onToggle, items, align = 'center' }: { open: boolean; onToggle: () => void; items: { label: string; onClick: () => void; danger?: boolean }[]; align?: 'center' | 'right' }) {
  const anchor = useRef<HTMLSpanElement>(null);
  return (
    <span ref={anchor} style={{ position: 'relative', display: 'inline-flex' }}>
      <button onClick={e => { e.stopPropagation(); onToggle(); }} aria-haspopup="menu" aria-expanded={open} title="More" className={'tap ' + hover(`color:${MARK}`)} style={{ height: 28, minWidth: 28, padding: '0 6px', border: 'none', background: 'none', color: INK, font: `600 16px/1 ${SANS}`, letterSpacing: 1, cursor: 'pointer' }}>⋯</button>
      {open && <Popover anchor={anchor} align={align} gap={6}>
        <span role="menu" onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', minWidth: 190, padding: 6, background: PAPER, border: `1px solid ${INK}`, boxShadow: '0 12px 30px rgba(34,35,32,.14)' }}>
          {items.map(it => (
            <button key={it.label} role="menuitem" onClick={it.onClick} className={hover('background:rgba(var(--ink-rgb),.07)')} style={{ textAlign: 'left', padding: '12px 10px', border: 'none', background: 'none', color: it.danger ? MARK : INK, font: `500 13px ${SANS}`, letterSpacing: 0, textTransform: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>{it.label}</button>
          ))}
        </span>
      </Popover>}
    </span>
  );
}

export function ReportModal({ v }: { v: V }) {
  return (
    <Modal onClose={e => { if (e.target === e.currentTarget) v.closeReport(); }} pad={v.mModalPad} maxWidth={460}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={heading}>Report {v.reportKind === 'user' ? 'artist' : 'sketchbook'}</div>
        <div style={{ fontSize: 14, lineHeight: 1.45, color: 'rgba(var(--ink-rgb),.7)' }}>What’s wrong with {v.reportLabel}? Reports are private; the artist isn’t told who sent one.</div>
      </div>
      <div role="radiogroup" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {v.reportReasons.map((r: V) => (
          <button key={r.key} role="radio" aria-checked={r.on} onClick={r.pick} style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', padding: '10px 12px', border: `1.5px solid ${r.on ? INK : 'rgba(var(--ink-rgb),.14)'}`, borderRadius: 2, background: r.on ? 'rgba(var(--ink-rgb),.06)' : 'none', color: INK, font: `500 14px ${SANS}`, cursor: 'pointer' }}>
            <span style={{ width: 14, height: 14, borderRadius: '50%', border: `1.5px solid ${INK}`, boxSizing: 'border-box', background: r.on ? `radial-gradient(${INK} 0 3px, transparent 3.5px)` : 'none', flexShrink: 0 }} />
            {r.label}
          </button>
        ))}
      </div>
      <label style={fieldLabel}>Anything else? (optional)
        <textarea value={v.reportNote} onChange={v.onReportNote} maxLength={500} rows={3} className={focusMark} style={{ ...field, height: undefined, padding: '12px 14px', font: `500 14px/1.45 ${SANS}`, resize: 'none' }} />
      </label>
      <Notice err={v.reportErr} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button onClick={v.closeReport} className={hoverTint} style={{ ...ghostBtn, height: 44, padding: '0 18px', fontSize: 14 }}>Cancel</button>
        <button onClick={v.submitReport} disabled={v.reportBusy} style={{ height: 44, padding: '0 22px', borderRadius: 2, border: 'none', background: INK, color: PAPER, font: `500 14px ${SANS}`, cursor: 'pointer', opacity: v.reportBusy ? 0.6 : 1 }}>{v.reportBusy ? 'Sending…' : 'Send report'}</button>
      </div>
    </Modal>
  );
}

/** Name a new collection (and optionally move a saved sketchbook into it). */
/** Moderators: put one of your sketchbooks in From the archive, credited to the historical artist and its source. */
export function ArchiveModal({ v }: { v: V }) {
  const f = v.arF;
  return (
    <Modal onClose={e => { if (e.target === e.currentTarget) v.arClose(); }} pad={v.mModalPad} maxWidth={480}>
      <form onSubmit={v.arSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={heading}>{v.arExists ? 'Archive details' : 'Add to the archive'}</div>
          <div style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(var(--ink-rgb),.7)' }}>Only for public-domain work (the artist died over 70 years ago) with images the source lets anyone reuse, such as the Met, Art Institute of Chicago, Rijksmuseum or National Gallery of Art open-access collections.</div>
        </div>
        <TextField label="Artist" value={f.artist} onChange={v.arSet('artist')} placeholder="Rembrandt van Rijn" autoFocus />
        <TextField label="Years" value={f.years} onChange={v.arSet('years')} placeholder="c. 1635–1640" />
        <TextField label="Source (museum or library)" value={f.source} onChange={v.arSet('source')} placeholder="Rijksmuseum, Amsterdam · public domain" />
        <TextField label="Link to the source" value={f.url} onChange={v.arSet('url')} placeholder="https://…" type="url" />
        <label style={fieldLabel}>A few words about it
          <textarea value={f.note} onChange={v.arSet('note')} maxLength={600} rows={3} placeholder="Where it was made, what it shows, why it matters." className={focusMark} style={{ ...field, height: 'auto', padding: '10px 14px', resize: 'vertical', font: `400 14px/1.45 ${SANS}` }} />
        </label>
        <Notice err={v.arErr} />
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          {v.arExists ? <button type="button" onClick={v.arRemove} disabled={v.arBusy} style={{ ...linkBtn(MARK), height: 44 }}>Remove from archive</button> : <span />}
          <span style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={v.arClose} className={hoverTint} style={{ ...ghostBtn, height: 44, padding: '0 18px', fontSize: 14 }}>Cancel</button>
            <button type="submit" disabled={v.arBusy} style={{ height: 44, padding: '0 22px', borderRadius: 2, border: 'none', background: INK, color: PAPER, font: `500 14px ${SANS}`, cursor: 'pointer', opacity: v.arBusy ? 0.6 : 1 }}>{v.arBusy ? 'Saving…' : 'Save'}</button>
          </span>
        </div>
      </form>
    </Modal>
  );
}

export function CollectionModal({ v }: { v: V }) {
  return (
    <Modal onClose={e => { if (e.target === e.currentTarget) v.cnClose(); }} pad={v.mModalPad} maxWidth={420}>
      <form onSubmit={v.cnCreate} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={heading}>New collection</div>
          <div style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(var(--ink-rgb),.7)' }}>{v.cnMoving ? 'Name it, and this sketchbook moves straight in.' : 'A shelf for saved sketchbooks. Only you can see it.'}</div>
        </div>
        <TextField label="Name" value={v.cnName} onChange={v.onCnName} placeholder="Inspiration, Ink, Faces…" autoFocus />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" onClick={v.cnClose} className={hoverTint} style={{ ...ghostBtn, height: 44, padding: '0 18px', fontSize: 14 }}>Cancel</button>
          <button type="submit" disabled={!v.cnName.trim()} style={{ height: 44, padding: '0 22px', borderRadius: 2, border: 'none', background: INK, color: PAPER, font: `500 14px ${SANS}`, cursor: 'pointer', opacity: v.cnName.trim() ? 1 : 0.5 }}>Create</button>
        </div>
      </form>
    </Modal>
  );
}

/** Embed code for putting a sketchbook on another website. */
export function EmbedModal({ v }: { v: V }) {
  return (
    <Modal onClose={e => { if (e.target === e.currentTarget) v.emClose(); }} pad={v.mModalPad} maxWidth={560}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={heading}>Embed “{v.emTitle}”</div>
        <div style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(var(--ink-rgb),.7)' }}>Paste this into your website or portfolio (an HTML or embed block). Visitors can turn the pages right there. Only public sketchbooks can be embedded.</div>
      </div>
      <textarea readOnly value={v.emCode} onFocus={e => e.currentTarget.select()} rows={4} style={{ ...field, height: undefined, padding: '12px 14px', font: `500 12px/1.5 ui-monospace, Menlo, monospace`, resize: 'none' }} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button onClick={v.emClose} className={hoverTint} style={{ ...ghostBtn, height: 44, padding: '0 18px', fontSize: 14 }}>Close</button>
        <button onClick={v.emCopy} style={{ height: 44, padding: '0 22px', borderRadius: 2, border: 'none', background: INK, color: PAPER, font: `500 14px ${SANS}`, cursor: 'pointer' }}>Copy code</button>
      </div>
    </Modal>
  );
}

/** Brief confirmation at the bottom of the screen. */
/** The 1-minute tour of fletora (public/welcome/tour.mp4), played here rather than in a new tab. */
export function TourVideo({ onClose }: { onClose: () => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-label="A tour of fletora" onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(20,20,24,.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <button onClick={onClose} aria-label="Close" className={hover('opacity:.75')} style={{ position: 'absolute', top: 12, right: 16, border: 'none', background: 'none', color: '#f6f2ea', fontSize: 30, cursor: 'pointer' }}>×</button>
      <video poster="/welcome/tour.jpg" controls autoPlay muted playsInline style={{ width: 'min(1100px, 100%)', maxHeight: 'calc(100% - 80px)', aspectRatio: '16 / 9', background: '#000', borderRadius: 4, boxShadow: '0 30px 80px rgba(0,0,0,.4)' }}>
        <source src="/welcome/tour.mp4" type="video/mp4" /><source src="/welcome/tour.webm" type="video/webm" />
      </video>
    </div>
  );
}

/** A one-time tip: what to try here, until Got it. In the editor it sits out of the way of the page and tools. */
export function Tip({ v }: { v: V }) {
  return (
    <div role="status" style={{ position: 'absolute', ...(v.tipSide ? { right: 48, bottom: 24 } : { left: '50%', transform: 'translateX(-50%)', ...(v.tipTop ? { top: 64 } : { bottom: 'calc(110px + var(--tabbar, 0px))' }) }), zIndex: 41, width: 'min(400px, calc(100% - 32px))', boxSizing: 'border-box', padding: '14px 16px', background: INK, color: PAPER, borderRadius: 3, boxShadow: '0 12px 30px rgba(20,20,30,.25)', display: 'flex', gap: 14, alignItems: 'center' }}>
      <span style={{ flex: 1, font: `400 14px/1.45 ${SANS}` }}>{v.tipMsg}</span>
      <button onClick={v.tipClose} className={hover('opacity:.8')} style={{ flexShrink: 0, height: 34, padding: '0 14px', border: `1px solid rgba(255,255,255,.35)`, borderRadius: 2, background: 'none', color: PAPER, font: `500 13px ${SANS}`, cursor: 'pointer' }}>Got it</button>
    </div>
  );
}

export function Toast({ msg }: { msg: string }) {
  return <div role="status" style={{ position: 'absolute', left: '50%', bottom: 'calc(110px + var(--tabbar, 0px))', transform: 'translateX(-50%)', zIndex: 40, padding: '10px 16px', background: INK, color: PAPER, font: `500 13px ${SANS}`, borderRadius: 2, boxShadow: '0 10px 24px rgba(34,35,32,.2)', whiteSpace: 'nowrap', pointerEvents: 'none' }}>{msg}</div>;
}
