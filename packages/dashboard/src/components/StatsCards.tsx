'use client';

import { useTranslations } from 'next-intl';

interface Props {
  totalCost: number;
  totalTokens: number;
  memberCount: number;
  sessionCount: number;
  totalTurns?: number;
  cacheHitRatio?: number;
  days?: number;
}

const CARD_DEFS_BASE = [
  {
    key: 'cost',
    icon: '$',
    accentColor: '#6366f1',
    glowColor: 'rgba(99,102,241,0.12)',
    borderTopColor: 'rgba(99,102,241,0.5)',
  },
  {
    key: 'members',
    icon: '⬡',
    accentColor: '#f59e0b',
    glowColor: 'rgba(245,158,11,0.12)',
    borderTopColor: 'rgba(245,158,11,0.5)',
  },
  {
    key: 'sessions',
    icon: '◎',
    accentColor: '#f43f5e',
    glowColor: 'rgba(244,63,94,0.12)',
    borderTopColor: 'rgba(244,63,94,0.5)',
  },
];

const TOKENS_CARD = {
  key: 'tokens',
  icon: '◈',
  accentColor: '#10b981',
  glowColor: 'rgba(16,185,129,0.12)',
  borderTopColor: 'rgba(16,185,129,0.5)',
};

const TURNS_CARD = {
  key: 'turns',
  icon: '↯',
  accentColor: '#10b981',
  glowColor: 'rgba(16,185,129,0.12)',
  borderTopColor: 'rgba(16,185,129,0.5)',
};

const AVG_COST_CARD = {
  key: 'avgCost',
  icon: '⌀',
  accentColor: '#8b5cf6',
  glowColor: 'rgba(139,92,246,0.12)',
  borderTopColor: 'rgba(139,92,246,0.5)',
};

const CACHE_HIT_CARD = {
  key: 'cacheHit',
  icon: '⚡',
  accentColor: '#06b6d4',
  glowColor: 'rgba(6,182,212,0.12)',
  borderTopColor: 'rgba(6,182,212,0.5)',
};

const BURN_RATE_CARD = {
  key: 'burnRate',
  icon: '↗',
  accentColor: '#f97316',
  glowColor: 'rgba(249,115,22,0.12)',
  borderTopColor: 'rgba(249,115,22,0.5)',
};

export function StatsCards({ totalCost, totalTokens, memberCount, sessionCount, totalTurns, cacheHitRatio, days }: Props) {
  const t = useTranslations('stats');
  const labels: Record<string, string> = {
    cost: t('totalCost'),
    members: t('teamMembers'),
    sessions: t('sessionCount'),
    tokens: t('totalTokens'),
    turns: t('apiRequests'),
    avgCost: t('avgCostSession'),
    cacheHit: t('cacheHitRatio'),
    burnRate: t('dailyBurnRate'),
  };

  const showTurns = typeof totalTurns === 'number' && totalTurns > 0;
  const secondCard = showTurns ? TURNS_CARD : TOKENS_CARD;
  const extraCards = [AVG_COST_CARD, BURN_RATE_CARD];
  const CARD_DEFS = [CARD_DEFS_BASE[0], secondCard, ...CARD_DEFS_BASE.slice(1), ...extraCards];

  const avgCostPerSession = sessionCount > 0 ? totalCost / sessionCount : 0;
  const dailyBurnRate = days && days > 0 ? totalCost / days : 0;

  const values: Record<string, string> = {
    cost: `$${totalCost.toFixed(2)}`,
    tokens: formatNumber(totalTokens),
    turns: formatNumber(totalTurns ?? 0),
    members: String(memberCount),
    sessions: String(sessionCount),
    avgCost: `$${avgCostPerSession.toFixed(2)}`,
    cacheHit: cacheHitRatio != null ? `${cacheHitRatio.toFixed(1)}%` : 'N/A',
    burnRate: `$${dailyBurnRate.toFixed(2)}/d`,
  };

  return (
    <div
      className="grid"
      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}
    >
      {CARD_DEFS.map((def) => (
        <StatCard
          key={def.key}
          label={labels[def.key]}
          value={values[def.key as keyof typeof values]}
          icon={def.icon}
          accentColor={def.accentColor}
          glowColor={def.glowColor}
          borderTopColor={def.borderTopColor}
        />
      ))}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  accentColor: string;
  glowColor: string;
  borderTopColor: string;
}

function StatCard({ label, value, icon, accentColor, glowColor, borderTopColor }: StatCardProps) {
  return (
    <div
      className="glass-card"
      style={{
        borderRadius: '12px',
        padding: '20px',
        borderTop: `1px solid ${borderTopColor}`,
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = 'translateY(-2px)';
        el.style.boxShadow = `0 8px 32px ${glowColor}`;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = 'none';
      }}
    >
      {/* Background glow blob */}
      <div
        style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: glowColor,
          filter: 'blur(20px)',
          pointerEvents: 'none',
        }}
      />

      {/* Icon badge */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: glowColor,
          border: `1px solid ${borderTopColor}`,
          color: accentColor,
          fontSize: '14px',
          marginBottom: '12px',
        }}
      >
        {icon}
      </div>

      {/* Label */}
      <p
        style={{
          fontSize: '11px',
          fontWeight: 500,
          color: '#71717a',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          marginBottom: '4px',
        }}
      >
        {label}
      </p>

      {/* Value */}
      <p
        style={{
          fontSize: '26px',
          fontWeight: 700,
          color: '#fafafa',
          letterSpacing: '-0.03em',
          lineHeight: 1.1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </p>
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
