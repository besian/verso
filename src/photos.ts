// Photos placed on a page in the editor (Draw and Text): moved, resized and turned by hand, and drawn into the
// saved page under the drawing and text.

/** A photo on the page: its centre and width as shares of the page, its height/width in pixels, and its turn. */
export interface PagePhoto { id: string; src: string; x: number; y: number; w: number; a: number; rot: number }

/** Longest side a placed photo is kept at: plenty for a page, small enough to keep the editor quick. */
const MAX_SIDE = 1600;

const loadImg = (src: string) => new Promise<HTMLImageElement>((ok, fail) => { const im = new Image(); im.onload = () => ok(im); im.onerror = fail; im.src = src; });

/** A picked file as a placed photo's picture (scaled down, as a JPEG) and its shape. */
export async function readPhoto(file: File): Promise<{ src: string; a: number }> {
  const url = URL.createObjectURL(file);
  try {
    const im = await loadImg(url), k = Math.min(1, MAX_SIDE / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k));
    c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
    return { src: c.toDataURL('image/jpeg', 0.9), a: c.height / c.width };
  } finally { URL.revokeObjectURL(url); }
}

/** A new photo in the middle of a page `pageA` (width/height) wide, sized to sit comfortably on it. */
export function placePhoto(src: string, a: number, pageA: number): PagePhoto {
  const w = Math.min(0.62, 0.55 / (a * pageA)); // no taller than 55% of the page
  return { id: Math.random().toString(36).slice(2, 9), src, x: 0.5, y: 0.45, w, a, rot: (Math.random() - 0.5) * 4 };
}

/** Draws the photos onto a page W × H. */
export async function drawPhotos(ctx: CanvasRenderingContext2D, photos: PagePhoto[], W: number, H: number) {
  for (const p of photos) {
    const im = await loadImg(p.src).catch(() => null); if (!im) continue;
    const w = p.w * W, h = w * p.a;
    ctx.save(); ctx.translate(p.x * W, p.y * H); ctx.rotate(p.rot * Math.PI / 180);
    ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore();
  }
}
