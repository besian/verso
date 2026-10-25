// The Contact page's form: emails the message to hello@fletora.studio through Resend, with the sender's address
// as reply-to so a reply goes straight back to them. Nothing is stored except when each address and each
// connection last sent one (to stop floods). Signed-out visitors can use it too; when signed in, the account
// is named in the email.
// Needs RESEND_API_KEY and FIREBASE_SERVICE_ACCOUNT in Vercel.
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';

const FROM = process.env.EMAIL_FROM || 'Fletora <noreply@fletora.studio>';
const TO = process.env.CONTACT_EMAIL || 'hello@fletora.studio';
const GAP_MS = 2 * 60_000; // one message per address (and per connection) every two minutes
// Must match CONTACT_KINDS in src/views/Pages.tsx.
const KINDS: Record<string, string> = {
  help: 'A question or help', complaint: 'A complaint', appeal: 'Appeal a moderation decision', bug: 'A problem with the site',
  report: 'Reporting content or a person', privacy: 'A privacy or data request', billing: 'Plus and billing', other: 'Something else',
};
const json = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const sha = (s: string) => createHash('sha256').update(s).digest('hex');

export function GET() { return json(405, { error: 'use POST' }); }

export async function POST(req: Request) {
  if (!process.env.RESEND_API_KEY || !process.env.FIREBASE_SERVICE_ACCOUNT) return json(503, { error: 'not-configured' });
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  const str = (k: string, max: number) => (typeof b[k] === 'string' ? (b[k] as string) : '').trim().slice(0, max);
  const kind = str('kind', 20), email = str('email', 200).toLowerCase(), text = str('text', 4000), link = str('link', 500);
  // A field people can't see: only bots fill it in. They're told it worked.
  if (str('website', 200)) return json(200, { ok: true });
  if (!KINDS[kind]) return json(400, { error: 'contact/kind' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { error: 'contact/email' });
  if (text.length < 10) return json(400, { error: 'contact/short' });

  if (!getApps().length) initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  const db = getFirestore();
  let who = 'Not signed in';
  const token = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  if (token) {
    try {
      const u = await getAuth().verifyIdToken(token), p = (await db.collection('users').doc(u.uid).get()).data() || {};
      who = `${p.name || 'No name'} (@${p.handle || '?'}, uid ${u.uid}, account email ${u.email || '?'})`;
    } catch { /* treated as signed out */ }
  }

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim();
  const refs = [db.collection('contactLog').doc(sha(email)), ...(ip ? [db.collection('contactLog').doc(sha('ip:' + ip))] : [])];
  const last = await Promise.all(refs.map(r => r.get().then(s => (s.get('at') as number | undefined) || 0)));
  if (last.some(t => Date.now() - t < GAP_MS)) return json(429, { error: 'contact/wait' });

  const rows: [string, string][] = [['About', KINDS[kind]], ['From', email], ['Account', who], ...(link ? [['Link', link] as [string, string]] : []), ['Sent', new Date().toUTCString()]];
  const sans = 'Helvetica,Arial,sans-serif';
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#fbfaf6;color:#222320;font:400 15px/1.55 ${sans}">
<table cellpadding="6" style="border-collapse:collapse">${rows.map(([k, v]) => `<tr><td style="vertical-align:top;color:#77756e;white-space:nowrap">${k}</td><td style="word-break:break-word">${esc(v)}</td></tr>`).join('')}</table>
<p style="margin:18px 0 0;white-space:pre-wrap;word-break:break-word">${esc(text)}</p>
<p style="margin:18px 0 0;color:#77756e;font-size:13px">Reply to this email to answer them.</p></body></html>`;
  const plain = `${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${text}`;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [TO], reply_to: email, subject: `${KINDS[kind]}: message from ${email}`, html, text: plain }),
  });
  if (!r.ok) { console.error('resend', r.status, await r.text()); return json(502, { error: 'contact/send' }); }
  await Promise.all(refs.map(ref => ref.set({ at: Date.now() })));
  return json(200, { ok: true });
}
