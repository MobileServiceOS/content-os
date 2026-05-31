// Conditionally renders children based on the current user's role + an action.
import type { ReactNode } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { can, type Action } from '../lib/permissions';

export default function RoleGate({
  action,
  children,
  fallback = null,
}: {
  action: Action;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { role } = useBusiness();
  return <>{can(action, role) ? children : fallback}</>;
}
