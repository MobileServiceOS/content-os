// Client transport for the Search Console callables. Firebase is lazy-imported
// so importing this never initializes it. The browser only triggers the OAuth
// redirect + sync/disconnect; it never sees the client secret or the token.

async function callable<A, R>(name: string, arg: A): Promise<R> {
  const [{ httpsCallable }, { functions }] = await Promise.all([
    import('firebase/functions'),
    import('../firebase/client'),
  ]);
  const fn = httpsCallable<A, R>(functions, name);
  return (await fn(arg)).data;
}

/** Start OAuth: fetch the consent URL and redirect the browser to Google. */
export async function scStartConnect(businessId: string): Promise<void> {
  const { url } = await callable<{ businessId: string }, { url: string }>('scAuthUrl', { businessId });
  window.location.href = url;
}

export async function scSync(businessId: string): Promise<{ siteUrl: string; queries: number; pages: number }> {
  return callable('scSync', { businessId });
}

export async function scDisconnect(businessId: string): Promise<{ ok: boolean }> {
  return callable('scDisconnect', { businessId });
}
