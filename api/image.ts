// Every picture goes through here before anyone else can see it. The app uploads it to pending/{uid}/ (private),
// then asks for a check: Claude looks at it, and only then is it moved to users/{uid}/ (public), with a thumbnail
// made here. The rules:
//   - photos (or photo-real images) with nudity or sexual content: refused and deleted;
//   - drawings with nudity or sexual content: allowed, and the sketchbook is labelled Mature;
//   - anything that sexualises someone who looks under 18, drawn or not: refused, kept out of sight for the
//     report to the authorities, and emailed to the safety inbox straight away;
//   - anything the check can't decide on, or won't look at: held back for a moderator.
// Profile pictures can't carry any nudity at all, since they show everywhere without a label.
// Moderators also use this to see and delete held pictures, and the app to make thumbnails for older pages.
// Needs ANTHROPIC_API_KEY, FIREBASE_SERVICE_ACCOUNT and RESEND_API_KEY in Vercel.
import Anthropic from '@anthropic-ai/sdk';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';

const ORIGIN = process.env.APP_ORIGIN || 'https://fletora.studio';
const FROM = process.env.EMAIL_FROM || 'Fletora <noreply@fletora.studio>';
const SAFETY_TO = process.env.SAFETY_EMAIL || 'besian@fletora.studio';
const PER_DAY = 400; // checks per person per day
const MAX = 15 * 1024 * 1024;
const CACHE = 'public,max-age=31536000,immutable';
const json = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function admin() {
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}') as { project_id?: string };
  if (!getApps().length) initializeApp({ credential: cert(sa as object) });
  const name = process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET || `${sa.project_id}.firebasestorage.app`;
  return { auth: getAuth(), db: getFirestore(), bucket: getStorage().bucket(name) };
}
const publicUrl = (bucket: string, path: string) => `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`;

// ---------- the check ----------

const PROMPT = `You check pictures uploaded to Fletora, a site where artists share their sketchbooks. Most uploads are drawings, paintings or photos of sketchbook pages. Look at this picture and fill in the form.

- medium: "drawing" for hand-made or digital artwork of any style (sketches, paintings, comics, anime, life drawing), including a photograph of a drawing or a sketchbook page. "photo" for a photograph of real people or things, or an image made to look like one (photo-real renders or AI images). "mixed" when real photographs are part of the picture (a collage with photos). "none" when there's nothing to judge (blank page, plain text).
- nudity: true if anyone is shown with exposed genitals, buttocks or female nipples.
- sexual: true if the picture shows sexual activity or is plainly sexual or erotic in intent.
- minor: "sexual" if anyone who looks under 18 (including child-like or youthful-looking drawn characters, whatever their stated age) is shown in a sexual or sexualised way: sexual activity, sexual posing, or a focus on their genitals or body. "nude" if someone who looks under 18 is nude but not sexualised (for example a classical cherub). Otherwise "none". When in doubt between "none" and the others, don't choose "none".
- unsure: true if you can't judge any of the above with confidence.
- reason: one short sentence a moderator can read, describing what you see without graphic detail.

Ordinary, non-sexual drawings of children, figure studies with clothes, and anatomy sketches are normal here. Judge only what is visible.`;

const SCHEMA = {
  type: 'object',
  properties: {
    medium: { type: 'string', enum: ['drawing', 'photo', 'mixed', 'none'] },
    nudity: { type: 'boolean' },
    sexual: { type: 'boolean' },
    minor: { type: 'string', enum: ['none', 'nude', 'sexual'] },
    unsure: { type: 'boolean' },
    reason: { type: 'string' },
  },
  required: ['medium', 'nudity', 'sexual', 'minor', 'unsure', 'reason'],
  additionalProperties: false,
} as const;

interface Verdict { medium: 'drawing' | 'photo' | 'mixed' | 'none'; nudity: boolean; sexual: boolean; minor: 'none' | 'nude' | 'sexual'; unsure: boolean; reason: string }
type Outcome = 'ok' | 'mature' | 'photo' | 'hold' | 'child' | 'avatar';

