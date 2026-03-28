'use client';

import { useTranslations } from 'next-intl';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { getMemberColor } from '@/lib/colors';
import type { UtilizationHistory } from '@/lib/types';

type WindowMode = '5h' | '7d';

interface Props {
  utilizationHistory: UtilizationHistory[];
  mode: WindowMode;
  onModeChange: (mode: WindowMode) => void;
  days: number;
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

  const sorted = [...payload].filter(p => p.value != null).sort((a, b) => (b.value || 0) - (a.value || 0));

  return (
    <div style={{
      background: '#18181b',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '10px',
      padding: '12px 14px',
      boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
      minWidth: '160px',
    }}>
      <p style={{
        fontSize: '11px', color: '#71717a', fontWeight: 500,
        letterSpacing: '0.04em', marginBottom: '8px',
      }}>
        {label}
      </p>
      {sorted.map((entry) => (
        <div key={entry.name} style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: '16px', marginBottom: '4px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '7px', height: '7px', borderRadius: '50%',
              background: entry.color, flexShrink: 0,
            }} />
            <span title={entry.name} style={{ fontSize: '12px', color: '#a1a1aa', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {entry.name}
            </span>
          </div>
          <span style={{ fontSize: '12px', color: '#fafafa', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {Math.round(entry.value)}%
          </span>
        </div>
      ))}
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function RollingUsagePanel({ utilizationHistory, mode, onModeChange, days }: Props) {
  const t = useTranslations('common');
  const tu = useTranslations('utilization');

  if (utilizationHistory.length === 0) {
    return (
      <div className="glass-card" style={{ borderRadius: '16px', padding: '24px' }}>
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#fafafa', letterSpacing: '-0.01em', marginBottom: '2px' }}>
            {tu('title')}
          </h2>
          <p style={{ fontSize: '12px', color: '#52525b' }}>{tu('subtitle')}</p>
        </div>
        <div style={{ padding: '40px 16px', textAlign: 'center', color: '#52525b', fontSize: '13px' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.5 }}>~</div>
          {t('noDataYet')}
        </div>
      </div>
    );
  }

  // Get all unique members
  const memberSet = new Set(utilizationHistory.map(h => h.displayName));
  const members = [...memberSet];

  // 1. Build per-member time series sorted by time
  const memberSeries = new Map<string, { ts: string; pct: number }[]>();
  for (const h of utilizationHistory) {
    const pct = mode === '5h' ? h.fiveHourPct : h.sevenDayPct;
    if (pct === null) continue;
    if (!memberSeries.has(h.displayName)) memberSeries.set(h.displayName, []);
    memberSeries.get(h.displayName)!.push({ ts: h.recordedAt, pct });
  }
  for (const series of memberSeries.values()) {
    series.sort((a, b) => a.ts.localeCompare(b.ts));
  }

  // 2. Max-fill: replace anomalous dips (0 or very low) with sliding window max
  const WINDOW_RADIUS = 3;
  for (const series of memberSeries.values()) {
    const raw = series.map(s => s.pct);
    for (let i = 0; i < series.length; i++) {
      const lo = Math.max(0, i - WINDOW_RADIUS);
      const hi = Math.min(series.length - 1, i + WINDOW_RADIUS);
      let windowMax = 0;
      for (let j = lo; j <= hi; j++) windowMax = Math.max(windowMax, raw[j]);
      if (windowMax > 0 && series[i].pct < windowMax * 0.3) {
        series[i].pct = windowMax;
      }
    }
  }

  // 3. Collect all unique timestamps and downsample if too many
  const MAX_POINTS = 300;
  const allTimestamps = [...new Set(
    [...memberSeries.values()].flatMap(s => s.map(p => p.ts))
  )].sort();

  let bucketedData: Record<string, number | string>[];

  if (allTimestamps.length <= MAX_POINTS) {
    // No sampling needed — build chart data directly
    const timeMap = new Map<string, Record<string, number | string>>();
    for (const [name, series] of memberSeries) {
      for (const { ts, pct } of series) {
        if (!timeMap.has(ts)) timeMap.set(ts, { time: ts });
        timeMap.get(ts)![name] = pct;
      }
    }
    bucketedData = Array.from(timeMap.values())
      .sort((a, b) => (a.time as string).localeCompare(b.time as string));
  } else {
    // Downsample: divide time range into MAX_POINTS buckets, take max per member per bucket
    const tMin = new Date(allTimestamps[0]).getTime();
    const tMax = new Date(allTimestamps[allTimestamps.length - 1]).getTime();
    const bucketWidth = (tMax - tMin) / MAX_POINTS;

    const buckets = new Map<number, Record<string, number | string>>();

    for (const [name, series] of memberSeries) {
      for (const { ts, pct } of series) {
        const t = new Date(ts).getTime();
        const bucketIdx = Math.min(Math.floor((t - tMin) / bucketWidth), MAX_POINTS - 1);

        if (!buckets.has(bucketIdx)) {
          const bucketMid = new Date(tMin + (bucketIdx + 0.5) * bucketWidth).toISOString();
          buckets.set(bucketIdx, { time: bucketMid });
        }
        const row = buckets.get(bucketIdx)!;
        row[name] = Math.max((row[name] as number) || 0, pct);
      }
    }

    bucketedData = Array.from(buckets.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, row]) => row);
  }

  // Ensure chart X-axis spans the full requested time range
  const now = new Date();
  const rangeStart = new Date(now.getTime() - days * 86400000);
  const firstTime = bucketedData.length > 0 ? new Date(bucketedData[0].time as string).getTime() : Infinity;
  const lastTime = bucketedData.length > 0 ? new Date(bucketedData[bucketedData.length - 1].time as string).getTime() : -Infinity;
  if (rangeStart.getTime() < firstTime) {
    bucketedData.unshift({ time: rangeStart.toISOString() });
  }
  if (now.getTime() > lastTime) {
    bucketedData.push({ time: now.toISOString() });
  }

  const chartData = bucketedData;

  return (
    <div className="glass-card" style={{ borderRadius: '16px', padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#fafafa', letterSpacing: '-0.01em', marginBottom: '2px' }}>
            {tu('title')}
          </h2>
          <p style={{ fontSize: '12px', color: '#52525b' }}>{tu('subtitle')}</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* 5h/7d toggle */}
          <div style={{
            display: 'flex',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.06)',
            padding: '2px',
          }}>
            {(['5h', '7d'] as WindowMode[]).map((m) => (
              <button
                key={m}
                onClick={() => onModeChange(m)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  border: 'none',
                  background: mode === m ? 'rgba(99,102,241,0.2)' : 'transparent',
                  color: mode === m ? '#a5b4fc' : '#71717a',
                  transition: 'all 0.15s ease',
                }}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginLeft: '12px' }}>
            {members.map((name) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: getMemberColor(name),
                }} />
                <span title={name} style={{ fontSize: '11px', color: '#71717a', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData}>
          <CartesianGrid vertical={false} strokeDasharray="0" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="time"
            tickFormatter={formatTime}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#52525b', fontSize: 10 }}
            interval="preserveStartEnd"
            minTickGap={60}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#52525b', fontSize: 11 }}
            width={40}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: 'rgba(255,255,255,0.08)' }}
          />
          {members.map((name) => (
            <Line
              key={name}
              type="monotone"
              dataKey={name}
              stroke={getMemberColor(name)}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
