// Firebase Auth state + actions. On signup, creates the top-level users/{uid} doc
// that maps a user to their business tenants.
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { getDoc, setDoc } from 'firebase/firestore';
import { auth } from '../lib/firebase/client';
import { userDoc } from '../lib/firebase/paths';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async login(email, password) {
        await signInWithEmailAndPassword(auth, email, password);
      },
      async signup(email, password, displayName) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName });
        // Create the users/{uid} mapping doc if it does not exist yet.
        const ref = userDoc(cred.user.uid);
        const existing = await getDoc(ref);
        if (!existing.exists()) {
          await setDoc(ref, {
            uid: cred.user.uid,
            email,
            displayName,
            businessIds: [],
          });
        }
      },
      async logout() {
        await signOut(auth);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
