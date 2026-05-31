// Save social replies for the active tenant.
import { addDoc } from 'firebase/firestore';
import { socialRepliesCol } from '../lib/firebase/paths';
import { withAudit } from '../lib/firebase/converters';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import type { SocialReplyDoc } from '../types/models';

export type NewSocialReply = Omit<
  SocialReplyDoc,
  'id' | 'businessId' | 'createdBy' | 'createdAt' | 'updatedAt'
>;

export function useSocialReplies() {
  const { businessId } = useBusiness();
  const { user } = useAuth();

  async function save(data: NewSocialReply): Promise<string> {
    if (!businessId || !user) throw new Error('No active business');
    const ref = await addDoc(socialRepliesCol(businessId), withAudit(businessId, user.uid, data));
    return ref.id;
  }

  return { save };
}
