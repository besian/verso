// Once a day (vercel.json → crons): sends the weekly email on Mondays (api/_lib/weekly.ts), reminds people their free trial of Plus ends soon, and ends Plus that has run
// out without a subscription behind it (trials, gifts, Plus switched on by hand). Paid Plus is ended by the
// Stripe webhook instead. When Plus ends, link-only sketchbooks become private.
// Needs CRON_SECRET (Vercel sends it to cron jobs), FIREBASE_SERVICE_ACCOUNT and RESEND_API_KEY in Vercel.
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { emailPage, esc, row } from './_lib/emailLayout.js';
import { sendWeekly, unsubOk } from './_lib/weekly.js';

const ORIGIN = process.env.APP_ORIGIN || 'https://fletora.studio';
const FROM = process.env.EMAIL_FROM || 'Fletora <noreply@fletora.studio>';
const DAY = 86_400_000;
const json = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const until = (v: unknown) => typeof v === 'number' ? v : typeof v === 'string' ? Number(v) || 0 : (v as { toMillis?: () => number })?.toMillis?.() ?? 0;

function reminder(name: string, ends: number) {
  const day = new Date(ends).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const lead = `Hi ${esc(name || 'there')}, your free trial of Fletora Plus ends on ${day}. After that your account goes back to the free plan: nothing you've made is deleted, but link-only sketchbooks become private, stats and your pinned sketchbook are hidden, and the free limits apply to anything new.`;
  const subject = `Your Fletora Plus trial ends ${day}`;
  const html = emailPage({ title: subject, origin: ORIGIN, heading: 'Your Plus trial <em>ends soon</em>', rows: [
    row.text(lead), row.text('To keep Plus, choose a plan: £7 a month, or £60 a year.'), row.button(`${ORIGIN}/plus`, 'Keep Plus'),
    row.small("If you don't want Plus, you don't need to do anything. There's no card on file, so you won't be charged.", 0),
  ] });
  const text = `${lead.replace(/&[a-z]+;/g, '')}\n\nTo keep Plus, choose a plan (£7 a month, or £60 a year): ${ORIGIN}/plus\n\nIf you don't want Plus, you don't need to do anything. There's no card on file, so you won't be charged.`;
  return { subject, html, text };
}

const admin = () => { if (!getApps().length) initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!)) }); return getFirestore(); };
const page = (heading: string, body: string, form = '') => new Response(emailPage({ title: 'Weekly email', origin: ORIGIN, heading, rows: [row.text(body), form].filter(Boolean) }), { headers: { 'content-type': 'text/html; charset=utf-8' } });

/** Unsubscribing from the weekly email, from its link: the link shows a button (so mail scanners opening links
 *  don't unsubscribe anyone), and the button, or the mail app's one-click unsubscribe, POSTs here. */
async function unsubscribe(req: Request, url: URL) {
  const uid = url.searchParams.get('unsub') || '', sig = url.searchParams.get('t') || '';
  if (!process.env.CRON_SECRET || !process.env.FIREBASE_SERVICE_ACCOUNT) return json(503, { error: 'not-configured' });
  if (!unsubOk(uid, sig)) return page('That link <em>doesn’t work</em>', `You can turn the weekly email off in <a href="${ORIGIN}/settings" style="color:inherit">Settings</a> instead.`);
  if (req.method !== 'POST') return page('Stop the <em>weekly email</em>?', 'You won’t get the Monday email any more. You can turn it back on in Settings whenever you like.',
    `<tr><td style="padding:4px 0 10px"><form method="post" action="${esc(url.pathname + url.search)}"><button type="submit" style="background:#222320;color:#F4F1E9;border:none;padding:15px 28px;font:500 15px/1 Helvetica,Arial,sans-serif;cursor:pointer">Unsubscribe</button></form></td></tr>`);
  await admin().collection('emailPrefs').doc(uid).set({ weekly: false, at: Date.now() }, { merge: true });
  return page('You’re <em>unsubscribed</em>', `No more weekly emails. You can turn it back on in <a href="${ORIGIN}/settings" style="color:inherit">Settings</a>.`);
}
export async function POST(req: Request) {
  const url = new URL(req.url);
  return url.searchParams.has('unsub') ? unsubscribe(req, url) : json(405, { error: 'method' });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.has('unsub')) return unsubscribe(req, url);
  if (!process.env.CRON_SECRET || !process.env.FIREBASE_SERVICE_ACCOUNT) return json(503, { error: 'not-configured' });
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return json(401, { error: 'not-allowed' });
  const db = admin(), auth = getAuth(), now = Date.now();
  let reminded = 0, ended = 0, weekly = 0;
  try { weekly = await sendWeekly(db, auth, { now, origin: ORIGIN, from: FROM, force: url.searchParams.get('weekly') === 'now' }); } catch (e) { console.error('weekly', e); }

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
  return json(200, { ok: true, weekly, reminded, ended });
}
