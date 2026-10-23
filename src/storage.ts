// Per-browser preferences. Accounts, books and follows live in Firebase (see backend.ts).
export function loadExView(): string | null { try { return localStorage.getItem('sb-exview'); } catch { return null; } }
export function saveExView(v: string) { try { localStorage.setItem('sb-exview', v); } catch { /* storage unavailable */ } }
export function loadSound(): boolean { try { return localStorage.getItem('sb-sound') !== 'off'; } catch { return true; } }
export function saveSound(on: boolean) { try { localStorage.setItem('sb-sound', on ? 'on' : 'off'); } catch { /* storage unavailable */ } }
export type Theme = 'system' | 'light' | 'dark';
export function loadTheme(): Theme { try { const t = localStorage.getItem('sb-theme'); return t === 'light' || t === 'dark' ? t : 'system'; } catch { return 'system'; } }
export function saveTheme(t: Theme) { try { if (t === 'system') localStorage.removeItem('sb-theme'); else localStorage.setItem('sb-theme', t); } catch { /* storage unavailable */ } }
