'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import type { MemberPlan } from '@/lib/types';
import { getMemberColor } from '@/lib/colors';
import { getInitial } from '@/lib/member-utils';
import { formatTokens } from '@/lib/formatters';
import { api, type MemberSummary } from '@/lib/api-client';

interface Props {
  data: MemberSummary[];
  memberPlans?: MemberPlan[];
  previousWeekTop?: MemberSummary[];
}

const RANK_STYLES: Record<number, { badge: string; color: string }> = {
  0: { badge: '#f59e0b', color: '#fafafa' },
  1: { badge: '#71717a', color: '#fafafa' },
  2: { badge: '#92400e', color: '#fcd34d' },
};

const MEDAL_COLORS = [
  { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)', text: '#f59e0b', label: '1st' },
  { bg: 'rgba(161,161,170,0.12)', border: 'rgba(161,161,170,0.3)', text: '#a1a1aa', label: '2nd' },
  { bg: 'rgba(180,83,9,0.12)', border: 'rgba(180,83,9,0.3)', text: '#d97706', label: '3rd' },
];

function getWeekRangeLabel(offset: number = 0): string {
  const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
  const nowKST = new Date(Date.now() + KST_OFFSET_MS);
  const day = nowKST.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  const currentMonday = new Date(nowKST);
  currentMonday.setUTCDate(nowKST.getUTCDate() - diff);
  currentMonday.setUTCHours(0, 0, 0, 0);

  const targetMonday = new Date(currentMonday);
  targetMonday.setUTCDate(currentMonday.getUTCDate() + offset * 7);

  const mon = targetMonday.getUTCMonth() + 1;
  const date = targetMonday.getUTCDate();

  if (offset === 0) {
    const todayMon = nowKST.getUTCMonth() + 1;
    const todayDate = nowKST.getUTCDate();
    return `${mon}/${date} ~ ${todayMon}/${todayDate}`;
  }

  const sunday = new Date(targetMonday);
  sunday.setUTCDate(targetMonday.getUTCDate() + 6);
  return `${mon}/${date} ~ ${sunday.getUTCMonth() + 1}/${sunday.getUTCDate()}`;
}

const PLAN_BADGE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  max5: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', text: '#34d399' },
  max20: { bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)', text: '#818cf8' },
};

