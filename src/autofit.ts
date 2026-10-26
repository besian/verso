// Finds the sheet of paper in a photo of a sketchbook page, so the page editor can straighten and crop it on its own.
// The background is whatever touches the photo's edges (a table, a lap): everything joined to the edges that's on the
// background's side of the light/dark split is background, and the largest piece left is the page. Working from the
// edges like this means drawings on the page, however dark or dense, never cut it up.

export type Pt = { x: number; y: number };

const SIZE = 200;

/** The page's corners (top left, top right, bottom right, bottom left) in 0–1 image coordinates, or null when the
 *  photo doesn't clearly show a page on a background (a scan, a screenshot, a page photographed edge to edge). */
export function findPage(im: CanvasImageSource, nw: number, nh: number): Pt[] | null {
  if (!nw || !nh) return null;
  const k = SIZE / Math.max(nw, nh), w = Math.max(8, Math.round(nw * k)), h = Math.max(8, Math.round(nh * k));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true }); if (!ctx) return null;
  ctx.drawImage(im, 0, 0, w, h);
  let px: Uint8ClampedArray;
  try { px = ctx.getImageData(0, 0, w, h).data; } catch { return null; }
  // Paper is light and grey-ish: lightness, less a little for strong colour.
  const n = w * h, val = new Float32Array(n), hist = new Array(256).fill(0);
  for (let i = 0; i < n; i++) {
    const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const v = Math.max(0, Math.min(255, 0.299 * r + 0.587 * g + 0.114 * b - 0.35 * (mx - mn)));
    val[i] = v; hist[v | 0]++;
  }
  const t = otsu(hist, n);
  // Which side of the split the background is on: the side most of the photo's edge is on.
  let edgeHi = 0, edgeN = 0;
  const onEdge = (i: number) => { edgeN++; if (val[i] > t) edgeHi++; };
  for (let x = 0; x < w; x++) { onEdge(x); onEdge((h - 1) * w + x); }
  for (let y = 1; y < h - 1; y++) { onEdge(y * w); onEdge(y * w + w - 1); }
  const bgHi = edgeHi / edgeN > 0.5, edgeBg = bgHi ? edgeHi / edgeN : 1 - edgeHi / edgeN;
  if (edgeBg < 0.6) return null; // the page runs off the photo, or there's no clear background
  const isBg = (i: number) => (val[i] > t) === bgHi;
  // Background: flood from the edges.
  const bg = new Uint8Array(n), q = new Int32Array(n); let qh = 0, qt = 0;
  const seed = (i: number) => { if (!bg[i] && isBg(i)) { bg[i] = 1; q[qt++] = i; } };
  for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1); }
  while (qh < qt) {
    const i = q[qh++], x = i % w;
    if (x > 0) seed(i - 1); if (x < w - 1) seed(i + 1); if (i >= w) seed(i - w); if (i < n - w) seed(i + w);
  }
  // The page: the largest piece that isn't background.
  const lab = new Int32Array(n); let best = 0, bestN = 0, id = 0;
  for (let s = 0; s < n; s++) {
    if (bg[s] || lab[s]) continue;
    id++; let cnt = 0; qh = qt = 0; q[qt++] = s; lab[s] = id;
    while (qh < qt) {
      const i = q[qh++], x = i % w; cnt++;
      const go = (j: number) => { if (!bg[j] && !lab[j]) { lab[j] = id; q[qt++] = j; } };
      if (x > 0) go(i - 1); if (x < w - 1) go(i + 1); if (i >= w) go(i - w); if (i < n - w) go(i + w);
    }
    if (cnt > bestN) { bestN = cnt; best = id; }
  }
  const share = bestN / n;
  if (share < 0.12 || share > 0.94) return null;
  // Corners: the page's furthest points along the two diagonals (good for pages turned up to about 35°).
  let tl = 0, tr = 0, br = 0, bl = 0, tlv = Infinity, trv = -Infinity, brv = -Infinity, blv = Infinity;
  let mean = 0, bgMean = 0, bgN = 0;
  for (let i = 0; i < n; i++) {
    if (lab[i] !== best) { if (bg[i]) { bgMean += val[i]; bgN++; } continue; }
    mean += val[i];
    const x = i % w, y = (i / w) | 0, s = x + y, d = x - y;
    if (s < tlv) { tlv = s; tl = i; } if (s > brv) { brv = s; br = i; }
    if (d > trv) { trv = d; tr = i; } if (d < blv) { blv = d; bl = i; }
  }
  // The page must stand out from the background.
  if (!bgN || Math.abs(mean / bestN - bgMean / bgN) < 28) return null;
  const P = [tl, tr, br, bl].map(i => ({ x: ((i % w) + 0.5) / w, y: (((i / w) | 0) + 0.5) / h }));
  // A sheet of paper fills most of the four-sided shape its corners make.
  const quad = Math.abs(area(P.map(p => ({ x: p.x * w, y: p.y * h }))));
  if (!quad || bestN / quad < 0.82 || !convex(P)) return null;
  return P;
}

