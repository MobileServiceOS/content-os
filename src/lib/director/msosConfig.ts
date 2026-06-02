// PUBLIC Firebase web config for the MSOS project (`mobile-service-os`). Firebase
// web config is NOT secret — it identifies the project; security is enforced by
// MSOS's Firestore rules + the signed-in user's membership. MSOS itself ships
// these same values in its client bundle. Env override (VITE_MSOS_*) is supported
// but the public fallback means no secret provisioning is needed.
export interface MsosWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const env = import.meta.env as Record<string, string | undefined>;

export const MSOS_WEB_CONFIG: MsosWebConfig = {
  apiKey: env.VITE_MSOS_API_KEY ?? 'AIzaSyDpe9pVejH1EFZmQYv04sgtZBoLxqM6lW0',
  authDomain: env.VITE_MSOS_AUTH_DOMAIN ?? 'mobile-service-os.firebaseapp.com',
  projectId: env.VITE_MSOS_PROJECT_ID ?? 'mobile-service-os',
  storageBucket: env.VITE_MSOS_STORAGE_BUCKET ?? 'mobile-service-os.firebasestorage.app',
  messagingSenderId: env.VITE_MSOS_MESSAGING_SENDER_ID ?? '77527561910',
  appId: env.VITE_MSOS_APP_ID ?? '1:77527561910:web:4a0c65c0203d403f4f5817',
};
