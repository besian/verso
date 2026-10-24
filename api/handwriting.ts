// Reads handwriting drawn in the page editor and returns it as plain text, using Claude.
// Signed-in users only, and a limited number of conversions per hour each.
// Needs ANTHROPIC_API_KEY and FIREBASE_SERVICE_ACCOUNT in Vercel.
import Anthropic from '@anthropic-ai/sdk';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const PER_HOUR = 60;
const json = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function admin() {
  if (!getApps().length) initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}')) });
  return { auth: getAuth(), db: getFirestore() };
}

const PROMPT = `This image is handwriting from an artist's sketchbook page. Transcribe it exactly as written.
- Keep the writer's line breaks, spelling, punctuation and language.
- If a word is unclear, give your best reading of it.
- Reply with only the transcribed text: no quotes, notes or commentary.
- If there is no readable writing, reply with nothing.`;

export function GET() { return json(405, { error: 'use POST' }); }

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY || !process.env.FIREBASE_SERVICE_ACCOUNT) return json(503, { error: 'not-configured' });
  const { auth, db } = admin();
  let uid = '';
  try { uid = (await auth.verifyIdToken((req.headers.get('authorization') || '').replace(/^Bearer /, ''))).uid; }
  catch { return json(401, { error: 'sign-in' }); }

  const body = await req.json().catch(() => ({})) as { image?: string };
  const image = typeof body.image === 'string' ? body.image : '';
  if (!image || image.length > 4_000_000 || !/^[A-Za-z0-9+/=]+$/.test(image)) return json(400, { error: 'bad-image' });

  // Count this hour's conversions for the user.
  const ref = db.collection('inkLog').doc(`${uid}_${new Date().toISOString().slice(0, 13)}`);
  const n = ((await ref.get()).get('n') as number | undefined) || 0;
  if (n >= PER_HOUR) return json(429, { error: 'limit' });
  await ref.set({ n: FieldValue.increment(1) }, { merge: true });

  const client = new Anthropic();
  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-5-5',
      max_tokens: 2000,
      output_config: { effort: 'low' },
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: image } },
        { type: 'text', text: PROMPT },
      ] }],
    });
    if (msg.stop_reason === 'refusal') return json(422, { error: 'unreadable' });
    const text = msg.content.map(b => b.type === 'text' ? b.text : '').join('').trim();
    return json(200, { text });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json(429, { error: 'busy' });
    console.error('handwriting', e);
    return json(502, { error: 'read-failed' });
  }
}
