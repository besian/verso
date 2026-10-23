// Light or dark theme: light unless the visitor picks dark in Settings (remembered per browser).
import * as store from './storage';

let pref = store.loadTheme();

export const isDark = () => pref === 'dark';
function apply() {
  const root = document.documentElement;
  if (pref === 'dark') root.dataset.theme = 'dark'; else delete root.dataset.theme;
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute('content', isDark() ? '#1A1B18' : '#F4F1E9'));
  // The tab icon matches the theme in use.
  document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]').forEach(l => { l.href = `/icons/favicon-${isDark() ? 'dark' : 'light'}-64.png`; });
}
apply();
export function setTheme(t: 'light' | 'dark') { pref = t; store.saveTheme(t); apply(); }
