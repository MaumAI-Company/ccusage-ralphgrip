'use client';

import { useTranslations } from 'next-intl';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { getMemberColor } from '@/lib/colors';
import { formatDate } from '@/lib/formatters';
interface DailyData {
  date: string;
  [member: string]: string | number;
}

interface Props {
  data: DailyData[];
  members: string[];
}


interface CustomTooltipPayload {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: CustomTooltipPayload[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const sorted = [...payload].sort((a, b) => (b.value || 0) - (a.value || 0));
  const total = sorted.reduce((s, p) => s + (p.value || 0), 0);

  return (
    <div
      style={{
        background: '#18181b',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '10px',
        padding: '12px 14px',
        boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
        minWidth: '160px',
      }}
    >
      <p
        style={{
          fontSize: '11px',
          color: '#71717a',
          fontWeight: 500,
          letterSpacing: '0.04em',
          marginBottom: '8px',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </p>
      {sorted.map((entry) => (
        <div
          key={entry.name}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            marginBottom: '4px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: entry.color,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: '12px', color: '#a1a1aa', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {entry.name}
            </span>
          </div>
          <span style={{ fontSize: '12px', color: '#fafafa', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            ${(entry.value || 0).toFixed(3)}
          </span>
        </div>
      ))}
      {payload.length > 1 && (
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            marginTop: '8px',
            paddingTop: '8px',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '11px', color: '#71717a' }}>Total</span>
          <span style={{ fontSize: '12px', color: '#fafafa', fontWeight: 700 }}>${total.toFixed(3)}</span>
        </div>
      )}
    </div>
  );
}

export function DailyChart({ data, members }: Props) {
  const t = useTranslations('common');
  const tch = useTranslations('charts');
  if (data.length === 0 || members.length === 0) {
    return (
      <div className="glass-card" style={{ borderRadius: '16px', padding: '24px' }}>
        {/* Header */}
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h2
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#fafafa',
                letterSpacing: '-0.01em',
                marginBottom: '2px',
              }}
            >
              {tch('dailyCostTrend')}
            </h2>
            <p style={{ fontSize: '12px', color: '#52525b' }}>{tch('dailyCostTrendSub')}</p>
          </div>
        </div>
        <div style={{ padding: '40px 16px', textAlign: 'center', color: '#52525b', fontSize: '13px' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.5 }}>~</div>
          {t('noData')}
        </div>
      </div>
    );
  }

  return (
    <div
      className="glass-card"
      style={{ borderRadius: '16px', padding: '24px' }}
    >
      {/* Header */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#fafafa',
              letterSpacing: '-0.01em',
              marginBottom: '2px',
            }}
          >
            {tch('dailyCostTrend')}
          </h2>
          <p style={{ fontSize: '12px', color: '#52525b' }}>{tch('dailyCostTrendSub')}</p>
        </div>

        {/* Custom legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxWidth: '60%', justifyContent: 'flex-end' }}>
          {members.map((name) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: getMemberColor(name),
                }}
              />
              <span style={{ fontSize: '11px', color: '#71717a', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {name}
              </span>
            </div>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} barSize={members.length > 4 ? 12 : 16} barCategoryGap="30%">
          <CartesianGrid vertical={false} strokeDasharray="0" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#52525b', fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(v) => `$${v}`}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#52525b', fontSize: 11 }}
            width={44}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 4 }}
          />
          {members.map((name, i) => (
            <Bar
              key={name}
              dataKey={name}
              stackId="cost"
              fill={getMemberColor(name)}
              radius={i === members.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
              fillOpacity={0.9}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
