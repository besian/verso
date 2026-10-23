import type { CSSProperties, ChangeEventHandler, MouseEventHandler, ReactNode } from 'react';
import type { V } from '../App';
import { focus, hover } from '../pseudo';
import { INK, MARK, MUTED, PAPER, SANS, SERIF } from '../theme';

const field: CSSProperties = { height: 44, padding: '0 14px', borderRadius: 2, border: '1.5px solid rgba(34,35,32,.14)', background: 'rgba(34,35,32,.06)', color: INK, font: `500 14px ${SANS}`, outline: 'none', width: '100%', boxSizing: 'border-box' };
const fieldLabel: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'rgba(34,35,32,.75)' };
const focusMark = focus(`border-color:${MARK}`);
const ghostBtn: CSSProperties = { borderRadius: 2, border: '1.5px solid rgba(34,35,32,.5)', background: 'none', color: INK, font: `500 13px ${SANS}`, cursor: 'pointer' };
const hoverTint = hover('background:rgba(34,35,32,.1)');
const linkBtn = (color: string): CSSProperties => ({ background: 'none', border: 'none', color, font: `500 13px ${SANS}`, cursor: 'pointer', padding: 0 });
const heading: CSSProperties = { fontSize: 38, fontFamily: SERIF, fontWeight: 400, letterSpacing: '-.01em' };

function Modal({ onClose, pad, maxWidth, gap = 18, shadow, children }: { onClose: MouseEventHandler; pad: number; maxWidth: number; gap?: number; shadow?: string; children: ReactNode }) {
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 20, background: 'rgba(226,222,212,.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, boxSizing: 'border-box' }}>
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
      <div style={{ display: 'flex', alignItems: 'center', height: 44, padding: '0 14px', borderRadius: 2, border: '1.5px solid rgba(34,35,32,.14)', background: 'rgba(34,35,32,.06)', boxSizing: 'border-box' }}>
        <span style={{ fontSize: 14, color: 'rgba(34,35,32,.5)' }}>@</span>
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
  return (
    <Modal onClose={v.pfClose} pad={v.mModalPad} maxWidth={520}>
      <div style={heading}>Edit profile</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 80, height: 80, flexShrink: 0, borderRadius: '50%', background: v.dAvBg, color: PAPER, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 600 }}>{v.dInit}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={v.pickAv} className={hoverTint} style={{ ...ghostBtn, height: 36, padding: '0 14px' }}>Upload photo</button>
          {v.dHasAv && <button onClick={v.removeAv} style={{ ...linkBtn(MARK), height: 36, padding: '0 8px' }}>Remove</button>}
        </div>
      </div>
      <div style={grid}>
        <TextField label="Name" value={v.dName} onChange={v.onDName} />
        <HandleField value={v.dHandle} onChange={v.onDHandle} />
      </div>
      <label style={fieldLabel}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Bio</span><span style={{ color: 'rgba(34,35,32,.5)' }}>{v.dBioCount}</span></div>
        <textarea value={v.dBio} onChange={v.onDBio} maxLength={160} rows={3} placeholder="What do you draw?" className={focusMark} style={{ ...field, height: undefined, padding: '12px 14px', font: `500 14px/1.45 ${SANS}`, resize: 'none' }} />
      </label>
      <div style={grid}>
        <TextField label="Location" value={v.dLoc} onChange={v.onDLoc} placeholder="City" />
        <TextField label="Website" value={v.dWeb} onChange={v.onDWeb} placeholder="yoursite.com" />
      </div>
      <Notice err={v.dErr} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', paddingTop: 14, borderTop: '1px solid rgba(34,35,32,.12)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 160 }}>
          <span style={{ fontSize: 12, color: 'rgba(34,35,32,.6)' }}>Signed in as {v.dEmail}</span>
          <button onClick={v.signOut} style={{ ...linkBtn(MARK), alignSelf: 'flex-start', padding: '2px 0' }}>Sign out</button>
        </div>
        <button onClick={v.pfCancel} className={hoverTint} style={{ ...ghostBtn, height: 44, padding: '0 18px', fontSize: 14 }}>Cancel</button>
        <button onClick={v.pfSave} disabled={v.dBusy} style={{ height: 44, padding: '0 22px', borderRadius: 2, border: 'none', background: MARK, color: PAPER, font: `500 14px ${SANS}`, cursor: v.dBusy ? 'progress' : 'pointer', opacity: v.dBusy ? 0.6 : 1 }}>{v.dBusy ? 'Saving…' : 'Save'}</button>
      </div>
    </Modal>
  );
}

