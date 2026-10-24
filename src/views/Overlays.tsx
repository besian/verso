import type { CSSProperties, ChangeEventHandler, MouseEventHandler, ReactNode } from 'react';
import type { V } from '../App';
import { focus, hover, wheelSideways } from '../pseudo';
import { INK, MARK, MUTED, PAPER, SANS, SERIF, pagePad } from '../theme';
import { TEXT_FONT, TEXT_INK } from '../handwriting';
import { PAPERS, PAPER_PREVIEW } from '../paper';

const field: CSSProperties = { height: 44, padding: '0 14px', borderRadius: 2, border: '1.5px solid rgba(var(--ink-rgb),.14)', background: 'rgba(var(--ink-rgb),.06)', color: INK, font: `500 14px ${SANS}`, outline: 'none', width: '100%', boxSizing: 'border-box' };
const fieldLabel: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'rgba(var(--ink-rgb),.75)' };
const focusMark = focus(`border-color:${MARK}`);
const ghostBtn: CSSProperties = { borderRadius: 2, border: '1.5px solid rgba(var(--ink-rgb),.5)', background: 'none', color: INK, font: `500 13px ${SANS}`, cursor: 'pointer' };
const hoverTint = hover('background:rgba(var(--ink-rgb),.1)');
const linkBtn = (color: string): CSSProperties => ({ background: 'none', border: 'none', color, font: `500 13px ${SANS}`, cursor: 'pointer', padding: 0 });
const heading: CSSProperties = { fontSize: 38, fontFamily: SERIF, fontWeight: 400, letterSpacing: '-.01em' };

