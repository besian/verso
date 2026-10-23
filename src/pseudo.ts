// Pseudo-class styles (:hover, :focus) for inline-styled elements. Each unique rule
// becomes one generated class; declarations are !important so they beat inline styles.
let sheet: CSSStyleSheet | null = null;
const cache = new Map<string, string>();
let n = 0;

function rule(pseudo: string, css: string): string {
  const key = pseudo + '|' + css;
  const hit = cache.get(key);
  if (hit) return hit;
  if (!sheet) {
    const el = document.createElement('style');
    document.head.appendChild(el);
    sheet = el.sheet!;
  }
  const cls = 'ps' + (n++).toString(36);
  const body = css.split(';').map(d => d.trim()).filter(Boolean).map(d => d + ' !important').join(';');
  sheet.insertRule(`.${cls}:${pseudo}{${body}}`, sheet.cssRules.length);
  cache.set(key, cls);
  return cls;
}

export const hover = (css: string) => rule('hover', css);
export const focus = (css: string) => rule('focus', css);

/** Lets a plain mouse wheel scroll a one-row strip sideways (trackpads already can). */
export function wheelSideways(e: { deltaX: number; deltaY: number; currentTarget: HTMLElement }) {
  const el = e.currentTarget, max = el.scrollWidth - el.clientWidth;
  if (!max || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
  const next = Math.max(0, Math.min(max, el.scrollLeft + e.deltaY));
  if (next !== el.scrollLeft) el.scrollLeft = next;
}
