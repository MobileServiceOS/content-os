// CRUD + live subscription for agent-created tasks.
import { useEffect, useState } from 'react';
import { addDoc, deleteDoc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { tasksCol, taskDoc } from '../lib/firebase/paths';
import { withAudit, touch } from '../lib/firebase/converters';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import type { TaskItem, TaskStatus } from '../types/level3';

export type NewTask = Omit<TaskItem, 'id' | 'businessId' | 'createdBy' | 'createdAt' | 'updatedAt'>;

export function useTasks() {
  const { businessId } = useBusiness();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskItem[]>([]);

  useEffect(() => {
    if (!businessId) {
      setTasks([]);
      return;
    }
    const q = query(tasksCol(businessId), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setTasks(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TaskItem, 'id'>) })));
    });
  }, [businessId]);

  async function create(data: NewTask): Promise<string> {
    if (!businessId || !user) throw new Error('No active business');
    const ref = await addDoc(tasksCol(businessId), withAudit(businessId, user.uid, data));
    return ref.id;
  }
  async function update(id: string, patch: Partial<TaskItem>): Promise<void> {
    if (!businessId) return;
    await updateDoc(taskDoc(businessId, id), touch(patch));
  }
  const setStatus = (id: string, status: TaskStatus) => update(id, { status });
  async function remove(id: string): Promise<void> {
    if (!businessId) return;
    await deleteDoc(taskDoc(businessId, id));
  }

  return { tasks, create, update, setStatus, remove };
}
