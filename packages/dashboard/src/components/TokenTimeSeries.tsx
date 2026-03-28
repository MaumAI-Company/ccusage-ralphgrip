'use client';

import { useState, useId, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { formatDate, formatTokens } from '@/lib/formatters';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { DailyEntry } from '@/lib/api-client';

interface Props {
  data: DailyEntry[];
}

interface TooltipEntry {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const sorted = [...payload].sort((a, b) => (b.value || 0) - (a.value || 0));
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
            <span style={{ fontSize: '12px', color: '#a1a1aa' }}>{entry.name}</span>
          </div>
          <span
            style={{
              fontSize: '12px',
              color: '#fafafa',
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatTokens(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function TokenTimeSeries({ data }: Props) {
  const t = useTranslations('charts');
  const tc = useTranslations('common');
  const [logScale, setLogScale] = useState(false);
  const gradientId = useId();

  // Aggregate by date
  const chartData = useMemo(() => {
    const dateMap = new Map<string, { input: number; output: number }>();
    for (const entry of data) {
      const existing = dateMap.get(entry.date) ?? { input: 0, output: 0 };
      existing.input += entry.inputTokens;
      existing.output += entry.outputTokens;
      dateMap.set(entry.date, existing);
    }
    return Array.from(dateMap.entries())
      .map(([date, vals]) => ({ date, input: vals.input, output: vals.output }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="glass-card" style={{ borderRadius: '16px', padding: '24px', position: 'relative' }}>
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
              {t('tokenTimeSeriesTitle')}
            </h2>
            <p style={{ fontSize: '12px', color: '#52525b' }}>{t('tokenTimeSeriesSub')}</p>
          </div>
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
      style={{ borderRadius: '16px', padding: '24px', position: 'relative' }}
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
            {t('tokenTimeSeriesTitle')}
          </h2>
          <p style={{ fontSize: '12px', color: '#52525b' }}>{t('tokenTimeSeriesSub')}</p>
        </div>

        {/* Log scale toggle */}
        <button
          onClick={() => setLogScale((v) => !v)}
          style={{
            background: logScale ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${logScale ? 'rgba(6,182,212,0.4)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '6px',
            color: logScale ? '#06b6d4' : '#71717a',
            cursor: 'pointer',
            padding: '4px 10px',
            fontSize: '11px',
            fontWeight: 500,
            transition: 'all 0.15s ease',
          }}
        >
          Log
        </button>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#06b6d4' }} />
          <span style={{ fontSize: '11px', color: '#71717a' }}>Input</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
          <span style={{ fontSize: '11px', color: '#71717a' }}>Output</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`${gradientId}-inputGrad`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
            </linearGradient>
            <linearGradient id={`${gradientId}-outputGrad`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
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
            tickFormatter={formatTokens}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#52525b', fontSize: 11 }}
            width={44}
            scale={logScale ? 'log' : 'auto'}
            domain={logScale ? ['auto', 'auto'] : [0, 'auto']}
            allowDataOverflow
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="input"
            name="Input"
            stroke="#06b6d4"
            strokeWidth={2}
            fill={`url(#${gradientId}-inputGrad)`}
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="output"
            name="Output"
            stroke="#10b981"
            strokeWidth={2}
            fill={`url(#${gradientId}-outputGrad)`}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
