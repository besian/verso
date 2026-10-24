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
| `books/{id}` `collab*`, `invite*` | the one other person who can add pages, and a pending invitation | owner invites/removes; invitee accepts/declines; the other person edits pages only |
| `users/{uid}/followers/{uid}` | one doc per follower (its size is the follower count) | the follower |
| `users/{uid}/notifications/{id}` | likes, follows, goals; ids fixed per person and action | the sender |
| `reports/{reporter}_{target}` | reason and note | the reporter; read by moderators |
| `admins/{uid}` | marks a moderator | console only |
| `banned/{uid}` | suspended artists | moderators |
| Storage `users/{uid}/…` | page images, covers, avatars (images under 10 MB) | that user |

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
4. Redeploy. Optional: `EMAIL_FROM` (default `Fletora <noreply@fletora.studio>`), `APP_ORIGIN` (default `https://fletora.studio`).

## Handwriting to text (Claude)

The page editor's **Write** mode sends the handwriting to `api/handwriting.ts`, which reads it with
Claude (Haiku 5.5) and returns the text. Signed-in users only, 60 conversions per person per hour.

1. console.anthropic.com → API keys → create one → Vercel env var `ANTHROPIC_API_KEY`.
2. It also uses `FIREBASE_SERVICE_ACCOUNT` (already set for the branded emails).
3. Redeploy. Optional: set a monthly spend limit in the Anthropic console (Settings → Limits).

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
