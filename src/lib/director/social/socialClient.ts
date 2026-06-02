// Client transport for the generic social callables (platform-parameterized).
// Firebase lazy-imported; the browser only triggers OAuth + sync/disconnect.
async function callable<A, R>(name: string, arg: A): Promise<R> {
  const [{ httpsCallable }, { functions }] = await Promise.all([
    import('firebase/functions'),
    import('../../firebase/client'),
  ]);
  const fn = httpsCallable<A, R>(functions, name);
  return (await fn(arg)).data;
}

export async function socialStartConnect(businessId: string, platform: string): Promise<void> {
  const { url } = await callable<{ businessId: string; platform: string }, { url: string }>('socialAuthUrl', { businessId, platform });
  window.location.href = url;
}
export async function socialSync(businessId: string, platform: string): Promise<{ videos: number }> {
  return callable('socialSync', { businessId, platform });
}
export async function socialDisconnect(businessId: string, platform: string): Promise<{ ok: boolean }> {
  return callable('socialDisconnect', { businessId, platform });
}
