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
  Legend,
} from 'recharts';

interface ToolDailyEntry {
  date: string;
  toolName: string;
  totalCalls: number;
  totalAccepts: number;
  totalRejects: number;
}

interface Props {
  data?: ToolDailyEntry[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const EDIT_WRITE_TOOLS = ['Edit', 'Write', 'MultiEdit'];

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
  const t = useTranslations('charts');
  if (!active || !payload || !payload.length) return null;
  const sorted = [...payload].sort((a, b) => (b.value || 0) - (a.value || 0));
  const accepts = payload.find((p) => p.name === 'Accepts')?.value ?? 0;
  const rejects = payload.find((p) => p.name === 'Rejects')?.value ?? 0;
  const total = accepts + rejects;
  const rate = total > 0 ? ((accepts / total) * 100).toFixed(1) : '—';

  return (
    <div
      style={{
        background: '#18181b',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '10px',
        padding: '12px 14px',
        boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
        minWidth: '150px',
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
          <span style={{ fontSize: '12px', color: '#fafafa', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {entry.value}
          </span>
        </div>
      ))}
      {total > 0 && (
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            marginTop: '8px',
            paddingTop: '8px',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '11px', color: '#71717a' }}>{t('approvalRate')}</span>
          <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 700 }}>{rate}%</span>
        </div>
      )}
    </div>
  );
}

export function ToolAcceptRejectChart({ data }: Props) {
  const t = useTranslations('charts');
  const tc = useTranslations('common');
  const isEmpty = !data || data.length === 0;

  if (isEmpty) {
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
            {t('editWriteTrend')}
          </h2>
          <p style={{ fontSize: '12px', color: '#52525b' }}>{t('editWriteTrendSub')}</p>
        </div>
        <div
          style={{
            height: '200px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <p style={{ color: '#52525b', fontSize: '13px' }}>{tc('collectingData')}</p>
        </div>
      </div>
    );
  }

  // Filter to Edit/Write tools and aggregate by date
  const filtered = data.filter((d) => EDIT_WRITE_TOOLS.includes(d.toolName));
  const dateMap = new Map<string, { accepts: number; rejects: number }>();
  for (const entry of filtered) {
    const existing = dateMap.get(entry.date) ?? { accepts: 0, rejects: 0 };
    existing.accepts += entry.totalAccepts;
    existing.rejects += entry.totalRejects;
    dateMap.set(entry.date, existing);
  }

  const chartData = Array.from(dateMap.entries())
    .map(([date, vals]) => ({ date, Accepts: vals.accepts, Rejects: vals.rejects }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (chartData.length === 0) {
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
            {t('editWriteTrend')}
          </h2>
          <p style={{ fontSize: '12px', color: '#52525b' }}>{t('editWriteTrendSub')}</p>
        </div>
        <div
          style={{
            height: '200px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <p style={{ color: '#52525b', fontSize: '13px' }}>{tc('collectingData')}</p>
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
          {t('editWriteTrend')}
        </h2>
        <p style={{ fontSize: '12px', color: '#52525b' }}>{t('editWriteTrendSub')}</p>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} barSize={14} barCategoryGap="30%">
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
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#52525b', fontSize: 11 }}
            width={36}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 4 }}
          />
          <Legend
            wrapperStyle={{ fontSize: '11px', color: '#71717a', paddingTop: '12px' }}
            formatter={(value) => (
              <span style={{ color: '#71717a', fontSize: '11px' }}>{value}</span>
            )}
          />
          <Bar
            dataKey="Accepts"
            stackId="ar"
            fill="#10b981"
            fillOpacity={0.85}
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="Rejects"
            stackId="ar"
            fill="#ef4444"
            fillOpacity={0.85}
            radius={[3, 3, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
