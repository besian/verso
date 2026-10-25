// A page image passed through fletora.studio, for making PDFs: some browsers won't let the page read an image
// straight from Firebase Storage, but they always can from the site itself. Signed-in users only, and only
// images stored under users/ in this project's own bucket.
// Needs FIREBASE_SERVICE_ACCOUNT in Vercel.
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const MAX = 15 * 1024 * 1024;
const json = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export async function GET(req: Request) {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) return json(503, { error: 'not-configured' });
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}') as { project_id?: string };
  if (!getApps().length) initializeApp({ credential: cert(sa as object) });
  try { await getAuth().verifyIdToken((req.headers.get('authorization') || '').replace(/^Bearer /, '')); }
  catch { return json(401, { error: 'sign-in' }); }

  const u = new URL(req.url).searchParams.get('u') || '';
  const m = /^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/([a-z0-9.-]+)\/o\/users%2F[^?#]+\?alt=media(&token=[\w-]+)?$/.exec(u);
  if (!m || !sa.project_id || !m[1].startsWith(sa.project_id + '.')) return json(400, { error: 'not-a-page' });

  const r = await fetch(u);
  if (!r.ok) return json(r.status === 404 ? 404 : 502, { error: 'fetch-failed' });
  const type = r.headers.get('content-type') || '';
  if (!type.startsWith('image/')) return json(415, { error: 'not-an-image' });
  const body = await r.arrayBuffer();
  if (body.byteLength > MAX) return json(413, { error: 'too-large' });
  return new Response(body, { headers: { 'content-type': type, 'cache-control': 'private, max-age=3600' } });
}
