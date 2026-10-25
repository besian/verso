// Fletora Plus billing through Stripe (Managed Payments: Stripe is the seller and handles tax, fraud and
// disputes). `checkout` starts a subscription (on Fletora's own page, with Stripe's card fields); `details`,
// `cancel`, `resume`, `switch`, `card` and `card-done` run Fletora's billing page; `portal` is Stripe's own page,
// kept as a fallback; `sync` confirms a checkout as soon as someone comes back from paying (the webhook does too,
// and keeps it up to date after); `close` cancels everything when an account is deleted; `gift` lets moderators
// give someone Plus for free (or take a gift back).
// Needs STRIPE_SECRET_KEY and FIREBASE_SERVICE_ACCOUNT in Vercel.
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldPath, getFirestore } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import { stripe } from './_lib/stripe.js';
import { syncCheckout, syncSubscription } from './_lib/plus.js';

const ORIGIN = process.env.APP_ORIGIN || 'https://fletora.studio';
/** Back to the same address the person paid from (www. or not), so they're still signed in there. */
const originOf = (req: Request) => {
  const o = req.headers.get('origin') || '';
  return /^https:\/\/(www\.)?fletora\.studio$/.test(o) || o === ORIGIN ? o : ORIGIN;
};
// Stripe's checkout form in Fletora's paper, red and square corners (all it lets a checkout change).
const BRANDING = { display_name: 'Fletora', background_color: '#F4F1E9', button_color: '#AD493A', border_style: 'rectangular' };
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
  const body = await req.json().catch(() => ({})) as { action?: string; plan?: string; embedded?: boolean; session?: string; setup?: string; target?: string; months?: number; remove?: boolean };
  const here = originOf(req), back = `${here}/settings?plus=welcome&session_id={CHECKOUT_SESSION_ID}`;
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
      // On Fletora's page when the site has a publishable key: Fletora's own form with Stripe's card fields
      // (elements; `custom` in older API versions), else Stripe's whole form embedded (embedded_page / embedded),
      // else Stripe's own page below.
      // Why each mode was refused goes back too; the page shows it in test mode only.
      const refused: string[] = [];
      if (body.embedded) for (const ui_mode of ['elements', 'custom', 'embedded_page', 'embedded']) {
        try {
          // Stripe's form in Fletora's colours where it allows them; if those settings are refused, without them.
          const s = await stripe('POST', 'checkout/sessions', { ...base, ui_mode, return_url: back, branding_settings: BRANDING })
            .catch(() => stripe('POST', 'checkout/sessions', { ...base, ui_mode, return_url: back }));
          if (s.client_secret) return json(200, { clientSecret: s.client_secret, ui: ui_mode === 'elements' || ui_mode === 'custom' ? 'elements' : 'embedded', refused });
        } catch (e) { console.warn('checkout', ui_mode, (e as Error).message); refused.push(`${ui_mode}: ${(e as Error).message}`); }
      }
      const page = { ...base, success_url: back, cancel_url: `${here}/settings` };
      const s = await stripe('POST', 'checkout/sessions', { ...page, branding_settings: BRANDING }).catch(() => stripe('POST', 'checkout/sessions', page));
      return json(200, { url: s.url });
    }
    if (body.action === 'portal') {
      if (!bill.customer) return json(404, { error: 'no-customer' });
      const s = await stripe('POST', 'billing_portal/sessions', { customer: bill.customer, return_url: `${here}/billing` });
      return json(200, { url: s.url });
    }
    // ---------- Fletora's billing page ----------
    if (body.action === 'details') {
      if (!bill.sub) return json(404, { error: 'no-subscription' });
      const [sub, inv, ch] = await Promise.all([
        stripe('GET', `subscriptions/${bill.sub}`, { expand: ['default_payment_method', 'customer.invoice_settings.default_payment_method'] }),
        stripe<{ data: Record<string, any>[] }>('GET', 'invoices', { customer: bill.customer, limit: 24 }),
        stripe<{ data: Record<string, any>[] }>('GET', 'charges', { customer: bill.customer, limit: 24 }).catch(() => ({ data: [] })),
      ]);
      const item = sub.items?.data?.[0], pm = sub.default_payment_method || sub.customer?.invoice_settings?.default_payment_method, card = pm?.card;
      const ms = (t?: number | null) => (t ? t * 1000 : 0);
      const cardOf = (c?: Record<string, any> | null) => c ? { brand: c.brand || '', last4: c.last4 || '', exp: c.exp_month ? `${String(c.exp_month).padStart(2, '0')}/${String(c.exp_year).slice(-2)}` : '' } : null;
      // Payments: each charge with the card it used, refunds included; invoices fill in any charge can't be listed.
      const payments = ch.data.length ? ch.data.map(c => ({
        id: c.id, at: ms(c.created), amount: c.amount, refunded: c.amount_refunded || 0, currency: c.currency,
        status: c.refunded ? 'refunded' : c.amount_refunded ? 'part-refunded' : c.status === 'succeeded' ? 'paid' : c.status,
        card: cardOf(c.payment_method_details?.card), url: c.receipt_url || '',
      })) : inv.data.filter(i => i.status !== 'draft').map(i => ({ id: i.id, at: ms(i.created), amount: i.amount_paid || i.total, refunded: 0, currency: i.currency, status: i.status, card: null, url: i.hosted_invoice_url || i.invoice_pdf || '' }));
      return json(200, {
        status: sub.status, interval: item?.price?.recurring?.interval || '', amount: item?.price?.unit_amount || 0, currency: item?.price?.currency || 'gbp',
        periodEnd: ms(sub.current_period_end ?? item?.current_period_end), periodStart: ms(sub.current_period_start ?? item?.current_period_start),
        started: ms(sub.start_date || sub.created), cancelling: !!sub.cancel_at_period_end, cancelledAt: ms(sub.canceled_at), endsAt: ms(sub.cancel_at || sub.ended_at),
        card: card ? { ...cardOf(card)!, added: ms(pm.created) } : pm?.type ? { brand: pm.type, last4: '', exp: '', added: ms(pm.created) } : null,
        payments,
      });
    }
    if (body.action === 'cancel' || body.action === 'resume') {
      if (!bill.sub) return json(404, { error: 'no-subscription' });
      // Cancelling keeps Plus until the end of the paid period; resuming undoes that before it ends.
      await stripe('POST', `subscriptions/${bill.sub}`, { cancel_at_period_end: body.action === 'cancel' });
      await syncSubscription(db, bill.sub, uid);
      return json(200, { ok: true });
    }
    if (body.action === 'switch') {
      // Monthly → yearly: the year starts now, and what's left of the month is credited against it.
      if (!bill.sub) return json(404, { error: 'no-subscription' });
      const sub = await stripe('GET', `subscriptions/${bill.sub}`), item = sub.items?.data?.[0], price = await priceFor('year');
      if (!item || !price) return json(503, { error: 'no-price' });
      if (item.price?.recurring?.interval === 'year') return json(200, { ok: true });
      await stripe('POST', `subscriptions/${bill.sub}`, { items: [{ id: item.id, price }], proration_behavior: 'always_invoice', cancel_at_period_end: false });
      await syncSubscription(db, bill.sub, uid);
      return json(200, { ok: true });
    }
    if (body.action === 'card') {
      // A new card: Stripe's card fields on Fletora's page confirm this setup, then `card-done` makes it the one used.
      if (!bill.customer) return json(404, { error: 'no-customer' });
      const si = await stripe('POST', 'setup_intents', { customer: bill.customer, usage: 'off_session', automatic_payment_methods: { enabled: true }, metadata: { uid } });
      return json(200, { clientSecret: si.client_secret });
    }
    if (body.action === 'card-done') {
      const si = await stripe('GET', `setup_intents/${String(body.setup || '').replace(/[^A-Za-z0-9_]/g, '')}`);
      if (si.metadata?.uid !== uid || si.status !== 'succeeded' || !si.payment_method) return json(400, { error: 'bad-request' });
      const pm = typeof si.payment_method === 'string' ? si.payment_method : si.payment_method.id;
      await stripe('POST', `customers/${bill.customer}`, { invoice_settings: { default_payment_method: pm } });
      if (bill.sub) await stripe('POST', `subscriptions/${bill.sub}`, { default_payment_method: pm });
      return json(200, { ok: true });
    }
    if (body.action === 'gift') {
      // Moderators only. A gift is plus/{uid} with gift: true and no subscription behind it; a paid subscription
      // always wins (the webhook rewrites plus/{uid} from it), and gifts never touch one.
      if (!(await db.collection('admins').doc(uid).get()).exists) return json(403, { error: 'not-allowed' });
      const target = String(body.target || '');
      if (!/^[A-Za-z0-9]{10,40}$/.test(target)) return json(400, { error: 'bad-request' });
      const [plus, paid] = await Promise.all([db.collection('plus').doc(target).get(), db.collection('billing').doc(target).get()]);
      if (paid.data()?.renews || ['active', 'trialing', 'past_due'].includes(paid.data()?.status)) return json(409, { error: 'paid' });
      // Removing works for a gift and for Plus switched on by hand in the console (neither has a subscription).
      if (body.remove) {
        if (plus.exists) await plus.ref.set({ on: false, until: 0 });
        return json(200, { ok: true });
      }
      const months = Math.max(0, Math.min(120, Math.floor(Number(body.months) || 0)));
      const until = months ? new Date(new Date().setMonth(new Date().getMonth() + months)).getTime() : new Date('2100-01-01').getTime();
      await plus.ref.set({ on: true, until, gift: true, forever: !months, by: uid, at: Date.now() });
      return json(200, { ok: true, until });
    }
    if (body.action === 'sync') {
      if (!/^cs_[A-Za-z0-9_]+$/.test(body.session || '')) return json(400, { error: 'bad-request' });
      return json(200, { plus: await syncCheckout(db, body.session!, uid) });
    }
    if (body.action === 'close') {
      // Deleting the account: end any subscription now (no further charges), then remove the records only the
      // server can: Plus and billing, handwriting and email counts, counters, and stats for the person's
      // sketchbooks. Runs before the app deletes the rest (it needs their sketchbooks to find the stats).
      if (bill.sub && ['active', 'trialing', 'past_due', 'incomplete'].includes(bill.status || 'active'))
        await stripe('DELETE', `subscriptions/${bill.sub}`).catch(e => { if ((e as { status?: number }).status !== 404) throw e; });
      const byUid = (c: string) => db.collection(c).where(FieldPath.documentId(), '>=', uid + '_').where(FieldPath.documentId(), '<', uid + '_\uf8ff').get();
      const [books, ink, checks] = await Promise.all([db.collection('books').where('ownerId', '==', uid).get(), byUid('inkLog'), byUid('checkLog')]);
      const refs = [billing, db.collection('plus').doc(uid), db.collection('chatLimits').doc(uid), db.collection('userCounts').doc(uid),
        ...(email ? ['mailLog', 'contactLog'].map(c => db.collection(c).doc(createHash('sha256').update(email.toLowerCase()).digest('hex'))) : []),
        ...ink.docs.map(d => d.ref), ...checks.docs.map(d => d.ref),
        ...books.docs.flatMap(b => [db.collection('stats').doc(b.id), db.collection('bookCounts').doc(b.id), db.collection('mature').doc(b.id)])];
      for (let i = 0; i < refs.length; i += 400) { const batch = db.batch(); refs.slice(i, i + 400).forEach(r => batch.delete(r)); await batch.commit(); }
      return json(200, { ok: true });
    }
    return json(400, { error: 'bad-request' });
  } catch (e) {
    console.error('billing', body.action, e);
    if ((e as { status?: number }).status === 403) return json(403, { error: 'not-yours' });
    return json(502, { error: 'stripe-failed' });
  }
}
