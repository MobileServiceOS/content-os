// Content OS serverless backend. The `generate` callable verifies the caller's
// Firebase Auth + tenant membership, then calls Claude with the brand-aware prompt.
// The Anthropic key lives only here (Functions secret) — never in the browser.
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { buildPrompt } from './prompts';
import { callClaude } from './anthropic';
import type { GenerateData, GenKind } from './types';

initializeApp();

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');

const KINDS: GenKind[] = ['content', 'script', 'review', 'social', 'repurpose'];

export const generate = onCall({ secrets: [ANTHROPIC_API_KEY] }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');

  const data = request.data as GenerateData;
  if (!data?.businessId || !KINDS.includes(data.kind) || !data.brand) {
    throw new HttpsError('invalid-argument', 'businessId, a valid kind, and brand are required.');
  }

  // Tenant isolation + role check (owner/manager may generate).
  const memberSnap = await getFirestore()
    .doc(`businesses/${data.businessId}/members/${uid}`)
    .get();
  const role = memberSnap.data()?.role as string | undefined;
  if (!memberSnap.exists || (role !== 'owner' && role !== 'manager')) {
    throw new HttpsError('permission-denied', 'You are not allowed to generate for this business.');
  }

  const prompt = buildPrompt(data.kind, data.payload ?? {}, data.brand, data.avoid ?? []);
  try {
    const { json, usage } = await callClaude(ANTHROPIC_API_KEY.value(), prompt);
    return { result: json, usage };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed.';
    throw new HttpsError('internal', message);
  }
});
