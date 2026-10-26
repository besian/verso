// A picture of a page (or the open spread) to post on Instagram, TikTok and the like: the pages on fletora's paper,
// with the sketchbook's name, the artist and the fletora mark. 1080 × 1350 (4:5), the size those apps show in full.

const PAPER = '#F4F1E9', INK = '#222320', MARK = '#AD493A', MUTED = '#77756E';
const SERIF = '"Instrument Serif", Georgia, serif', SANS = '"Geist", Helvetica, Arial, sans-serif';

const load = (src: string) => new Promise<HTMLImageElement>((ok, fail) => {
  const im = new Image(); if (!/^(data|blob):/.test(src)) im.crossOrigin = 'anonymous';
  im.onload = () => ok(im); im.onerror = () => fail(new Error('image')); im.src = src;
});
function fit(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text;
  let t = text; while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1);
  return t + '…';
}

/** pages: one or two picture URLs (left, right), each of the page shape `aspect` (width / height). */
export async function shareImage(o: { pages: string[]; aspect: number; title: string; artist: string; link: string }): Promise<Blob> {
  await Promise.all([document.fonts?.load(`64px ${SERIF}`), document.fonts?.load(`500 28px ${SANS}`)].map(p => p?.catch(() => undefined)));
  const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
  const imgs = await Promise.all(o.pages.map(load));
  // The pages, as large as fits above the caption, with a soft shadow and a fold between two.
  const n = imgs.length, boxW = W - 160, boxH = H - 420, a = o.aspect * n;
  const pw = Math.min(boxW, boxH * a), ph = pw / a, x0 = (W - pw) / 2, y0 = 110 + (boxH - ph) / 2;
  ctx.save(); ctx.shadowColor = 'rgba(34,35,32,.22)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 24; ctx.fillStyle = '#f3efe6'; ctx.fillRect(x0, y0, pw, ph); ctx.restore();
  imgs.forEach((im, i) => ctx.drawImage(im, x0 + i * pw / n, y0, pw / n, ph));
  if (n === 2) {
    const g = ctx.createLinearGradient(W / 2 - 28, 0, W / 2 + 28, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(0,0,0,.16)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(W / 2 - 28, y0, 56, ph);
  }
  // Caption: the sketchbook in the site's serif, the artist, then the mark and the address.
  const cy = y0 + ph + 92;
  ctx.textAlign = 'center'; ctx.fillStyle = INK;
  ctx.font = `400 64px ${SERIF}`; ctx.fillText(fit(ctx, o.title, W - 160), W / 2, cy);
  ctx.font = `500 26px ${SANS}`; ctx.fillStyle = MUTED; ctx.fillText(fit(ctx, `by ${o.artist}`.toUpperCase().split('').join(' '), W - 160), W / 2, cy + 52);
  ctx.font = `400 46px ${SERIF}`; ctx.fillStyle = INK;
  const mark = 'fletora', mw = ctx.measureText(mark).width, dot = ctx.measureText('.').width, mx = W / 2 - (mw + dot) / 2;
  ctx.textAlign = 'left'; ctx.fillText(mark, mx, H - 70); ctx.fillStyle = MARK; ctx.fillText('.', mx + mw, H - 70);
  ctx.textAlign = 'center'; ctx.font = `500 22px ${SANS}`; ctx.fillStyle = MUTED; ctx.fillText(o.link.replace(/^https?:\/\//, ''), W / 2, H - 34);
  return new Promise((ok, fail) => c.toBlob(b => b ? ok(b) : fail(new Error('blob')), 'image/jpeg', 0.92));
}

/** Opens the share sheet with the picture (phones), or saves it (elsewhere). */
export async function sharePicture(blob: Blob, name: string, title: string, url: string): Promise<'shared' | 'saved' | 'cancelled'> {
  const file = new File([blob], name, { type: 'image/jpeg' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try { await nav.share({ files: [file], title, text: `${title} ${url}` }); return 'shared'; }
    catch (e) { if ((e as Error).name === 'AbortError') return 'cancelled'; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return 'saved';
}
