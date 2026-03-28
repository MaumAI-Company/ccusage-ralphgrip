'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatTokens } from '@/lib/formatters';
import { TruncatedAxisTick } from './TruncatedAxisTick';
import type { HackathonTeamEntry } from '@/lib/api-client';

interface Props {
  teams: HackathonTeamEntry[];
}

const MEDAL = ['#FFD700', '#C0C0C0', '#CD7F32'] as const;

interface TooltipPayload {
  value: number;
  payload: ChartRow;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

interface ChartRow {
  name: string;
  cost: number;
  tokens: number;
  members: number;
  color: string;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const entry = payload[0];
  return (
    <div
      style={{
        background: '#18181b',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '10px',
        padding: '10px 12px',
        boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
      }}
    >
      <p style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '4px' }}>
        {entry.payload.name}
      </p>
      <p style={{ fontSize: '14px', fontWeight: 700, color: '#fafafa', fontVariantNumeric: 'tabular-nums' }}>
        ${entry.value.toFixed(2)}
      </p>
      <p style={{ fontSize: '11px', color: '#71717a', marginTop: '2px' }}>
        {formatTokens(entry.payload.tokens)} tokens &middot; {entry.payload.members} members
      </p>
    </div>
  );
}

const DEFAULT_COLOR = '#6366f1';

export function TeamLeaderboard({ teams }: Props) {
  const chartData: ChartRow[] = useMemo(() => {
    return [...teams]
      .sort((a, b) => b.totalCost - a.totalCost)
      .map((t) => ({
        name: t.teamDisplayName || t.teamName,
        cost: t.totalCost,
        tokens: t.totalTokens,
        members: t.memberCount,
        color: t.teamColor || DEFAULT_COLOR,
      }));
  }, [teams]);

  if (teams.length === 0) {
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
            Team Leaderboard
          </h2>
          <p style={{ fontSize: '12px', color: '#52525b' }}>Teams ranked by total cost</p>
        </div>
        <div style={{ padding: '40px 16px', textAlign: 'center', color: '#52525b', fontSize: '13px' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.5 }}>~</div>
          No team data
        </div>
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
          Team Leaderboard
        </h2>
        <p style={{ fontSize: '12px', color: '#52525b' }}>Teams ranked by total cost</p>
      </div>

      {/* Top 3 podium */}
      {chartData.length >= 1 && (
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
        }}>
          {chartData.slice(0, 3).map((team, i) => {
            const medals = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'];
            const medalBg = [
              'rgba(245,158,11,0.15)',
              'rgba(161,161,170,0.12)',
              'rgba(180,83,9,0.12)',
            ];
            const medalBorder = [
              'rgba(245,158,11,0.4)',
              'rgba(161,161,170,0.3)',
              'rgba(180,83,9,0.3)',
            ];
            return (
              <div
                key={team.name}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: medalBg[i],
                  border: `1px solid ${medalBorder[i]}`,
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: '18px' }}>{medals[i]}</span>
                <p
                  title={team.name}
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#e4e4e7',
                    marginTop: '4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: team.color,
                      marginRight: '6px',
                      verticalAlign: 'middle',
                    }}
                  />
                  {team.name}
                </p>
                <p style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: MEDAL[i],
                  marginTop: '4px',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  ${team.cost.toFixed(2)}
                </p>
                <p style={{ fontSize: '10px', color: '#71717a', marginTop: '2px' }}>
                  {team.members} members &middot; {formatTokens(team.tokens)} tok
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Bar chart */}
      <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 36)}>
        <BarChart
          data={chartData}
          layout="vertical"
          barSize={16}
          margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
        >
          <XAxis
            type="number"
            tickFormatter={(v: number) => `$${v.toFixed(0)}`}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#52525b', fontSize: 10 }}
          />
          <YAxis
            type="category"
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={<TruncatedAxisTick />}
            interval={0}
            width={120}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="cost" radius={[0, 3, 3, 0]} fillOpacity={0.9}>
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
