// Stripe tells us about subscriptions here, and this is the only place Fletora Plus is switched on or off.
// Each event is checked against STRIPE_WEBHOOK_SECRET, then the subscription is read fresh from Stripe (so
// events arriving out of order can't leave the wrong state) and written to plus/{uid} (public: on/off, for
// the Plus mark and the rules) and billing/{uid} (private: plan details, for Settings).
// When Plus ends, link-only sketchbooks go back to private.
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { stripe } from './_lib/stripe.js';

const GRACE_MS = 3 * 86400000; // a late renewal doesn't switch Plus off for a few days
const LIVE = ['active', 'trialing', 'past_due'];
const json = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function db() {
  if (!getApps().length) initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}')) });
  return getFirestore();
}

/** Stripe-Signature: t=<time>,v1=<hmac of "time.body">; refused if forged or more than 5 minutes old. */
function verified(raw: string, header: string, secret: string) {
  const parts = Object.fromEntries(header.split(',').map(p => p.split('=') as [string, string]));
  const t = Number(parts.t), sigs = header.split(',').filter(p => p.startsWith('v1=')).map(p => p.slice(3));
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const want = Buffer.from(createHmac('sha256', secret).update(`${t}.${raw}`).digest('hex'));
  return sigs.some(s => { const got = Buffer.from(s); return got.length === want.length && timingSafeEqual(got, want); });
}

/** Reads the subscription and records what it means for its account. */
async function sync(subId: string, uidHint?: string) {
  const d = db(), sub = await stripe('GET', `subscriptions/${subId}`);
  const uid: string = sub.metadata?.uid || uidHint || '';
  if (!uid) return console.warn('subscription without uid', subId);
  const item = sub.items?.data?.[0], end = (sub.current_period_end ?? item?.current_period_end ?? 0) * 1000;
  const on = LIVE.includes(sub.status);
  await Promise.all([
    d.collection('plus').doc(uid).set({ on, until: on ? end + GRACE_MS : 0 }),
    d.collection('billing').doc(uid).set({
      customer: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id, sub: sub.id, status: sub.status,
      interval: item?.price?.recurring?.interval || '', periodEnd: end, renews: on && !sub.cancel_at_period_end, at: Date.now(),
    }, { merge: true }),
  ]);
  if (!on) {
    const books = await d.collection('books').where('ownerId', '==', uid).where('linkOnly', '==', true).get();
    const batch = d.batch(); books.forEach(b => batch.update(b.ref, { linkOnly: false })); if (!books.empty) await batch.commit();
  }
}

export function GET() { return json(405, { error: 'use POST' }); }

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.STRIPE_SECRET_KEY || !process.env.FIREBASE_SERVICE_ACCOUNT) return json(503, { error: 'not-configured' });
  const raw = await req.text();
  if (!verified(raw, req.headers.get('stripe-signature') || '', secret)) return json(400, { error: 'bad-signature' });
  const ev = JSON.parse(raw) as { type: string; data: { object: Record<string, any> } }, o = ev.data.object;
  try {
    if (ev.type === 'checkout.session.completed' && o.mode === 'subscription' && o.subscription) await sync(o.subscription, o.client_reference_id);
    else if (ev.type.startsWith('customer.subscription.')) await sync(o.id);
  } catch (e) {
    // A failure answers 500 so Stripe tries again later.
    console.error('webhook', ev.type, e);
    return json(500, { error: 'failed' });
  }
  return json(200, { ok: true });
}
