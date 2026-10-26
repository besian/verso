// A sketchbook as a PDF, made in the browser (Plus), laid out like a printed sketchbook: its cover, a title page,
// each drawing on an A4 page of paper with its caption and date, pictures across two pages on one landscape page,
// and a closing page. Each page is a background drawn on a canvas in fletora's own fonts (paper, text, shadow)
// with the drawing placed on top as its original JPEG, so drawings keep their full resolution. Written by hand,
// so no PDF library is needed.

export interface PdfPage { url: string; caption?: string; date?: string; /** The right half, when this page starts a picture across two pages. */ right?: string }
export interface PdfBook { title: string; artist: string; link: string; color: string; cover?: string | null; mediums?: string[] }

const PAPER = '#F4F1E9', INK = '#222320', MUTED = '#77756e', MARK = '#AD493A';
const SERIF = "'Instrument Serif', Georgia, serif", SANS = "'Geist', Helvetica, Arial, sans-serif";
const A4 = { w: 595, h: 842 }, K = 2.5; // points; background canvases are drawn at 2.5 px per point (180 dpi)
const enc = (s: string) => { const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); b[i] = c < 256 ? c : 63; } return b; };
const esc = (s: string) => s.replace(/[\\()]/g, m => '\\' + m).replace(/[\r\n]+/g, ' ');

const loadImg = (src: string, cors: boolean) => new Promise<HTMLImageElement>((res, rej) => {
  const im = new Image(); if (cors) im.crossOrigin = 'anonymous';
  im.onload = () => res(im); im.onerror = () => rej(new Error('couldn’t load a page image')); im.src = src;
});

interface Jpeg { bytes: Uint8Array; w: number; h: number; img: HTMLImageElement }
/** A page image as JPEG bytes with its size. JPEGs go in as they are; anything else (or an image that can only be
 *  loaded as a picture) is redrawn through a canvas. */
async function jpeg(url: string, token: string): Promise<Jpeg> {
  let blob: Blob | null = null;
  const get = async (u: string, init: RequestInit) => { try { const r = await fetch(u, init); return r.ok && (r.headers.get('content-type') || '').startsWith('image/') ? await r.blob() : null; } catch { return null; } };
  if (!/^https?:/.test(url)) blob = await get(url, {});
  else {
    // Straight from storage (fresh, so a copy the browser kept from showing the page can't get in the way);
    // failing that, passed through fletora.studio (api/page-image), which some browsers need.
    blob = await get(url, { mode: 'cors', cache: 'reload' })
      || (token ? await get(`/api/page-image?u=${encodeURIComponent(url)}`, { headers: { authorization: 'Bearer ' + token } }) : null);
  }
  const local = blob ? URL.createObjectURL(blob) : '';
  try {
    const img = await loadImg(local || url, !local), w = img.naturalWidth, h = img.naturalHeight;
    if (blob && (blob.type === 'image/jpeg' || blob.type === 'image/jpg')) return { bytes: new Uint8Array(await blob.arrayBuffer()), w, h, img };
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d')!; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0);
    return { bytes: await canvasJpeg(c, 0.92), w, h, img };
  } finally { if (local) URL.revokeObjectURL(local); }
}
const canvasJpeg = (c: HTMLCanvasElement, q: number) => new Promise<Uint8Array>((res, rej) =>
  c.toBlob(b => b ? b.arrayBuffer().then(a => res(new Uint8Array(a))) : rej(new Error('couldn’t draw a page')), 'image/jpeg', q));

