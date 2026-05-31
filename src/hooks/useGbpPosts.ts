// CRUD + live subscription for GBP posts (with approve/reject helpers).
import { useEffect, useState } from 'react';
import { addDoc, deleteDoc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { gbpPostsCol, gbpPostDoc } from '../lib/firebase/paths';
import { withAudit, touch } from '../lib/firebase/converters';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import type { GbpPost } from '../types/level3';
import type { ApprovalState } from '../types/models';

export type NewGbpPost = Omit<GbpPost, 'id' | 'businessId' | 'createdBy' | 'createdAt' | 'updatedAt'>;

export function useGbpPosts() {
  const { businessId } = useBusiness();
  const { user } = useAuth();
  const [posts, setPosts] = useState<GbpPost[]>([]);

  useEffect(() => {
    if (!businessId) {
      setPosts([]);
      return;
    }
    const q = query(gbpPostsCol(businessId), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setPosts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<GbpPost, 'id'>) })));
    });
  }, [businessId]);

  async function create(data: NewGbpPost): Promise<string> {
    if (!businessId || !user) throw new Error('No active business');
    const ref = await addDoc(gbpPostsCol(businessId), withAudit(businessId, user.uid, data));
    return ref.id;
  }
  async function update(id: string, patch: Partial<GbpPost>): Promise<void> {
    if (!businessId) return;
    await updateDoc(gbpPostDoc(businessId, id), touch(patch));
  }
  const setApproval = (id: string, approvalState: ApprovalState) => update(id, { approvalState });
  async function remove(id: string): Promise<void> {
    if (!businessId) return;
    await deleteDoc(gbpPostDoc(businessId, id));
  }

  return { posts, create, update, setApproval, remove };
}
