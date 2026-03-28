'use client';

import { useTranslations } from 'next-intl';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { shortModelName } from '@/lib/formatters';

interface Props {
  data: { model: string; totalCost: number }[];
}

import { MEMBER_COLORS as MODEL_COLORS } from '@/lib/colors';

interface TooltipPayload {
  value: number;
  payload: { model: string; totalCost: number };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const entry = payload[0];
  return (
    <div style={{
      background: '#18181b',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '10px',
      padding: '10px 12px',
      boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
    }}>
      <p style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '4px' }}>
        {shortModelName(entry.payload.model)}
      </p>
      <p style={{ fontSize: '14px', fontWeight: 700, color: '#fafafa', fontVariantNumeric: 'tabular-nums' }}>
        ${entry.value.toFixed(2)}
      </p>
    </div>
  );
}

interface LabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  model: string;
  index: number;
}

function hexLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function renderLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, model, index }: LabelProps) {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const sliceColor = MODEL_COLORS[index % MODEL_COLORS.length];
  const textColor = hexLuminance(sliceColor) > 0.4 ? '#18181b' : '#fafafa';

  return (
    <text x={x} y={y} fill={textColor} textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={600}>
      {shortModelName(model)}
    </text>
  );
}

export function ModelCostChart({ data }: Props) {
  const t = useTranslations('charts');
  const tc = useTranslations('common');
  const sorted = [...data].sort((a, b) => b.totalCost - a.totalCost);
  const total = sorted.reduce((s, d) => s + d.totalCost, 0);

  if (data.length === 0) {
    return (
      <div className="glass-card" style={{ borderRadius: '16px', padding: '24px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#fafafa', letterSpacing: '-0.01em', marginBottom: '2px' }}>
            {t('modelCost')}
          </h2>
          <p style={{ fontSize: '12px', color: '#52525b' }}>{t('modelCostSub')}</p>
        </div>
        <div style={{ padding: '40px 16px', textAlign: 'center', color: '#52525b', fontSize: '13px' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.5 }}>~</div>
          {tc('noData')}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ borderRadius: '16px', padding: '24px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#fafafa', letterSpacing: '-0.01em', marginBottom: '2px' }}>
          {t('modelCost')}
        </h2>
        <p style={{ fontSize: '12px', color: '#52525b' }}>{t('modelCostSub')}</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={sorted}
              dataKey="totalCost"
              nameKey="model"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={90}
              paddingAngle={2}
              label={renderLabel as unknown as undefined}
              labelLine={false}
            >
              {sorted.map((entry, i) => (
                <Cell key={entry.model} fill={MODEL_COLORS[i % MODEL_COLORS.length]} fillOpacity={0.85} stroke="none" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: '12px', justifyContent: 'center' }}>
        {sorted.map((entry, i) => (
          <div key={entry.model} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '2px',
              background: MODEL_COLORS[i % MODEL_COLORS.length],
            }} />
            <span style={{ fontSize: '11px', color: '#a1a1aa' }}>
              {shortModelName(entry.model)}
            </span>
            <span style={{ fontSize: '11px', color: '#52525b', fontVariantNumeric: 'tabular-nums' }}>
              ${entry.totalCost.toFixed(2)} ({total > 0 ? Math.round(entry.totalCost / total * 100) : 0}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
