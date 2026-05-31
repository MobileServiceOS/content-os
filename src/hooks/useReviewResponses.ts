// Save review responses for the active tenant.
import { addDoc } from 'firebase/firestore';
import { reviewResponsesCol } from '../lib/firebase/paths';
import { withAudit } from '../lib/firebase/converters';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import type { ReviewResponseDoc } from '../types/models';

export type NewReviewResponse = Omit<
  ReviewResponseDoc,
  'id' | 'businessId' | 'createdBy' | 'createdAt' | 'updatedAt'
>;

export function useReviewResponses() {
  const { businessId } = useBusiness();
  const { user } = useAuth();

  async function save(data: NewReviewResponse): Promise<string> {
    if (!businessId || !user) throw new Error('No active business');
    const ref = await addDoc(reviewResponsesCol(businessId), withAudit(businessId, user.uid, data));
    return ref.id;
  }

  return { save };
}
