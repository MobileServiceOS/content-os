// Navigation. Desktop: a left sidebar with grouped links. Mobile: a top brand
// bar + a scrollable bottom link bar (the sidebar flattens via CSS). Generator
// links are hidden from viewers. Wave 0 subtraction: Fingerprints (dev tool) and
// Engage (thin duplicate of Social) are removed from the nav; their routes and
// pages remain reachable by direct URL — see App.tsx.
import { Fragment } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBusiness } from '../context/BusinessContext';
import { can } from '../lib/permissions';

interface Item {
  to: string;
  label: string;
  icon: string;
  creatorsOnly?: boolean;
  ownerOnly?: boolean;
  group?: string;
}

const ITEMS: Item[] = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/director', label: 'Marketing Director', icon: '🧭', group: 'Director' },
  { to: '/new-job', label: 'New Job', icon: '⚡', creatorsOnly: true, group: 'Create' },
  { to: '/review', label: 'Review', icon: '⭐', creatorsOnly: true, group: 'Create' },
  { to: '/social', label: 'Social', icon: '💬', creatorsOnly: true, group: 'Create' },
  { to: '/tasks', label: 'Tasks', icon: '☑️', group: 'Manage' },
  { to: '/pipeline', label: 'Content Pipeline', icon: '🗂️', group: 'Manage' },
  { to: '/brand', label: 'Brand', icon: '🎨', group: 'Settings' },
];

export default function Nav() {
  const { role } = useBusiness();
  const { logout, user } = useAuth();
  const canCreate = can('content.create', role);
  const isOwner = role === 'owner';
  const visible = ITEMS.filter((i) => (!i.creatorsOnly || canCreate) && (!i.ownerOnly || isOwner));

  let lastGroup: string | undefined;

  return (
    <aside className="sidebar">
      <div className="side-head">
        <span className="wordmark"><span className="spark">✦</span>Content OS</span>
        <div className="side-user">
          <span className="muted side-username">{user?.displayName || user?.email}</span>
          <button className="btn btn-sm" onClick={() => void logout()}>Sign out</button>
        </div>
      </div>
      <nav className="side-links">
        {visible.map((i) => {
          const header = i.group && i.group !== lastGroup ? i.group : null;
          lastGroup = i.group;
          return (
            <Fragment key={i.to}>
              {header && <div className="nav-group">{header}</div>}
              <NavLink to={i.to} end={i.to === '/'} className={({ isActive }) => (isActive ? 'active' : undefined)}>
                <span className="nico">{i.icon}</span>
                {i.label}
              </NavLink>
            </Fragment>
          );
        })}
      </nav>
    </aside>
  );
}
