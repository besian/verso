// Light / dark theme: follows the system unless the visitor picks one (remembered per browser).
import * as store from './storage';

const dark = matchMedia('(prefers-color-scheme: dark)');
let pref = store.loadTheme();

export const isDark = () => pref === 'dark' || (pref === 'system' && dark.matches);
function apply() {
  const root = document.documentElement;
  if (pref === 'system') delete root.dataset.theme; else root.dataset.theme = pref;
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute('content', isDark() ? '#1A1B18' : '#F4F1E9'));
  // The tab icon follows the theme in use, including one picked here rather than by the system.
  const icon = `/icons/favicon-${isDark() ? 'dark' : 'light'}-64.png`;
  document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]').forEach(l => { l.href = icon; l.removeAttribute('media'); });
}
apply();
export function onSystemChange(cb: () => void) { dark.addEventListener?.('change', () => { apply(); cb(); }); }
/** Switches to the opposite of what's showing now. */
export function toggleTheme() { pref = isDark() ? 'light' : 'dark'; if ((pref === 'dark') === dark.matches) pref = 'system'; store.saveTheme(pref); apply(); }
