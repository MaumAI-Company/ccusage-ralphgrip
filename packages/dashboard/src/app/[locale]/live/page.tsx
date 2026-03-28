'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface TeamEntry {
  teamId: string;
  teamName: string;
  teamDisplayName: string;
  teamColor: string | null;
  totalCost: number;
  totalTokens: number;
  sessionCount: number;
  memberCount: number;
}

interface MemberEntry {
  displayName: string;
  totalCost: number;
  totalTokens: number;
}

interface LiveData {
  teamLeaderboard: TeamEntry[];
  members: MemberEntry[];
  totalCost: number;
  sessionCount: number;
  teamCount: number;
  memberCount: number;
}

const MEDAL_ICONS = ['🥇', '🥈', '🥉'];

const FALLBACK_COLORS = [
  '#818cf8', '#f472b6', '#34d399', '#fbbf24', '#f87171',
  '#a78bfa', '#22d3ee', '#fb923c',
];

function getTeamColor(team: TeamEntry, index: number): string {
  return team.teamColor || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

function formatCost(cost: number): string {
  if (cost >= 1000) return `$${(cost / 1000).toFixed(1)}k`;
  if (cost >= 100) return `$${cost.toFixed(0)}`;
  if (cost >= 10) return `$${cost.toFixed(1)}`;
  return `$${cost.toFixed(2)}`;
}

function formatCountdown(remaining: number): string {
  if (remaining <= 0) return 'EVENT ENDED';
  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function LivePage() {
  const [data, setData] = useState<LiveData | null>(null);
  const [clock, setClock] = useState(new Date());
  const [sseConnected, setSseConnected] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // SSE connection with fallback to polling
  useEffect(() => {
    let cancelled = false;
    const es = new EventSource('/api/sse/live');

    es.addEventListener('init', (e) => {
      if (!cancelled) {
        setData(JSON.parse(e.data));
        setSseConnected(true);
      }
    });

    es.addEventListener('update', (e) => {
      if (!cancelled) setData(JSON.parse(e.data));
    });

    es.onerror = () => {
      es.close();
      setSseConnected(false);
      if (cancelled) return;

      // Fallback to polling
      const poll = async () => {
        try {
          const res = await fetch('/api/live');
          if (res.ok) setData(await res.json());
        } catch { /* retry next tick */ }
      };
      poll(); // Immediate first fetch
      pollingRef.current = setInterval(poll, 5000);
    };

    return () => {
      cancelled = true;
      es.close();
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Clock tick
  useEffect(() => {
    const interval = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Countdown to 9PM KST March 29, 2026
  const eventEnd = new Date('2026-03-29T21:00:00+09:00');
  const remaining = Math.max(0, eventEnd.getTime() - clock.getTime());

  // Loading state
  if (!data) {
    return (
      <div style={{
        width: '100vw', height: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: '#09090b', color: '#fafafa',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            border: '3px solid rgba(99,102,241,0.3)',
            borderTopColor: '#818cf8',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ color: '#71717a', fontSize: 16, letterSpacing: '0.05em' }}>
            Connecting to live feed...
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  const teams = data.teamLeaderboard;
  const members = data.members;

  return (
    <div style={{
      width: '100vw', height: '100vh', overflow: 'hidden',
      background: '#09090b', color: '#fafafa',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Animated gradient background */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 60% at 30% -10%, rgba(99,102,241,0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 110%, rgba(139,92,246,0.08) 0%, transparent 50%)',
        animation: 'bgPulse 8s ease-in-out infinite alternate',
      }} />
      <style>{`
        @keyframes bgPulse {
          0% { opacity: 0.8; }
          100% { opacity: 1.2; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(99,102,241,0.2); }
          50% { box-shadow: 0 0 40px rgba(99,102,241,0.4); }
        }
        @keyframes countPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
      `}</style>

      {/* Header */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 40px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(9,9,11,0.8)',
        backdropFilter: 'blur(12px)',
        flexShrink: 0,
      }}>
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
            border: '1px solid rgba(99,102,241,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'glow 3s ease-in-out infinite',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div>
            <h1 style={{
              fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em',
              background: 'linear-gradient(135deg, #c7d2fe 0%, #818cf8 50%, #a78bfa 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              margin: 0, lineHeight: 1.2,
            }}>
              Ralphthon @Seoul #2
            </h1>
            <p style={{ fontSize: 13, color: '#52525b', margin: 0, marginTop: 2 }}>
              Live Leaderboard
            </p>
          </div>
        </div>

        {/* Clock + Countdown */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 14, color: '#71717a', fontVariantNumeric: 'tabular-nums' }}>
            {clock.toLocaleTimeString('en-US', { hour12: false, timeZone: 'Asia/Seoul' })} KST
          </div>
          <div style={{
            fontSize: 32, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.02em', marginTop: 2,
            color: remaining <= 3600000 ? '#f87171' : remaining <= 7200000 ? '#fbbf24' : '#818cf8',
            animation: remaining <= 3600000 ? 'countPulse 1s ease-in-out infinite' : 'none',
          }}>
            {formatCountdown(remaining)}
          </div>
          <div style={{ fontSize: 11, color: '#52525b', marginTop: 1 }}>
            {remaining > 0 ? 'remaining' : ''}
          </div>
        </div>

        {/* Connection indicator */}
        <div style={{
          position: 'absolute', top: 12, right: 40,
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 11, color: sseConnected ? '#4ade80' : '#71717a',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: sseConnected ? '#22c55e' : '#71717a',
            boxShadow: sseConnected ? '0 0 6px #22c55e' : 'none',
          }} />
          {sseConnected ? 'Live' : 'Polling'}
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        position: 'relative', zIndex: 1,
        flex: 1, display: 'flex', gap: 24,
        padding: '24px 40px',
        minHeight: 0,
      }}>
        {/* Left: Team Leaderboard (60%) */}
        <div style={{ flex: '0 0 60%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <h2 style={{
            fontSize: 15, fontWeight: 600, color: '#a1a1aa',
            letterSpacing: '0.06em', textTransform: 'uppercase',
            marginBottom: 16, flexShrink: 0,
          }}>
            Team Rankings
          </h2>
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', gap: 10,
            overflow: 'hidden',
          }}>
            {teams.map((team, i) => {
              const color = getTeamColor(team, i);
              const maxCost = teams[0]?.totalCost || 1;
              const barWidth = Math.max(5, (team.totalCost / maxCost) * 100);
              const isTop3 = i < 3;

              return (
                <div
                  key={team.teamId}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: isTop3 ? '14px 20px' : '10px 20px',
                    borderRadius: 14,
                    background: isTop3
                      ? `linear-gradient(135deg, rgba(${hexToRgb(color)},0.12) 0%, rgba(${hexToRgb(color)},0.04) 100%)`
                      : 'rgba(255,255,255,0.03)',
                    border: `1px solid rgba(${hexToRgb(color)},${isTop3 ? 0.25 : 0.1})`,
                    animation: `fadeInUp 0.4s ease-out ${i * 0.08}s both`,
                    transition: 'all 0.3s ease',
                  }}
                >
                  {/* Rank */}
                  <div style={{
                    width: 40, textAlign: 'center', flexShrink: 0,
                    fontSize: isTop3 ? 28 : 20,
                  }}>
                    {isTop3 ? MEDAL_ICONS[i] : (
                      <span style={{ color: '#52525b', fontWeight: 600 }}>{i + 1}</span>
                    )}
                  </div>

                  {/* Team info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      {/* Color dot */}
                      <span style={{
                        width: 10, height: 10, borderRadius: '50%',
                        background: color, flexShrink: 0,
                        boxShadow: `0 0 8px ${color}40`,
                      }} />
                      <span style={{
                        fontSize: isTop3 ? 28 : 22, fontWeight: 700,
                        color: isTop3 ? '#fafafa' : '#d4d4d8',
                        letterSpacing: '-0.02em',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {team.teamDisplayName}
                      </span>
                      <span style={{
                        fontSize: 12, color: '#71717a', flexShrink: 0,
                      }}>
                        {team.memberCount} members
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div style={{
                      height: 4, borderRadius: 2,
                      background: 'rgba(255,255,255,0.05)',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${barWidth}%`, height: '100%', borderRadius: 2,
                        background: `linear-gradient(90deg, ${color}, ${color}80)`,
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                  </div>

                  {/* Cost */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{
                      fontSize: isTop3 ? 36 : 28, fontWeight: 700,
                      color: isTop3 ? color : '#a1a1aa',
                      fontVariantNumeric: 'tabular-nums',
                      letterSpacing: '-0.02em',
                    }}>
                      {formatCost(team.totalCost)}
                    </div>
                    <div style={{ fontSize: 11, color: '#52525b' }}>
                      {team.sessionCount} sessions
                    </div>
                  </div>
                </div>
              );
            })}
            {teams.length === 0 && (
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#52525b', fontSize: 18,
              }}>
                No team data yet
              </div>
            )}
          </div>
        </div>

        {/* Right: Individual Top 15 (40%) */}
        <div style={{ flex: '0 0 38%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <h2 style={{
            fontSize: 15, fontWeight: 600, color: '#a1a1aa',
            letterSpacing: '0.06em', textTransform: 'uppercase',
            marginBottom: 16, flexShrink: 0,
          }}>
            Individual Top 15
          </h2>
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', gap: 6,
            overflow: 'hidden',
          }}>
            {members.map((member, i) => {
              const isTop3 = i < 3;
              return (
                <div
                  key={member.displayName}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: isTop3 ? '10px 16px' : '7px 16px',
                    borderRadius: 10,
                    background: isTop3 ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid rgba(255,255,255,${isTop3 ? 0.08 : 0.03})`,
                    animation: `fadeInUp 0.3s ease-out ${i * 0.05}s both`,
                  }}
                >
                  {/* Rank */}
                  <span style={{
                    width: 28, textAlign: 'center', flexShrink: 0,
                    fontSize: isTop3 ? 20 : 14,
                    color: isTop3 ? undefined : '#52525b',
                    fontWeight: isTop3 ? undefined : 600,
                  }}>
                    {isTop3 ? MEDAL_ICONS[i] : i + 1}
                  </span>

                  {/* Name */}
                  <span style={{
                    flex: 1, fontSize: isTop3 ? 20 : 16,
                    fontWeight: isTop3 ? 600 : 400,
                    color: isTop3 ? '#fafafa' : '#a1a1aa',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {member.displayName}
                  </span>

                  {/* Cost */}
                  <span style={{
                    fontSize: isTop3 ? 22 : 16, fontWeight: 600,
                    color: isTop3 ? '#818cf8' : '#71717a',
                    fontVariantNumeric: 'tabular-nums',
                    flexShrink: 0,
                  }}>
                    {formatCost(member.totalCost)}
                  </span>
                </div>
              );
            })}
            {members.length === 0 && (
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#52525b', fontSize: 16,
              }}>
                No individual data yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Stats Bar */}
      <div style={{
        position: 'relative', zIndex: 1, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 48,
        padding: '16px 40px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(9,9,11,0.9)',
        backdropFilter: 'blur(12px)',
      }}>
        <StatItem label="Total Cost" value={formatCost(data.totalCost)} color="#818cf8" />
        <StatItem label="Teams" value={String(data.teamCount)} color="#f472b6" />
        <StatItem label="Participants" value={String(data.memberCount)} color="#fbbf24" />
        <StatItem label="Sessions" value={String(data.sessionCount)} color="#34d399" />
      </div>
    </div>
  );
}

function StatItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontSize: 28, fontWeight: 700, color,
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.02em',
      }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: '#52525b', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
    </div>
  );
}

/** Convert hex color to R,G,B string for use in rgba() */
function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const num = parseInt(h.length === 3
    ? h.split('').map(c => c + c).join('')
    : h, 16);
  return `${(num >> 16) & 255},${(num >> 8) & 255},${num & 255}`;
}
