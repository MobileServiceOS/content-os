// Client transport for the Wave 3 publish callables. Firebase is lazy-imported.
// Publishing is gated server-side (PUBLISH_ENABLED) until TikTok/GBP grant write
// access; until then these resolve to a `gated` result the UI shows honestly.
async function callable<A, R>(name: string, arg: A): Promise<R> {
  const [{ httpsCallable }, { functions }] = await Promise.all([
    import('firebase/functions'),
    import('../firebase/client'),
  ]);
  const fn = httpsCallable<A, R>(functions, name);
  return (await fn(arg)).data;
}

export interface PublishOutcome {
  ok: boolean;
  /** true when the server returned the "awaiting platform approval" gate. */
  gated: boolean;
  id?: string;
  message?: string;
}

function toOutcome(err: unknown): PublishOutcome {
  const e = err as { code?: string; message?: string };
  const gated = (e?.code ?? '').includes('failed-precondition');
  return { ok: false, gated, message: e?.message ?? 'Publish failed.' };
}

/** Publish a Google Business Profile post. Returns a gated outcome until approved. */
export async function publishGbpPost(businessId: string, summary: string, opts?: { ctaUrl?: string; mediaUrl?: string }): Promise<PublishOutcome> {
  try {
    const r = await callable<{ businessId: string; summary: string; ctaUrl?: string; mediaUrl?: string }, { name: string }>(
      'gbpPublish', { businessId, summary, ctaUrl: opts?.ctaUrl, mediaUrl: opts?.mediaUrl },
    );
    return { ok: true, gated: false, id: r.name };
  } catch (err) {
    return toOutcome(err);
  }
}

/** Publish a video to a social platform (TikTok). Returns a gated outcome until approved. */
export async function publishSocialVideo(businessId: string, platform: string, caption: string, videoUrl: string, privacy?: string): Promise<PublishOutcome> {
  try {
    const r = await callable<{ businessId: string; platform: string; caption: string; videoUrl: string; privacy?: string }, { id: string; status: string }>(
      'socialPublish', { businessId, platform, caption, videoUrl, privacy },
    );
    return { ok: true, gated: false, id: r.id, message: r.status };
  } catch (err) {
    return toOutcome(err);
  }
}
