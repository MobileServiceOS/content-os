/**
 * Seed the first tenant: Wheel Rush Mobile Tire Repair.
 *
 * Prereqs:
 *   1. Fill in .env with your Firebase config (VITE_FIREBASE_*).
 *   2. Sign up the owner account in the app first (so the email/password exists).
 *   3. Run:  OWNER_EMAIL=you@example.com OWNER_PASSWORD=secret npm run seed
 *
 * The script signs in as the owner, then writes the business, the owner's member
 * doc, brand settings, and the user→business mapping — in the order the security
 * rules permit a fresh owner to bootstrap.
 */
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
} from 'firebase/firestore';

// --- Load .env (tsx does not auto-load it) -------------------------------------
function loadEnv(): Record<string, string> {
  const out: Record<string, string> = { ...process.env } as Record<string, string>;
  try {
    const raw = readFileSync(new URL('../.env', import.meta.url), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    /* no .env file — rely on process.env */
  }
  return out;
}

const env = loadEnv();

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

const OWNER_EMAIL = env.OWNER_EMAIL;
const OWNER_PASSWORD = env.OWNER_PASSWORD;
const BUSINESS_ID = env.BUSINESS_ID || 'wheel-rush';

const WHEEL_RUSH_BRAND = {
  businessName: 'Wheel Rush Mobile Tire Repair',
  website: 'wheelrush.net',
  phone: '305-897-7030',
  serviceAreas: ['Miami-Dade', 'Broward'],
  services: [
    'Mobile tire repair',
    'Mobile tire replacement',
    'Flat tire repair',
    'Blowout replacement',
    'Tire plug',
    'Tire patch',
    'Valve stem replacement',
    'Wheel lock removal',
    'Mount and balance',
  ],
  notOffered: ['Rim repair', 'Wheel repair'],
  socialHandles: ['@wheelrushllc'],
  ctas: [
    'Book now at wheelrush.net',
    'Call or text 305-897-7030',
    'We come to you — anywhere in Miami-Dade & Broward',
  ],
  localKeywords: [
    'mobile tire repair Miami',
    'roadside tire change Broward',
    'flat tire near me',
    'emergency tire replacement Miami-Dade',
  ],
  bannedPhrases: [],
  requiredPhrases: [],
  brandTone: 'Helpful, fast, down-to-earth. Real scenarios, no hype, no keyword stuffing.',
};

async function main() {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error('Missing Firebase config. Fill in .env first.');
  }
  if (!OWNER_EMAIL || !OWNER_PASSWORD) {
    throw new Error('Set OWNER_EMAIL and OWNER_PASSWORD (the owner must already be signed up).');
  }

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  const cred = await signInWithEmailAndPassword(auth, OWNER_EMAIL, OWNER_PASSWORD);
  const uid = cred.user.uid;
  const ts = Date.now();
  console.log(`Signed in as ${OWNER_EMAIL} (uid ${uid}). Seeding business "${BUSINESS_ID}"…`);

  // 1. Business doc (rules: create allowed when ownerId == auth.uid).
  await setDoc(
    doc(db, 'businesses', BUSINESS_ID),
    {
      id: BUSINESS_ID,
      name: WHEEL_RUSH_BRAND.businessName,
      ownerId: uid,
      businessId: BUSINESS_ID,
      createdBy: uid,
      createdAt: ts,
      updatedAt: ts,
    },
    { merge: true },
  );

  // 2. Owner membership (rules: bootstrap clause permits self-write when ownerId == uid).
  await setDoc(doc(db, 'businesses', BUSINESS_ID, 'members', uid), {
    userId: uid,
    role: 'owner',
    displayName: cred.user.displayName || OWNER_EMAIL.split('@')[0],
    email: OWNER_EMAIL,
    createdAt: ts,
  });

  // 3. Brand settings (rules: owner write).
  await setDoc(doc(db, 'businesses', BUSINESS_ID, 'brandSettings', 'main'), WHEEL_RUSH_BRAND, {
    merge: true,
  });

  // 4. User → business mapping (rules: own user doc).
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  const existingIds: string[] = (userSnap.data()?.businessIds as string[] | undefined) ?? [];
  const businessIds = Array.from(new Set([...existingIds, BUSINESS_ID]));
  await setDoc(
    userRef,
    {
      uid,
      email: OWNER_EMAIL,
      displayName: cred.user.displayName || OWNER_EMAIL.split('@')[0],
      businessIds,
    },
    { merge: true },
  );

  console.log('✅ Seed complete. Reload the app — you are now the owner of Wheel Rush.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Seed failed:', err.message || err);
  process.exit(1);
});
