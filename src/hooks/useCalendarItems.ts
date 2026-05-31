// CRUD + live subscription for the tenant's content calendar.
import { useEffect, useState } from 'react';
import { addDoc, deleteDoc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { calendarItemsCol, calendarItemDoc } from '../lib/firebase/paths';
import { withAudit, touch } from '../lib/firebase/converters';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import type { CalendarItem, ContentStatus } from '../types/models';

export type NewCalendarItem = Omit<
  CalendarItem,
  'id' | 'businessId' | 'createdBy' | 'createdAt' | 'updatedAt'
>;

export function useCalendarItems() {
  const { businessId } = useBusiness();
  const { user } = useAuth();
  const [items, setItems] = useState<CalendarItem[]>([]);

  useEffect(() => {
    if (!businessId) {
      setItems([]);
      return;
    }
    const q = query(calendarItemsCol(businessId), orderBy('scheduledAt', 'asc'));
    return onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CalendarItem, 'id'>) })));
    });
  }, [businessId]);

  async function create(data: NewCalendarItem): Promise<string> {
    if (!businessId || !user) throw new Error('No active business');
    const ref = await addDoc(calendarItemsCol(businessId), withAudit(businessId, user.uid, data));
    return ref.id;
  }

  async function update(id: string, patch: Partial<CalendarItem>): Promise<void> {
    if (!businessId) return;
    await updateDoc(calendarItemDoc(businessId, id), touch(patch));
  }

  async function remove(id: string): Promise<void> {
    if (!businessId) return;
    await deleteDoc(calendarItemDoc(businessId, id));
  }

  const reschedule = (id: string, scheduledAt: number) => update(id, { scheduledAt });
  const setStatus = (id: string, status: ContentStatus) => update(id, { status });

  return { items, create, update, remove, reschedule, setStatus };
}
