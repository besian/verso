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
import { COLORS as DRAW_COLORS, TOOLS as DRAW_TOOLS } from '../draw';

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
  const fields = (
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
      <div style={grid}>
        <TextField label="Location" value={v.dLoc} onChange={v.onDLoc} placeholder="City" />
        <TextField label="Website" value={v.dWeb} onChange={v.onDWeb} placeholder="yoursite.com" />
        <TextField label="Contact email (shown on your profile)" value={v.dMail} onChange={v.onDMail} placeholder="hello@yoursite.com" type="email" />
      </div>
      <SocialFields v={v} />
      <Notice err={v.dErr} />
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
        {fields}
        <div style={{ paddingTop: 16, borderTop: '1px solid rgba(var(--ink-rgb),.12)' }}>{account}</div>
      </div>
    </div>
  );
  return (
    <Modal onClose={v.pfClose} pad={v.mModalPad} maxWidth={520}>
      <div style={heading}>Edit profile</div>
      {fields}
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
      <span style={{ fontSize: 15, lineHeight: 1.55 }}>Link-only sketchbooks, stats and pinning are in each sketchbook’s Details, and you have more room for sketchbooks, pages and handwriting. Your receipt is on its way by email, and you can manage Plus in Settings.</span>
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
  const act: CSSProperties = { ...ghostBtn, height: 40, padding: '0 14px', fontSize: 14 };
  return (
    <div onClick={e => { if (e.target === e.currentTarget) v.closePage(); }} style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'rgba(var(--canvas-rgb),.88)', display: 'flex', alignItems: v.notMob ? 'center' : 'flex-end', justifyContent: 'center', padding: v.notMob ? 24 : 0 }}>
      <div role="dialog" aria-label={`Page ${pg.num}`} style={{ background: PAPER, border: v.notMob ? `1px solid ${INK}` : 'none', borderTop: `1px solid ${INK}`, width: '100%', maxWidth: 720, maxHeight: '100%', overflowY: 'auto', boxSizing: 'border-box', padding: v.notMob ? 28 : '20px 16px calc(20px + env(safe-area-inset-bottom))', display: 'flex', gap: 24, flexDirection: v.notMob ? 'row' : 'column' }}>
        <div style={{ flexShrink: 0, width: v.notMob ? 220 : '42%', alignSelf: v.notMob ? 'flex-start' : 'center', aspectRatio: v.pgAspect, borderRadius: '2px 8px 8px 2px', background: pg.bg, boxShadow: '0 10px 24px rgba(10,10,30,.3)' }} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ font: `400 28px/1 ${SERIF}` }}>Page {pg.num}</span>
            <span style={hint}>{v.mgPage + 1} of {v.pagesList.length}</span>
          </div>
          <label style={fieldLabel}>Caption
            <input value={pg.caption} onChange={pg.onCaption} maxLength={140} placeholder="Where, what, who" autoFocus={v.notMob} className={focusMark} style={field} />
          </label>
          <label style={fieldLabel}>Date
            <input type="date" value={pg.date} onChange={pg.onDate} className={focusMark} style={{ ...field, color: pg.date ? INK : 'rgba(var(--ink-rgb),.5)' }} />
          </label>
          <span style={hint}>Written in the page’s margin in the book.</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => { v.closePage(); pg.adjust(); }} className={hoverTint} style={act}>Adjust photo</button>
            <button onClick={() => { v.closePage(); pg.write(); }} className={hoverTint} style={act}>Write on page</button>
            <button onClick={() => { v.closePage(); pg.edit(); }} className={hoverTint} style={act}>Crop & fit</button>
            <button onClick={pg.left} disabled={v.mgPage === 0} className={hoverTint} style={{ ...act, opacity: v.mgPage === 0 ? 0.4 : 1 }}>← Earlier</button>
            <button onClick={pg.right} disabled={v.mgPage === v.pagesList.length - 1} className={hoverTint} style={{ ...act, opacity: v.mgPage === v.pagesList.length - 1 ? 0.4 : 1 }}>Later →</button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 8 }}>
            <button onClick={() => { v.closePage(); pg.remove(); }} className="tap" style={linkBtn(MARK)}>Remove page</button>
            <button onClick={v.closePage} style={{ height: 44, padding: '0 24px', borderRadius: 2, border: 'none', background: INK, color: PAPER, font: `500 14px ${SANS}`, cursor: 'pointer' }}>Done</button>
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

