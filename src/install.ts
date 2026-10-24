// "Install fletora": the browser's install prompt (Chrome, Edge, Android) is saved when offered,
// iOS gets instructions, and an installed app says so.
type Prompt = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> };
let deferred: Prompt | null = null;
const subs = new Set<() => void>();
addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e as Prompt; subs.forEach(f => f()); });
addEventListener('appinstalled', () => { deferred = null; subs.forEach(f => f()); });

export const installed = () => matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const canPrompt = () => !!deferred;
export function onChange(f: () => void) { subs.add(f); return () => subs.delete(f); }
export async function install(): Promise<boolean> {
  if (!deferred) return false;
  const d = deferred; deferred = null; await d.prompt();
  const ok = (await d.userChoice).outcome === 'accepted'; subs.forEach(f => f()); return ok;
}
