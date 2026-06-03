// Tenant-scoped Firestore path/reference helpers. Every collection lives under
// businesses/{businessId}/... so a single membership check governs all access.
import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
} from 'firebase/firestore';
import { db } from './client';

export const userDoc = (uid: string): DocumentReference =>
  doc(db, 'users', uid);

export const businessDoc = (businessId: string): DocumentReference =>
  doc(db, 'businesses', businessId);

export const membersCol = (businessId: string): CollectionReference =>
  collection(db, 'businesses', businessId, 'members');

export const memberDoc = (businessId: string, uid: string): DocumentReference =>
  doc(db, 'businesses', businessId, 'members', uid);

export const brandSettingsDoc = (businessId: string): DocumentReference =>
  doc(db, 'businesses', businessId, 'brandSettings', 'main');

export const contentItemsCol = (businessId: string): CollectionReference =>
  collection(db, 'businesses', businessId, 'contentItems');

export const contentItemDoc = (businessId: string, id: string): DocumentReference =>
  doc(db, 'businesses', businessId, 'contentItems', id);

export const calendarItemsCol = (businessId: string): CollectionReference =>
  collection(db, 'businesses', businessId, 'calendarItems');

export const calendarItemDoc = (businessId: string, id: string): DocumentReference =>
  doc(db, 'businesses', businessId, 'calendarItems', id);

export const reviewResponsesCol = (businessId: string): CollectionReference =>
  collection(db, 'businesses', businessId, 'reviewResponses');

export const socialRepliesCol = (businessId: string): CollectionReference =>
  collection(db, 'businesses', businessId, 'socialReplies');

export const generationHistoryCol = (businessId: string): CollectionReference =>
  collection(db, 'businesses', businessId, 'generationHistory');

export const generationCostsCol = (businessId: string): CollectionReference =>
  collection(db, 'businesses', businessId, 'generationCosts');

export const mediaItemsCol = (businessId: string): CollectionReference =>
  collection(db, 'businesses', businessId, 'mediaItems');

export const mediaItemDoc = (businessId: string, id: string): DocumentReference =>
  doc(db, 'businesses', businessId, 'mediaItems', id);

/** Storage path for a tenant's media asset. */
export const mediaStoragePath = (businessId: string, fileName: string): string =>
  `businesses/${businessId}/media/${fileName}`;

// --- Level 3 collections ---
export const contentAssetsCol = (businessId: string): CollectionReference =>
  collection(db, 'businesses', businessId, 'contentAssets');
export const contentAssetDoc = (businessId: string, id: string): DocumentReference =>
  doc(db, 'businesses', businessId, 'contentAssets', id);

export const gbpPostsCol = (businessId: string): CollectionReference =>
  collection(db, 'businesses', businessId, 'gbpPosts');
export const gbpPostDoc = (businessId: string, id: string): DocumentReference =>
  doc(db, 'businesses', businessId, 'gbpPosts', id);

export const seoContentCol = (businessId: string): CollectionReference =>
  collection(db, 'businesses', businessId, 'seoContent');
export const seoContentDoc = (businessId: string, id: string): DocumentReference =>
  doc(db, 'businesses', businessId, 'seoContent', id);

export const tasksCol = (businessId: string): CollectionReference =>
  collection(db, 'businesses', businessId, 'tasks');
export const taskDoc = (businessId: string, id: string): DocumentReference =>
  doc(db, 'businesses', businessId, 'tasks', id);

export const agentLogsCol = (businessId: string): CollectionReference =>
  collection(db, 'businesses', businessId, 'agentLogs');

// Cockpit snapshot — the daily Home summary the client persists so the Monday
// digest function can email it server-side (the server can't read MSOS directly).
export const cockpitSnapshotDoc = (businessId: string): DocumentReference =>
  doc(db, 'businesses', businessId, 'cockpit', 'latest');

// --- Analytics (post-publication performance) ---
export const postPerformanceCol = (businessId: string): CollectionReference =>
  collection(db, 'businesses', businessId, 'postPerformance');
export const postPerformanceDoc = (businessId: string, id: string): DocumentReference =>
  doc(db, 'businesses', businessId, 'postPerformance', id);
export const performanceSnapshotsCol = (
  businessId: string,
  postId: string,
): CollectionReference =>
  collection(db, 'businesses', businessId, 'postPerformance', postId, 'snapshots');
