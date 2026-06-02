// Second Firebase app pointed at the MSOS project (`mobile-service-os`), used
// READ-ONLY. This is a separate app instance from Content OS's primary app, with
// its own auth session, so the user signs in to MSOS with their own identity and
// reads are governed entirely by MSOS's Firestore rules. We never write.
//
// Everything is lazy-imported so this module is free to import anywhere without
// pulling Firebase into unrelated bundles/tests.
import type { FirebaseApp } from 'firebase/app';
import type { Auth, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { MSOS_WEB_CONFIG } from './msosConfig';

const APP_NAME = 'msos';

let appP: Promise<FirebaseApp> | null = null;
async function msosApp(): Promise<FirebaseApp> {
  if (!appP) {
    appP = (async () => {
      const { getApps, getApp, initializeApp } = await import('firebase/app');
      const existing = getApps().find((a) => a.name === APP_NAME);
      return existing ? getApp(APP_NAME) : initializeApp(MSOS_WEB_CONFIG, APP_NAME);
    })();
  }
  return appP;
}

export async function msosAuth(): Promise<Auth> {
  const { getAuth } = await import('firebase/auth');
  return getAuth(await msosApp());
}

export async function msosDb(): Promise<Firestore> {
  const { getFirestore } = await import('firebase/firestore');
  return getFirestore(await msosApp());
}

/** Subscribe to the MSOS auth user (separate session from Content OS). */
export async function onMsosAuth(cb: (user: User | null) => void): Promise<() => void> {
  const { onAuthStateChanged } = await import('firebase/auth');
  return onAuthStateChanged(await msosAuth(), cb);
}

/** Email + password sign-in to the MSOS project (primary, read-only use). */
export async function connectMsosEmail(email: string, password: string): Promise<User> {
  const { signInWithEmailAndPassword } = await import('firebase/auth');
  const cred = await signInWithEmailAndPassword(await msosAuth(), email.trim(), password);
  return cred.user;
}

/** OPTIONAL Google popup sign-in to the MSOS project (read-only use). */
export async function connectMsosGoogle(): Promise<User> {
  const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
  const cred = await signInWithPopup(await msosAuth(), new GoogleAuthProvider());
  return cred.user;
}

/** Sign out of the MSOS app only (does not touch the Content OS session). */
export async function disconnectMsos(): Promise<void> {
  const { signOut } = await import('firebase/auth');
  await signOut(await msosAuth());
}
