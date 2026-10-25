// Fletora Plus billing through Stripe (Managed Payments: Stripe is the seller and handles tax, fraud and
// disputes). Checkout starts a subscription, the portal is where people change plan, update their card or
// cancel, and `close` cancels everything when an account is deleted. Plus itself is switched on and off by
// api/stripe-webhook, never here. Needs STRIPE_SECRET_KEY and FIREBASE_SERVICE_ACCOUNT in Vercel.
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { stripe } from './_lib/stripe.js';

const ORIGIN = process.env.APP_ORIGIN || 'https://fletora.studio';
// The product in Stripe whose monthly and yearly prices are offered.
const PRODUCT = process.env.STRIPE_PRODUCT_NAME || 'Fletora Plus';
const json = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function admin() {
  if (!getApps().length) initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}')) });
  return { auth: getAuth(), db: getFirestore() };
}

/** The active monthly or yearly price of Fletora Plus. */
async function priceFor(plan: 'month' | 'year'): Promise<string | null> {
  const list = await stripe<{ data: { id: string; recurring?: { interval: string }; product: { name: string; active: boolean } }[] }>('GET', 'prices', { active: true, type: 'recurring', limit: 100, expand: ['data.product'] });
  return list.data.find(p => p.product?.active && p.product.name === PRODUCT && p.recurring?.interval === plan)?.id || null;
}

export function GET() { return json(405, { error: 'use POST' }); }

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.FIREBASE_SERVICE_ACCOUNT) return json(503, { error: 'not-configured' });
  const { auth, db } = admin();
  let uid = '', email = '';
  try { const u = await auth.verifyIdToken((req.headers.get('authorization') || '').replace(/^Bearer /, '')); uid = u.uid; email = u.email || ''; }
  catch { return json(401, { error: 'sign-in' }); }
  const body = await req.json().catch(() => ({})) as { action?: string; plan?: string; embedded?: boolean };
  const billing = db.collection('billing').doc(uid), bill = (await billing.get()).data() || {};

  try {
    if (body.action === 'checkout') {
      const plan = body.plan === 'year' ? 'year' : 'month';
      const plus = (await db.collection('plus').doc(uid).get()).data();
      if (plus?.on && plus.until > Date.now()) return json(409, { error: 'already-plus' });
      const price = await priceFor(plan);
      if (!price) return json(503, { error: 'no-price' });
      const base = {
        mode: 'subscription', line_items: [{ price, quantity: 1 }],
        ...(bill.customer ? { customer: bill.customer } : { customer_email: email || undefined }),
        client_reference_id: uid, metadata: { uid }, subscription_data: { metadata: { uid } },
        allow_promotion_codes: true, managed_payments: { enabled: true },
      };
      // Embedded in the Plus sheet when the site has a publishable key. Stripe's docs name the mode both
      // embedded_page (newer) and embedded, so both are tried before falling back to Stripe's own page.
      if (body.embedded) for (const ui_mode of ['embedded_page', 'embedded']) {
        try {
          const s = await stripe('POST', 'checkout/sessions', { ...base, ui_mode, return_url: `${ORIGIN}/settings?plus=welcome` });
          if (s.client_secret) return json(200, { clientSecret: s.client_secret });
        } catch (e) { console.warn('embedded checkout', ui_mode, (e as Error).message); }
      }
      const s = await stripe('POST', 'checkout/sessions', { ...base, success_url: `${ORIGIN}/settings?plus=welcome`, cancel_url: `${ORIGIN}/settings` });
      return json(200, { url: s.url });
    }
    if (body.action === 'portal') {
      if (!bill.customer) return json(404, { error: 'no-customer' });
      const s = await stripe('POST', 'billing_portal/sessions', { customer: bill.customer, return_url: `${ORIGIN}/settings` });
      return json(200, { url: s.url });
    }
    if (body.action === 'close') {
      // Deleting the account: end the subscription now (no further charges) and forget the billing link.
      if (bill.sub) await stripe('DELETE', `subscriptions/${bill.sub}`).catch(e => { if ((e as { status?: number }).status !== 404) throw e; });
      await Promise.all([billing.delete(), db.collection('plus').doc(uid).delete()]);
      return json(200, { ok: true });
    }
    return json(400, { error: 'bad-request' });
  } catch (e) {
    console.error('billing', body.action, e);
    return json(502, { error: 'stripe-failed' });
  }
}