function Modal({ onClose, pad, maxWidth, gap = 18, shadow, children }: { onClose: MouseEventHandler; pad: number; maxWidth: number; gap?: number; shadow?: string; children: ReactNode }) {
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 20, background: 'rgba(var(--canvas-rgb),.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, boxSizing: 'border-box' }}>
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
        <div style={{ width: 80, height: 80, flexShrink: 0, borderRadius: '50%', background: v.dAvBg, color: PAPER, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 600 }}>{v.dInit}</div>
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
      </div>
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
              {v.isCollab ? (
                <Row label="Shared with you">
                  <span style={{ fontSize: 14, lineHeight: 1.5 }}>This is {v.shOwner}’s sketchbook ({v.shOwnerHandle}). You can add, caption and change pages; {v.shOwner} looks after the rest.</span>
                  <button onClick={v.shLeave} disabled={v.shBusy} style={{ ...linkBtn(MARK), alignSelf: 'flex-start' }}>Leave sketchbook</button>
                </Row>
              ) : (
                <>
                  <Row label="Cover">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      {v.swatches.map((c: V) => <button key={c.key} onClick={c.pick} aria-label={`Cover colour ${c.c}`} style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: c.c, boxShadow: c.ring, cursor: 'pointer', padding: 0 }} />)}
                      <button onClick={v.pickCover} className={hoverTint} style={{ ...ghostBtn, height: 32, padding: '0 12px', marginLeft: 4 }}>{v.hasCoverImg ? 'Change image' : 'Use an image'}</button>
                      {v.hasCoverImg && <button onClick={v.removeCover} style={linkBtn(MARK)}>Remove image</button>}
                      <input ref={v.coverRef} type="file" accept="image/*" onChange={v.onCoverFile} style={{ display: 'none' }} />
                    </div>
                  </Row>
                  <Row label="Who can see it" note={v.bookHidden ? <span style={{ color: MARK }}>Hidden by moderators for breaking the terms. Only you can see it.</span> : v.bookPublic ? 'Anyone can find it in Explore and on your profile.' : 'Only you can see it.'}>
                    <div role="radiogroup" aria-label="Who can see this sketchbook" style={{ display: 'flex', gap: 2, padding: 3, border: '1px solid rgba(var(--ink-rgb),.2)', alignSelf: 'flex-start', opacity: v.bookHidden ? 0.45 : 1 }}>
                      {([[true, 'Public'], [false, 'Private']] as const).map(([on, name]) => (
                        <button key={name} role="radio" aria-checked={v.bookPublic === on} disabled={v.bookHidden} onClick={() => v.setPublic(on)} style={{ height: 32, padding: '0 16px', border: 'none', borderRadius: 2, background: v.bookPublic === on ? INK : 'transparent', color: v.bookPublic === on ? PAPER : INK, font: `500 13px ${SANS}`, cursor: v.bookHidden ? 'not-allowed' : 'pointer' }}>{name}</button>
                      ))}
                    </div>
                  </Row>
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

/** Invite one other person to add pages, see who's drawing in it, or stop sharing. */
function SharePanel({ v }: { v: V }) {
  const who = (m: V) => <><b style={{ fontWeight: 600 }}>{m.name}</b> <span style={{ color: 'rgba(var(--ink-rgb),.6)' }}>{m.handle}</span></>;
  return (
    <Row label="Draw together" note="One other person can add and caption pages. Invitations are sent straight away, without needing Save.">
      {v.shCollab ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontSize: 14 }}>
          <span>Drawing with {who(v.shCollab)}</span>
          <button onClick={v.shRemove} disabled={v.shBusy} style={linkBtn(MARK)}>Stop sharing</button>
        </div>
      ) : v.shInvite ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontSize: 14 }}>
          <span>Waiting for {who(v.shInvite)} to accept</span>
          <button onClick={v.shCancel} disabled={v.shBusy} style={linkBtn(MARK)}>Cancel invitation</button>
        </div>
      ) : (
        <form onSubmit={v.shInviteSend} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 220px' }}><HandleField value={v.shDraft} onChange={v.onShDraft} placeholder="their handle" /></div>
          <button type="submit" disabled={v.shBusy || !v.shDraft} style={{ height: 44, padding: '0 20px', borderRadius: 2, border: 'none', background: INK, color: PAPER, font: `500 14px ${SANS}`, cursor: 'pointer', opacity: v.shBusy || !v.shDraft ? 0.5 : 1 }}>{v.shBusy ? 'Inviting…' : 'Invite'}</button>
        </form>
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

/** The page-shaped frame: the image (dragged, pinched, twisted) with the colour adjustments applied, under a thirds grid. */
function EditFrame({ v, radius, shadow, wheel }: { v: V; radius: string; shadow: string; wheel?: boolean }) {
  return (
    <div onPointerDown={v.edDown} onPointerMove={v.edMove} onPointerUp={v.edUp} onPointerCancel={v.edUp} onWheel={wheel && !v.edWrite ? v.edWheel : undefined} style={{ position: 'relative', width: v.fw, height: v.fh, flexShrink: 0, overflow: 'hidden', borderRadius: radius, boxShadow: shadow, cursor: v.edWrite ? 'crosshair' : 'move', touchAction: 'none' }}>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <filter id="ed-adjust" colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values={v.edFx} /></filter>
      </svg>
      {/* Same paper and the same colour matrix the saved page gets. */}
      <div style={{ position: 'absolute', inset: 0, background: '#f3efe6', filter: v.edAdjusted && !v.edPeek ? 'url(#ed-adjust)' : undefined, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: v.bw, height: v.bh, transform: `translate(-50%,-50%) ${v.edTransform}`, background: v.edBg }} />
      </div>
      {v.edMode === 'fit' && <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(var(--ink-rgb),.35) 1px,transparent 1px),linear-gradient(90deg,rgba(var(--ink-rgb),.35) 1px,transparent 1px)', backgroundSize: '33.34% 33.34%', mixBlendMode: 'difference', opacity: .5 }} />}
      {/* Typed text (always shown, so Fit and Adjust preview the finished page), then the handwriting still to convert. */}
      {v.edTexts.map((t: V) => (
        <div key={t.id} data-tid={t.id} style={{ position: 'absolute', left: t.left, top: t.top, width: t.width, font: `${t.fontPx}px/${t.lineH}px ${TEXT_FONT}`, color: TEXT_INK, whiteSpace: 'pre', pointerEvents: v.edWrite ? 'auto' : 'none', cursor: 'grab', outline: t.sel ? `1.5px dashed ${MARK}` : v.edWrite ? '1px dashed rgba(34,35,32,.25)' : 'none', outlineOffset: 4 }}>
          {t.lines.map((l: string, i: number) => <div key={i} style={{ height: t.lineH }}>{l}</div>)}
        </div>
      ))}
      {v.edWrite && (
        <svg width={v.fw} height={v.fh} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} aria-hidden="true">
          {v.edInkPaths.map((d: string, i: number) => <path key={i} d={d} fill="none" stroke={TEXT_INK} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" opacity={v.inkBusy ? 0.35 : 1} />)}
        </svg>
      )}
      {v.inkBusy && <span style={{ position: 'absolute', left: '50%', top: 12, transform: 'translateX(-50%)', padding: '5px 12px', borderRadius: 12, background: 'rgba(34,35,32,.8)', color: '#F6F2E8', font: `500 12px ${SANS}` }}>Reading your writing…</span>}
      {v.edPeek && <span style={{ position: 'absolute', left: 8, top: 8, padding: '3px 8px', borderRadius: 10, background: 'rgba(34,35,32,.75)', color: '#F6F2E8', font: `500 11px ${SANS}` }}>Original</span>}
    </div>
  );
}

function ModeSwitch({ v, height = 36 }: { v: V; height?: number }) {
  return (
    <div role="tablist" aria-label="Editor" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, padding: 3, border: '1px solid rgba(var(--ink-rgb),.2)' }}>
      {([['fit', 'Fit'], ['adjust', 'Adjust'], ['write', 'Write']] as const).map(([k, l]) => (
        <button key={k} role="tab" aria-selected={v.edMode === k} onClick={() => v.setEdMode(k)} style={{ height, border: 'none', borderRadius: 2, background: v.edMode === k ? INK : 'transparent', color: v.edMode === k ? PAPER : INK, font: `500 14px ${SANS}`, cursor: 'pointer' }}>{l}{k === 'adjust' && v.edAdjusted ? ' •' : ''}</button>
      ))}
    </div>
  );
}

