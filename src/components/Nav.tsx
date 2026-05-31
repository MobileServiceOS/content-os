// Primary navigation. Generator links are hidden from viewers (read-only role).
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBusiness } from '../context/BusinessContext';
import { can } from '../lib/permissions';

interface Item {
  to: string;
  label: string;
  creatorsOnly?: boolean;
}

const ITEMS: Item[] = [
  { to: '/', label: 'Home' },
  { to: '/generator', label: 'Generator', creatorsOnly: true },
  { to: '/script', label: 'Script', creatorsOnly: true },
  { to: '/review', label: 'Review', creatorsOnly: true },
  { to: '/social', label: 'Social', creatorsOnly: true },
  { to: '/repurpose', label: 'Repurpose', creatorsOnly: true },
  { to: '/library', label: 'Library' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/brand', label: 'Brand' },
];

export default function Nav() {
  const { role } = useBusiness();
  const { logout, user } = useAuth();
  const canCreate = can('content.create', role);

  return (
    <>
      <div className="nav-top">
        <strong>Content OS</strong>
        <div className="row">
          <span className="muted" style={{ fontSize: '0.82rem' }}>
            {user?.displayName || user?.email}
          </span>
          <button className="btn btn-sm" onClick={() => void logout()}>
            Sign out
          </button>
        </div>
      </div>
      <nav className="nav">
        {ITEMS.filter((i) => !i.creatorsOnly || canCreate).map((i) => (
          <NavLink
            key={i.to}
            to={i.to}
            end={i.to === '/'}
            className={({ isActive }) => (isActive ? 'active' : undefined)}
          >
            {i.label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
