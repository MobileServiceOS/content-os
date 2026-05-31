// App chrome: nav + routed content. Surfaces the "no tenant" state with a
// one-click workspace bootstrap for the first owner.
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Nav from './Nav';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import { createWheelRushWorkspace } from '../lib/onboarding';

export default function Layout() {
  const { loading, noTenant } = useBusiness();
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  async function createWorkspace() {
    if (!user) return;
    setCreating(true);
    setError('');
    try {
      await createWheelRushWorkspace(user);
      // Re-resolve the tenant: simplest is a reload (BusinessContext reads on mount).
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the workspace.');
      setCreating(false);
    }
  }

  return (
    <div className="app-shell">
      <Nav />
      <main className="app-main">
        {loading ? (
          <div className="center muted">Loading workspace…</div>
        ) : noTenant ? (
          <div className="card stack" style={{ maxWidth: 480, margin: '40px auto', textAlign: 'center' }}>
            <h2 style={{ margin: 0 }}>Welcome to Content OS</h2>
            <p className="muted" style={{ margin: 0 }}>
              You’re signed in, but no workspace exists yet. Create the Wheel Rush workspace to get
              started — you’ll be the owner, with brand settings pre-loaded.
            </p>
            <button className="btn btn-primary btn-block" onClick={() => void createWorkspace()} disabled={creating}>
              {creating ? 'Creating…' : 'Create Wheel Rush workspace'}
            </button>
            {error && <p className="error">{error}</p>}
            <p className="muted" style={{ fontSize: '0.74rem', margin: 0 }}>
              Already a team member? Ask an owner to invite you instead.
            </p>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}
