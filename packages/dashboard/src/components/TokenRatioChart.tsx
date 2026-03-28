'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { getMemberColor } from '@/lib/colors';
import { TruncatedAxisTick } from './TruncatedAxisTick';
import { formatTokens } from '@/lib/formatters';
import type { DailyEntry } from '@/lib/api-client';

interface Props {
  data: DailyEntry[];
}

interface RatioEntry {
  name: string;
  ratio: number;
  displayValue: number;
  bias: 'output' | 'input';
  inputTokens: number;
  outputTokens: number;
}

interface TooltipPayload {
  value: number;
  payload: RatioEntry;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const entry = payload[0].payload;
  const biasLabel = entry.bias === 'output' ? 'Output' : 'Input';
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
      <p style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '6px' }}>
        {entry.name}
      </p>
      <p style={{ fontSize: '14px', fontWeight: 700, color: '#fafafa', fontVariantNumeric: 'tabular-nums', marginBottom: '4px' }}>
        {entry.ratio.toFixed(2)}x {biasLabel}
      </p>
      <p style={{ fontSize: '11px', color: '#71717a', fontVariantNumeric: 'tabular-nums' }}>
        Input: {formatTokens(entry.inputTokens)} &middot; Output: {formatTokens(entry.outputTokens)}
      </p>
    </div>
  );
}

export function TokenRatioChart({ data }: Props) {
  const t = useTranslations('charts');
  const tc = useTranslations('common');
  const { chartData, maxAbsValue } = useMemo(() => {
    const memberMap = new Map<string, { input: number; output: number }>();
    for (const entry of data) {
      const cur = memberMap.get(entry.displayName) ?? { input: 0, output: 0 };
      cur.input += entry.inputTokens;
      cur.output += entry.outputTokens;
      memberMap.set(entry.displayName, cur);
    }
    const items = Array.from(memberMap.entries())
      .filter(([, v]) => v.input > 0 && v.output > 0)
      .map(([name, v]): RatioEntry => {
        const ratio = Math.max(v.output, v.input) / Math.min(v.output, v.input);
        const bias: 'output' | 'input' = v.output >= v.input ? 'output' : 'input';
        // displayValue: positive for output-biased, negative for input-biased
        const displayValue = bias === 'output' ? (ratio - 1) : -(ratio - 1);
        return {
          name,
          ratio,
          displayValue,
          bias,
          inputTokens: v.input,
          outputTokens: v.output,
        };
      })
      .sort((a, b) => b.ratio - a.ratio);

    const maxAbs = items.reduce((max, d) => Math.max(max, Math.abs(d.displayValue)), 0);

    return { chartData: items, maxAbsValue: maxAbs };
  }, [data]);

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
            {t('tokenRatioTitle')}
          </h2>
          <p style={{ fontSize: '12px', color: '#52525b' }}>{t('tokenRatioSub')}</p>
        </div>
        <div style={{ padding: '40px 16px', textAlign: 'center', color: '#52525b', fontSize: '13px' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.5 }}>~</div>
          {tc('noData')}
        </div>
      </div>
    );
  }

  // Symmetric domain so the ReferenceLine sits at center
  const domainMax = Math.ceil(maxAbsValue * 10) / 10 || 1;

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
          {t('tokenRatioTitle')}
        </h2>
        <p style={{ fontSize: '12px', color: '#52525b' }}>
          <span style={{ color: '#f59e0b' }}>{t('inputBias')}</span>
          {' ← 1.0x → '}
          <span style={{ color: '#6366f1' }}>{t('outputBias')}</span>
        </p>
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
            domain={[-domainMax, domainMax]}
            tickFormatter={(v: number) => `${(Math.abs(v) + 1).toFixed(1)}x`}
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
          <ReferenceLine
            x={0}
            stroke="rgba(255,255,255,0.15)"
            strokeDasharray="3 3"
          />
          <Bar dataKey="displayValue" radius={3} fillOpacity={0.9}>
            {chartData.map((entry) => (
              <Cell
                key={entry.name}
                fill={getMemberColor(entry.name)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
