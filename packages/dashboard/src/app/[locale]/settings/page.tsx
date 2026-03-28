'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { ProtectedPage } from '@/components/ProtectedPage';
import { AppHeader, HeaderLink, HeaderDivider } from '@/components/AppHeader';

interface Profile {
  claimed: true;
  name: string;
  displayName: string | null;
  email: string;
}

interface NotLinkedResponse {
  claimed: false;
}

type ProfileResponse = Profile | NotLinkedResponse;

function NotLinkedMessage({ email }: { email?: string }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-400">
        Your account is not linked to a member yet.
      </p>
      <p className="text-sm text-zinc-500">
        Send a usage report from your Claude Code plugin to automatically link
        your email{email ? ` (${email})` : ''} to your member record.
      </p>
    </div>
  );
}

function ProfileEditor({ profile, onUpdate }: { profile: Profile; onUpdate: (p: Profile) => void }) {
  const [displayName, setDisplayName] = useState(profile.displayName || '');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: displayName.trim() || profile.name }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }
      const newDisplayName = displayName.trim() || profile.name;
      onUpdate({ ...profile, displayName: newDisplayName });
      setEditing(false);
      setFeedback({ type: 'success', message: 'Display name updated' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDisplayName(profile.displayName || '');
    setEditing(false);
    setFeedback(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-zinc-500 mb-1">Email</label>
        <div className="text-sm text-zinc-300">{profile.email}</div>
      </div>

      <div>
        <label className="block text-xs text-zinc-500 mb-1">Display Name</label>
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={profile.name}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
              maxLength={50}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') handleCancel();
              }}
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded transition-colors"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-300">
              {profile.displayName || <span className="text-zinc-600 italic">Not set</span>}
            </span>
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Edit
            </button>
          </div>
        )}
      </div>

      {feedback && (
        <div className={`text-sm px-3 py-2 rounded ${
          feedback.type === 'success'
            ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800'
            : 'bg-red-900/30 text-red-400 border border-red-800'
        }`}>
          {feedback.message}
        </div>
      )}
    </div>
  );
}

function SettingsContent() {
  const { user } = useAuth();
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/profile');
      if (!res.ok) throw new Error('Failed to fetch profile');
      const json = await res.json();
      setData(json);
    } catch {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-zinc-500">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-xl font-semibold text-zinc-100 mb-6">Settings</h1>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Profile</h2>

        {error ? (
          <div className="text-sm text-red-400">{error}</div>
        ) : data && !data.claimed ? (
          <NotLinkedMessage email={user?.email} />
        ) : data && data.claimed ? (
          <ProfileEditor
            profile={data}
            onUpdate={(p) => setData(p)}
          />
        ) : null}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedPage>
      <AppHeader
        maxWidthClassName="max-w-7xl"
        meta={(
          <>
            <HeaderLink href="/">Dashboard</HeaderLink>
            <HeaderDivider />
            <HeaderLink href="/report">Report</HeaderLink>
            <HeaderDivider />
            <HeaderLink href="/settings" active>Settings</HeaderLink>
          </>
        )}
      />
      <SettingsContent />
    </ProtectedPage>
  );
}
