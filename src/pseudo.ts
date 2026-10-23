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
