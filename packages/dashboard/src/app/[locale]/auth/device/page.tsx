'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { AuthGate, AuthLoading } from '@/components/AuthGate';

type Status = 'loading' | 'confirm' | 'authorizing' | 'success' | 'error' | 'expired';

export default function DeviceAuthorizePage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <DeviceAuthorizeContent />
    </Suspense>
  );
}

function DeviceAuthorizeContent() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');

  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (authLoading || !user || !code) return;

    // Verify the challenge is valid
    fetch(`/api/auth/device/authorize?code=${encodeURIComponent(code)}`)
      .then(async (res) => {
        if (res.ok) {
          setStatus('confirm');
        } else if (res.status === 410) {
          setStatus('expired');
        } else {
          setStatus('error');
          const body = await res.json().catch(() => ({}));
          setErrorMessage(body.error || 'Failed to verify challenge');
        }
      })
      .catch(() => {
        setStatus('error');
        setErrorMessage('Network error');
      });
  }, [authLoading, user, code]);

  // Auth loading
  if (authLoading) return <AuthLoading />;

  // Not authenticated — show login gate (will return here after login)
  if (!user) return <AuthGate />;

  // No code in URL
  if (!code) {
    return (
      <PageWrapper>
        <StatusCard
          icon="⚠"
          title="Missing Code"
          description="No device challenge code provided. Please use the link from your CLI."
        />
      </PageWrapper>
    );
  }

  const handleAuthorize = async () => {
    setStatus('authorizing');
    try {
      const res = await fetch('/api/auth/device/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      if (res.ok) {
        setStatus('success');
      } else {
        setStatus('error');
        const body = await res.json().catch(() => ({}));
        setErrorMessage(body.error || 'Authorization failed');
      }
    } catch {
      setStatus('error');
      setErrorMessage('Network error');
    }
  };

  return (
    <PageWrapper>
      {status === 'loading' && <AuthLoading />}

      {status === 'confirm' && (
        <div className="bg-[#18181b] rounded-xl border border-zinc-800 p-8 max-w-sm w-full text-center space-y-6">
          <div className="space-y-2">
            <div className="text-2xl">◆</div>
            <h1 className="text-lg font-semibold text-zinc-100">Authorize CLI</h1>
            <p className="text-sm text-zinc-500">
              A CLI tool is requesting access to your account.
            </p>
          </div>

          <div className="bg-[#0a0a0a] rounded-lg px-4 py-3">
            <p className="text-xs text-zinc-500 mb-1">Challenge Code</p>
            <p className="text-xl font-mono font-bold text-zinc-100 tracking-widest">{code}</p>
          </div>

          <div className="text-sm text-zinc-400">
            Signed in as <span className="text-zinc-200">{user.name}</span>
            <br />
            <span className="text-xs text-zinc-600">{user.email}</span>
          </div>

          <button
            onClick={handleAuthorize}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg px-4 py-2.5 transition-colors cursor-pointer"
          >
            Authorize
          </button>

          <p className="text-xs text-zinc-600">
            Only authorize if you initiated this from your CLI.
          </p>
        </div>
      )}

      {status === 'authorizing' && (
        <StatusCard icon="" title="Authorizing..." description="Please wait..." loading />
      )}

      {status === 'success' && (
        <StatusCard
          icon="✓"
          title="Authorized"
          description="CLI has been authorized. You can close this tab and return to your terminal."
          success
        />
      )}

      {status === 'expired' && (
        <StatusCard
          icon="⏱"
          title="Challenge Expired"
          description="This challenge has expired or was already used. Please request a new one from your CLI."
        />
      )}

      {status === 'error' && (
        <StatusCard
          icon="✕"
          title="Error"
          description={errorMessage || 'Something went wrong. Please try again.'}
        />
      )}
    </PageWrapper>
  );
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#09090b' }}>
      {children}
    </div>
  );
}

function StatusCard({
  icon,
  title,
  description,
  success,
  loading,
}: {
  icon: string;
  title: string;
  description: string;
  success?: boolean;
  loading?: boolean;
}) {
  return (
    <div className="bg-[#18181b] rounded-xl border border-zinc-800 p-8 max-w-sm w-full text-center space-y-4">
      {loading ? (
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mx-auto" />
      ) : (
        <div className={`text-3xl ${success ? 'text-green-400' : 'text-zinc-400'}`}>{icon}</div>
      )}
      <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
      <p className="text-sm text-zinc-500">{description}</p>
    </div>
  );
}
