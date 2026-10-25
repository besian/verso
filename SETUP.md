# fletora. — setup

Vite + React app. Accounts use Firebase Authentication (email + password); profiles, books and
follows are in Cloud Firestore; page images, covers and avatars are in Cloud Storage. Without
Firebase config the site still runs, signed out and without community books.

## Run locally

```sh
npm install
npm run dev              # uses .env.local (see .env.example)
```

Or run entirely against local emulators (needs Java; no Firebase project required):

```sh
npm run emulators        # terminal 1
npm run dev:emulators    # terminal 2
```

## Firebase project (one-time)

1. **Create a project** at https://console.firebase.google.com.
2. **Authentication** → Get started → Sign-in method → enable **Email/Password**.
   Then Settings → **Authorized domains** → add your Vercel domain (e.g. `verso-xyz.vercel.app`)
   and any custom domain.
3. **Firestore Database** → Create database (production mode, any region).
4. **Storage** → Get started (production mode). Storage needs the Blaze plan on new projects.
5. **Web app config**: Project settings → General → Your apps → add a **Web** app, copy the
   `firebaseConfig` values into the `VITE_FIREBASE_*` variables from `.env.example`.
6. **Security rules**: deploy the ones in this repo:
   ```sh
   npx firebase-tools login
   npm run deploy:rules -- --project <your-project-id>
   ```
   (or paste `firestore.rules` and `storage.rules` into the Rules tabs in the console).
