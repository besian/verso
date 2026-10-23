// Per-browser preferences. Accounts, books and follows live in Firebase (see backend.ts).
export function loadExView(): string | null { try { return localStorage.getItem('sb-exview'); } catch { return null; } }
export function saveExView(v: string) { try { localStorage.setItem('sb-exview', v); } catch { /* storage unavailable */ } }
export function loadSound(): boolean { try { return localStorage.getItem('sb-sound') !== 'off'; } catch { return true; } }
export function saveSound(on: boolean) { try { localStorage.setItem('sb-sound', on ? 'on' : 'off'); } catch { /* storage unavailable */ } }
