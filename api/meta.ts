// Link previews for shared profile and sketchbook links. Preview bots (iMessage, WhatsApp, X,
// Slack…) don't run the app, so vercel.json sends them here: we look the page up through
// Firestore's public REST API and return the app's index.html with the right meta tags.
export const config = { runtime: 'edge' };

const env = (k: string, d: string) => (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env[k] || d;
const PROJECT = env('VITE_FIREBASE_PROJECT_ID', 'verso-57469');
const KEY = env('VITE_FIREBASE_API_KEY', 'AIzaSyCrInLvaLg59OkZR8sdzcl8eqanAsm1saY');
const DOCS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

type Fields = Record<string, { stringValue?: string; integerValue?: string; booleanValue?: boolean; arrayValue?: { values?: { stringValue?: string }[] } }>;
async function getDoc(path: string): Promise<Fields | null> {
  const r = await fetch(`${DOCS}/${path}?key=${KEY}`);
  return r.ok ? ((await r.json()) as { fields?: Fields }).fields || null : null;
}
const str = (f: Fields | null, k: string) => f?.[k]?.stringValue || '';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

interface Meta { title: string; description: string; image?: string; url: string }

export async function describe(path: string, origin: string): Promise<Meta> {
  const site: Meta = { title: 'verso. — A place for the unfinished', description: 'A home for sketchbooks, unfinished thoughts, and the creative process. Share your pages. Discover someone else’s world.', url: origin + path };
  const m = /^\/@([a-z0-9._]{1,24})(?:\/([A-Za-z0-9]{6,40}))?\/?$/i.exec(path);
  if (!m) return site;
  const [, handle, bookId] = m;
  if (bookId) {
    const b = await getDoc(`books/${bookId}`);
    if (!b) return site;
    const pages = b.pages?.arrayValue?.values?.map(v => v.stringValue || '') || [], n = Number(b.pageCount?.integerValue || pages.length);
    return { title: `${str(b, 'name')} — by ${str(b, 'ownerName') || '@' + handle} · verso.`, description: `A sketchbook of ${n} ${n === 1 ? 'page' : 'pages'} by ${str(b, 'ownerName') || '@' + handle}. Leaf through it on verso.`, image: str(b, 'cover') || pages[0] || undefined, url: site.url };
  }
  const h = await getDoc(`handles/${handle.toLowerCase()}`), uid = str(h, 'uid');
  const u = uid ? await getDoc(`users/${uid}`) : null;
  if (!u) return site;
  return { title: `${str(u, 'name')} (@${str(u, 'handle')}) · verso.`, description: str(u, 'bio') || `Sketchbooks by ${str(u, 'name')} on verso.`, image: str(u, 'av') || undefined, url: site.url };
}

export function inject(html: string, m: Meta): string {
  const tags = [
    `<meta name="description" content="${esc(m.description)}">`,
    `<meta property="og:site_name" content="verso.">`, `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${esc(m.title)}">`, `<meta property="og:description" content="${esc(m.description)}">`, `<meta property="og:url" content="${esc(m.url)}">`,
    m.image ? `<meta property="og:image" content="${esc(m.image)}">` : '',
    `<meta name="twitter:card" content="${m.image ? 'summary_large_image' : 'summary'}">`, `<meta name="twitter:title" content="${esc(m.title)}">`, `<meta name="twitter:description" content="${esc(m.description)}">`,
    m.image ? `<meta name="twitter:image" content="${esc(m.image)}">` : '',
  ].filter(Boolean).join('\n');
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(m.title)}</title>`)
    .replace(/<meta (name="description"|property="og:[a-z_]+"|name="twitter:[a-z]+")[^>]*>\n?/g, '')
    .replace('</head>', `${tags}\n</head>`);
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url), path = url.searchParams.get('path') || '/';
  const [html, meta] = await Promise.all([fetch(`${url.origin}/index.html`).then(r => r.text()), describe(path, url.origin).catch(() => null)]);
  return new Response(meta ? inject(html, meta) : html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300, s-maxage=300' } });
}