7. **Storage CORS** (lets "Edit page" re-crop a page that's already uploaded):
   ```sh
   gcloud storage buckets update gs://<your-bucket> --cors-file=cors.json
   ```
   Use the bucket name from `VITE_FIREBASE_STORAGE_BUCKET`.

8. **Indexes** (Explore loads 24 books at a time): Firestore → **Indexes** → Composite →
   **Create index** twice, both on collection `books`, query scope Collection:
   - `isPublic` Ascending, `updatedAt` Descending
   - `isPublic` Ascending, `pageCount` Descending

   (or `npx firebase-tools deploy --only firestore:indexes`). Until they finish building,
   Explore falls back to loading up to 300 books at once.
9. **Moderators**: Authentication → Users → copy your **User UID**. Firestore → **Start
   collection** `admins` → Document ID = that UID, any field (e.g. `at` = 1). A **Moderation**
   button then appears on your profile (`/admin`): review reports, hide or restore a
   sketchbook, suspend an artist, dismiss a report.
10. **App Check** (optional): create a reCAPTCHA v3 key at https://www.google.com/recaptcha/admin
    for your domain, register it in Firebase → **App Check** → Apps → your web app, and set
    `VITE_FIREBASE_APPCHECK_KEY` in Vercel to the site key. Enforce it only for
    **Authentication**: enforcing Firestore or Storage would block shared-link previews
    (`api/meta.ts`) and plain `<img>` image loads.
11. **Budget alert**: Google Cloud console → Billing → **Budgets & alerts** → Create budget
    (e.g. a small monthly amount with emails at 50%, 90% and 100%).

12. **Email links on fletora's own page**: Authentication → **Templates** → any template → pencil →
    **Customize action URL** → `https://<your-domain>/auth/action` → Save (it applies to all
    templates). Confirm-email, reset-password and change-email links then open fletora's page.

## Custom domain (fletora.studio)

1. **Vercel** → Project → Settings → **Domains** → add `fletora.studio` (and `www.fletora.studio`,
   set to redirect to it). Vercel shows the DNS records to add at your registrar (an A record for
   the bare domain and a CNAME for www); add them and wait for the tick.
2. **Firebase** → Authentication → Settings → **Authorized domains** → add `fletora.studio`.
3. **Email links**: Authentication → Templates → Customize action URL →
   `https://fletora.studio/auth/action`. While there, set the sender name to **Fletora**.
4. Optional: in Authentication → Templates → **SMTP settings** / custom domain, send from
   `noreply@fletora.studio` so emails are less likely to land in spam.

## Vercel

Project → Settings → **Environment Variables**: add the six `VITE_FIREBASE_*` variables for
Production (and Preview if you want), then redeploy. Vite reads them at build time, so a
redeploy is needed after changing them.

## Data model

| Path | Contents | Who can write |
| --- | --- | --- |
| `users/{uid}` | name, handle, bio, location, website, avatar URL, joined | that user |
| `users/{uid}/following/{uid}` | one doc per artist followed | that user |
| `handles/{handle}` | `{ uid }`, keeps handles unique | the user claiming it |
| `books/{id}` | owner, name, colour, shape, cover URL, page URLs in order, captions + dates per page, mediums, tags (`labels` for filtering), `hidden` | the owner (`hidden`: moderators) |
| `books/{id}` `mature`, `matureLock` | Mature label (drawn nudity or sexual content); `matureLock` when the upload check set it | owner (`mature` until locked); moderators clear |
| `mature/{bookId}` | the upload check labelled this book Mature; its saves must keep the label | `api/image` only; moderators delete |
| `checkLog/{uid}_{day}` | upload checks per person per day (400) | `api/image` only |
| `books/{id}` `collabs`, `invites`, `people` | people who can add pages and invitations waiting (1 person, or 5 with Plus), with their names; older books keep a single `collab`/`invite` until their sharing next changes | owner invites/removes; invitees accept/decline; people in it edit pages or leave |
| `users/{uid}/followers/{uid}` | one doc per follower (its size is the follower count) | the follower |
| `users/{uid}/notifications/{id}` | likes, follows, goals; ids fixed per person and action | the sender |
| `reports/{reporter}_{target}` | reason and note | the reporter; read by moderators |
| `reports/check_{id}` | pictures the upload check held back (`kind: 'image'`, `file` in quarantine) or a Mature label to check | `api/image` only; read by moderators |
| `admins/{uid}` | marks a moderator | console only |
| `banned/{uid}` | suspended artists | moderators |
| `plus/{uid}` | `{ on, until }`: Fletora Plus (public, for the Plus mark and the rules) | `api/stripe-webhook` only |
| `billing/{uid}` | Stripe customer, subscription, plan, renewal date (read by that user) | `api/stripe-webhook` only |
| `stats/{bookId}` | view counts by source (explore, profile, home, link, embed) and saves (read by the owner) | anyone, one view at a time |
| Storage `pending/{uid}/…` | uploads waiting for the check (images under 10 MB; not readable) | that user |
| Storage `users/{uid}/…` | page images, covers, avatars, thumbnails (public) | `api/image` only (the user can delete) |
| Storage `quarantine/{uid}/…` | pictures held back by the check | `api/image` only (moderators view through it) |

Everything is publicly readable so Explore and artist profiles work signed out. Email
addresses stay in Firebase Auth and are never written to Firestore.

## Branded emails (Resend)

Firebase won't let this project edit its email templates, so `api/email.ts` sends the account emails
(confirm email, reset password, change email) itself through Resend. Until the two keys below are set,
the app falls back to Firebase's plain emails.

1. resend.com → Domains → add `fletora.studio`, and add the DNS records it shows in Vercel → Domains → fletora.studio → DNS.
2. Resend → API Keys → create one (Sending access) → Vercel env var `RESEND_API_KEY`.
3. Firebase → ⚙ Project settings → Service accounts → Generate new private key → paste the whole JSON file's
   contents into Vercel env var `FIREBASE_SERVICE_ACCOUNT`. Keep this file private; it has full admin access.
4. Redeploy. Optional: `EMAIL_FROM` (default `Fletora <noreply@fletora.studio>`), `APP_ORIGIN` (default `https://fletora.studio`),
   `EMAIL_REPLY_TO` (where replies go; defaults to `VITE_CONTACT_EMAIL`).
   `SAFETY_EMAIL` (who gets emailed at once when a report says a child may be at risk; defaults to besian@fletora.studio).

## Handwriting to text (Claude)

The page editor's **Write** mode sends the handwriting to `api/handwriting.ts`, which reads it with
Claude (Haiku 5.5) and returns the text. Signed-in users only, 20 conversions per person a month (500 with Plus).

1. console.anthropic.com → API keys → create one → Vercel env var `ANTHROPIC_API_KEY`.
2. It also uses `FIREBASE_SERVICE_ACCOUNT` (already set for the branded emails).
3. Redeploy. Optional: set a monthly spend limit in the Anthropic console (Settings → Limits).

## Upload checks (Claude)

Every picture goes through `api/image.ts` before it's public. The app uploads it to Storage `pending/{uid}/`,
which nobody can read, and the server sends it to Claude (Opus 5.5) to check, then:

| Claude finds | What happens |
| --- | --- |
| nothing of concern | published to `users/{uid}/`, with a thumbnail made on the server |
| a drawing with nudity (adults, not sexually explicit) | published, and the sketchbook is labelled Mature for good (moderators can clear it); if Claude wasn't sure, a report asks a moderator to check the label |
| a photo, photo-real image or collage with nudity or sexual content | refused and deleted |
| anything that sexualises someone who looks under 18, drawn or not | refused, moved to `quarantine/`, the sketchbook hidden, a report made and `SAFETY_EMAIL` emailed at once |
| non-sexual nudity of someone who looks under 18, or Claude declines to look | held back in `quarantine/` with a report for a moderator |
| a sexually explicit drawing | refused (showing it would need proper age checks under the Online Safety Act) |
| nudity in a profile picture | refused |

If Claude can't be reached, nothing is published: the app keeps the page and tries again on the next save.
Moderators see held pictures on the Moderation page (**View picture** gives a 5-minute link; **Delete picture**).
Mature sketchbooks are left out of Explore, label pages, the home feed and other people's profiles unless the
viewer is signed in and has turned on **Show Mature sketchbooks** (Account settings), and opening one asks first.

1. Uses `ANTHROPIC_API_KEY`, `FIREBASE_SERVICE_ACCOUNT` and `RESEND_API_KEY` (already set).
2. Publish the new `firestore.rules` **and** `storage.rules` (Firebase console → Storage → Rules). Until the Storage
   rules are published, the old ones still let the app write straight to `users/`.
3. Optional: `FIREBASE_STORAGE_BUCKET` if the bucket isn't `VITE_FIREBASE_STORAGE_BUCKET`.
4. Optional: in Google Cloud console → Cloud Storage → your bucket → Lifecycle, add a rule to delete objects with
   prefix `pending/` older than 1 day (leftovers from uploads that were interrupted).
5. Cost: about a cent per picture checked. Set a monthly spend limit in the Anthropic console.

## Messages

Direct messages live in `chats/{a}_{b}` (and `chats/…/messages`), with a daily limit on new conversations in
`chatLimits/{uid}`. All of it is enforced by `firestore.rules`, so **publish the rules** after pulling this:

    npm run deploy:rules

- Someone who follows you can message you directly; anyone else's first message is a **request** you accept or decline.
- Blocked people can't message you; suspended accounts can't send; 20 new conversations a day per person.
- Reported messages appear on the Moderation page with the message text (moderators can't read conversations).

**UK Online Safety Act:** private messaging makes Fletora a user-to-user service. Keep a short written risk
assessment (what could go wrong in messages, e.g. harassment, spam, contact with under-18s; and what's in place:
requests, blocking, reporting, rate limits, suspension), review it yearly, and act on reports promptly.

## Fletora Plus (Stripe)

Plus is a subscription (£7 a month or £60 a year) sold through Stripe **Managed Payments**: Stripe is the
merchant of record, so it charges VAT/sales tax, handles fraud and disputes, and sends receipts.
What's free and what's Plus is in `src/plus.ts` (keep its prices in step with Stripe).

- `api/billing.ts`: starts a checkout, opens the billing portal (change plan, card, cancel), and cancels the
  subscription when someone deletes their account.
- `api/stripe-webhook.ts`: the only place Plus is switched on or off. It writes `plus/{uid}` and `billing/{uid}`,
  and makes link-only sketchbooks private again when Plus ends.

Setup (do it all in the **sandbox** first, then repeat in the live account):

1. Product catalogue → Add product → name it exactly **Fletora Plus**, with two recurring prices: £7.00 monthly
   and £60.00 yearly. Under each price's tax settings choose **Inclusive** (UK prices are shown with VAT).
2. Developers → API keys → Secret key → Vercel env var `STRIPE_SECRET_KEY`. Optional: the Publishable key → Vercel env var
   `VITE_STRIPE_PUBLISHABLE_KEY`, so checkout opens inside the Plus sheet instead of on Stripe's page (if Stripe won't
   embed it, people are sent to Stripe's page as before).
3. Developers → Webhooks → Add endpoint → `https://fletora.studio/api/stripe-webhook`, with the events
   `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`,
   `customer.subscription.deleted`. Copy its signing secret → Vercel env var `STRIPE_WEBHOOK_SECRET`.
4. Settings → Billing → Customer portal → turn on cancelling and switching between the two prices, then Save.
5. Redeploy, and publish the rules (`npm run deploy:rules`): page limits, link-only sketchbooks, stats and
   the pinned sketchbook are enforced there.
6. Test with card `4242 4242 4242 4242`, any future date and any CVC.

Going live: switch Stripe to the live account, create the same product and prices (Stripe can copy them from the
sandbox), add the live webhook, and replace the two Vercel env vars with the live key and live signing secret.
Optional: `STRIPE_PRODUCT_NAME` if the product is named something other than "Fletora Plus".

