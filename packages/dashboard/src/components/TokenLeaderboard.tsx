'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { getMemberColor } from '@/lib/colors';
import { formatTokens } from '@/lib/formatters';
import { TruncatedAxisTick } from './TruncatedAxisTick';
import type { DailyEntry } from '@/lib/api-client';

interface Props {
  data: DailyEntry[];
  type: 'total' | 'input' | 'output';
}

const TITLE_KEY_MAP = {
  total: 'totalTokenTop10',
  input: 'inputTokenTop10',
  output: 'outputTokenTop10',
} as const;

interface TooltipPayload {
  value: number;
  payload: { name: string };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
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
        {formatTokens(entry.value)}
      </p>
    </div>
  );
}

export function TokenLeaderboard({ data, type }: Props) {
  const t = useTranslations('charts');
  const tc = useTranslations('common');
  // Aggregate tokens per member
  const chartData = useMemo(() => {
    const memberTotals = new Map<string, number>();
    for (const entry of data) {
      const current = memberTotals.get(entry.displayName) ?? 0;
      let tokens = 0;
      if (type === 'total') tokens = entry.inputTokens + entry.outputTokens;
      else if (type === 'input') tokens = entry.inputTokens;
      else tokens = entry.outputTokens;
      memberTotals.set(entry.displayName, current + tokens);
    }
    return Array.from(memberTotals.entries())
      .map(([name, tokens]) => ({ name, tokens }))
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 10);
  }, [data, type]);

  if (data.length === 0) {
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
            {t(TITLE_KEY_MAP[type])}
          </h2>
          <p style={{ fontSize: '12px', color: '#52525b' }}>{t('tokenLeaderboardSub')}</p>
        </div>
        <div style={{ padding: '40px 16px', textAlign: 'center', color: '#52525b', fontSize: '13px' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.5 }}>~</div>
          {tc('noData')}
        </div>
      </div>
    );
  }

  return (
    <div
      className="glass-card"
      style={{ borderRadius: '16px', padding: '24px' }}
    >
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
          {t(TITLE_KEY_MAP[type])}
        </h2>
        <p style={{ fontSize: '12px', color: '#52525b' }}>{t('tokenLeaderboardSub')}</p>
      </div>

      <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 30)}>
        <BarChart
          data={chartData}
          layout="vertical"
          barSize={14}
          margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
        >
          <XAxis
            type="number"
            tickFormatter={formatTokens}
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
          <Bar dataKey="tokens" radius={[0, 3, 3, 0]} fillOpacity={0.9}>
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={getMemberColor(entry.name)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
