// App chrome: nav + routed content. Surfaces the "no tenant" state for users who
// have signed up but are not yet a member of any business.
import { Outlet } from 'react-router-dom';
import Nav from './Nav';
import { useBusiness } from '../context/BusinessContext';

export default function Layout() {
  const { loading, noTenant } = useBusiness();

  return (
    <div className="app-shell">
      <Nav />
      <main className="app-main">
        {loading ? (
          <div className="center muted">Loading workspace…</div>
        ) : noTenant ? (
          <div className="card empty">
            <h2>No workspace yet</h2>
            <p className="muted">
              Your account isn’t linked to a business yet. Ask an owner to invite you, or
              run the Wheel Rush seed (see SETUP.md) to create the first tenant.
            </p>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}
