// Records what a Stripe subscription means for its Fletora account: plus/{uid} (public on/off, for the Plus
// mark and the rules) and billing/{uid} (private plan details). Used by the webhook and by api/billing's
// `sync`, which confirms a checkout straight away when someone comes back from paying.
import type { Firestore } from 'firebase-admin/firestore';
import { stripe } from './stripe.js';

const GRACE_MS = 3 * 86400000; // a late renewal doesn't switch Plus off for a few days
const LIVE = ['active', 'trialing', 'past_due'];
const idOf = (x: unknown) => typeof x === 'string' ? x : (x as { id?: string } | null)?.id || '';

/** Reads the subscription fresh from Stripe (so events arriving out of order can't leave the wrong state). */
export async function syncSubscription(db: Firestore, subId: string, uidHint = ''): Promise<boolean> {
  const sub = await stripe('GET', `subscriptions/${subId}`), customer = idOf(sub.customer);
  // Whose it is: set on the subscription at checkout; failing that, the checkout's reference or a known customer.
  let uid: string = sub.metadata?.uid || uidHint;
  if (!uid && customer) uid = (await db.collection('billing').where('customer', '==', customer).limit(1).get()).docs[0]?.id || '';
  if (!uid) { console.warn('subscription without uid', subId); return false; }
  const item = sub.items?.data?.[0], end = (sub.current_period_end ?? item?.current_period_end ?? 0) * 1000;
  const on = LIVE.includes(sub.status);
  await Promise.all([
    // `paid` marks Plus that comes from a subscription (moderators can't change it; see the gift action).
    db.collection('plus').doc(uid).set({ on, until: on ? end + GRACE_MS : 0, paid: on }),
    db.collection('billing').doc(uid).set({
      customer, sub: sub.id, status: sub.status, interval: item?.price?.recurring?.interval || '', periodEnd: end,
      renews: on && !sub.cancel_at_period_end, at: Date.now(),
    }, { merge: true }),
  ]);
  // When Plus ends, link-only sketchbooks go back to private.
  if (!on) {
    const books = await db.collection('books').where('ownerId', '==', uid).where('linkOnly', '==', true).get();
    const batch = db.batch(); books.forEach(b => batch.update(b.ref, { linkOnly: false })); if (!books.empty) await batch.commit();
  }
  return on;
}

/** A finished checkout: its subscription, recorded for the account that started it. */
export async function syncCheckout(db: Firestore, sessionId: string, uid?: string): Promise<boolean> {
  const s = await stripe('GET', `checkout/sessions/${sessionId}`), owner: string = s.client_reference_id || s.metadata?.uid || '';
  if (uid && owner !== uid) throw Object.assign(new Error('not your checkout'), { status: 403 });
  const sub = idOf(s.subscription);
  return sub ? syncSubscription(db, sub, owner) : false;
}
