// A sketchbook as a PDF, made in the browser (Plus): a title page, then one page per drawing at the drawing's
// own shape, with its caption and date underneath. Written by hand (images are JPEGs, text is Helvetica), so no
// PDF library is needed.

export interface PdfPage { url: string; note?: string }

const W = 595; // A4 width in points; each page's height follows its drawing
const enc = (s: string) => {
  // Helvetica's standard encoding covers Latin-1; anything beyond becomes '?'.
  const b = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); b[i] = c < 256 ? c : 63; }
  return b;
};
const esc = (s: string) => s.replace(/[\\()]/g, m => '\\' + m).replace(/[\r\n]+/g, ' ');

const loadImg = (src: string, cors: boolean) => new Promise<HTMLImageElement>((res, rej) => {
  const im = new Image(); if (cors) im.crossOrigin = 'anonymous';
  im.onload = () => res(im); im.onerror = () => rej(new Error('couldn’t load a page image')); im.src = src;
});

/** A page image as JPEG bytes with its size. JPEGs go in as they are; anything else (or an image that can only
 *  be loaded as a picture) is redrawn through a canvas. */
async function jpeg(url: string): Promise<{ bytes: Uint8Array; w: number; h: number }> {
  let blob: Blob | null = null;
  try {
    // Fetched fresh, so a copy the browser kept from showing the page can't get in the way.
    const r = await fetch(url, /^https?:/.test(url) ? { mode: 'cors', cache: 'reload' } : {});
    if (r.ok) blob = await r.blob();
  } catch { /* fall back to loading it as a picture below */ }
  const local = blob ? URL.createObjectURL(blob) : '';
  try {
    const im = await loadImg(local || url, !local), w = im.naturalWidth, h = im.naturalHeight;
    if (blob && (blob.type === 'image/jpeg' || blob.type === 'image/jpg')) return { bytes: new Uint8Array(await blob.arrayBuffer()), w, h };
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d')!; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(im, 0, 0);
    const out = await new Promise<Blob>((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('couldn’t redraw a page')), 'image/jpeg', 0.92));
    return { bytes: new Uint8Array(await out.arrayBuffer()), w, h };
  } finally { if (local) URL.revokeObjectURL(local); }
}

export async function makePdf(title: string, by: string, pages: PdfPage[], progress?: (done: number, all: number) => void): Promise<Blob> {
  const parts: Uint8Array[] = [], offsets: number[] = [];
  let size = 0;
  const put = (x: string | Uint8Array) => { const b = typeof x === 'string' ? enc(x) : x; parts.push(b); size += b.length; };
  const obj = (n: number, body: string | (() => void)) => { offsets[n] = size; put(`${n} 0 obj\n`); if (typeof body === 'string') put(body); else body(); put('\nendobj\n'); };
  const stream = (n: number, dict: string, data: Uint8Array) => obj(n, () => { put(`<< ${dict} /Length ${data.length} >>\nstream\n`); put(data); put('\nendstream'); });

  put('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n');
  // 1 catalog, 2 page tree, 3 font; then three objects per page (page, contents, image), title page first.
  const kids: number[] = [];
  let next = 4;
  obj(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');

  const titlePage = () => {
    const H = Math.round(W * 1.414), p = next++, c = next++;
    const text = `BT /F1 30 Tf 56 ${H - 140} Td (${esc(title)}) Tj ET\nBT /F1 13 Tf 56 ${H - 170} Td (${esc(by)}) Tj ET\n`
      + `BT /F1 10 Tf 56 56 Td (${esc(`${pages.length} ${pages.length === 1 ? 'page' : 'pages'} - fletora.studio`)}) Tj ET`;
    stream(c, '', enc(text));
    obj(p, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${c} 0 R >>`);
    kids.push(p);
  };
  titlePage();

  for (let i = 0; i < pages.length; i++) {
    const { bytes, w, h } = await jpeg(pages[i].url);
    const note = (pages[i].note || '').trim(), strip = note ? 30 : 0, ih = Math.round(W * h / w), H = ih + strip;
    const p = next++, c = next++, im = next++;
    stream(im, `/Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`, bytes);
    stream(c, '', enc(`q ${W} 0 0 ${ih} 0 ${strip} cm /Im0 Do Q` + (note ? `\nBT /F1 10 Tf 16 11 Td (${esc(note)}) Tj ET` : '')));
    obj(p, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R >> /XObject << /Im0 ${im} 0 R >> >> /Contents ${c} 0 R >>`);
    kids.push(p);
    progress?.(i + 1, pages.length);
  }

  obj(2, `<< /Type /Pages /Kids [${kids.map(k => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`);
  obj(1, `<< /Type /Catalog /Pages 2 0 R /ViewerPreferences << /DisplayDocTitle true >> >>`);
  const info = next++;
  obj(info, `<< /Title (${esc(title)}) /Author (${esc(by)}) /Producer (fletora.studio) >>`);

  const xref = size, count = next;
  put(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let n = 1; n < count; n++) put(`${String(offsets[n] ?? 0).padStart(10, '0')} 00000 n \n`);
  put(`trailer\n<< /Size ${count} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts as BlobPart[], { type: 'application/pdf' });
}
