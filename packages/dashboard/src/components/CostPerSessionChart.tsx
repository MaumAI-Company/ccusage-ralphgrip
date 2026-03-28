'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import { getMemberColor } from '@/lib/colors';
import { TruncatedAxisTick } from './TruncatedAxisTick';
import type { MemberSummary } from '@/lib/api-client';
import type { MemberSessionCount } from '@/lib/types';

interface Props {
  members: MemberSummary[];
  memberSessionCount: MemberSessionCount[];
  totalTurns: number;
  totalCost: number;
}

interface TooltipEntry {
  value: number;
  payload: { name: string; costPerSession: number; sessions: number; cost: number };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: '#18181b',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '10px',
      padding: '12px 14px',
      boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
      minWidth: '140px',
    }}>
      <p style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '6px', fontWeight: 500 }}>
        {d.name}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <span style={{ fontSize: '11px', color: '#71717a' }}>$/session</span>
          <span style={{ fontSize: '12px', color: '#fafafa', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            ${d.costPerSession.toFixed(2)}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <span style={{ fontSize: '11px', color: '#71717a' }}>Sessions</span>
          <span style={{ fontSize: '12px', color: '#a1a1aa', fontVariantNumeric: 'tabular-nums' }}>
            {d.sessions}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <span style={{ fontSize: '11px', color: '#71717a' }}>Total</span>
          <span style={{ fontSize: '12px', color: '#a1a1aa', fontVariantNumeric: 'tabular-nums' }}>
            ${d.cost.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function CostPerSessionChart({ members, memberSessionCount, totalTurns, totalCost }: Props) {
  const chartData = useMemo(() => {
    const sessionMap = new Map(memberSessionCount.map(m => [m.displayName, m.sessionCount]));
    return members
      .map(m => {
        const sessions = sessionMap.get(m.displayName) || 0;
        return {
          name: m.displayName,
          costPerSession: sessions > 0 ? m.totalCost / sessions : 0,
          sessions,
          cost: m.totalCost,
        };
      })
      .filter(m => m.sessions > 0)
      .sort((a, b) => b.costPerSession - a.costPerSession);
  }, [members, memberSessionCount]);

  const teamAvg = totalTurns > 0 ? totalCost / totalTurns : 0;

  if (chartData.length === 0) {
    return (
      <div className="glass-card" style={{ borderRadius: '16px', padding: '24px' }}>
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#fafafa', letterSpacing: '-0.01em', marginBottom: '2px' }}>
            세션당 비용
          </h2>
          <p style={{ fontSize: '12px', color: '#52525b' }}>Cost per session by member</p>
        </div>
        <div style={{ padding: '40px 16px', textAlign: 'center', color: '#52525b', fontSize: '13px' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.5 }}>~</div>
          데이터가 없습니다
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ borderRadius: '16px', padding: '24px' }}>
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#fafafa', letterSpacing: '-0.01em', marginBottom: '2px' }}>
            세션당 비용
          </h2>
          <p style={{ fontSize: '12px', color: '#52525b' }}>Cost per session by member</p>
        </div>
        {teamAvg > 0 && (
          <div style={{
            background: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.25)',
            borderRadius: '8px',
            padding: '6px 10px',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '9px', color: '#34d399', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Avg $/turn
            </p>
            <p style={{ fontSize: '16px', fontWeight: 700, color: '#6ee7b7', fontVariantNumeric: 'tabular-nums' }}>
              ${teamAvg.toFixed(3)}
            </p>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 36 + 20)}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid horizontal={false} strokeDasharray="0" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            type="number"
            tickFormatter={(v) => `$${v.toFixed(1)}`}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#52525b', fontSize: 11 }}
          />
          <YAxis
            type="category"
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={<TruncatedAxisTick maxChars={10} />}
            interval={0}
            width={80}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="costPerSession" radius={[0, 4, 4, 0]} maxBarSize={24}>
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={getMemberColor(entry.name)} fillOpacity={0.75} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