export function NewBookPicker({ v }: { v: V }) {
  return (
    <Modal onClose={v.closePick} pad={v.mModalPad} maxWidth={760} gap={20} shadow="0 30px 60px rgba(10,10,30,.5)">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-.01em' }}>New sketchbook</div>
        <div style={{ fontSize: 13, color: 'rgba(34,35,32,.7)' }}>Pick a shape and size</div>
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
        <button onClick={v.cancelPick} style={{ height: 40, padding: '0 18px', borderRadius: 2, border: '1.5px solid rgba(34,35,32,.4)', background: 'none', color: INK, font: `500 14px ${SANS}`, cursor: 'pointer' }}>Cancel</button>
        <button onClick={v.createBook} className={hover('transform:scale(1.04)')} style={{ height: 40, padding: '0 22px', borderRadius: 2, border: 'none', background: MARK, color: PAPER, font: `500 14px ${SANS}`, cursor: 'pointer' }}>Create</button>
      </div>
    </Modal>
  );
}

const smallBtn: CSSProperties = { height: 28, borderRadius: 2, border: 'none', background: 'none', color: INK, font: `500 13px ${SANS}`, cursor: 'pointer' };
const arrowSm: CSSProperties = { ...smallBtn, width: 28, borderRadius: '50%', fontSize: 14 };
const hoverSm = hover('background:rgba(34,35,32,.12)');

