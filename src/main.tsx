import { createRoot } from 'react-dom/client';
import App from './App';

// Installable app: the service worker only runs on the built site (not in dev or against emulators).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(e => console.warn('service worker', e)));
}

createRoot(document.getElementById('root')!).render(<App />);
