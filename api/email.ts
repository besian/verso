// Sends fletora's own account emails (confirm email, reset password, change email) through Resend,
// because Firebase won't let this project edit its templates. Firebase Admin makes the one-time
// code; the link in the email goes straight to our /auth/action page, which finishes the job.
// Needs RESEND_API_KEY and FIREBASE_SERVICE_ACCOUNT (the service account JSON) in Vercel.
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';

const ORIGIN = process.env.APP_ORIGIN || 'https://fletora.studio';
const FROM = process.env.EMAIL_FROM || 'Fletora <noreply@fletora.studio>';
const GAP_MS = 60_000; // one email per address per minute

type Kind = 'verify' | 'reset' | 'change';
const json = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function admin() {
  if (!getApps().length) initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}')) });
  return { auth: getAuth(), db: getFirestore() };
}

/** Firebase's link points at its own page; keep only the code and point it at ours. */
const ourLink = (link: string) => {
  const q = new URL(link).searchParams;
  return `${ORIGIN}/auth/action?mode=${encodeURIComponent(q.get('mode') || '')}&oobCode=${encodeURIComponent(q.get('oobCode') || '')}`;
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const COPY: Record<Kind, { subject: string; lead: (email: string) => string; button: string; foot: string }> = {
  verify: { subject: 'Confirm your email for Fletora', lead: () => 'Welcome to Fletora, a home for sketchbooks, unfinished pages and all. Confirm your email address to finish setting up your account.', button: 'Confirm my email', foot: 'If you didn’t make a Fletora account, you can ignore this email.' },
  reset: { subject: 'Reset your Fletora password', lead: e => `Someone asked to reset the password for your Fletora account (${esc(e)}). If it was you, choose a new one below.`, button: 'Choose a new password', foot: 'If you didn’t ask for this, you can ignore this email and your password won’t change.' },
  change: { subject: 'Confirm your new Fletora email', lead: e => `Confirm that you’d like to sign in to Fletora with ${esc(e)} from now on.`, button: 'Confirm new email', foot: 'If you didn’t ask for this, you can ignore this email and nothing will change.' },
};

function render(kind: Kind, email: string, link: string) {
  const c = COPY[kind], serif = 'Georgia,\'Times New Roman\',serif', sans = 'Helvetica,Arial,sans-serif';
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f4f1ea">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;padding:40px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fbfaf6;border:1px solid #e2ded3;padding:36px 32px;color:#222320">
<tr><td style="font:400 30px/1 ${serif};padding-bottom:28px">fletora<span style="color:#ad493a">.</span></td></tr>
<tr><td style="font:400 16px/1.6 ${sans};padding-bottom:28px">${c.lead(email)}</td></tr>
<tr><td style="padding-bottom:28px"><a href="${esc(link)}" style="display:inline-block;background:#222320;color:#f4f1ea;padding:14px 26px;font:500 15px ${sans};text-decoration:none">${c.button}</a></td></tr>
<tr><td style="font:400 13px/1.6 ${sans};color:#77756e;padding-bottom:8px">${c.foot}</td></tr>
<tr><td style="font:400 12px/1.6 ${sans};color:#9a978e;word-break:break-all">Button not working? Paste this into your browser:<br>${esc(link)}</td></tr>
</table>
<p style="font:400 12px ${sans};color:#9a978e;margin:18px 0 0">Fletora · <a href="${ORIGIN}" style="color:#9a978e">fletora.studio</a></p>
</td></tr></table></body></html>`;
  const text = `${c.lead(email).replace(/&[a-z]+;/g, '')}\n\n${c.button}: ${link}\n\n${c.foot}`;
  return { subject: c.subject, html, text };
}

/** Opening the address in a browser just says it's there. */
export function GET() { return json(405, { error: 'use POST' }); }

export async function POST(req: Request) {
  if (!process.env.RESEND_API_KEY || !process.env.FIREBASE_SERVICE_ACCOUNT) return json(503, { error: 'not-configured' });
  const body = await req.json().catch(() => ({})) as { kind?: Kind; email?: string; newEmail?: string };
  const kind = body.kind;
  if (kind !== 'verify' && kind !== 'reset' && kind !== 'change') return json(400, { error: 'bad-request' });
  const { auth, db } = admin();

  // Who it's for. Confirming and changing need the signed-in user; a reset just needs an address.
  let to = '', link = '';
  try {
    if (kind === 'reset') {
      to = String(body.email || '').trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(to)) return json(400, { error: 'auth/invalid-email' });
    } else {
      const user = await auth.verifyIdToken((req.headers.get('authorization') || '').replace(/^Bearer /, ''));
      if (!user.email) return json(400, { error: 'bad-request' });
      if (kind === 'verify') to = user.email;
      else {
        // Changing email must follow a fresh password check (the app re-asks for it just before).
        if (Date.now() / 1000 - (user.auth_time || 0) > 300) return json(401, { error: 'auth/requires-recent-login' });
        to = String(body.newEmail || '').trim().toLowerCase();
        if (!/^\S+@\S+\.\S+$/.test(to)) return json(400, { error: 'auth/invalid-email' });
        if (to === user.email.toLowerCase()) return json(400, { error: 'auth/email-already-in-use' });
      }
    }
  } catch { return json(401, { error: 'auth/invalid-user-token' }); }

  // One email per address per minute, so nobody can flood someone's inbox.
  const ref = db.collection('mailLog').doc(createHash('sha256').update(to).digest('hex'));
  const last = (await ref.get()).get('at') as number | undefined;
  if (last && Date.now() - last < GAP_MS) return json(429, { error: 'auth/too-many-requests' });

  try {
    if (kind === 'verify') link = await auth.generateEmailVerificationLink(to);
    else if (kind === 'reset') link = await auth.generatePasswordResetLink(to);
    else {
      const user = await auth.verifyIdToken((req.headers.get('authorization') || '').replace(/^Bearer /, ''));
      link = await auth.generateVerifyAndChangeEmailLink(user.email!, to);
    }
  } catch (e) {
    const code = (e as { code?: string }).code || '';
    // Don't reveal whether an address has an account.
    if (kind === 'reset' && code === 'auth/user-not-found') return json(200, { ok: true });
    if (code === 'auth/email-already-exists') return json(400, { error: 'auth/email-already-in-use' });
    console.error('link', e); return json(500, { error: 'link-failed' });
  }

  const { subject, html, text } = render(kind, to, ourLink(link));
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [to], subject, html, text }),
  });
  if (!r.ok) { console.error('resend', r.status, await r.text()); return json(502, { error: 'send-failed' }); }
  await ref.set({ at: Date.now() });
  return json(200, { ok: true });
}
