// Blank pages to write or draw on: plain, lined, grid or dotted paper, drawn at the saved page size.

export type Paper = 'plain' | 'lined' | 'grid' | 'dots';
export const PAPERS: [Paper, string][] = [['plain', 'Plain'], ['lined', 'Lined'], ['grid', 'Grid'], ['dots', 'Dots']];

const H = 1600, STEP = 64, TOP = 160, BG = '#f3efe6', RULE = 'rgba(34,35,32,.16)';
/** Spacing and first rule of lined paper, as fractions of the page height (to sit typed text on the lines). */
export const RULED = { step: STEP / H, top: TOP / H };

/** A blank page of the given paper, as a JPEG data URL. */
export function paperUrl(kind: Paper, aspect: number): string {
  const W = Math.round(H * aspect), c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d')!; ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = RULE; ctx.fillStyle = 'rgba(34,35,32,.28)'; ctx.lineWidth = 2;
  if (kind === 'lined') for (let y = TOP; y < H - STEP / 2; y += STEP) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  if (kind === 'grid') {
    ctx.lineWidth = 1.5;
    for (let x = (W % STEP) / 2; x <= W; x += STEP) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = (H % STEP) / 2; y <= H; y += STEP) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  }
  if (kind === 'dots') for (let x = (W % STEP) / 2 + STEP / 2; x < W; x += STEP) for (let y = (H % STEP) / 2 + STEP / 2; y < H; y += STEP) { ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); }
  return c.toDataURL('image/jpeg', 0.9);
}

/** A small CSS preview of each paper for the picker. */
export const PAPER_PREVIEW: Record<Paper, string> = {
  plain: BG,
  lined: `repeating-linear-gradient(${BG} 0 7px, ${RULE} 7px 8px)`,
  grid: `repeating-linear-gradient(${RULE} 0 1px, transparent 1px 8px), repeating-linear-gradient(90deg, ${RULE} 0 1px, transparent 1px 8px), ${BG}`,
  dots: `radial-gradient(rgba(34,35,32,.35) 1px, transparent 1.4px) 0 0/8px 8px, ${BG}`,
};
