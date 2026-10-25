// Stripe tells us about subscriptions here: renewals, plan changes, cancellations and failed payments.
// Each event is checked against STRIPE_WEBHOOK_SECRET, then recorded by api/_lib/plus (plus/{uid} and billing/{uid}).
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { syncCheckout, syncSubscription } from './_lib/plus.js';

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

export function GET() { return json(405, { error: 'use POST' }); }

export async function POST(req: Request) {
  // Trimmed: a space or line break pasted along with the secret would fail every signature.
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret || !process.env.STRIPE_SECRET_KEY || !process.env.FIREBASE_SERVICE_ACCOUNT) return json(503, { error: 'not-configured' });
  const raw = await req.text();
  if (!verified(raw, req.headers.get('stripe-signature') || '', secret)) {
    // Shown in Stripe's delivery log: a wrong secret is the usual cause.
    console.warn('webhook signature mismatch', { secretStart: secret.slice(0, 6), length: secret.length, signed: !!req.headers.get('stripe-signature') });
    return json(400, { error: 'bad-signature', hint: secret.startsWith('whsec_') ? 'STRIPE_WEBHOOK_SECRET doesn’t match this endpoint’s signing secret' : 'STRIPE_WEBHOOK_SECRET should start with whsec_' });
  }
  const ev = JSON.parse(raw) as { type: string; data: { object: Record<string, any> } }, o = ev.data.object;
  try {
    if (ev.type === 'checkout.session.completed' && o.mode === 'subscription') await syncCheckout(db(), o.id);
    else if (ev.type.startsWith('customer.subscription.')) await syncSubscription(db(), o.id);
  } catch (e) {
    // A failure answers 500 so Stripe tries again later.
    console.error('webhook', ev.type, e);
    return json(500, { error: 'failed' });
  }
  return json(200, { ok: true });
}