/** Everything on the page: paper and image (with the colour matrix), drawing, typed text, and handwriting still to convert. */
function Layers({ v, inPad }: { v: V; inPad?: boolean }) {
  return (
    <>
      {/* Same paper and the same colour matrix the saved page gets. */}
      <div style={{ position: 'absolute', inset: 0, background: '#f3efe6', filter: v.edAdjusted && !v.edPeek ? 'url(#ed-adjust)' : undefined, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: v.bw, height: v.bh, transform: `translate(-50%,-50%) ${v.edTransform}`, background: v.edBg }} />
      </div>
      {v.edMarks.length > 0 && (
        <svg width={v.fw} height={v.fh} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} aria-hidden="true">
          {v.edMarks.map((m: V, i: number) => <path key={i} d={m.d} fill="none" stroke={m.color} strokeWidth={m.w} strokeOpacity={m.alpha} strokeLinecap="round" strokeLinejoin="round" />)}
        </svg>
      )}
      {v.edTexts.map((t: V) => (
        <div key={t.id} data-tid={inPad ? undefined : t.id} style={{ position: 'absolute', left: t.left, top: t.top, width: t.width, font: `${t.fontPx}px/${t.lineH}px ${TEXT_FONT}`, color: TEXT_INK, whiteSpace: 'pre', pointerEvents: v.edWrite && !inPad ? 'auto' : 'none', cursor: 'grab', outline: inPad ? 'none' : t.sel ? `1.5px dashed ${MARK}` : v.edWrite ? '1px dashed rgba(34,35,32,.25)' : 'none', outlineOffset: 4 }}>
          {t.lines.map((l: string, i: number) => <div key={i} style={{ height: t.lineH }}>{l}</div>)}
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
function EditFrame({ v, radius, shadow, wheel }: { v: V; radius: string; shadow: string; wheel?: boolean }) {
  const pen = v.edDraw || (v.edWrite && !v.edPad);
  return (
    <div onPointerDown={v.edDown} onPointerMove={v.edMove} onPointerUp={v.edUp} onPointerCancel={v.edUp} onWheel={wheel && v.edMode === 'fit' ? v.edWheel : undefined} style={{ position: 'relative', width: v.fw, height: v.fh, flexShrink: 0, overflow: 'hidden', borderRadius: radius, boxShadow: shadow, cursor: pen ? 'crosshair' : v.edWrite ? 'pointer' : v.edMode === 'pick' ? 'default' : 'move', touchAction: 'none' }}>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <filter id="ed-adjust" colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values={v.edFx} /></filter>
      </svg>
      <Layers v={v} />
      {v.edMode === 'fit' && <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(var(--ink-rgb),.35) 1px,transparent 1px),linear-gradient(90deg,rgba(var(--ink-rgb),.35) 1px,transparent 1px)', backgroundSize: '33.34% 33.34%', mixBlendMode: 'difference', opacity: .5 }} />}
      {/* Profile photo: everything outside the circle is dimmed, as it won't show. */}
      {v.edAvatar && <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', boxShadow: '0 0 0 9999px rgba(20,20,22,.5)', outline: '1.5px solid rgba(255,255,255,.85)', pointerEvents: 'none' }} />}
      {v.edPad && <div style={{ position: 'absolute', ...v.padRect, boxSizing: 'border-box', border: `1.5px solid ${MARK}`, borderRadius: 2, background: 'rgba(173,73,58,.06)', pointerEvents: 'none' }} />}
      {v.inkBusy && <span style={{ position: 'absolute', left: '50%', top: 12, transform: 'translateX(-50%)', padding: '5px 12px', borderRadius: 12, background: 'rgba(34,35,32,.8)', color: '#F6F2E8', font: `500 12px ${SANS}` }}>Reading your writing…</span>}
      {v.edPeek && <span style={{ position: 'absolute', left: 8, top: 8, padding: '3px 8px', borderRadius: 10, background: 'rgba(34,35,32,.75)', color: '#F6F2E8', font: `500 11px ${SANS}` }}>Original</span>}
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

const MODE_NAMES: Record<string, string> = { fit: 'Fit', adjust: 'Adjust', draw: 'Draw', write: 'Write' };
const TITLES: Record<string, string> = { fit: 'Fit your page', adjust: 'Adjust', draw: 'Draw', write: 'Write', pick: 'New page' };

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
      {([['draw', 'Draw', 'Pen, pencil, marker and colours'], ['write', 'Write', 'Handwriting, turned into typed text']] as const).map(([k, l, d]) => (
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
  const chip = (on: boolean): CSSProperties => ({ flex: 1, height: 34, padding: '0 8px', border: `1px solid ${on ? INK : 'rgba(var(--ink-rgb),.2)'}`, borderRadius: 17, background: on ? INK : 'transparent', color: on ? PAPER : INK, font: `500 13px ${SANS}`, cursor: 'pointer', whiteSpace: 'nowrap' });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: mob ? 10 : 14 }}>
      <div role="tablist" aria-label="Tool" style={{ display: 'flex', gap: 4 }}>
        {DRAW_TOOLS.map(([k, l]) => <button key={k} role="tab" aria-selected={v.penTool === k} onClick={() => v.setTool(k)} style={chip(v.penTool === k)}>{l}</button>)}
      </div>
      <div role="radiogroup" aria-label="Colour" style={{ display: 'flex', gap: 6, justifyContent: 'space-between', opacity: v.penTool === 'eraser' ? 0.45 : 1 }}>
        {DRAW_COLORS.map(([c, l]) => (
          <button key={c} role="radio" aria-checked={v.penColor === c && v.penTool !== 'eraser'} title={l} aria-label={l} onClick={() => v.setColor(c)} style={{ width: 30, height: 30, borderRadius: '50%', padding: 0, cursor: 'pointer', background: c, border: '1px solid rgba(34,35,32,.25)', boxShadow: v.penColor === c && v.penTool !== 'eraser' ? `0 0 0 2px ${PAPER}, 0 0 0 4px ${INK}` : 'none' }} />
        ))}
      </div>
      <Slider name={v.penTool === 'eraser' ? 'Eraser size' : 'Size'} lbl={String(v.penSize)} min={1} max={40} step={1} value={v.penSize} onChange={v.onPenSize} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={v.undoMark} disabled={!v.hasMarks} style={{ ...outline, opacity: v.hasMarks ? 1 : 0.4 }}>Undo</button>
        <button onClick={v.clearMarks} disabled={!v.hasMarks} style={{ ...outline, opacity: v.hasMarks ? 1 : 0.4 }}>Clear</button>
      </div>
    </div>
  );
}

/** Hold to see the image without adjustments. */
const PeekBtn = ({ v, style }: { v: V; style: CSSProperties }) => (
  <button onPointerDown={v.peekOn} onPointerUp={v.peekOff} onPointerLeave={v.peekOff} onPointerCancel={v.peekOff} onContextMenu={e => e.preventDefault()} disabled={!v.edAdjusted} style={{ ...style, opacity: v.edAdjusted ? 1 : 0.4, touchAction: 'none', userSelect: 'none' }}>Hold to compare</button>
);

/** Write mode controls: the zoom pad, converting the handwriting, or editing the selected piece of text. */
function WriteTools({ v, outline, mob }: { v: V; outline: CSSProperties; mob?: boolean }) {
  const t = v.selText;
  if (t) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: mob ? 10 : 14 }}>
      <textarea value={t.text} onChange={t.onText} rows={mob ? 2 : 4} aria-label="Text" className={focusMark} style={{ ...field, height: 'auto', padding: '10px 12px', resize: 'vertical', font: `400 15px/1.4 ${SANS}` }} />
      <Slider name="Size" lbl={t.sizeLbl} min={20} max={120} step={1} value={t.size} onChange={t.onSize} />
      {!mob && <Slider name="Width" lbl={`${t.width}%`} min={15} max={100} step={1} value={t.width} onChange={t.onWidth} />}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={t.remove} style={{ ...outline, color: MARK }}>Remove text</button>
        <button onClick={t.done} style={outline}>Done</button>
      </div>
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: mob ? 8 : 14 }}>
      {!mob && <span style={{ fontSize: 12, lineHeight: 1.45, color: 'rgba(var(--ink-rgb),.6)' }}>{v.edPad ? 'Write big in the pad under the page; it slides along as you go. Tap the page to move the pad, then convert it to typed text.' : 'Write on the page with your finger, a pen or the mouse, then convert it to typed text. Tap text to edit it; drag it to move it.'}</span>}
      <div style={{ display: 'flex', gap: 8 }}>
        {v.edPad && <button onClick={v.padSpace} style={outline}>Space →</button>}
        {v.edPad && <button onClick={v.padNewLine} style={outline}>New line</button>}
        <button onClick={v.undoInk} disabled={!v.hasInk || v.inkBusy} style={{ ...outline, opacity: v.hasInk ? 1 : 0.4 }}>Undo</button>
        {!v.edPad && <button onClick={v.clearInk} disabled={!v.hasInk || v.inkBusy} style={{ ...outline, opacity: v.hasInk ? 1 : 0.4 }}>Clear</button>}
      </div>
      <button onClick={v.convertInk} disabled={!v.hasInk || v.inkBusy} style={{ ...outline, flex: 'none', height: mob ? 42 : 40, border: 'none', background: v.hasInk ? MARK : 'rgba(var(--ink-rgb),.12)', color: v.hasInk ? PAPER : 'rgba(var(--ink-rgb),.5)' }}>{v.inkBusy ? 'Reading…' : 'Convert to text'}</button>
      {v.inkErr && <span role="alert" style={{ fontSize: 13, color: MARK }}>{v.inkErr}</span>}
      <button onClick={v.togglePad} style={{ ...linkBtn('rgba(var(--ink-rgb),.75)'), alignSelf: 'center', fontSize: 13 }}>{v.edPad ? 'Write directly on the page instead' : 'Use the zoom pad'}</button>
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
  const hint = pick ? 'Choose how to fill this page' : draw ? 'Draw with your finger or a stylus' : write ? (v.edPad ? 'Write in the pad · tap the page to move it' : 'Write with your finger, then convert · drag text to move it') : adjust ? 'Whites cleans up the grey of a photographed page' : 'Drag to move · pinch to zoom · twist to rotate';
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
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <EditFrame v={v} radius="2px 8px 8px 2px" shadow="0 18px 40px rgba(10,10,30,.3)" />
        {v.edPad && <WritePad v={v} />}
        <div style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),.6)' }}>{hint}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 10 }}>
        <ModeSwitch v={v} height={34} />
        {pick ? <PickMode v={v} mob /> : draw ? <DrawTools v={v} outline={outline} mob /> : write ? <WriteTools v={v} outline={outline} mob /> : <>
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
        </>}
        {!pick && <button onClick={v.applyEdit} style={{ height: 52, borderRadius: 2, border: 'none', background: INK, color: PAPER, font: `500 16px ${SANS}`, cursor: 'pointer' }}>{v.applyLbl}</button>}
      </div>
    </div>
  );
}

