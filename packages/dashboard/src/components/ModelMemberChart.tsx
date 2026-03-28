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
  CartesianGrid,
} from 'recharts';
import { shortModelName } from '@/lib/formatters';
import { MEMBER_COLORS as MODEL_COLORS } from '@/lib/colors';
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
  const sorted = [...payload].filter(e => e.value > 0).sort((a, b) => b.value - a.value);
  if (sorted.length === 0) return null;
  const total = sorted.reduce((s, e) => s + e.value, 0);
  return (
    <div style={{
      background: '#18181b',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '10px',
      padding: '12px 14px',
      boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
      minWidth: '180px',
    }}>
      <p style={{
        fontSize: '12px', color: '#fafafa', fontWeight: 600,
        marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        paddingBottom: '6px',
      }}>
        {label}
      </p>
      {sorted.map((entry) => (
        <div key={entry.name} style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: '12px', marginBottom: '3px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '7px', height: '7px', borderRadius: '2px',
              background: entry.color, flexShrink: 0,
            }} />
            <span style={{
              fontSize: '11px', color: '#a1a1aa',
              maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{shortModelName(entry.name)}</span>
          </div>
          <span style={{
            fontSize: '11px', color: '#fafafa', fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
          }}>
            ${entry.value.toFixed(2)}
          </span>
        </div>
      ))}
      <div style={{
        marginTop: '6px', paddingTop: '6px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '11px', color: '#71717a' }}>Total</span>
        <span style={{ fontSize: '11px', color: '#fafafa', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          ${total.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

export function ModelMemberChart({ data }: Props) {
  const t = useTranslations('charts');
  const tc = useTranslations('common');

  const { chartData, models } = useMemo(() => {
    // Aggregate: member → model → cost
    const memberModelMap = new Map<string, Map<string, number>>();
    for (const d of data) {
      if (!memberModelMap.has(d.displayName)) memberModelMap.set(d.displayName, new Map());
      const mmap = memberModelMap.get(d.displayName)!;
      mmap.set(d.model, (mmap.get(d.model) || 0) + d.costUsd);
    }

    // Get all unique models sorted by total cost
    const modelTotals = new Map<string, number>();
    for (const mmap of memberModelMap.values()) {
      for (const [model, cost] of mmap) {
        modelTotals.set(model, (modelTotals.get(model) || 0) + cost);
      }
    }
    const sortedModels = Array.from(modelTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([m]) => m);

    // Build chart rows: one per member, sorted by total cost desc
    const rows = Array.from(memberModelMap.entries())
      .map(([name, mmap]) => {
        const row: Record<string, string | number> = { name };
        let total = 0;
        for (const model of sortedModels) {
          const cost = mmap.get(model) || 0;
          row[model] = cost;
          total += cost;
        }
        row._total = total;
        return row;
      })
      .sort((a, b) => (b._total as number) - (a._total as number))
      .slice(0, 15); // Top 15 members

    return { chartData: rows, models: sortedModels };
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="glass-card" style={{ borderRadius: '16px', padding: '24px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#fafafa', letterSpacing: '-0.01em', marginBottom: '2px' }}>
            {t('modelMemberTitle')}
          </h2>
          <p style={{ fontSize: '12px', color: '#52525b' }}>{t('modelMemberSub')}</p>
        </div>
        <div style={{ padding: '40px 16px', textAlign: 'center', color: '#52525b', fontSize: '13px' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.5 }}>~</div>
          {tc('noData')}
        </div>
      </div>
    );
  }

  const barHeight = 32;
  const chartHeight = Math.max(250, chartData.length * barHeight + 60);

  return (
    <div className="glass-card" style={{ borderRadius: '16px', padding: '24px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#fafafa', letterSpacing: '-0.01em', marginBottom: '2px' }}>
          {t('modelMemberTitle')}
        </h2>
        <p style={{ fontSize: '12px', color: '#52525b' }}>{t('modelMemberSub')}</p>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {models.map((model, i) => (
          <div key={model} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: MODEL_COLORS[i % MODEL_COLORS.length] }} />
            <span style={{ fontSize: '11px', color: '#a1a1aa' }}>{shortModelName(model)}</span>
          </div>
        ))}
      </div>

      <div style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid horizontal={false} strokeDasharray="0" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              type="number"
              tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toFixed(0)}`}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#52525b', fontSize: 11 }}
            />
            <YAxis
              dataKey="name"
              type="category"
              width={90}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            />
            {models.map((model, i) => (
              <Bar
                key={model}
                dataKey={model}
                name={model}
                stackId="stack"
                fill={MODEL_COLORS[i % MODEL_COLORS.length]}
                fillOpacity={0.85}
                radius={i === models.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