/** A page background: paper (or `fill`) at the page's size, drawn on in points. */
function sheet(w: number, h: number, fill = PAPER) {
  const c = document.createElement('canvas'); c.width = Math.round(w * K); c.height = Math.round(h * K);
  const ctx = c.getContext('2d')!; ctx.scale(K, K); ctx.fillStyle = fill; ctx.fillRect(0, 0, w, h); ctx.textBaseline = 'alphabetic';
  return { c, ctx };
}
const text = (ctx: CanvasRenderingContext2D, s: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = 'left', spacing = 0) => {
  ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align;
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = spacing + 'px';
  ctx.fillText(s, x, y);
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '0px';
};
/** Splits `s` into lines no wider than `max` in the current font. */
const wrap = (ctx: CanvasRenderingContext2D, s: string, max: number) => {
  const out: string[] = []; let line = '';
  for (const word of s.split(/\s+/)) { const t = line ? line + ' ' + word : word; if (ctx.measureText(t).width > max && line) { out.push(line); line = word; } else line = t; }
  if (line) out.push(line); return out;
};
const wordmark = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, align: CanvasTextAlign = 'left') => {
  ctx.font = `400 ${size}px ${SERIF}`; const w = ctx.measureText('fletora').width, left = align === 'center' ? x - (w + size * 0.25) / 2 : x;
  text(ctx, 'fletora', left, y, `400 ${size}px ${SERIF}`, INK); text(ctx, '.', left + w, y, `400 ${size}px ${SERIF}`, MARK);
};
/** The months the drawings span, from their dates ("March – October 2026", or one month). */
const span = (dates: string[]) => {
  const ds = dates.filter(Boolean).sort(); if (!ds.length) return '';
  const f = (d: string, y: boolean) => new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { month: 'long', ...(y ? { year: 'numeric' } : {}) });
  const a = ds[0], b = ds[ds.length - 1], sameYear = a.slice(0, 4) === b.slice(0, 4);
  return a.slice(0, 7) === b.slice(0, 7) ? f(a, true) : `${f(a, !sameYear)} – ${f(b, true)}`;
};
const dateLine = (d?: string) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

/** A finished page: its size, background and drawings placed on it (in points, from the bottom left). */
interface Out { w: number; h: number; bg: Uint8Array; draw: { j: Jpeg; x: number; y: number; w: number; h: number }[] }

/** A drawing (or both halves of a spread) on paper, with caption, date and page number. */
async function drawingPage(book: PdfBook, imgs: Jpeg[], p: PdfPage, num: string, spread: boolean): Promise<Out> {
  const W = spread ? A4.h : A4.w, H = spread ? A4.w : A4.h, { c, ctx } = sheet(W, H);
  const notes = !!(p.caption || p.date), m = spread ? 40 : 54, top = spread ? 40 : 56, bottom = notes ? (spread ? 92 : 120) : (spread ? 62 : 80);
  // The picture, as large as the margins allow, centred: one page, or the two halves side by side.
  const pw = imgs.reduce((a, j) => a + j.w / j.h, 0), boxW = W - 2 * m, boxH = H - top - bottom;
  const dh = Math.min(boxH, boxW / pw), dw = dh * pw, x0 = (W - dw) / 2, y0 = top + (boxH - dh) / 2;
  ctx.save(); ctx.shadowColor = 'rgba(34,35,32,.22)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6; ctx.fillStyle = '#fff'; ctx.fillRect(x0, y0, dw, dh); ctx.restore();
  if (spread) { ctx.fillStyle = 'rgba(34,35,32,.18)'; ctx.fillRect(x0 + dw / 2 - 0.4, y0, 0.8, dh); }
  // Caption and date under the picture, in the margin, like the book's own notes.
  let y = y0 + dh + 30;
  if (p.caption) {
    ctx.font = `italic 400 ${spread ? 15 : 17}px ${SERIF}`;
    for (const l of wrap(ctx, p.caption, Math.min(dw, 420)).slice(0, 2)) { text(ctx, l, W / 2, y, ctx.font, INK, 'center'); y += 20; }
  }
  if (p.date) text(ctx, dateLine(p.date).toUpperCase(), W / 2, y + (p.caption ? 2 : 0), `500 7.5px ${SANS}`, MUTED, 'center', 1.4);
  // Running foot: the sketchbook's name on one side, the page number on the other.
  text(ctx, book.title, m, H - 26, `italic 400 10px ${SERIF}`, MUTED);
  text(ctx, num, W - m, H - 26, `500 8px ${SANS}`, MUTED, 'right', 1);
  const draw: Out['draw'] = []; let x = x0;
  for (const j of imgs) { const w = dh * j.w / j.h; draw.push({ j, x, y: H - y0 - dh, w, h: dh }); x += w; }
  return { w: W, h: H, bg: await canvasJpeg(c, 0.9), draw };
}