/** The page editor: Fit (crop, zoom, rotate, skew), Adjust (light and colour), Draw, and Write (handwriting to text). */
export function Editor({ v }: { v: V }) {
  if (v.edMob) return <MobileEditor v={v} />;
  const outline: CSSProperties = { flex: 1, height: 36, borderRadius: 2, border: '1.5px solid rgba(var(--ink-rgb),.5)', background: 'none', color: INK, font: `500 13px ${SANS}`, cursor: 'pointer' };
  const adjust = v.edMode === 'adjust', write = v.edMode === 'write', draw = v.edMode === 'draw', pick = v.edMode === 'pick';
  const sub = pick ? 'draw or write' : draw ? 'pen, pencil and marker' : write ? 'handwriting to text' : adjust ? 'light and colour' : 'drag to move, scroll or pinch to zoom';
  return (
    <div style={{ position: 'absolute', inset: 0, background: PAPER, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 48, padding: 24, flexWrap: 'wrap', overflow: 'auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <EditFrame v={v} radius="2px 10px 10px 2px" shadow="0 30px 70px rgba(10,10,30,.5)" wheel />
        {v.edPad && <WritePad v={v} />}
      </div>
      <div style={{ width: 260, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={heading}>{v.edAvatar && v.edMode === 'fit' ? 'Your photo' : TITLES[v.edMode]}</div>
          <div style={{ fontSize: 13, color: 'rgba(var(--ink-rgb),.7)' }}>{v.edTitle} · {sub}</div>
        </div>
        <ModeSwitch v={v} />
        {pick ? <PickMode v={v} /> : draw ? <DrawTools v={v} outline={outline} /> : write ? <WriteTools v={v} outline={outline} /> : adjust ? (
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
            <Slider name="Zoom" lbl={v.scaleLbl} min={0.3} max={4} step={0.01} value={v.scale} onChange={v.onScale} />
            <Slider name="Rotate" lbl={v.rotLbl} min={-180} max={180} step={0.5} value={v.rot} onChange={v.onRot} />
            {!v.edAvatar && <Slider name="Skew horizontal" lbl={v.skxLbl} min={-30} max={30} step={0.5} value={v.skx} onChange={v.onSkx} />}
            {!v.edAvatar && <Slider name="Skew vertical" lbl={v.skyLbl} min={-30} max={30} step={0.5} value={v.sky} onChange={v.onSky} />}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={v.rot90} style={outline}>Rotate 90°</button>
              <button onClick={v.resetEd} style={outline}>Reset</button>
            </div>
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

const WELCOME_STEPS: [string, string][] = [
  ['Your first sketchbook is ready', 'It’s waiting under Your sketchbooks. Make more any time with + New, in five shapes from pocket to panorama.'],
  ['Add your pages', 'Photos or scans of your drawings, finished or not. Fit each one to the page, then drag to reorder.'],
  ['Write in the margins', 'Give a page a caption and a date, and tag the sketchbook with its mediums so people can find it.'],
  ['Share it, or don’t', 'Public sketchbooks appear in Explore and on your profile. Private ones are only for you. Invite one friend to draw in a sketchbook with you.'],
];

/** Shown once, right after joining. */
export function Welcome({ v }: { v: V }) {
  return (
    <div role="dialog" aria-modal="true" aria-label="Welcome to fletora" style={{ position: 'absolute', inset: 0, zIndex: 25, background: PAPER, overflowY: 'auto' }}>
      <div style={{ ...pagePad(!v.notMob), maxWidth: 1100, display: 'flex', flexDirection: 'column', gap: v.notMob ? 40 : 28 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span style={{ font: `500 11px ${SANS}`, letterSpacing: '.14em', textTransform: 'uppercase', color: MARK }}>Welcome to fletora.</span>
          <h1 style={{ margin: 0, font: `400 ${v.notMob ? 88 : 52}px/.95 ${SERIF}`, letterSpacing: '-.025em' }}>Hello, {v.welcomeName}. <em style={{ color: MARK }}>Start anywhere.</em></h1>
          <p style={{ margin: 0, maxWidth: 520, fontSize: 17, lineHeight: 1.55, color: MUTED }}>fletora is a home for sketchbooks: the unfinished pages, studies and false starts as much as the finished work. Here’s how it works.</p>
        </div>
        <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,190px),1fr))', gap: v.notMob ? 28 : 20 }}>
          {WELCOME_STEPS.map(([t, d], i) => (
            <li key={t} style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 14, borderTop: `1px solid ${INK}` }}>
              <span style={{ font: `400 34px/1 ${SERIF}`, color: MARK }}>{String(i + 1).padStart(2, '0')}</span>
              <span style={{ font: `400 24px/1.15 ${SERIF}` }}>{t}</span>
              <span style={{ fontSize: 14, lineHeight: 1.55, color: MUTED }}>{d}</span>
            </li>
          ))}
        </ol>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap', flexDirection: v.notMob ? 'row' : 'column' }}>
          <button onClick={v.welcomeStart} autoFocus={v.notMob} className={hover(`background:${MARK}`)} style={{ height: 50, padding: '0 28px', border: 'none', background: INK, color: PAPER, font: `500 15px ${SANS}`, cursor: 'pointer', width: v.notMob ? undefined : '100%' }}>Add my first pages</button>
          <button onClick={v.welcomeLater} className={hover(`color:${MARK};border-color:${MARK}`)} style={{ padding: '4px 0', border: 'none', borderBottom: `1px solid ${INK}`, background: 'none', color: INK, font: `500 15px ${SANS}`, cursor: 'pointer' }}>Look around first ↗</button>
        </div>
      </div>
    </div>
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
export function Toast({ msg }: { msg: string }) {
  return <div role="status" style={{ position: 'absolute', left: '50%', bottom: 'calc(110px + var(--tabbar, 0px))', transform: 'translateX(-50%)', zIndex: 40, padding: '10px 16px', background: INK, color: PAPER, font: `500 13px ${SANS}`, borderRadius: 2, boxShadow: '0 10px 24px rgba(34,35,32,.2)', whiteSpace: 'nowrap', pointerEvents: 'none' }}>{msg}</div>;
}
