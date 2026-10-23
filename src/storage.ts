// Per-browser preferences. Accounts, books and follows live in Firebase (see backend.ts).
export function loadExView(): string | null { try { return localStorage.getItem('sb-exview'); } catch { return null; } }
export function saveExView(v: string) { try { localStorage.setItem('sb-exview', v); } catch { /* storage unavailable */ } }
export function loadSound(): boolean { try { return localStorage.getItem('sb-sound') !== 'off'; } catch { return true; } }
export function saveSound(on: boolean) { try { localStorage.setItem('sb-sound', on ? 'on' : 'off'); } catch { /* storage unavailable */ } }
export function loadHints(): number { try { return Number(localStorage.getItem('sb-hints')) || 0; } catch { return 0; } }
export function saveHints(n: number) { try { localStorage.setItem('sb-hints', String(n)); } catch { /* storage unavailable */ } }
export type Theme = 'light' | 'dark';
export function loadTheme(): Theme { try { return localStorage.getItem('sb-theme') === 'dark' ? 'dark' : 'light'; } catch { return 'light'; } }
export function saveTheme(t: Theme) { try { localStorage.setItem('sb-theme', t); } catch { /* storage unavailable */ } }
