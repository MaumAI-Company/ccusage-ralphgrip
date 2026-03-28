'use client';

import { useTranslations } from 'next-intl';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { shortModelName } from '@/lib/formatters';

interface ModelData {
  model: string;
  count: number;
  totalCost: number;
}

interface Props {
  data: ModelData[];
}

import { MEMBER_COLORS as COLORS } from '@/lib/colors';

interface PiePayloadEntry {
  name?: string;
  value?: number;
  payload?: { percent?: number };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: PiePayloadEntry[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const entry = payload[0];
  const modelName = typeof entry.name === 'string' ? entry.name : String(entry.name ?? '');
  const value = typeof entry.value === 'number' ? entry.value : 0;
  const pct = typeof entry.payload?.percent === 'number' ? entry.payload.percent : 0;

  return (
    <div
      style={{
        background: '#18181b',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '10px',
        padding: '12px 14px',
        boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
      }}
    >
      <p style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '6px' }}>
        {shortModelName(modelName)}
      </p>
      <p style={{ fontSize: '15px', fontWeight: 700, color: '#fafafa', marginBottom: '2px' }}>
        ${value.toFixed(3)}
      </p>
      <p style={{ fontSize: '11px', color: '#52525b' }}>
        {(pct * 100).toFixed(1)}% of total
      </p>
    </div>
  );
}


export function ModelPieChart({ data }: Props) {
  const t = useTranslations('charts');
  const tc = useTranslations('common');
  const totalCost = data.reduce((s, d) => s + d.totalCost, 0);
  const sorted = [...data].sort((a, b) => b.totalCost - a.totalCost);

  if (data.length === 0) {
    return (
      <div className="glass-card" style={{ borderRadius: '16px', padding: '24px' }}>
        {/* Header */}
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
            {t('modelDistribution')}
          </h2>
          <p style={{ fontSize: '12px', color: '#52525b' }}>{t('modelDistributionSub')}</p>
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
      {/* Header */}
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
          {t('modelDistribution')}
        </h2>
        <p style={{ fontSize: '12px', color: '#52525b' }}>{t('modelDistributionSub')}</p>
      </div>

      {/* Donut chart with center label overlay */}
      <div style={{ position: 'relative' }}>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={sorted}
              dataKey="totalCost"
              nameKey="model"
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={90}
              paddingAngle={2}
              strokeWidth={0}
            >
              {sorted.map((_, i) => (
                <Cell
                  key={i}
                  fill={COLORS[i % COLORS.length]}
                  opacity={0.9}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center total - absolutely centered */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '10px', color: '#52525b', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '2px' }}>
              {tc('total')}
            </p>
            <p
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: '#fafafa',
                letterSpacing: '-0.03em',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              ${totalCost.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
        {sorted.map((d, i) => {
          const pct = totalCost > 0 ? (d.totalCost / totalCost) * 100 : 0;
          return (
            <div
              key={d.model}
              style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
            >
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '2px',
                  background: COLORS[i % COLORS.length],
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: '12px',
                  color: '#a1a1aa',
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {shortModelName(d.model)}
              </span>
              <span style={{ fontSize: '11px', color: '#52525b', flexShrink: 0 }}>
                {pct.toFixed(1)}%
              </span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#e4e4e7',
                  flexShrink: 0,
                  fontVariantNumeric: 'tabular-nums',
                  width: '56px',
                  textAlign: 'right',
                }}
              >
                ${d.totalCost.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
