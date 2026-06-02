// Client transport for the GBP callables. Firebase is lazy-imported. The browser
// only triggers the OAuth redirect + sync/disconnect; it never sees the secret
// or token. Mirrors searchConsoleClient.
async function callable<A, R>(name: string, arg: A): Promise<R> {
  const [{ httpsCallable }, { functions }] = await Promise.all([
    import('firebase/functions'),
    import('../firebase/client'),
  ]);
  const fn = httpsCallable<A, R>(functions, name);
  return (await fn(arg)).data;
}

export async function gbpStartConnect(businessId: string): Promise<void> {
  const { url } = await callable<{ businessId: string }, { url: string }>('gbpAuthUrl', { businessId });
  window.location.href = url;
}
export async function gbpSync(businessId: string): Promise<{ location: string; calls: number }> {
  return callable('gbpSync', { businessId });
}
export async function gbpDisconnect(businessId: string): Promise<{ ok: boolean }> {
  return callable('gbpDisconnect', { businessId });
}
