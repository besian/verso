// Once a day (vercel.json → crons): reminds people their free trial of Plus ends soon, and ends Plus that has run
// out without a subscription behind it (trials, gifts, Plus switched on by hand). Paid Plus is ended by the
// Stripe webhook instead. When Plus ends, link-only sketchbooks become private.
// Needs CRON_SECRET (Vercel sends it to cron jobs), FIREBASE_SERVICE_ACCOUNT and RESEND_API_KEY in Vercel.
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const ORIGIN = process.env.APP_ORIGIN || 'https://fletora.studio';
const FROM = process.env.EMAIL_FROM || 'Fletora <noreply@fletora.studio>';
const DAY = 86_400_000;
const json = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const until = (v: unknown) => typeof v === 'number' ? v : typeof v === 'string' ? Number(v) || 0 : (v as { toMillis?: () => number })?.toMillis?.() ?? 0;

function reminder(name: string, ends: number) {
  const sans = 'Helvetica,Arial,sans-serif', serif = 'Georgia,\'Times New Roman\',serif', day = new Date(ends).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const lead = `Hi ${esc(name || 'there')}, your free trial of Fletora Plus ends on ${day}. After that your account goes back to the free plan: nothing you've made is deleted, but link-only sketchbooks become private, stats and your pinned sketchbook are hidden, and the free limits apply to anything new.`;
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f4f1ea">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;padding:40px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fbfaf6;border:1px solid #e2ded3;padding:36px 32px;color:#222320">
<tr><td style="font:400 30px/1 ${serif};padding-bottom:28px">fletora<span style="color:#ad493a">.</span></td></tr>
<tr><td style="font:400 16px/1.6 ${sans};padding-bottom:28px">${lead}</td></tr>
<tr><td style="font:400 16px/1.6 ${sans};padding-bottom:28px">To keep Plus, choose a plan: £7 a month, or £60 a year.</td></tr>
<tr><td style="padding-bottom:28px"><a href="${ORIGIN}/plus" style="display:inline-block;background:#222320;color:#f4f1ea;padding:14px 26px;font:500 15px ${sans};text-decoration:none">Keep Plus</a></td></tr>
<tr><td style="font:400 13px/1.6 ${sans};color:#77756e">If you don't want Plus, you don't need to do anything. There's no card on file, so you won't be charged.</td></tr>
</table></td></tr></table></body></html>`;
  const text = `${lead.replace(/&[a-z]+;/g, '')}\n\nTo keep Plus, choose a plan (£7 a month, or £60 a year): ${ORIGIN}/plus\n\nIf you don't want Plus, you don't need to do anything. There's no card on file, so you won't be charged.`;
  return { subject: `Your Fletora Plus trial ends ${day}`, html, text };
}

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || !process.env.FIREBASE_SERVICE_ACCOUNT) return json(503, { error: 'not-configured' });
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return json(401, { error: 'not-allowed' });
  if (!getApps().length) initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  const db = getFirestore(), auth = getAuth(), now = Date.now();
  let reminded = 0, ended = 0;

  // Trials ending within the next two days that haven't been reminded yet.
  if (process.env.RESEND_API_KEY) {
    const soon = await db.collection('plus').where('until', '>', now).where('until', '<=', now + 2 * DAY).get();
    for (const d of soon.docs) {
      const p = d.data(); if (!p.on || !p.trial || p.reminded) continue;
      try {
        const u = await auth.getUser(d.id); if (!u.email) continue;
        const name = ((await db.collection('users').doc(d.id).get()).get('name') as string) || '';
        const m = reminder(name, until(p.until));
        const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
          body: JSON.stringify({ from: FROM, to: [u.email], subject: m.subject, html: m.html, text: m.text }) });
        if (!r.ok) { console.error('resend', r.status, await r.text()); continue; }
        await d.ref.update({ reminded: now }); reminded++;
      } catch (e) { console.error('reminder', d.id, e); }
    }
  }

  // Plus that has run out without a subscription: switched off, and its link-only sketchbooks made private.
  const over = await db.collection('plus').where('until', '<=', now).get();
  for (const d of over.docs) {
    const p = d.data(); if (!p.on || p.paid) continue;
    try {
      await d.ref.update({ on: false });
      const books = await db.collection('books').where('ownerId', '==', d.id).where('linkOnly', '==', true).get();
      const batch = db.batch(); books.forEach(b => batch.update(b.ref, { linkOnly: false })); if (!books.empty) await batch.commit();
      ended++;
    } catch (e) { console.error('ending plus', d.id, e); }
  }
  return json(200, { ok: true, reminded, ended });
}
