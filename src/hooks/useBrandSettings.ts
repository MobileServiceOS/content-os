// Read/update brand settings for the active tenant.
import { setDoc } from 'firebase/firestore';
import { useBusiness } from '../context/BusinessContext';
import { brandSettingsDoc } from '../lib/firebase/paths';
import type { BrandSettings } from '../types/models';

export function useBrandSettings() {
  const { businessId, brand } = useBusiness();

  async function save(next: BrandSettings): Promise<void> {
    if (!businessId) throw new Error('No active business');
    await setDoc(brandSettingsDoc(businessId), next, { merge: true });
  }

  return { brand, save };
}
