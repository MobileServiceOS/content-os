// In-app workspace bootstrap. A signed-in user with no tenant can create the
// first Wheel Rush business + their owner membership + brand settings, entirely
// client-side (the security rules permit a fresh owner to bootstrap). Replaces
// the terminal seed for the first tenant.
import { getDoc, setDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { businessDoc, memberDoc, brandSettingsDoc, userDoc } from './firebase/paths';
import { now } from './firebase/converters';
import type { BrandSettings } from '../types/models';

export const WHEEL_RUSH_BUSINESS_ID = 'wheel-rush';

export const WHEEL_RUSH_BRAND: BrandSettings = {
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
  provider: 'mock',
  imageProvider: 'mock',
};

/** Create the Wheel Rush tenant with `user` as owner. Returns the businessId. */
export async function createWheelRushWorkspace(user: User): Promise<string> {
  const uid = user.uid;
  const ts = now();
  const bid = WHEEL_RUSH_BUSINESS_ID;
  const displayName = user.displayName || user.email?.split('@')[0] || 'Owner';

  // 1. Business (rules: create allowed when ownerId == auth.uid).
  await setDoc(
    businessDoc(bid),
    { id: bid, name: WHEEL_RUSH_BRAND.businessName, ownerId: uid, businessId: bid, createdBy: uid, createdAt: ts, updatedAt: ts },
    { merge: true },
  );
  // 2. Owner membership (rules: self-write allowed when business.ownerId == uid).
  await setDoc(memberDoc(bid, uid), { userId: uid, role: 'owner', displayName, email: user.email ?? '', createdAt: ts });
  // 3. Brand settings (rules: owner write).
  await setDoc(brandSettingsDoc(bid), WHEEL_RUSH_BRAND, { merge: true });
  // 4. User -> business mapping (own user doc).
  const uRef = userDoc(uid);
  const snap = await getDoc(uRef);
  const ids: string[] = (snap.data()?.businessIds as string[] | undefined) ?? [];
  await setDoc(uRef, { uid, email: user.email ?? '', displayName: user.displayName ?? displayName, businessIds: Array.from(new Set([...ids, bid])) }, { merge: true });

  return bid;
}
