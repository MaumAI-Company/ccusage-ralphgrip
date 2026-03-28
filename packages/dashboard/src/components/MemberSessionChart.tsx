'use client';

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
import { TruncatedAxisTick } from './TruncatedAxisTick';

interface Props {
  data: { displayName: string; sessionCount: number }[];
}

interface TooltipPayload {
  value: number;
  payload: { displayName: string };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  const tc = useTranslations('common');
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
        {entry.payload.displayName}
      </p>
      <p
        style={{
          fontSize: '14px',
          fontWeight: 700,
          color: '#fafafa',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {tc('sessions', { count: entry.value })}
      </p>
    </div>
  );
}

export function MemberSessionChart({ data }: Props) {
  const t = useTranslations('charts');
  const tc = useTranslations('common');
  const sorted = [...data].sort((a, b) => b.sessionCount - a.sessionCount);

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
            {t('memberSessions')}
          </h2>
          <p style={{ fontSize: '12px', color: '#52525b' }}>{t('memberSessionsSub')}</p>
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
          {t('memberSessions')}
        </h2>
        <p style={{ fontSize: '12px', color: '#52525b' }}>{t('memberSessionsSub')}</p>
      </div>

      <ResponsiveContainer width="100%" height={Math.max(180, sorted.length * 30)}>
        <BarChart
          data={sorted}
          layout="vertical"
          barSize={14}
          margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
        >
          <XAxis
            type="number"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#52525b', fontSize: 10 }}
          />
          <YAxis
            type="category"
            dataKey="displayName"
            axisLine={false}
            tickLine={false}
            tick={<TruncatedAxisTick />}
            interval={0}
            width={120}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="sessionCount" radius={[0, 3, 3, 0]} fillOpacity={0.9}>
            {sorted.map((entry) => (
              <Cell key={entry.displayName} fill={getMemberColor(entry.displayName)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