/** The front: the sketchbook's cover (its colour or picture) with a label, like the closed book. */
async function coverPage(book: PdfBook, cover: Jpeg | null): Promise<Out> {
  const { w: W, h: H } = A4, { c, ctx } = sheet(W, H, book.color || '#b8243a');
  if (cover) { const s = Math.max(W / cover.w, H / cover.h); ctx.drawImage(cover.img, (W - cover.w * s) / 2, (H - cover.h * s) / 2, cover.w * s, cover.h * s); }
  // The elastic band down the right, and a soft edge on the spine.
  ctx.fillStyle = 'rgba(20,20,24,.82)'; ctx.fillRect(W - 78, 0, 16, H);
  const g = ctx.createLinearGradient(0, 0, 28, 0); g.addColorStop(0, 'rgba(0,0,0,.28)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 28, H);
  // The label.
  ctx.font = `400 34px ${SERIF}`;
  const lines = wrap(ctx, book.title, 300).slice(0, 3), lw = Math.min(360, Math.max(...lines.map(l => ctx.measureText(l).width)) + 64), lh = 46 + lines.length * 38 + 30;
  const lx = 60, ly = 120;
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3; ctx.fillStyle = '#F6F2E8'; ctx.fillRect(lx, ly, lw, lh); ctx.restore();
  lines.forEach((l, i) => text(ctx, l, lx + 32, ly + 58 + i * 38, `400 34px ${SERIF}`, INK));
  text(ctx, book.artist, lx + 32, ly + lh - 24, `italic 400 15px ${SERIF}`, MUTED);
  return { w: W, h: H, bg: await canvasJpeg(c, 0.9), draw: [] };
}

/** Inside the cover: the name, who drew it, how many pages and when, and its mediums. */
async function titlePage(book: PdfBook, pages: PdfPage[], count: number): Promise<Out> {
  const { w: W, h: H } = A4, { c, ctx } = sheet(W, H);
  text(ctx, 'A SKETCHBOOK', 64, 150, `600 8px ${SANS}`, MARK, 'left', 2.2);
  ctx.fillStyle = 'rgba(34,35,32,.35)'; ctx.fillRect(64, 166, 40, 0.8);
  ctx.font = `400 58px ${SERIF}`;
  let y = 236; for (const l of wrap(ctx, book.title, W - 128).slice(0, 4)) { text(ctx, l, 64, y, `400 58px ${SERIF}`, INK); y += 60; }
  text(ctx, book.artist, 64, y + 8, `italic 400 24px ${SERIF}`, MARK);
  const when = span(pages.map(p => p.date || '')), facts = [`${count} ${count === 1 ? 'page' : 'pages'}`, when, (book.mediums || []).join(', ')].filter(Boolean);
  facts.forEach((f, i) => text(ctx, f, 64, y + 64 + i * 22, `400 12px ${SANS}`, MUTED));
  wordmark(ctx, 64, H - 72, 22);
  text(ctx, book.link, 64, H - 52, `400 9px ${SANS}`, MUTED);
  return { w: W, h: H, bg: await canvasJpeg(c, 0.9), draw: [] };
}

/** The last page: where it was made. */
async function endPage(book: PdfBook): Promise<Out> {
  const { w: W, h: H } = A4, { c, ctx } = sheet(W, H);
  text(ctx, 'Made with', W / 2, H / 2 - 18, `italic 400 16px ${SERIF}`, MUTED, 'center');
  wordmark(ctx, W / 2, H / 2 + 22, 40, 'center');
  text(ctx, book.link, W / 2, H / 2 + 50, `400 9px ${SANS}`, MUTED, 'center');
  return { w: W, h: H, bg: await canvasJpeg(c, 0.9), draw: [] };
}

export async function makePdf(book: PdfBook, pages: PdfPage[], progress?: (done: number, all: number) => void, token = ''): Promise<Blob> {
  // The fonts must be ready before they're drawn onto the canvases.
  await Promise.all([`400 40px ${SERIF}`, `italic 400 40px ${SERIF}`, `400 12px ${SANS}`, `500 12px ${SANS}`, `600 12px ${SANS}`].map(f => document.fonts?.load(f).catch(() => null)));
  const count = pages.reduce((n, p) => n + (p.right ? 2 : 1), 0), outs: Out[] = [];
  const cover = book.cover ? await jpeg(book.cover, token).catch(() => null) : null;
  outs.push(await coverPage(book, cover), await titlePage(book, pages, count));
  let n = 1;
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i], imgs = [await jpeg(p.url, token), ...(p.right ? [await jpeg(p.right, token)] : [])];
    outs.push(await drawingPage(book, imgs, p, p.right ? `${n}–${n + 1}` : String(n), !!p.right));
    n += imgs.length; progress?.(i + 1, pages.length);
  }
  outs.push(await endPage(book));
  return write(book, outs);
}

