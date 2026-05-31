// Resolves the current user's active tenant (single-tenant MVP), their role, and
// live brand settings. Everything tenant-scoped reads businessId/role from here.
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { getDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { userDoc, memberDoc, brandSettingsDoc } from '../lib/firebase/paths';
import type { BrandSettings, Member, Role } from '../types/models';

interface BusinessContextValue {
  businessId: string | null;
  role: Role | null;
  member: Member | null;
  brand: BrandSettings | null;
  loading: boolean;
  /** True when the user has authenticated but belongs to no business yet. */
  noTenant: boolean;
}

const BusinessContext = createContext<BusinessContextValue | null>(null);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [brand, setBrand] = useState<BrandSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [noTenant, setNoTenant] = useState(false);

  // Resolve the active business from users/{uid}.businessIds (first one for MVP).
  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setBusinessId(null);
      setRole(null);
      setMember(null);
      setBrand(null);
      setNoTenant(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const snap = await getDoc(userDoc(user.uid));
      const ids: string[] = (snap.data()?.businessIds as string[] | undefined) ?? [];
      if (cancelled) return;
      if (ids.length === 0) {
        setNoTenant(true);
        setBusinessId(null);
        setLoading(false);
        return;
      }
      setNoTenant(false);
      setBusinessId(ids[0]);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Subscribe to the member doc (role) and brand settings once we have a tenant.
  useEffect(() => {
    if (!user || !businessId) return;
    setLoading(true);
    const unsubMember = onSnapshot(memberDoc(businessId, user.uid), (snap) => {
      const data = snap.data() as Member | undefined;
      setMember(data ?? null);
      setRole(data?.role ?? null);
      setLoading(false);
    });
    const unsubBrand = onSnapshot(brandSettingsDoc(businessId), (snap) => {
      setBrand((snap.data() as BrandSettings | undefined) ?? null);
    });
    return () => {
      unsubMember();
      unsubBrand();
    };
  }, [user, businessId]);

  return (
    <BusinessContext.Provider
      value={{ businessId, role, member, brand, loading, noTenant }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness(): BusinessContextValue {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error('useBusiness must be used within a BusinessProvider');
  return ctx;
}