/** Claude's reading of the picture; null when it declines to look at it. */
async function classify(jpeg: Buffer): Promise<Verdict | null> {
  const client = new Anthropic();
  const msg = await client.beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    messages: [{ role: 'user', content: [
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: jpeg.toString('base64') } },
      { type: 'text', text: PROMPT },
    ] }],
  });
  if (msg.stop_reason === 'refusal') return null;
  const text = msg.content.map(b => b.type === 'text' ? b.text : '').join('');
  try { return JSON.parse(text) as Verdict; } catch { return null; }
}

function decide(v: Verdict | null, avatar: boolean): Outcome {
  if (!v) return 'hold';
  if (v.minor === 'sexual') return 'child';
  if (v.minor === 'nude') return 'hold';
  const explicit = v.nudity || v.sexual;
  if (!explicit) return 'ok';
  if (avatar) return 'avatar';
  if (v.medium === 'photo' || v.medium === 'mixed') return 'photo';
  if (v.unsure && v.medium !== 'drawing') return 'hold';
  return 'mature';
}

// ---------- after the check ----------

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
async function childEmail(rows: [string, string][]) {
  if (!process.env.RESEND_API_KEY) return;
  const sans = 'Helvetica,Arial,sans-serif';
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#fbfaf6;color:#222320;font:400 15px/1.55 ${sans}">
<p style="margin:0 0 6px;color:#ad493a;font-weight:600">Upload stopped: may sexualise a child</p>
<p style="margin:0 0 18px">Fletora’s automatic check refused an upload and kept it out of sight. Look at it on the Moderation page. If it is child sexual abuse material, report it to the IWF (report.iwf.org.uk) or the NCA, and don’t delete it until it has been reported. If a child is in immediate danger call 999.</p>
<table cellpadding="6" style="border-collapse:collapse">${rows.map(([k, v]) => `<tr><td style="vertical-align:top;color:#77756e;white-space:nowrap">${k}</td><td style="white-space:pre-wrap;word-break:break-word">${esc(v)}</td></tr>`).join('')}</table>
<p style="margin:18px 0 0"><a href="${ORIGIN}/admin" style="color:#222320">Open Moderation</a></p></body></html>`;
  const text = `Upload stopped: may sexualise a child\n\n${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nOpen Moderation: ${ORIGIN}/admin`;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [SAFETY_TO], subject: 'Urgent: upload stopped by the child safety check', html, text }),
  });
  if (!r.ok) console.error('resend', r.status, await r.text());
}

type Admin = ReturnType<typeof admin>;

/** Moves a refused picture somewhere only the server can reach, and puts it in the moderators' queue. */
async function holdBack({ db, bucket }: Admin, uid: string, src: string, outcome: 'hold' | 'child', v: Verdict | null, bookId: string) {
  const id = randomUUID(), dest = `quarantine/${uid}/${id}.jpg`;
  await bucket.file(src).move(dest);
  const reason = outcome === 'child' ? 'Child safety (automatic check)' : 'Held for review (automatic check)';
  await db.collection('reports').doc(`check_${id}`).set({
    by: 'check', kind: 'image', targetId: bookId || uid, ownerId: uid, reason, note: v?.reason || 'The check couldn’t judge this picture.', at: Date.now(), file: dest,
  });
  if (outcome === 'child') {
    const u = (await db.collection('users').doc(uid).get()).data() || {};
    await childEmail([['Account', `${u.name || 'No name'} (@${u.handle || '?'}, uid ${uid})`], ['Sketchbook', bookId || '(profile picture)'], ['What the check saw', v?.reason || ''], ['When', new Date().toUTCString()], ['Stored at', dest]]);
    // Their sketchbook comes out of sight until a moderator has looked.
    if (bookId) await db.collection('books').doc(bookId).update({ hidden: true, isPublic: false, linkOnly: false }).catch(() => {});
  }
}

/** Labels a sketchbook Mature for good (only moderators can take it off). For a book not saved yet, a marker makes
 *  its first save carry the label (see firestore.rules). */
async function markMature({ db }: Admin, bookId: string, uid: string, v: Verdict) {
  await db.collection('mature').doc(bookId).set({ uid, at: Date.now(), reason: v.reason });
  const ref = db.collection('books').doc(bookId), b = await ref.get();
  if (b.exists) await ref.update({ mature: true, matureLock: true });
  // A drawing the check wasn't sure about is labelled, and a moderator looks too.
  if (v.unsure) await db.collection('reports').doc(`check_${randomUUID()}`).set({ by: 'check', kind: 'book', targetId: bookId, ownerId: uid, reason: 'Check the Mature label (automatic check)', note: v.reason, at: Date.now() });
}

/** The public copy and its thumbnail. */
async function publish({ bucket }: Admin, src: string, dest: string, jpeg: Buffer, thumb: boolean) {
  await bucket.file(dest).save(jpeg, { contentType: 'image/jpeg', metadata: { cacheControl: CACHE } });
  let t = '';
  if (thumb) {
    t = dest.replace(/\.jpg$/, '_t.jpg');
    const small = await sharp(jpeg).resize({ height: 480, withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
    await bucket.file(t).save(small, { contentType: 'image/jpeg', metadata: { cacheControl: CACHE } });
  }
  await bucket.file(src).delete({ ignoreNotFound: true });
  return { url: publicUrl(bucket.name, dest), thumb: t ? publicUrl(bucket.name, t) : '' };
}

async function check(a: Admin, uid: string, body: { path?: string; kind?: string; book?: string }) {
  const { db, bucket } = a, path = String(body.path || ''), kind = body.kind === 'avatar' ? 'avatar' : 'page', bookId = String(body.book || '');
  if (!path.startsWith(`pending/${uid}/`) || path.includes('..')) return json(400, { error: 'bad-path' });
  if (kind === 'page' && !/^[A-Za-z0-9]{1,40}$/.test(bookId)) return json(400, { error: 'bad-book' });

  // Someone else's sketchbook can't be written to (shared ones can, by the people drawing in them).
  if (kind === 'page') {
    const b = (await db.collection('books').doc(bookId).get()).data();
    if (b && b.ownerId !== uid && !(b.collabs || []).includes(uid) && b.collab !== uid) return json(403, { error: 'not-yours' });
  }
  const day = db.collection('checkLog').doc(`${uid}_${new Date().toISOString().slice(0, 10)}`);
  if (((await day.get()).get('n') || 0) >= PER_DAY) return json(429, { error: 'limit' });
  await day.set({ n: FieldValue.increment(1) }, { merge: true });

  const file = bucket.file(path);
  const [meta] = await file.getMetadata().catch(() => [null]);
  if (!meta) return json(404, { error: 'missing' });
  if (Number(meta.size) > MAX || !String(meta.contentType || '').startsWith('image/')) { await file.delete({ ignoreNotFound: true }); return json(400, { error: 'bad-image' }); }
  const [raw] = await file.download();

  // Stored as a JPEG whatever came in (which also drops anything hidden in the file), and checked at the size
  // Claude reads pictures at.
  let full: Buffer, look: Buffer;
  try {
    const img = sharp(raw, { limitInputPixels: 100_000_000 }).rotate();
    full = await img.clone().flatten({ background: '#ffffff' }).jpeg({ quality: 90 }).toBuffer();
    look = await img.clone().flatten({ background: '#ffffff' }).resize({ width: 1568, height: 1568, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
  } catch { await file.delete({ ignoreNotFound: true }); return json(400, { error: 'bad-image' }); }

  let v: Verdict | null;
  try { v = await classify(look); }
  catch (e) {
    // Nothing goes up unchecked: if Claude can't be reached, the upload waits and the app tries again later.
    console.error('check', e);
    return json(e instanceof Anthropic.RateLimitError ? 429 : 503, { error: 'check-unavailable' });
  }
  const outcome = decide(v, kind === 'avatar');

  if (outcome === 'photo' || outcome === 'avatar') { await file.delete({ ignoreNotFound: true }); return json(200, { ok: false, outcome }); }
  if (outcome === 'hold' || outcome === 'child') { await holdBack(a, uid, path, outcome, v, kind === 'page' ? bookId : ''); return json(200, { ok: false, outcome: 'hold' }); }

  if (outcome === 'mature' && v) await markMature(a, bookId, uid, v);
  const dest = kind === 'avatar' ? `users/${uid}/avatar-${Date.now()}.jpg` : `users/${uid}/books/${bookId}/${randomUUID()}.jpg`;
  return json(200, { ok: true, outcome, ...(await publish(a, path, dest, full, kind === 'page')) });
}

/** A thumbnail for a page stored before thumbnails existed (it was public already, so isn't checked again). */
async function thumb({ bucket }: Admin, uid: string, body: { url?: string; book?: string }) {
  const m = /\/o\/(users%2F[^?#]+)\?alt=media/.exec(String(body.url || '')), bookId = String(body.book || '');
  if (!m || !/^[A-Za-z0-9]{1,40}$/.test(bookId)) return json(400, { error: 'bad-request' });
  const src = decodeURIComponent(m[1]);
  if (src.includes('..')) return json(400, { error: 'bad-request' });
  const [raw] = await bucket.file(src).download().catch(() => [null]);
  if (!raw) return json(404, { error: 'missing' });
  const small = await sharp(raw).rotate().flatten({ background: '#ffffff' }).resize({ height: 480, withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
  const dest = `users/${uid}/books/${bookId}/${randomUUID()}_t.jpg`;
  await bucket.file(dest).save(small, { contentType: 'image/jpeg', metadata: { cacheControl: CACHE } });
  return json(200, { thumb: publicUrl(bucket.name, dest) });
}

/** Moderators: a short-lived link to a held picture, or deleting it. */
async function held({ db, bucket }: Admin, uid: string, body: { action?: string; report?: string }) {
  if (!(await db.collection('admins').doc(uid).get()).exists) return json(403, { error: 'moderators-only' });
  const ref = db.collection('reports').doc(String(body.report || '')), r = (await ref.get()).data();
  const file = typeof r?.file === 'string' && r.file.startsWith('quarantine/') ? r.file : '';
  if (!file) return json(404, { error: 'no-file' });
  if (body.action === 'view') {
    const [url] = await bucket.file(file).getSignedUrl({ action: 'read', expires: Date.now() + 5 * 60_000 });
    return json(200, { url });
  }
  await bucket.file(file).delete({ ignoreNotFound: true });
  await ref.update({ file: FieldValue.delete(), deleted: Date.now() });
  return json(200, { ok: true });
}

export function GET() { return json(405, { error: 'use POST' }); }

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY || !process.env.FIREBASE_SERVICE_ACCOUNT) return json(503, { error: 'not-configured' });
  const a = admin();
  let uid = '';
  try { uid = (await a.auth.verifyIdToken((req.headers.get('authorization') || '').replace(/^Bearer /, ''))).uid; }
  catch { return json(401, { error: 'sign-in' }); }
  const body = await req.json().catch(() => ({})) as Record<string, string>;
  try {
    if (body.action === 'check') return await check(a, uid, body);
    if (body.action === 'thumb') return await thumb(a, uid, body);
    if (body.action === 'view' || body.action === 'delete') return await held(a, uid, body);
    return json(400, { error: 'bad-request' });
  } catch (e) {
    console.error('image', e);
    return json(500, { error: 'failed' });
  }
}
