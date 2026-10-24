// Social links on profiles: which platforms, how a handle (or a pasted link) becomes a profile URL.

export interface Platform { key: string; label: string; url: (h: string) => string; hint: string }
export const PLATFORMS: Platform[] = [
  { key: 'instagram', label: 'Instagram', url: h => `https://instagram.com/${h}`, hint: '@yourname' },
  { key: 'tiktok', label: 'TikTok', url: h => `https://www.tiktok.com/@${h}`, hint: '@yourname' },
  { key: 'x', label: 'X', url: h => `https://x.com/${h}`, hint: '@yourname' },
  { key: 'threads', label: 'Threads', url: h => `https://www.threads.net/@${h}`, hint: '@yourname' },
  { key: 'bluesky', label: 'Bluesky', url: h => `https://bsky.app/profile/${h}`, hint: 'yourname.bsky.social' },
  { key: 'youtube', label: 'YouTube', url: h => `https://www.youtube.com/@${h}`, hint: '@yourchannel' },
  { key: 'pinterest', label: 'Pinterest', url: h => `https://www.pinterest.com/${h}`, hint: 'yourname' },
  { key: 'behance', label: 'Behance', url: h => `https://www.behance.net/${h}`, hint: 'yourname' },
  { key: 'dribbble', label: 'Dribbble', url: h => `https://dribbble.com/${h}`, hint: 'yourname' },
  { key: 'artstation', label: 'ArtStation', url: h => `https://www.artstation.com/${h}`, hint: 'yourname' },
  { key: 'deviantart', label: 'DeviantArt', url: h => `https://www.deviantart.com/${h}`, hint: 'yourname' },
  { key: 'patreon', label: 'Patreon', url: h => `https://www.patreon.com/${h}`, hint: 'yourname' },
  { key: 'kofi', label: 'Ko-fi', url: h => `https://ko-fi.com/${h}`, hint: 'yourname' },
  { key: 'etsy', label: 'Etsy', url: h => `https://www.etsy.com/shop/${h}`, hint: 'YourShop' },
  { key: 'linkedin', label: 'LinkedIn', url: h => `https://www.linkedin.com/in/${h}`, hint: 'your-name' },
];
export const PLATFORM = Object.fromEntries(PLATFORMS.map(p => [p.key, p])) as Record<string, Platform>;
export const MAX_SOCIALS = 8;

/** "@name", "name" or a pasted profile link → just the handle (the part after the site's address). */
export function cleanHandle(v: string): string {
  let h = v.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  // Drop the site and any fixed path before the handle (e.g. "etsy.com/shop/", "linkedin.com/in/", "bsky.app/profile/").
  h = h.replace(/^[^/]+\.[a-z]{2,}\/(shop\/|in\/|profile\/)?/i, '');
  return h.replace(/^@/, '').replace(/[/?#].*$/, '').slice(0, 100);
}

/** A profile's links in platform order, skipping empty or unknown ones. */
export function socialLinks(s: Record<string, string> | undefined): { key: string; label: string; href: string }[] {
  return PLATFORMS.filter(p => s?.[p.key] && cleanHandle(s[p.key])).map(p => ({ key: p.key, label: p.label, href: p.url(encodeURIComponent(cleanHandle(s![p.key])).replace(/%40/g, '@')) }));
}