export function MemberTable({ data: initialData, memberPlans = [], previousWeekTop: initialPreviousWeekTop = [] }: Props) {
  const t = useTranslations('member');
  const tc = useTranslations('common');
  const [weekOffset, setWeekOffset] = useState(0);
  // Only store fetched data for past weeks; current week uses props directly.
  const [fetchedData, setFetchedData] = useState<MemberSummary[] | null>(null);
  const [fetchedPreviousWeekTop, setFetchedPreviousWeekTop] = useState<MemberSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Derive: use props for current week, fetched data for past weeks.
  const data = weekOffset === 0 ? initialData : (fetchedData ?? []);
  const previousWeekTop = weekOffset === 0 ? initialPreviousWeekTop : (fetchedPreviousWeekTop ?? []);

  const navigateWeek = useCallback(async (newOffset: number) => {
    if (newOffset > 0) return;
    setWeekOffset(newOffset);

    if (newOffset === 0) {
      setFetchedData(null);
      setFetchedPreviousWeekTop(null);
      return;
    }

    setLoading(true);
    setFetchError(null);
    try {
      const result = await api.getWeeklyRanking(newOffset);
      setFetchedData(result.weeklyRanking);
      setFetchedPreviousWeekTop(result.previousWeekTop);
    } catch {
      setFetchError(tc('failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [tc]);

  const sorted = [...data].sort((a, b) => b.totalCost - a.totalCost);
  const maxCost = sorted[0]?.totalCost || 1;

  const header = (
    <div style={{ marginBottom: '20px' }}>
      <h2
        style={{
          fontSize: '15px',
          fontWeight: 600,
          color: '#fafafa',
          letterSpacing: '-0.01em',
          marginBottom: '6px',
        }}
      >
        {t('weeklyRanking')}
      </h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          onClick={() => navigateWeek(weekOffset - 1)}
          disabled={loading}
          style={{
            background: 'none',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '6px',
            color: '#a1a1aa',
            cursor: loading ? 'wait' : 'pointer',
            padding: '2px 6px',
            fontSize: '12px',
            lineHeight: 1,
            transition: 'all 0.15s ease',
            minWidth: '44px',
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = '#e4e4e7'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#a1a1aa'; }}
        >
          ←
        </button>
        <span style={{ fontSize: '12px', color: '#71717a', minWidth: '100px', textAlign: 'center' }}>
          {loading ? '...' : getWeekRangeLabel(weekOffset)}
        </span>
        <button
          onClick={() => navigateWeek(weekOffset + 1)}
          disabled={weekOffset >= 0 || loading}
          style={{
            background: 'none',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '6px',
            color: weekOffset >= 0 ? '#27272a' : '#a1a1aa',
            cursor: weekOffset >= 0 || loading ? 'default' : 'pointer',
            padding: '2px 6px',
            fontSize: '12px',
            lineHeight: 1,
            transition: 'all 0.15s ease',
            minWidth: '44px',
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => { if (weekOffset < 0 && !loading) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = '#e4e4e7'; } }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = weekOffset >= 0 ? '#27272a' : '#a1a1aa'; }}
        >
          →
        </button>
        {weekOffset < 0 && (
          <button
            onClick={() => navigateWeek(0)}
            disabled={loading}
            style={{
              background: 'rgba(99,102,241,0.15)',
              border: '1px solid rgba(99,102,241,0.3)',
              borderRadius: '6px',
              color: '#818cf8',
              cursor: loading ? 'wait' : 'pointer',
              padding: '2px 8px',
              fontSize: '11px',
              fontWeight: 500,
              lineHeight: '18px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.25)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.15)'; }}
          >
            {tc('thisWeek')}
          </button>
        )}
      </div>
      {weekOffset === 0 && (
        <p style={{ fontSize: '10px', color: '#3f3f46', marginTop: '2px' }}>{tc('mondayReset')}</p>
      )}
    </div>
  );

  if (sorted.length === 0) {
    return (
      <div className="glass-card" style={{ borderRadius: '16px', padding: '24px' }}>
        {header}
        {fetchError && (
          <div style={{ fontSize: '12px', color: '#f87171', marginBottom: '12px', padding: '8px 10px', borderRadius: '8px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{fetchError}</span>
            <button
              onClick={() => setFetchError(null)}
              style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '12px', padding: '0 4px' }}
            >
              ✕
            </button>
          </div>
        )}
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
      {/* Header with navigation */}
      {header}

      {/* Fetch error */}
      {fetchError && (
        <div style={{ fontSize: '12px', color: '#f87171', marginBottom: '12px', padding: '8px 10px', borderRadius: '8px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{fetchError}</span>
          <button
            onClick={() => setFetchError(null)}
            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '12px', padding: '0 4px' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Previous week podium */}
      {previousWeekTop.length > 0 && (
        <div style={{
          marginBottom: '16px',
          padding: '12px',
          borderRadius: '10px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          <p style={{ fontSize: '10px', color: '#52525b', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '10px' }}>
            {t('previousWeekTop3', { label: weekOffset === 0 ? tc('lastWeek') : tc('weekBefore') })}
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            {previousWeekTop.map((m, i) => {
              const medal = MEDAL_COLORS[i];
              return (
                <div
                  key={m.displayName}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: medal.bg,
                    border: `1px solid ${medal.border}`,
                    textAlign: 'center',
                  }}
                >
                  <span style={{ fontSize: '9px', fontWeight: 700, color: medal.text, letterSpacing: '0.04em' }}>
                    {medal.label}
                  </span>
                  <p
                    title={m.displayName}
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#e4e4e7',
                      marginTop: '4px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {m.displayName}
                  </p>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: medal.text, marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
                    ${m.totalCost.toFixed(2)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {sorted.map((m, idx) => {
          const pct = (m.totalCost / maxCost) * 100;
          const color = getMemberColor(m.displayName);
          const rankStyle = RANK_STYLES[idx];
          const showDivider = idx === 10 || idx === 15;

          return (
            <div key={m.displayName}>
              {showDivider && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  margin: '6px 12px',
                }}>
                  <div style={{
                    flex: 1,
                    height: '1px',
                    background: idx === 10
                      ? 'linear-gradient(90deg, rgba(245,158,11,0.4) 0%, rgba(245,158,11,0.1) 100%)'
                      : 'linear-gradient(90deg, rgba(113,113,122,0.3) 0%, rgba(113,113,122,0.08) 100%)',
                  }} />
                  <span style={{
                    fontSize: '9px',
                    fontWeight: 600,
                    color: idx === 10 ? '#f59e0b' : '#52525b',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    flexShrink: 0,
                  }}>
                    {idx === 10 ? 'TOP 10' : 'TOP 15'}
                  </span>
                  <div style={{
                    flex: 1,
                    height: '1px',
                    background: idx === 10
                      ? 'linear-gradient(90deg, rgba(245,158,11,0.1) 0%, rgba(245,158,11,0.4) 100%)'
                      : 'linear-gradient(90deg, rgba(113,113,122,0.08) 0%, rgba(113,113,122,0.3) 100%)',
                  }} />
                </div>
              )}
            <div
              style={{
                borderRadius: '10px',
                padding: '12px',
                transition: 'background 0.15s ease',
                cursor: 'default',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = 'transparent';
              }}
            >
              {/* Top row: rank, avatar, name, cost */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                {/* Rank */}
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: rankStyle ? rankStyle.color : '#52525b',
                    background: rankStyle ? rankStyle.badge : 'transparent',
                    width: '18px',
                    height: '18px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {idx + 1}
                </span>

                {/* Avatar */}
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${color}33 0%, ${color}66 100%)`,
                    border: `1px solid ${color}44`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: color,
                    flexShrink: 0,
                  }}
                >
                  {getInitial(m.displayName)}
                </div>

                {/* Name + Plan badge */}
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    title={m.displayName}
                    style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      color: '#e4e4e7',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {m.displayName}
                  </span>
                  {(() => {
                    const plan = memberPlans.find(p => p.displayName === m.displayName);
                    if (!plan) return null;
                    const badgeColor = PLAN_BADGE_COLORS[plan.planName] || PLAN_BADGE_COLORS.max5;
                    return (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: badgeColor.bg,
                            border: `1px solid ${badgeColor.border}`,
                            color: badgeColor.text,
                            letterSpacing: '0.02em',
                          }}
                        >
                          {plan.planName}
                        </span>
                        {plan.isPersonal && (
                          <span style={{ fontSize: '9px', color: '#f59e0b', fontWeight: 500 }}>P</span>
                        )}
                        {plan.note && (
                          <span style={{ fontSize: '9px', color: '#71717a' }} title={plan.note}>*</span>
                        )}
                      </span>
                    );
                  })()}
                </div>

                {/* Cost */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#fafafa',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    ${m.totalCost.toFixed(2)}
                  </span>
                  <div style={{ fontSize: '10px', color: '#52525b', marginTop: '1px' }}>
                    {formatTokens(m.totalTokens)} tok
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div
                className="progress-bar"
                style={{ marginLeft: '28px' }}
              >
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${color}88 0%, ${color} 100%)`,
                  }}
                />
              </div>
            </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

