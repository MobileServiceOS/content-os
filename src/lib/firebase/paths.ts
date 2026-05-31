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
