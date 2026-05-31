// CRUD + live subscription for Local SEO content (with approve/reject helpers).
import { useEffect, useState } from 'react';
import { addDoc, deleteDoc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { seoContentCol, seoContentDoc } from '../lib/firebase/paths';
import { withAudit, touch } from '../lib/firebase/converters';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import type { SeoContent } from '../types/level3';
import type { ApprovalState } from '../types/models';

export type NewSeoContent = Omit<SeoContent, 'id' | 'businessId' | 'createdBy' | 'createdAt' | 'updatedAt'>;

export function useSeoContent() {
  const { businessId } = useBusiness();
  const { user } = useAuth();
  const [items, setItems] = useState<SeoContent[]>([]);

  useEffect(() => {
    if (!businessId) {
      setItems([]);
      return;
    }
    const q = query(seoContentCol(businessId), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SeoContent, 'id'>) })));
    });
  }, [businessId]);

  async function create(data: NewSeoContent): Promise<string> {
    if (!businessId || !user) throw new Error('No active business');
    const ref = await addDoc(seoContentCol(businessId), withAudit(businessId, user.uid, data));
    return ref.id;
  }
  async function update(id: string, patch: Partial<SeoContent>): Promise<void> {
    if (!businessId) return;
    await updateDoc(seoContentDoc(businessId, id), touch(patch));
  }
  const setApproval = (id: string, approvalState: ApprovalState) => update(id, { approvalState });
  async function remove(id: string): Promise<void> {
    if (!businessId) return;
    await deleteDoc(seoContentDoc(businessId, id));
  }

  return { items, create, update, setApproval, remove };
}