/** Hold to see the image without adjustments. */
const PeekBtn = ({ v, style }: { v: V; style: CSSProperties }) => (
  <button onPointerDown={v.peekOn} onPointerUp={v.peekOff} onPointerLeave={v.peekOff} onPointerCancel={v.peekOff} onContextMenu={e => e.preventDefault()} disabled={!v.edAdjusted} style={{ ...style, opacity: v.edAdjusted ? 1 : 0.4, touchAction: 'none', userSelect: 'none' }}>Hold to compare</button>
);

/** Write mode controls: convert the handwriting, or edit the selected piece of text. */
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: mob ? 10 : 14 }}>
      {!mob && <span style={{ fontSize: 12, lineHeight: 1.45, color: 'rgba(var(--ink-rgb),.6)' }}>Write on the page with your finger, a pen or the mouse, then convert it to typed text. Tap text to edit it; drag it to move it.</span>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={v.undoInk} disabled={!v.hasInk || v.inkBusy} style={{ ...outline, opacity: v.hasInk ? 1 : 0.4 }}>Undo</button>
        <button onClick={v.clearInk} disabled={!v.hasInk || v.inkBusy} style={{ ...outline, opacity: v.hasInk ? 1 : 0.4 }}>Clear</button>
      </div>
      <button onClick={v.convertInk} disabled={!v.hasInk || v.inkBusy} style={{ ...outline, flex: 'none', height: mob ? 42 : 40, border: 'none', background: v.hasInk ? MARK : 'rgba(var(--ink-rgb),.12)', color: v.hasInk ? PAPER : 'rgba(var(--ink-rgb),.5)' }}>{v.inkBusy ? 'Reading…' : 'Convert to text'}</button>
      {v.inkErr && <span role="alert" style={{ fontSize: 13, color: MARK }}>{v.inkErr}</span>}
    </div>
  );
}