/** The Pages screen: every page as a thumbnail to edit, remove, reorder or add to, plus name and cover. */
export function Manager({ v }: { v: V }) {
  return (
    <div onDragOver={v.onDragOver} onDrop={v.onDrop} style={{ position: 'absolute', inset: 0, background: PAPER, zIndex: 15, overflow: 'auto' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <button onClick={v.closeManager} style={{ height: 36, padding: '0 16px', borderRadius: 2, border: 'none', background: INK, color: PAPER, font: `500 14px ${SANS}`, cursor: 'pointer' }}>← Done</button>
          <button onClick={v.deleteBook} className={hover(`background:${MARK};color:${PAPER}`)} style={{ height: 36, padding: '0 14px', borderRadius: 2, border: `1.5px solid ${MARK}`, background: 'none', color: MARK, font: `500 13px ${SANS}`, cursor: 'pointer' }}>Delete sketchbook</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, flex: 1 }}>
            <input value={v.bookName} onChange={v.onName} style={{ background: 'none', border: 'none', borderBottom: '1.5px solid rgba(34,35,32,.25)', color: INK, font: `500 34px ${SANS}`, letterSpacing: '-.02em', padding: '0 0 4px', outline: 'none', width: '100%', maxWidth: 480 }} />
            <div style={{ fontSize: 13, color: 'rgba(34,35,32,.7)' }}>{v.blankNote} · drag to reorder</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
              <div role="radiogroup" aria-label="Who can see this sketchbook" style={{ display: 'flex', gap: 2, padding: 3, border: '1px solid rgba(34,35,32,.2)' }}>
                {([[true, 'Public'], [false, 'Private']] as const).map(([on, name]) => (
                  <button key={name} role="radio" aria-checked={v.bookPublic === on} onClick={() => v.setPublic(on)} style={{ height: 30, padding: '0 14px', border: 'none', borderRadius: 2, background: v.bookPublic === on ? INK : 'transparent', color: v.bookPublic === on ? PAPER : INK, font: `500 13px ${SANS}`, cursor: 'pointer' }}>{name}</button>
                ))}
              </div>
              <span style={{ fontSize: 13, color: 'rgba(34,35,32,.7)' }}>{v.bookPublic ? 'Anyone can find it in Explore and on your profile.' : 'Only you can see it.'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'rgba(34,35,32,.7)' }}>Cover</span>
            {v.swatches.map((s: V) => <button key={s.key} onClick={s.pick} aria-label={`Cover colour ${s.c}`} style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', background: s.c, boxShadow: s.ring, cursor: 'pointer', padding: 0 }} />)}
            <button onClick={v.pickCover} className={hoverTint} style={{ ...ghostBtn, height: 30, padding: '0 12px', marginLeft: 6 }}>Upload cover</button>
            {v.hasCoverImg && <button onClick={v.removeCover} style={{ ...linkBtn(MARK), padding: '0 4px' }}>Remove</button>}
            <input ref={v.coverRef} type="file" accept="image/*" onChange={v.onCoverFile} style={{ display: 'none' }} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 20 }}>
          {v.pagesList.map((pg: V, i: number) => (
            <div key={i} draggable onDragStart={pg.dragStart} onDragOver={pg.dragOver} onDrop={pg.drop} style={{ display: 'flex', flexDirection: 'column', gap: 8, cursor: 'grab' }}>
              <div onClick={pg.edit} className={hover(`box-shadow:0 0 0 2px ${INK},0 10px 24px rgba(10,10,30,.35)`)} style={{ aspectRatio: v.pgAspect, borderRadius: '2px 8px 8px 2px', background: pg.bg, boxShadow: '0 10px 24px rgba(10,10,30,.35)', cursor: 'pointer' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'rgba(34,35,32,.7)' }}>{pg.num}</span>
                <div style={{ display: 'flex', gap: 2 }}>
                  <button onClick={pg.left} title="Move earlier" className={hoverSm} style={arrowSm}>‹</button>
                  <button onClick={pg.right} title="Move later" className={hoverSm} style={arrowSm}>›</button>
                  <button onClick={pg.edit} className={hoverSm} style={{ ...smallBtn, padding: '0 8px' }}>Edit</button>
                  <button onClick={pg.remove} className={hover('background:rgba(255,120,120,.15)')} style={{ ...smallBtn, padding: '0 8px', color: MARK }}>Remove</button>
                </div>
              </div>
            </div>
          ))}
          <div onClick={v.pick} style={{ display: 'flex', flexDirection: 'column', gap: 8, cursor: 'pointer' }}>
            <div className={hover(`border-color:${INK}`)} style={{ aspectRatio: v.pgAspect, borderRadius: '2px 8px 8px 2px', border: '2px dashed rgba(34,35,32,.35)', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', color: 'rgba(34,35,32,.8)', fontSize: 14, fontWeight: 500, textAlign: 'center', padding: 12 }}>
              <span style={{ fontSize: 28, fontWeight: 400 }}>+</span>
              <span>Add pages</span>
              <span style={{ fontSize: 12, color: 'rgba(34,35,32,.6)' }}>or drop images</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Slider({ name, lbl, min, max, step, value, onChange }: { name: string; lbl: string; min: number; max: number; step: number; value: number; onChange: ChangeEventHandler<HTMLInputElement> }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{name}</span><span style={{ color: 'rgba(34,35,32,.7)' }}>{lbl}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={onChange} style={{ width: '100%', accentColor: INK }} />
    </label>
  );
}

const ED_TOOLS: [string, string, number, number, number, string][] = [
  ['scale', 'Zoom', 0.3, 4, 0.01, 'scaleLbl'], ['rot', 'Rotate', -180, 180, 0.5, 'rotLbl'], ['skx', 'Skew ↔', -30, 30, 0.5, 'skxLbl'], ['sky', 'Skew ↕', -30, 30, 0.5, 'skyLbl'],
];
const ED_ON: Record<string, string> = { scale: 'onScale', rot: 'onRot', skx: 'onSkx', sky: 'onSky' };

/** Phone layout: top bar, full-width frame (drag, pinch, twist), one slider for the chosen tool, big action button. */
function MobileEditor({ v }: { v: V }) {
  const tool = ED_TOOLS.find(t => t[0] === v.edTool) || ED_TOOLS[0];
  const [key, name, min, max, step, lbl] = tool;
  const bar: CSSProperties = { background: 'none', border: 'none', padding: '8px 0', color: INK, font: `500 15px ${SANS}`, cursor: 'pointer' };
  return (
    <div style={{ position: 'absolute', inset: 0, background: PAPER, zIndex: 20, display: 'flex', flexDirection: 'column', boxSizing: 'border-box', padding: '0 16px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))', overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8, padding: '12px 0 8px' }}>
        <button onClick={v.cancelEdit} style={{ ...bar, justifySelf: 'start', color: 'rgba(34,35,32,.75)' }}>Cancel</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ font: `400 22px/1.1 ${SERIF}` }}>Fit your page</div>
          <div style={{ fontSize: 12, color: 'rgba(34,35,32,.65)' }}>{v.edTitle}</div>
        </div>
        {v.applyLbl === 'Add to sketchbook' ? <button onClick={v.skipEdit} style={{ ...bar, justifySelf: 'end', color: 'rgba(34,35,32,.75)' }}>Skip</button> : <span />}
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <div onPointerDown={v.edDown} onPointerMove={v.edMove} onPointerUp={v.edUp} onPointerCancel={v.edUp} style={{ position: 'relative', width: v.fw, height: v.fh, flexShrink: 0, overflow: 'hidden', background: '#f3efe6', borderRadius: '2px 8px 8px 2px', boxShadow: '0 18px 40px rgba(10,10,30,.3)', touchAction: 'none' }}>
          <div style={{ position: 'absolute', left: '50%', top: '50%', width: v.bw, height: v.bh, transform: `translate(-50%,-50%) ${v.edTransform}`, background: v.edBg, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(34,35,32,.35) 1px,transparent 1px),linear-gradient(90deg,rgba(34,35,32,.35) 1px,transparent 1px)', backgroundSize: '33.34% 33.34%', mixBlendMode: 'difference', opacity: .5 }} />
        </div>
        <div style={{ fontSize: 12, color: 'rgba(34,35,32,.6)' }}>Drag to move · pinch to zoom · twist to rotate</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 10 }}>
        <div role="tablist" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, padding: 3, border: '1px solid rgba(34,35,32,.2)' }}>
          {ED_TOOLS.map(([k, n]) => (
            <button key={k} role="tab" aria-selected={k === key} onClick={() => v.setEdTool(k)} style={{ height: 36, border: 'none', borderRadius: 2, background: k === key ? INK : 'transparent', color: k === key ? PAPER : INK, font: `500 13px ${SANS}`, cursor: 'pointer' }}>{n}</button>
          ))}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
          <span style={{ width: 64, color: 'rgba(34,35,32,.7)' }}>{name}</span>
          <input type="range" min={min} max={max} step={step} value={v[key]} onChange={v[ED_ON[key]]} style={{ flex: 1, accentColor: INK, height: 28 }} />
          <span style={{ width: 48, textAlign: 'right', color: 'rgba(34,35,32,.7)' }}>{v[lbl]}</span>
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={v.rot90} style={{ flex: 1, height: 42, borderRadius: 2, border: '1.5px solid rgba(34,35,32,.5)', background: 'none', color: INK, font: `500 14px ${SANS}`, cursor: 'pointer' }}>Rotate 90°</button>
          <button onClick={v.resetEd} style={{ flex: 1, height: 42, borderRadius: 2, border: '1.5px solid rgba(34,35,32,.5)', background: 'none', color: INK, font: `500 14px ${SANS}`, cursor: 'pointer' }}>Reset</button>
        </div>
        <button onClick={v.applyEdit} style={{ height: 52, borderRadius: 2, border: 'none', background: INK, color: PAPER, font: `500 16px ${SANS}`, cursor: 'pointer' }}>{v.applyLbl}</button>
      </div>
    </div>
  );
}

