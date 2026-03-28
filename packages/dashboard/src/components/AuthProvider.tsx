'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

interface AuthUser {
  email: string;
  name: string;
  avatarUrl: string | null;
  provider: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  error: null,
  login: () => {},
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

function getInitialAuthError(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const authError = params.get('auth_error');
  if (!authError) return null;
  const messages: Record<string, string> = {
    not_allowed: 'Your account is not authorized to access this dashboard.',
    exchange_failed: 'Authentication failed. Please try again.',
    expired_session: 'Session expired. Please sign in again.',
    invalid_state: 'Invalid authentication state. Please try again.',
  };
  return messages[authError] || `Authentication error: ${authError}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(getInitialAuthError);

  useEffect(() => {
    // Clean auth_error from URL if present
    const params = new URLSearchParams(window.location.search);
    if (params.has('auth_error')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('auth_error');
      window.history.replaceState({}, '', url.pathname + url.search);
    }

    // Fetch session
    fetch('/api/auth/session')
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      })
      .catch(() => {
        // Not authenticated — that's fine
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(() => {
    const returnTo = window.location.pathname + window.location.search;
    window.location.href = `/api/auth/login?return_to=${encodeURIComponent(returnTo)}`;
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
