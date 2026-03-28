'use client';

import { useMemo, useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { formatDate, formatTokens } from '@/lib/formatters';
import { getMemberColor } from '@/lib/colors';
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
  const sorted = [...payload].filter(e => e.value > 0).sort((a, b) => (b.value || 0) - (a.value || 0));
  if (sorted.length === 0) return null;
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
        letterSpacing: '0.04em', marginBottom: '8px', textTransform: 'uppercase',
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
            <span style={{
              fontSize: '12px', color: '#a1a1aa',
              maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{entry.name}</span>
          </div>
          <span style={{
            fontSize: '12px', color: '#fafafa', fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {formatTokens(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

type CacheMode = 'creation' | 'read';

interface DateEntry {
  date: string;
  members: Record<string, { creation: number; read: number }>;
}

export function CacheAnalyticsChart({ data }: Props) {
  const t = useTranslations('charts');
  const tc = useTranslations('common');
  const gradientId = useId();
  const [mode, setMode] = useState<CacheMode>('read');

  // Mode-independent aggregation
  const { members, totalCreation, totalRead, hitRatio, dateEntries } = useMemo(() => {
    const memberTotals = new Map<string, { creation: number; read: number }>();
    const dateMap = new Map<string, Record<string, { creation: number; read: number }>>();
    let cTotal = 0;
    let rTotal = 0;

    for (const entry of data) {
      const c = entry.cacheCreationTokens || 0;
      const r = entry.cacheReadTokens || 0;
      cTotal += c;
      rTotal += r;

      const cur = memberTotals.get(entry.displayName) ?? { creation: 0, read: 0 };
      cur.creation += c;
      cur.read += r;
      memberTotals.set(entry.displayName, cur);

      if (!dateMap.has(entry.date)) dateMap.set(entry.date, {});
      const row = dateMap.get(entry.date)!;
      const m = row[entry.displayName] ?? { creation: 0, read: 0 };
      m.creation += c;
      m.read += r;
      row[entry.displayName] = m;
    }

    const memberList = Array.from(memberTotals.entries())
      .filter(([, v]) => v.creation > 0 || v.read > 0)
      .sort((a, b) => (b[1].creation + b[1].read) - (a[1].creation + a[1].read))
      .map(([name]) => name);

    // Fill in missing dates so every day in the range is represented
    const dates = Array.from(dateMap.keys()).sort();
    const filledEntries: DateEntry[] = [];
    if (dates.length > 0) {
      const start = new Date(dates[0]);
      const end = new Date(dates[dates.length - 1]);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10);
        filledEntries.push({ date: key, members: dateMap.get(key) ?? {} });
      }
    }
    const entries = filledEntries;

    const ratio = cTotal + rTotal > 0 ? rTotal / (cTotal + rTotal) * 100 : 0;

    return { members: memberList, totalCreation: cTotal, totalRead: rTotal, hitRatio: ratio, dateEntries: entries };
  }, [data]);

  // Mode-dependent chart data
  const chartData = useMemo(() => {
    return dateEntries.map(({ date, members: mems }) => {
      const row: Record<string, string | number> = { date };
      for (const [name, vals] of Object.entries(mems)) {
        row[name] = mode === 'read' ? vals.read : vals.creation;
      }
      return row;
    });
  }, [dateEntries, mode]);

  const hasData = totalCreation > 0 || totalRead > 0;

  return (
    <div className="glass-card" style={{ borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#fafafa', letterSpacing: '-0.01em', marginBottom: '2px' }}>
            {t('cacheAnalyticsTitle')}
          </h2>
          <p style={{ fontSize: '12px', color: '#52525b' }}>{t('cacheAnalyticsSub')}</p>
        </div>
        {hasData && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: '0', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
              {(['read', 'creation'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  aria-pressed={mode === m}
                  style={{
                    background: mode === m ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.04)',
                    border: 'none',
                    color: mode === m ? '#c4b5fd' : '#71717a',
                    cursor: 'pointer',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 500,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {m === 'read' ? t('cacheRead') : t('cacheCreation')}
                </button>
              ))}
            </div>
            {/* Hit ratio badge */}
            <div style={{
              background: 'rgba(168,85,247,0.1)',
              border: '1px solid rgba(168,85,247,0.25)',
              borderRadius: '8px',
              padding: '6px 10px',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: '9px', color: '#a78bfa', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {t('hitRatio')}
              </p>
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#c4b5fd', fontVariantNumeric: 'tabular-nums' }}>
                {hitRatio.toFixed(1)}%
              </p>
            </div>
          </div>
        )}
      </div>

      {!hasData ? (
        <div style={{ padding: '40px 16px', textAlign: 'center', color: '#52525b', fontSize: '13px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.5 }}>~</div>
          {t('noCacheData')}
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Legend */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {members.map((member) => (
              <div key={member} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: getMemberColor(member) }} />
                <span style={{
                  fontSize: '11px', color: '#71717a',
                  maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{member}</span>
              </div>
            ))}
          </div>

          <div style={{ flex: 1, minHeight: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  {members.map((member, idx) => (
                    <linearGradient key={idx} id={`${gradientId}-m${idx}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={getMemberColor(member)} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={getMemberColor(member)} stopOpacity={0} />
                    </linearGradient>
                  ))}
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
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                />
                {members.map((member, idx) => (
                  <Area
                    key={member}
                    type="monotone"
                    dataKey={member}
                    name={member}
                    stroke={getMemberColor(member)}
                    strokeWidth={2}
                    fill={`url(#${gradientId}-m${idx})`}
                    dot={false}
                    stackId="1"
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
