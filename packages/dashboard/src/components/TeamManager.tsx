'use client';

import { useState, useEffect, useCallback } from 'react';
import type { TeamMemberSummary } from '@/lib/types';

interface GroupedTeam {
  teamId: string;
  teamName: string;
  teamDisplayName: string;
  teamColor: string | null;
  members: Array<{ memberId: string; memberName: string }>;
}

interface Props {
  allMembers: TeamMemberSummary[];
  onChanged?: () => void;
}

export function TeamManager({ allMembers, onChanged }: Props) {
  const [teams, setTeams] = useState<GroupedTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create team form
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');
  const [creating, setCreating] = useState(false);

  // Assign member
  const [assignTeamId, setAssignTeamId] = useState<string | null>(null);
  const [assignMemberId, setAssignMemberId] = useState('');

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch('/api/teams');
      if (!res.ok) throw new Error('Failed to fetch teams');
      const data: GroupedTeam[] = await res.json();
      setTeams(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), color: newColor }),
      });
      if (!res.ok) throw new Error('Failed to create team');
      setNewName('');
      await fetchTeams();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setCreating(false);
    }
  };

  const handleAssign = async (teamId: string) => {
    if (!assignMemberId) return;
    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: assignMemberId }),
      });
      if (!res.ok) throw new Error('Failed to assign member');
      setAssignMemberId('');
      setAssignTeamId(null);
      await fetchTeams();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assign failed');
    }
  };

  const handleRemove = async (teamId: string, memberId: string) => {
    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      });
      if (!res.ok) throw new Error('Failed to remove member');
      await fetchTeams();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Remove failed');
    }
  };

  const handleDelete = async (teamId: string) => {
    if (!confirm('Delete this team?')) return;
    try {
      const res = await fetch(`/api/teams/${teamId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete team');
      await fetchTeams();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  // Members already assigned to a team
  const assignedMemberIds = new Set(teams.flatMap(t => t.members.map(m => m.memberId)));
  const unassignedMembers = allMembers.filter(m => !assignedMemberIds.has(m.id));

  if (loading) {
    return (
      <div className="glass-card" style={{ borderRadius: '16px', padding: '24px' }}>
        <p style={{ color: '#71717a', fontSize: '13px' }}>Loading teams...</p>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ borderRadius: '16px', padding: '24px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2
          style={{
            fontSize: '15px',
            fontWeight: 600,
            color: '#fafafa',
            letterSpacing: '-0.01em',
            marginBottom: '2px',
          }}
        >
          Team Management
        </h2>
        <p style={{ fontSize: '12px', color: '#52525b' }}>Create and manage teams</p>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          fontSize: '12px', color: '#f87171', marginBottom: '12px',
          padding: '8px 10px', borderRadius: '8px',
          background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '12px', padding: '0 4px' }}
          >
            x
          </button>
        </div>
      )}

      {/* Create team */}
      <div style={{
        display: 'flex', gap: '8px', marginBottom: '20px',
        flexWrap: 'wrap', alignItems: 'center',
      }}>
        <input
          type="text"
          placeholder="Team name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          style={{
            flex: 1, minWidth: '140px',
            padding: '8px 12px', borderRadius: '8px', fontSize: '13px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fafafa', outline: 'none',
          }}
        />
        <input
          type="color"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          style={{
            width: '36px', height: '36px', borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent', cursor: 'pointer', padding: '2px',
          }}
        />
        <button
          onClick={handleCreate}
          disabled={creating || !newName.trim()}
          style={{
            padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
            background: 'rgba(99,102,241,0.8)',
            border: '1px solid rgba(99,102,241,0.4)',
            color: '#fafafa', cursor: creating ? 'wait' : 'pointer',
            opacity: !newName.trim() ? 0.5 : 1,
          }}
        >
          {creating ? '...' : 'Create Team'}
        </button>
      </div>

      {/* Team list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {teams.map((team) => (
          <div
            key={team.teamId}
            style={{
              borderRadius: '10px',
              padding: '14px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {/* Team header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '10px', height: '10px', borderRadius: '50%',
                    background: team.teamColor || '#6366f1',
                  }}
                />
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#e4e4e7' }}>
                  {team.teamDisplayName || team.teamName}
                </span>
                <span style={{ fontSize: '11px', color: '#52525b' }}>
                  ({team.members.length} members)
                </span>
              </div>
              <button
                onClick={() => handleDelete(team.teamId)}
                style={{
                  padding: '4px 10px', borderRadius: '6px', fontSize: '11px',
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  color: '#f87171', cursor: 'pointer',
                }}
              >
                Delete
              </button>
            </div>

            {/* Members */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
              {team.members.map((m) => (
                <span
                  key={m.memberId}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    fontSize: '12px', padding: '3px 8px', borderRadius: '6px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#d4d4d8',
                  }}
                >
                  {m.memberName}
                  <button
                    onClick={() => handleRemove(team.teamId, m.memberId)}
                    style={{
                      background: 'none', border: 'none',
                      color: '#71717a', cursor: 'pointer',
                      fontSize: '12px', padding: '0 2px', lineHeight: 1,
                    }}
                    title="Remove member"
                  >
                    x
                  </button>
                </span>
              ))}
              {team.members.length === 0 && (
                <span style={{ fontSize: '11px', color: '#3f3f46', fontStyle: 'italic' }}>
                  No members assigned
                </span>
              )}
            </div>

            {/* Assign member */}
            {assignTeamId === team.teamId ? (
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <select
                  value={assignMemberId}
                  onChange={(e) => setAssignMemberId(e.target.value)}
                  style={{
                    flex: 1, padding: '6px 10px', borderRadius: '6px', fontSize: '12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fafafa', outline: 'none',
                  }}
                >
                  <option value="">Select member...</option>
                  {unassignedMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.displayName}</option>
                  ))}
                </select>
                <button
                  onClick={() => handleAssign(team.teamId)}
                  disabled={!assignMemberId}
                  style={{
                    padding: '6px 12px', borderRadius: '6px', fontSize: '12px',
                    background: 'rgba(34,197,94,0.15)',
                    border: '1px solid rgba(34,197,94,0.3)',
                    color: '#4ade80', cursor: 'pointer',
                    opacity: !assignMemberId ? 0.5 : 1,
                  }}
                >
                  Add
                </button>
                <button
                  onClick={() => { setAssignTeamId(null); setAssignMemberId(''); }}
                  style={{
                    padding: '6px 10px', borderRadius: '6px', fontSize: '12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#71717a', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAssignTeamId(team.teamId)}
                style={{
                  padding: '5px 10px', borderRadius: '6px', fontSize: '11px',
                  background: 'rgba(99,102,241,0.1)',
                  border: '1px solid rgba(99,102,241,0.25)',
                  color: '#818cf8', cursor: 'pointer',
                }}
              >
                + Assign Member
              </button>
            )}
          </div>
        ))}

        {teams.length === 0 && (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: '#52525b', fontSize: '13px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.5 }}>~</div>
            No teams yet. Create one above.
          </div>
        )}
      </div>
    </div>
  );
}
