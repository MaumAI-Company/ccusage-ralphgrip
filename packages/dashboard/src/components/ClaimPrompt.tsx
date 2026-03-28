'use client';

import { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';

interface UnclaimedMember {
  name: string;
  recordCount: number;
  firstSeen: string;
}

export function ClaimPrompt() {
  const { user } = useAuth();
  const [unclaimed, setUnclaimed] = useState<UnclaimedMember[]>([]);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimed, setClaimed] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetch('/api/auth/claim')
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setUnclaimed(data.unclaimed || []);
        }
      })
      .catch(() => {});
  }, [user]);

  if (!user || dismissed || unclaimed.length === 0) return null;

  // Filter out already-claimed names
  const remaining = unclaimed.filter(m => !claimed.has(m.name));
  if (remaining.length === 0) return null;

  const handleClaim = async (name: string) => {
    setClaiming(name);
    setError(null);
    try {
      const res = await fetch('/api/auth/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberName: name }),
      });
      if (res.ok) {
        setClaimed(prev => new Set(prev).add(name));
      } else {
        const body = await res.json();
        setError(body.error || 'Failed to claim');
      }
    } catch {
      setError('Network error');
    } finally {
      setClaiming(null);
    }
  };

  return (
    <div className="bg-indigo-950/30 border border-indigo-900/40 rounded-xl p-4 mb-6">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium text-indigo-300">Claim your usage records</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Link existing records to your account. Select the names you used.
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-zinc-600 hover:text-zinc-400 text-lg leading-none cursor-pointer"
          aria-label="Dismiss"
        >
          &times;
        </button>
      </div>

      {error && (
        <div className="text-xs text-red-400 mb-2">{error}</div>
      )}

      <div className="space-y-2">
        {remaining.map(m => (
          <div key={m.name} className="flex items-center justify-between bg-[#0a0a0a] rounded-lg px-3 py-2">
            <div>
              <span className="text-sm text-zinc-200">{m.name}</span>
              <span className="text-xs text-zinc-600 ml-2">
                {m.recordCount} record{m.recordCount !== 1 ? 's' : ''}
              </span>
            </div>
            <button
              onClick={() => handleClaim(m.name)}
              disabled={claiming === m.name}
              className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded px-3 py-1 transition-colors cursor-pointer"
            >
              {claiming === m.name ? 'Claiming...' : 'Claim'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
