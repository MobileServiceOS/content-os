// CRUD + live subscription for the tenant's content library.
import { useEffect, useState } from 'react';
import { addDoc, deleteDoc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { contentItemsCol, contentItemDoc } from '../lib/firebase/paths';
import { withAudit, touch } from '../lib/firebase/converters';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import type { ContentItem, ContentStatus } from '../types/models';

export type NewContentItem = Omit<
  ContentItem,
  'id' | 'businessId' | 'createdBy' | 'createdAt' | 'updatedAt' | 'archived'
>;

export function useContentItems() {
  const { businessId } = useBusiness();
  const { user } = useAuth();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId) {
      setItems([]);
      setLoading(false);
      return;
    }
    const q = query(contentItemsCol(businessId), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ContentItem, 'id'>) })));
      setLoading(false);
    });
  }, [businessId]);

  async function create(data: NewContentItem): Promise<string> {
    if (!businessId || !user) throw new Error('No active business');
    const ref = await addDoc(
      contentItemsCol(businessId),
      withAudit(businessId, user.uid, { ...data, archived: false }),
    );
    return ref.id;
  }

  async function update(id: string, patch: Partial<ContentItem>): Promise<void> {
    if (!businessId) return;
    await updateDoc(contentItemDoc(businessId, id), touch(patch));
  }

  async function remove(id: string): Promise<void> {
    if (!businessId) return;
    await deleteDoc(contentItemDoc(businessId, id));
  }

  async function duplicate(item: ContentItem): Promise<string> {
    return create({
      title: `${item.title} (copy)`,
      content: item.content,
      platform: item.platform,
      city: item.city,
      service: item.service,
      status: 'draft',
      tags: item.tags,
      notes: item.notes,
    });
  }

  async function setStatus(id: string, status: ContentStatus): Promise<void> {
    return update(id, { status });
  }

  async function archive(id: string, archived = true): Promise<void> {
    return update(id, { archived });
  }

  return { items, loading, create, update, remove, duplicate, setStatus, archive };
}
