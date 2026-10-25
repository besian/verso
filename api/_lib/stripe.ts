// Stripe's REST API, called with fetch (no SDK). Shared by api/billing and api/stripe-webhook; files under
// api/_lib aren't functions of their own.

/** Stripe's API takes form fields, with nested objects written as a[b][c]. */
function form(o: Record<string, unknown>, out = new URLSearchParams(), pre = ''): URLSearchParams {
  for (const [k, v] of Object.entries(o)) {
    const key = pre ? `${pre}[${k}]` : k;
    if (v == null) continue;
    if (typeof v === 'object') form(v as Record<string, unknown>, out, key);
    else out.append(key, String(v));
  }
  return out;
}
export async function stripe<T = Record<string, any>>(method: 'GET' | 'POST' | 'DELETE', path: string, params: Record<string, unknown> = {}): Promise<T> {
  const q = form(params).toString(), get = method !== 'POST';
  const r = await fetch(`https://api.stripe.com/v1/${path}${get && q ? '?' + q : ''}`, {
    method, headers: { authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, 'content-type': 'application/x-www-form-urlencoded' }, body: get ? undefined : q,
  });
  const body = await r.json() as T & { error?: { message?: string } };
  if (!r.ok) throw Object.assign(new Error(body.error?.message || `stripe ${r.status}`), { status: r.status });
  return body;
}