/** Writes the pages out as a PDF: per page, its background image and its drawings. */
function write(book: PdfBook, outs: Out[]): Blob {
  const parts: Uint8Array[] = [], offsets: number[] = [];
  let size = 0, next = 3;
  const put = (x: string | Uint8Array) => { const b = typeof x === 'string' ? enc(x) : x; parts.push(b); size += b.length; };
  const obj = (n: number, body: string | (() => void)) => { offsets[n] = size; put(`${n} 0 obj\n`); if (typeof body === 'string') put(body); else body(); put('\nendobj\n'); };
  const stream = (n: number, dict: string, data: Uint8Array) => obj(n, () => { put(`<< ${dict} /Length ${data.length} >>\nstream\n`); put(data); put('\nendstream'); });
  const image = (n: number, bytes: Uint8Array, w: number, h: number) => stream(n, `/Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`, bytes);

  put('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n');
  // 1 catalog, 2 page tree; then per page: the page, its contents, its background and each drawing.
  const kids: number[] = [];
  for (const o of outs) {
    const p = next++, c = next++, bg = next++, ims = o.draw.map(() => next++);
    image(bg, o.bg, Math.round(o.w * K), Math.round(o.h * K));
    o.draw.forEach((d, k) => image(ims[k], d.j.bytes, d.j.w, d.j.h));
    const ops = [`q ${o.w} 0 0 ${o.h} 0 0 cm /Bg Do Q`, ...o.draw.map((d, k) => `q ${d.w.toFixed(2)} 0 0 ${d.h.toFixed(2)} ${d.x.toFixed(2)} ${d.y.toFixed(2)} cm /Im${k} Do Q`)];
    stream(c, '', enc(ops.join('\n')));
    obj(p, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${o.w} ${o.h}] /Resources << /XObject << /Bg ${bg} 0 R ${ims.map((n, k) => `/Im${k} ${n} 0 R`).join(' ')} >> >> /Contents ${c} 0 R >>`);
    kids.push(p);
  }
  obj(2, `<< /Type /Pages /Kids [${kids.map(k => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`);
  obj(1, `<< /Type /Catalog /Pages 2 0 R /ViewerPreferences << /DisplayDocTitle true >> >>`);
  const info = next++;
  obj(info, `<< /Title (${esc(book.title)}) /Author (${esc(book.artist.replace(/^by /, ''))}) /Producer (fletora.studio) >>`);

  const xref = size, count = next;
  put(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let n = 1; n < count; n++) put(`${String(offsets[n] ?? 0).padStart(10, '0')} 00000 n \n`);
  put(`trailer\n<< /Size ${count} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts as BlobPart[], { type: 'application/pdf' });
}
