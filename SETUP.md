# verso. — setup

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
