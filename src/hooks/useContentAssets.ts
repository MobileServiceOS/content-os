// CRUD + live subscription for Master Content Assets.
import { useEffect, useState } from 'react';
import { addDoc, deleteDoc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { contentAssetsCol, contentAssetDoc } from '../lib/firebase/paths';
import { withAudit, touch } from '../lib/firebase/converters';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import type { MasterContentAsset } from '../types/level3';

export type NewAsset = Omit<MasterContentAsset, 'id' | 'businessId' | 'createdBy' | 'createdAt' | 'updatedAt'>;

export function useContentAssets() {
  const { businessId } = useBusiness();
  const { user } = useAuth();
  const [assets, setAssets] = useState<MasterContentAsset[]>([]);

  useEffect(() => {
    if (!businessId) {
      setAssets([]);
      return;
    }
    const q = query(contentAssetsCol(businessId), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setAssets(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MasterContentAsset, 'id'>) })));
    });
  }, [businessId]);

  async function create(data: NewAsset): Promise<string> {
    if (!businessId || !user) throw new Error('No active business');
    const ref = await addDoc(contentAssetsCol(businessId), withAudit(businessId, user.uid, data));
    return ref.id;
  }
  async function update(id: string, patch: Partial<MasterContentAsset>): Promise<void> {
    if (!businessId) return;
    await updateDoc(contentAssetDoc(businessId, id), touch(patch));
  }
  async function remove(id: string): Promise<void> {
    if (!businessId) return;
    await deleteDoc(contentAssetDoc(businessId, id));
  }

  return { assets, create, update, remove };
}
