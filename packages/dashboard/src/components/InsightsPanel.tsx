'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { shortModelName } from '@/lib/formatters';
import type { DailyEntry, MemberSummary, ModelSummary } from '@/lib/api-client';

interface Props {
  daily: DailyEntry[];
  members: MemberSummary[];
  models: ModelSummary[];
  totalCost: number;
  sessionCount: number;
  days: number;
  teamMemberCount: number;
}

interface Insight {
  icon: string;
  label: string;
  value: string;
  detail: string;
  color: string;
  severity: 'info' | 'good' | 'warn' | 'alert';
}

const SEVERITY_COLORS = {
  info: { bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)', text: '#a5b4fc' },
  good: { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)', text: '#4ade80' },
  warn: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', text: '#fbbf24' },
  alert: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', text: '#f87171' },
};

export function InsightsPanel({ daily, members, models, totalCost, sessionCount, days, teamMemberCount }: Props) {
  const t = useTranslations('insights');

  const insights = useMemo(() => {
    const results: Insight[] = [];
    if (daily.length === 0) return results;

    // --- Cost projection ---
    const dailyBurn = days > 0 ? totalCost / days : 0;
    const monthProjection = dailyBurn * 30;
    results.push({
      icon: '~',
      label: t('monthProjection'),
      value: `$${monthProjection >= 1000 ? `${(monthProjection / 1000).toFixed(1)}K` : monthProjection.toFixed(0)}`,
      detail: t('monthProjectionDetail', { daily: dailyBurn.toFixed(2) }),
      color: '#a5b4fc',
      severity: monthProjection > 50000 ? 'alert' : monthProjection > 20000 ? 'warn' : 'info',
    });

    // --- Top model concentration ---
    if (models.length > 0) {
      const topModel = models[0];
      const topPct = totalCost > 0 ? (topModel.totalCost / totalCost * 100) : 0;
      const isOpus = topModel.model.toLowerCase().includes('opus');
      results.push({
        icon: '#',
        label: t('topModel'),
        value: shortModelName(topModel.model),
        detail: t('topModelDetail', { pct: topPct.toFixed(0), cost: topModel.totalCost.toFixed(0) }),
        color: '#c4b5fd',
        severity: isOpus && topPct > 70 ? 'warn' : 'info',
      });
    }

    // --- Most active member ---
    if (members.length > 0) {
      const top = members[0];
      const topPct = totalCost > 0 ? (top.totalCost / totalCost * 100) : 0;
      results.push({
        icon: '^',
        label: t('topMember'),
        value: top.displayName,
        detail: t('topMemberDetail', { pct: topPct.toFixed(0), cost: top.totalCost.toFixed(0) }),
        color: '#fbbf24',
        severity: topPct > 50 ? 'warn' : 'info',
      });
    }

    // --- Top 3 concentration ---
    if (members.length >= 3) {
      const top3Cost = members.slice(0, 3).reduce((s, m) => s + m.totalCost, 0);
      const top3Pct = totalCost > 0 ? (top3Cost / totalCost * 100) : 0;
      results.push({
        icon: '=',
        label: t('top3Concentration'),
        value: `${top3Pct.toFixed(0)}%`,
        detail: t('top3Detail', { names: members.slice(0, 3).map(m => m.displayName).join(', ') }),
        color: '#fb923c',
        severity: top3Pct > 80 ? 'warn' : 'info',
      });
    }

    // --- Avg cost per member ---
    if (teamMemberCount > 0) {
      const avgPerMember = totalCost / teamMemberCount;
      results.push({
        icon: '/',
        label: t('avgPerMember'),
        value: `$${avgPerMember.toFixed(2)}`,
        detail: t('avgPerMemberDetail', { members: teamMemberCount }),
        color: '#34d399',
        severity: 'info',
      });
    }

    // --- Session efficiency ---
    if (sessionCount > 0) {
      const avgCostPerSession = totalCost / sessionCount;
      const avgTokensPerSession = members.reduce((s, m) => s + m.totalTokens, 0) / sessionCount;
      results.push({
        icon: '%',
        label: t('sessionEfficiency'),
        value: `$${avgCostPerSession.toFixed(2)}/ses`,
        detail: t('sessionEfficiencyDetail', {
          tokens: avgTokensPerSession >= 1000 ? `${(avgTokensPerSession / 1000).toFixed(1)}K` : avgTokensPerSession.toFixed(0),
        }),
        color: '#f472b6',
        severity: avgCostPerSession > 20 ? 'warn' : 'info',
      });
    }

    // --- Cache savings estimate ---
    let totalCacheRead = 0, totalCacheCreate = 0, totalInput = 0;
    for (const d of daily) {
      totalCacheRead += d.cacheReadTokens || 0;
      totalCacheCreate += d.cacheCreationTokens || 0;
      totalInput += d.inputTokens || 0;
    }
    const cacheTotal = totalCacheRead + totalCacheCreate;
    if (cacheTotal > 0) {
      const hitRatio = totalCacheRead / cacheTotal * 100;
      const estimatedSavings = totalCacheRead * 0.000002; // rough ~$2/M saved vs full price
      results.push({
        icon: '!',
        label: t('cacheSavings'),
        value: `~$${estimatedSavings >= 100 ? estimatedSavings.toFixed(0) : estimatedSavings.toFixed(2)}`,
        detail: t('cacheSavingsDetail', { ratio: hitRatio.toFixed(1) }),
        color: '#22d3ee',
        severity: hitRatio > 80 ? 'good' : hitRatio > 50 ? 'info' : 'warn',
      });
    }

    // --- Peak usage day ---
    const dailyCostMap = new Map<string, number>();
    for (const d of daily) {
      dailyCostMap.set(d.date, (dailyCostMap.get(d.date) || 0) + d.costUsd);
    }
    if (dailyCostMap.size > 1) {
      let peakDate = '', peakCost = 0;
      for (const [date, cost] of dailyCostMap) {
        if (cost > peakCost) { peakDate = date; peakCost = cost; }
      }
      const d = new Date(peakDate);
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      results.push({
        icon: '*',
        label: t('peakDay'),
        value: `${d.getMonth() + 1}/${d.getDate()} (${dayNames[d.getDay()]})`,
        detail: t('peakDayDetail', { cost: peakCost.toFixed(2) }),
        color: '#e879f9',
        severity: peakCost > dailyBurn * 3 ? 'alert' : 'info',
      });
    }

    // --- Weekend vs weekday ---
    let weekdayCost = 0, weekendCost = 0, weekdayDays = 0, weekendDays = 0;
    for (const [date, cost] of dailyCostMap) {
      const dow = new Date(date).getDay();
      if (dow === 0 || dow === 6) { weekendCost += cost; weekendDays++; }
      else { weekdayCost += cost; weekdayDays++; }
    }
    if (weekdayDays > 0 && weekendDays > 0) {
      const weekdayAvg = weekdayCost / weekdayDays;
      const weekendAvg = weekendCost / weekendDays;
      const ratio = weekdayAvg > 0 ? weekendAvg / weekdayAvg : 0;
      results.push({
        icon: '&',
        label: t('weekendUsage'),
        value: `${(ratio * 100).toFixed(0)}%`,
        detail: t('weekendDetail', { weekday: weekdayAvg.toFixed(0), weekend: weekendAvg.toFixed(0) }),
        color: '#94a3b8',
        severity: ratio > 0.8 ? 'info' : ratio > 0.3 ? 'good' : 'info',
      });
    }

    // --- Model diversity ---
    if (models.length > 1) {
      const activeModels = models.filter(m => m.totalCost > 0).length;
      results.push({
        icon: '+',
        label: t('modelDiversity'),
        value: `${activeModels} models`,
        detail: t('modelDiversityDetail', { top: shortModelName(models[0].model), count: activeModels }),
        color: '#a78bfa',
        severity: activeModels === 1 ? 'warn' : 'info',
      });
    }

    // --- Cost trend (first half vs second half of period) ---
    if (dailyCostMap.size >= 4) {
      const sortedDays = Array.from(dailyCostMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      const mid = Math.floor(sortedDays.length / 2);
      const firstHalf = sortedDays.slice(0, mid).reduce((s, [, c]) => s + c, 0) / mid;
      const secondHalf = sortedDays.slice(mid).reduce((s, [, c]) => s + c, 0) / (sortedDays.length - mid);
      const change = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf * 100) : 0;
      results.push({
        icon: change > 0 ? '>' : '<',
        label: t('costTrend'),
        value: `${change > 0 ? '+' : ''}${change.toFixed(0)}%`,
        detail: t('costTrendDetail', { first: firstHalf.toFixed(0), second: secondHalf.toFixed(0) }),
        color: change > 20 ? '#f87171' : change < -20 ? '#4ade80' : '#a1a1aa',
        severity: change > 50 ? 'alert' : change > 20 ? 'warn' : change < -20 ? 'good' : 'info',
      });
    }

    // --- Opus savings potential ---
    const opusCost = models.filter(m => m.model.toLowerCase().includes('opus')).reduce((s, m) => s + m.totalCost, 0);
    if (opusCost > 0 && totalCost > 0) {
      const opusPct = opusCost / totalCost * 100;
      const potentialSaving = opusCost * 0.7; // ~70% cheaper with Sonnet
      results.push({
        icon: '$',
        label: t('opusSavings'),
        value: `~$${potentialSaving >= 1000 ? `${(potentialSaving / 1000).toFixed(1)}K` : potentialSaving.toFixed(0)}`,
        detail: t('opusSavingsDetail', { pct: opusPct.toFixed(0) }),
        color: '#f59e0b',
        severity: opusPct > 60 ? 'warn' : 'info',
      });
    }

    // --- I/O token ratio ---
    let totalOutputTokens = 0, totalInputTokens = 0;
    for (const d of daily) {
      totalInputTokens += d.inputTokens || 0;
      totalOutputTokens += d.outputTokens || 0;
    }
    if (totalInputTokens > 0) {
      const ioRatio = totalOutputTokens / totalInputTokens;
      results.push({
        icon: '~',
        label: t('ioRatio'),
        value: `1:${ioRatio.toFixed(2)}`,
        detail: t('ioRatioDetail', {
          input: totalInputTokens >= 1e6 ? `${(totalInputTokens / 1e6).toFixed(1)}M` : `${(totalInputTokens / 1e3).toFixed(0)}K`,
          output: totalOutputTokens >= 1e6 ? `${(totalOutputTokens / 1e6).toFixed(1)}M` : `${(totalOutputTokens / 1e3).toFixed(0)}K`,
        }),
        color: '#60a5fa',
        severity: ioRatio > 2 ? 'warn' : 'info',
      });
    }

    // --- Active days ratio ---
    if (days > 0) {
      const activeDays = dailyCostMap.size;
      const activePct = (activeDays / days) * 100;
      results.push({
        icon: '@',
        label: t('activeDays'),
        value: `${activeDays}/${days}d`,
        detail: t('activeDaysDetail', { pct: activePct.toFixed(0) }),
        color: '#2dd4bf',
        severity: activePct < 30 ? 'warn' : activePct > 90 ? 'good' : 'info',
      });
    }

    // --- Cost volatility (std dev / mean) ---
    if (dailyCostMap.size >= 5) {
      const costs = Array.from(dailyCostMap.values());
      const mean = costs.reduce((s, c) => s + c, 0) / costs.length;
      const variance = costs.reduce((s, c) => s + (c - mean) ** 2, 0) / costs.length;
      const stdDev = Math.sqrt(variance);
      const cv = mean > 0 ? (stdDev / mean * 100) : 0;
      results.push({
        icon: '?',
        label: t('volatility'),
        value: `${cv.toFixed(0)}%`,
        detail: t('volatilityDetail', { avg: mean.toFixed(0), std: stdDev.toFixed(0) }),
        color: '#fb7185',
        severity: cv > 100 ? 'alert' : cv > 60 ? 'warn' : 'info',
      });
    }

    // --- Idle members ---
    const activeMembers = new Set(daily.map(d => d.displayName));
    const idleCount = Math.max(0, teamMemberCount - activeMembers.size);
    if (idleCount > 0) {
      results.push({
        icon: '-',
        label: t('idleMembers'),
        value: `${idleCount}`,
        detail: t('idleMembersDetail', { active: activeMembers.size, total: teamMemberCount }),
        color: '#71717a',
        severity: idleCount > teamMemberCount * 0.5 ? 'warn' : 'info',
      });
    }

    // --- Multi-model members ---
    const memberModels = new Map<string, Set<string>>();
    for (const d of daily) {
      if (!memberModels.has(d.displayName)) memberModels.set(d.displayName, new Set());
      memberModels.get(d.displayName)!.add(d.model);
    }
    const multiModelUsers = Array.from(memberModels.values()).filter(s => s.size > 1).length;
    if (activeMembers.size > 0) {
      results.push({
        icon: '^',
        label: t('multiModel'),
        value: `${multiModelUsers}/${activeMembers.size}`,
        detail: t('multiModelDetail', { pct: (multiModelUsers / activeMembers.size * 100).toFixed(0) }),
        color: '#c084fc',
        severity: 'info',
      });
    }

    // --- Cost per 1K tokens ---
    const allTokens = totalInputTokens + totalOutputTokens + totalCacheRead + totalCacheCreate;
    if (allTokens > 0) {
      const costPer1K = (totalCost / allTokens) * 1000;
      results.push({
        icon: '.',
        label: t('costPerToken'),
        value: `$${costPer1K.toFixed(4)}/1K`,
        detail: t('costPerTokenDetail', { tokens: allTokens >= 1e6 ? `${(allTokens / 1e6).toFixed(1)}M` : `${(allTokens / 1e3).toFixed(0)}K` }),
        color: '#fca5a5',
        severity: costPer1K > 0.02 ? 'warn' : 'info',
      });
    }

    // --- Longest usage streak ---
    if (dailyCostMap.size >= 2) {
      const sortedDates = Array.from(dailyCostMap.keys()).sort();
      let maxStreak = 1, curStreak = 1;
      for (let i = 1; i < sortedDates.length; i++) {
        const prev = new Date(sortedDates[i - 1]);
        const curr = new Date(sortedDates[i]);
        const diffDays = (curr.getTime() - prev.getTime()) / 86400000;
        if (diffDays === 1) { curStreak++; maxStreak = Math.max(maxStreak, curStreak); }
        else { curStreak = 1; }
      }
      results.push({
        icon: '>',
        label: t('longestStreak'),
        value: `${maxStreak}d`,
        detail: t('longestStreakDetail', { total: sortedDates.length }),
        color: '#34d399',
        severity: maxStreak >= 14 ? 'good' : maxStreak >= 7 ? 'info' : 'warn',
      });
    }

    // --- Daily cost range ---
    if (dailyCostMap.size >= 3) {
      const costs = Array.from(dailyCostMap.values());
      const minCost = Math.min(...costs);
      const maxCost = Math.max(...costs);
      results.push({
        icon: '<>',
        label: t('dailyRange'),
        value: `$${minCost.toFixed(0)}–$${maxCost.toFixed(0)}`,
        detail: t('dailyRangeDetail', { spread: (maxCost / Math.max(minCost, 0.01)).toFixed(1) }),
        color: '#fca5a5',
        severity: maxCost > minCost * 10 ? 'warn' : 'info',
      });
    }

    // --- Heaviest single-day member ---
    const memberDailyCost = new Map<string, { cost: number; date: string }>();
    for (const d of daily) {
      const key = `${d.displayName}|${d.date}`;
      const cur = memberDailyCost.get(key);
      const newCost = (cur?.cost || 0) + d.costUsd;
      memberDailyCost.set(key, { cost: newCost, date: d.date });
    }
    if (memberDailyCost.size > 0) {
      let topKey = '', topVal = { cost: 0, date: '' };
      for (const [key, val] of memberDailyCost) {
        if (val.cost > topVal.cost) { topKey = key; topVal = val; }
      }
      const memberName = topKey.split('|')[0];
      results.push({
        icon: '!',
        label: t('heaviestDay'),
        value: `$${topVal.cost.toFixed(2)}`,
        detail: t('heaviestDayDetail', { member: memberName, date: topVal.date }),
        color: '#ef4444',
        severity: topVal.cost > dailyBurn * 2 ? 'alert' : 'info',
      });
    }

    // --- Usage equality (Gini coefficient) ---
    if (members.length >= 3) {
      const sortedCosts = [...members].map(m => m.totalCost).sort((a, b) => a - b);
      const n = sortedCosts.length;
      const totalSum = sortedCosts.reduce((s, c) => s + c, 0);
      if (totalSum > 0) {
        let giniSum = 0;
        for (let i = 0; i < n; i++) giniSum += (2 * (i + 1) - n - 1) * sortedCosts[i];
        const gini = giniSum / (n * totalSum);
        const equality = ((1 - gini) * 100);
        results.push({
          icon: '=',
          label: t('usageEquality'),
          value: `${equality.toFixed(0)}%`,
          detail: t('usageEqualityDetail', { gini: gini.toFixed(2) }),
          color: equality > 60 ? '#4ade80' : '#fbbf24',
          severity: equality < 30 ? 'warn' : equality > 70 ? 'good' : 'info',
        });
      }
    }

    // --- Tokens per dollar ---
    if (totalCost > 0 && allTokens > 0) {
      const tokPerDollar = allTokens / totalCost;
      results.push({
        icon: '#',
        label: t('tokensPerDollar'),
        value: `${tokPerDollar >= 1000 ? `${(tokPerDollar / 1000).toFixed(1)}K` : tokPerDollar.toFixed(0)}`,
        detail: t('tokensPerDollarDetail'),
        color: '#38bdf8',
        severity: 'info',
      });
    }

    // --- Cost per active day ---
    if (dailyCostMap.size > 0) {
      const costPerActiveDay = totalCost / dailyCostMap.size;
      results.push({
        icon: '/',
        label: t('costPerActiveDay'),
        value: `$${costPerActiveDay.toFixed(2)}`,
        detail: t('costPerActiveDayDetail', { days: dailyCostMap.size }),
        color: '#a3e635',
        severity: 'info',
      });
    }

    return results;
  }, [daily, members, models, totalCost, sessionCount, days, teamMemberCount, t]);

  if (insights.length === 0) return null;

  return (
    <div className="glass-card" style={{ borderRadius: '16px', padding: '24px' }}>
      <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#fafafa', letterSpacing: '-0.01em', marginBottom: '16px' }}>
        {t('title')}
      </h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '10px',
      }}>
        {insights.map((insight, i) => {
          const sev = SEVERITY_COLORS[insight.severity];
          return (
            <div
              key={i}
              style={{
                padding: '14px 16px',
                borderRadius: '12px',
                background: sev.bg,
                border: `1px solid ${sev.border}`,
                transition: 'transform 0.15s ease',
                cursor: 'default',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 500, color: '#71717a', letterSpacing: '0.03em' }}>
                  {insight.label}
                </span>
                <span style={{
                  fontSize: '10px', width: '18px', height: '18px', borderRadius: '4px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${insight.color}22`, color: insight.color, fontWeight: 700,
                }}>
                  {insight.icon}
                </span>
              </div>
              <p style={{
                fontSize: '18px', fontWeight: 700, color: sev.text,
                fontVariantNumeric: 'tabular-nums', marginBottom: '4px',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {insight.value}
              </p>
              <p style={{ fontSize: '11px', color: '#52525b', lineHeight: 1.4 }}>
                {insight.detail}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
