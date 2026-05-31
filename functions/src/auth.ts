// Shared auth + tenant-membership guard for callables.
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

/** Throws unless the caller is a signed-in owner/manager of the business. */
export async function assertMember(request: CallableRequest, businessId: string): Promise<string> {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');
  const snap = await getFirestore().doc(`businesses/${businessId}/members/${uid}`).get();
  const role = snap.data()?.role as string | undefined;
  if (!snap.exists || (role !== 'owner' && role !== 'manager')) {
    throw new HttpsError('permission-denied', 'You are not allowed to generate for this business.');
  }
  return uid;
}
