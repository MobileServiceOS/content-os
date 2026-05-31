// Live list of members for the active tenant.
import { useEffect, useState } from 'react';
import { onSnapshot, query, orderBy } from 'firebase/firestore';
import { useBusiness } from '../context/BusinessContext';
import { membersCol } from '../lib/firebase/paths';
import type { Member } from '../types/models';

export function useMembers() {
  const { businessId } = useBusiness();
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    if (!businessId) {
      setMembers([]);
      return;
    }
    const q = query(membersCol(businessId), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snap) => {
      setMembers(snap.docs.map((d) => d.data() as Member));
    });
  }, [businessId]);

  return { members };
}
