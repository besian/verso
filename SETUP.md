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
| `books/{id}` | owner, name, colour, shape, cover URL, page URLs in order | the owner |
| Storage `users/{uid}/…` | page images, covers, avatars (images under 10 MB) | that user |

Everything is publicly readable so Explore and artist profiles work signed out. Email
addresses stay in Firebase Auth and are never written to Firestore.