function otsu(hist: number[], n: number) {
  let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sb = 0, wb = 0, best = 0, t = 127;
  for (let i = 0; i < 256; i++) {
    wb += hist[i]; if (!wb) continue; const wf = n - wb; if (!wf) break;
    sb += i * hist[i]; const mb = sb / wb, mf = (sum - sb) / wf, v = wb * wf * (mb - mf) ** 2;
    if (v > best) { best = v; t = i; }
  }
  return t;
}
const area = (P: Pt[]) => P.reduce((a, p, i) => { const q = P[(i + 1) % P.length]; return a + p.x * q.y - q.x * p.y; }, 0) / 2;
function convex(P: Pt[]) {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = P[i], b = P[(i + 1) % 4], c = P[(i + 2) % 4], z = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(z) < 1e-9) return false;
    if (sign && Math.sign(z) !== sign) return false; sign = Math.sign(z);
  }
  return true;
}

export type Fit = { scale: number; rot: number; skx: number; sky: number; tx: number; ty: number };

/**
 * The editor settings (translate, rotate, zoom, then skew, as the editor applies them) that make the page with these
 * corners fill a frame fw × fh, cropping a sliver all round so no background shows. The page keeps its own shape:
 * if it's a different shape from the frame, the extra is cropped. The image is drawn bw × bh, centred, before the settings.
 */
export function fitPage(P: Pt[], nw: number, nh: number, bw: number, bh: number, fw: number, fh: number): Fit | null {
  // Corners in the image's drawn coordinates (centred), and the page's own proportions.
  const src = P.map(p => ({ x: (p.x - 0.5) * bw, y: (p.y - 0.5) * bh }));
  const len = (a: Pt, b: Pt) => Math.hypot((b.x - a.x) * nw, (b.y - a.y) * nh);
  const pw = (len(P[0], P[1]) + len(P[3], P[2])) / 2, ph = (len(P[0], P[3]) + len(P[1], P[2])) / 2;
  if (!pw || !ph) return null;
  const pa = pw / ph, over = 1.025;
  const [tw, th] = pa > fw / fh ? [fh * over * pa, fh * over] : [fw * over, fw * over / pa];
  const dst = [{ x: -tw / 2, y: -th / 2 }, { x: tw / 2, y: -th / 2 }, { x: tw / 2, y: th / 2 }, { x: -tw / 2, y: th / 2 }];
  // Fit a rotation, zoom and shift first, then the skews that take up what's left, a few times over.
  let a = 0, b = 0, s = 1, rot = 0, tx = 0, ty = 0;
  for (let it = 0; it < 4; it++) {
    const sk = src.map(p => ({ x: p.x + a * p.y, y: p.y + b * p.x }));
    ({ s, rot, tx, ty } = similarity(sk, dst));
    const cs = Math.cos(rot), sn = Math.sin(rot);
    let ra = 0, rb = 0, va = 0, ub = 0;
    src.forEach((p, i) => {
      // Back through the shift, rotation and zoom: what's left over is the skew.
      const X = dst[i].x - tx, Y = dst[i].y - ty, x = (cs * X + sn * Y) / s, y = (-sn * X + cs * Y) / s;
      ra += (x - p.x) * p.y; va += p.y * p.y; rb += (y - p.y) * p.x; ub += p.x * p.x;
    });
    a = va ? ra / va : 0; b = ub ? rb / ub : 0;
    a = Math.max(-0.27, Math.min(0.27, a)); b = Math.max(-0.27, Math.min(0.27, b));
  }
  const deg = 180 / Math.PI, r1 = (x: number) => Math.round(x * 10) / 10;
  const fit = { scale: Math.round(s * 1000) / 1000, rot: r1(rot * deg), skx: r1(Math.atan(a) * deg), sky: r1(Math.atan(b) * deg), tx: Math.round(tx), ty: Math.round(ty) };
  if (fit.scale < 0.3 || fit.scale > 4) return null;
  return fit;
}

/** Best rotation, uniform zoom and shift taking points A onto points B (least squares). */
function similarity(A: Pt[], B: Pt[]) {
  const n = A.length, ma = { x: 0, y: 0 }, mb = { x: 0, y: 0 };
  A.forEach((p, i) => { ma.x += p.x / n; ma.y += p.y / n; mb.x += B[i].x / n; mb.y += B[i].y / n; });
  let sxx = 0, sxy = 0, saa = 0;
  A.forEach((p, i) => {
    const ax = p.x - ma.x, ay = p.y - ma.y, bx = B[i].x - mb.x, by = B[i].y - mb.y;
    sxx += ax * bx + ay * by; sxy += ax * by - ay * bx; saa += ax * ax + ay * ay;
  });
  const rot = Math.atan2(sxy, sxx), s = Math.hypot(sxx, sxy) / (saa || 1), cs = Math.cos(rot), sn = Math.sin(rot);
  return { s, rot, tx: mb.x - s * (cs * ma.x - sn * ma.y), ty: mb.y - s * (sn * ma.x + cs * ma.y) };
}