/** "Fit your page": crop, zoom, rotate and skew an image inside a page-shaped frame. */
export function Editor({ v }: { v: V }) {
  if (v.edMob) return <MobileEditor v={v} />;
  const outline: CSSProperties = { flex: 1, height: 36, borderRadius: 2, border: '1.5px solid rgba(34,35,32,.5)', background: 'none', color: INK, font: `500 13px ${SANS}`, cursor: 'pointer' };
  return (
    <div style={{ position: 'absolute', inset: 0, background: PAPER, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 48, padding: 24, flexWrap: 'wrap', overflow: 'auto' }}>
      <div onPointerDown={v.edDown} onPointerMove={v.edMove} onPointerUp={v.edUp} onPointerCancel={v.edUp} onWheel={v.edWheel} style={{ position: 'relative', width: v.fw, height: v.fh, flexShrink: 0, overflow: 'hidden', background: '#f3efe6', borderRadius: '2px 10px 10px 2px', boxShadow: '0 30px 70px rgba(10,10,30,.5)', cursor: 'move', touchAction: 'none' }}>
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: v.bw, height: v.bh, transform: `translate(-50%,-50%) ${v.edTransform}`, background: v.edBg, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(34,35,32,.35) 1px,transparent 1px),linear-gradient(90deg,rgba(34,35,32,.35) 1px,transparent 1px)', backgroundSize: '33.34% 33.34%', mixBlendMode: 'difference', opacity: .5 }} />
      </div>
      <div style={{ width: 260, display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={heading}>Fit your page</div>
          <div style={{ fontSize: 13, color: 'rgba(34,35,32,.7)' }}>{v.edTitle} · drag to move, scroll or pinch to zoom</div>
        </div>
        <Slider name="Zoom" lbl={v.scaleLbl} min={0.3} max={4} step={0.01} value={v.scale} onChange={v.onScale} />
        <Slider name="Rotate" lbl={v.rotLbl} min={-180} max={180} step={0.5} value={v.rot} onChange={v.onRot} />
        <Slider name="Skew horizontal" lbl={v.skxLbl} min={-30} max={30} step={0.5} value={v.skx} onChange={v.onSkx} />
        <Slider name="Skew vertical" lbl={v.skyLbl} min={-30} max={30} step={0.5} value={v.sky} onChange={v.onSky} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={v.rot90} style={outline}>Rotate 90°</button>
          <button onClick={v.resetEd} style={outline}>Reset</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={v.applyEdit} style={{ height: 44, borderRadius: 2, border: 'none', background: INK, color: PAPER, font: `500 14px ${SANS}`, cursor: 'pointer' }}>{v.applyLbl}</button>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={v.skipEdit} style={linkBtn('rgba(34,35,32,.75)')}>Skip image</button>
            <button onClick={v.cancelEdit} style={linkBtn('rgba(34,35,32,.75)')}>Cancel all</button>
          </div>
        </div>
      </div>
    </div>
  );
}
