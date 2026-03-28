'use client';

import type { ReactNode } from 'react';
import { useAuth } from './AuthProvider';
import { AuthGate, AuthLoading } from './AuthGate';

/** Wraps page content with auth check. Shows AuthGate inline if not authenticated. */
export function ProtectedPage({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <AuthLoading />;
  if (!user) return <AuthGate />;

  return <>{children}</>;
}