/** Phone layout: top bar, full-width frame (drag, pinch, twist), Fit / Adjust, one slider for the chosen tool, big action button. */
function MobileEditor({ v }: { v: V }) {
  const adjust = v.edMode === 'adjust', write = v.edMode === 'write';
  const tools: { key: string; name: string; min: number; max: number; step: number; value: number; lbl: string; onChange: ChangeEventHandler<HTMLInputElement> }[] = adjust
    ? v.edAdj.map((a: V) => ({ key: a.key, name: ADJ_SHORT[a.key], min: a.min, max: a.max, step: 1, value: a.value, lbl: a.lbl, onChange: a.onChange }))
    : ED_TOOLS.map(([k, n, min, max, step, lbl]) => ({ key: k, name: n, min, max, step, value: v[k], lbl: v[lbl], onChange: v[ED_ON[k]] }));
  const tool = tools.find(t => t.key === (adjust ? v.edAdjTool : v.edTool)) || tools[0];
  const pick = (k: string) => adjust ? v.setEdAdjTool(k) : v.setEdTool(k);
  const bar: CSSProperties = { background: 'none', border: 'none', padding: '8px 0', color: INK, font: `500 15px ${SANS}`, cursor: 'pointer' };
  const outline: CSSProperties = { flex: 1, height: 42, borderRadius: 2, border: '1.5px solid rgba(var(--ink-rgb),.5)', background: 'none', color: INK, font: `500 14px ${SANS}`, cursor: 'pointer' };
  return (
    <div style={{ position: 'absolute', inset: 0, background: PAPER, zIndex: 20, display: 'flex', flexDirection: 'column', boxSizing: 'border-box', padding: '0 16px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))', overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8, padding: '12px 0 8px' }}>
        <button onClick={v.cancelEdit} style={{ ...bar, justifySelf: 'start', color: 'rgba(var(--ink-rgb),.75)' }}>Cancel</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ font: `400 22px/1.1 ${SERIF}` }}>{write ? 'Write' : adjust ? 'Adjust' : 'Fit your page'}</div>
          <div style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),.65)' }}>{v.edTitle}</div>
        </div>
        {v.applyLbl === 'Add to sketchbook' ? <button onClick={v.skipEdit} style={{ ...bar, justifySelf: 'end', color: 'rgba(var(--ink-rgb),.75)' }}>Skip</button> : <span />}
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <EditFrame v={v} radius="2px 8px 8px 2px" shadow="0 18px 40px rgba(10,10,30,.3)" />
        <div style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),.6)' }}>{write ? 'Write with your finger, then convert · drag text to move it' : adjust ? 'Whites cleans up the grey of a photographed page' : 'Drag to move · pinch to zoom · twist to rotate'}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 10 }}>
        <ModeSwitch v={v} height={34} />
        {write ? <WriteTools v={v} outline={outline} mob /> : <>
        <div role="tablist" aria-label={adjust ? 'Adjustment' : 'Tool'} style={{ display: 'flex', gap: 4, overflowX: 'auto', scrollbarWidth: 'none' } as CSSProperties}>
          {tools.map(t => (
            <button key={t.key} role="tab" aria-selected={t.key === tool.key} onClick={() => pick(t.key)} style={{ flex: '1 0 auto', height: 34, padding: '0 10px', border: `1px solid ${t.key === tool.key ? INK : 'rgba(var(--ink-rgb),.2)'}`, borderRadius: 17, background: t.key === tool.key ? INK : 'transparent', color: t.key === tool.key ? PAPER : INK, font: `500 13px ${SANS}`, cursor: 'pointer', whiteSpace: 'nowrap' }}>{t.name}{adjust && t.value !== 0 ? ' •' : ''}</button>
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
        <button onClick={v.applyEdit} style={{ height: 52, borderRadius: 2, border: 'none', background: INK, color: PAPER, font: `500 16px ${SANS}`, cursor: 'pointer' }}>{v.applyLbl}</button>
      </div>
    </div>
  );
}

/** "Fit your page": crop, zoom, rotate and skew an image inside a page-shaped frame, then adjust its light and colour. */
export function Editor({ v }: { v: V }) {
  if (v.edMob) return <MobileEditor v={v} />;
  const outline: CSSProperties = { flex: 1, height: 36, borderRadius: 2, border: '1.5px solid rgba(var(--ink-rgb),.5)', background: 'none', color: INK, font: `500 13px ${SANS}`, cursor: 'pointer' };
  const adjust = v.edMode === 'adjust', write = v.edMode === 'write';
  return (
    <div style={{ position: 'absolute', inset: 0, background: PAPER, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 48, padding: 24, flexWrap: 'wrap', overflow: 'auto' }}>
      <EditFrame v={v} radius="2px 10px 10px 2px" shadow="0 30px 70px rgba(10,10,30,.5)" wheel />
      <div style={{ width: 260, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={heading}>{write ? 'Write' : adjust ? 'Adjust' : 'Fit your page'}</div>
          <div style={{ fontSize: 13, color: 'rgba(var(--ink-rgb),.7)' }}>{v.edTitle} · {write ? 'handwriting to text' : adjust ? 'light and colour' : 'drag to move, scroll or pinch to zoom'}</div>
        </div>
        <ModeSwitch v={v} />
        {write ? <WriteTools v={v} outline={outline} /> : adjust ? (
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
            <Slider name="Skew horizontal" lbl={v.skxLbl} min={-30} max={30} step={0.5} value={v.skx} onChange={v.onSkx} />
            <Slider name="Skew vertical" lbl={v.skyLbl} min={-30} max={30} step={0.5} value={v.sky} onChange={v.onSky} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={v.rot90} style={outline}>Rotate 90°</button>
              <button onClick={v.resetEd} style={outline}>Reset</button>
            </div>
          </>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={v.applyEdit} style={{ height: 44, borderRadius: 2, border: 'none', background: INK, color: PAPER, font: `500 14px ${SANS}`, cursor: 'pointer' }}>{v.applyLbl}</button>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={v.skipEdit} style={linkBtn('rgba(var(--ink-rgb),.75)')}>Skip image</button>
            <button onClick={v.cancelEdit} style={linkBtn('rgba(var(--ink-rgb),.75)')}>Cancel all</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Small dropdown under a ⋯ button: report, block and the like. */
export function MoreMenu({ open, onToggle, items, align = 'center' }: { open: boolean; onToggle: () => void; items: { label: string; onClick: () => void; danger?: boolean }[]; align?: 'center' | 'right' }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <button onClick={e => { e.stopPropagation(); onToggle(); }} aria-haspopup="menu" aria-expanded={open} title="More" className={'tap ' + hover(`color:${MARK}`)} style={{ height: 28, minWidth: 28, padding: '0 6px', border: 'none', background: 'none', color: INK, font: `600 16px/1 ${SANS}`, letterSpacing: 1, cursor: 'pointer' }}>⋯</button>
      {open && (
        <span role="menu" style={{ position: 'absolute', top: '100%', [align === 'right' ? 'right' : 'left']: align === 'right' ? 0 : '50%', transform: align === 'right' ? undefined : 'translateX(-50%)', marginTop: 6, zIndex: 30, display: 'flex', flexDirection: 'column', minWidth: 190, padding: 6, background: PAPER, border: `1px solid ${INK}`, boxShadow: '0 12px 30px rgba(34,35,32,.14)' }}>
          {items.map(it => (
            <button key={it.label} role="menuitem" onClick={it.onClick} className={hover('background:rgba(var(--ink-rgb),.07)')} style={{ textAlign: 'left', padding: '12px 10px', border: 'none', background: 'none', color: it.danger ? MARK : INK, font: `500 13px ${SANS}`, letterSpacing: 0, textTransform: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>{it.label}</button>
          ))}
        </span>
      )}
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
