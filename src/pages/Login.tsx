// Email/password login + signup. Mobile-first single-column card.
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { firebaseConfigured } from '../lib/firebase/client';

export default function Login() {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'signup') {
        await signup(email, password, displayName || email.split('@')[0]);
      } else {
        await login(email, password);
      }
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center">
      <div className="card stack" style={{ width: '100%', maxWidth: 380 }}>
        <div>
          <h1>Content OS</h1>
          <p className="muted">AI content, reputation & social — for service businesses.</p>
        </div>

        {!firebaseConfigured && (
          <p className="error">
            Firebase is not configured. Add your config to <code>.env</code> (see SETUP.md).
          </p>
        )}

        <form className="stack" onSubmit={onSubmit}>
          {mode === 'signup' && (
            <label className="field">
              <span>Name</span>
              <input
                className="input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
              />
            </label>
          )}
          <label className="field">
            <span>Email</span>
            <input
              className="input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              className="input"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          </label>

          {error && <p className="error">{error}</p>}

          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <button
          className="btn btn-block"
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            setError('');
          }}
        >
          {mode === 'login' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
        </button>

        <p className="muted" style={{ textAlign: 'center', fontSize: '0.74rem', margin: 0 }}>
          <a href={`${import.meta.env.BASE_URL}terms.html`}>Terms of Service</a>
          {' · '}
          <a href={`${import.meta.env.BASE_URL}privacy.html`}>Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
