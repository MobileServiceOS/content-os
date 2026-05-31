// Centralized role → permission logic. Mirrored by firestore.rules on the server.
import type { Role } from '../types/models';

export type Action =
  | 'content.create'
  | 'content.edit'
  | 'content.delete'
  | 'content.read'
  | 'calendar.edit'
  | 'brand.edit'
  | 'members.manage';

const MATRIX: Record<Action, Role[]> = {
  'content.read': ['owner', 'manager', 'viewer'],
  'content.create': ['owner', 'manager'],
  'content.edit': ['owner', 'manager'],
  'content.delete': ['owner'], // managers may delete their own drafts; checked separately in rules
  'calendar.edit': ['owner', 'manager'],
  'brand.edit': ['owner'],
  'members.manage': ['owner'],
};

export function can(action: Action, role: Role | null): boolean {
  if (!role) return false;
  return MATRIX[action].includes(role);
}

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  manager: 'Content Manager',
  viewer: 'Viewer',
};
