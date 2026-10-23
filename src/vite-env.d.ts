/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string;
  /** "1" to use the local Firebase emulators (npm run emulators). */
  readonly VITE_FIREBASE_EMULATORS?: string;
  /** reCAPTCHA v3 site key registered with Firebase App Check. */
  readonly VITE_FIREBASE_APPCHECK_KEY?: string;
  /** Address shown on the privacy and terms pages. */
  readonly VITE_CONTACT_EMAIL?: string;
}
