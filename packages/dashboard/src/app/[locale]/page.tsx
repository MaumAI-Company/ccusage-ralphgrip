'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { StatsCards } from '@/components/StatsCards';
import { ProtectedPage } from '@/components/ProtectedPage';
import { FilterBar } from '@/components/FilterBar';
import { AppHeader, HeaderDivider, HeaderLink } from '@/components/AppHeader';
import { useStatsSSE } from '@/lib/sse-client';

const DailyChart = dynamic(() => import('@/components/DailyChart').then(m => ({ default: m.DailyChart })), { ssr: false });
const MemberTable = dynamic(() => import('@/components/MemberTable').then(m => ({ default: m.MemberTable })), { ssr: false });
const BudgetSettings = dynamic(() => import('@/components/BudgetSettings').then(m => ({ default: m.BudgetSettings })), { ssr: false });
const RollingUsagePanel = dynamic(() => import('@/components/RollingUsagePanel').then(m => ({ default: m.RollingUsagePanel })), { ssr: false });
const TokenLeaderboard = dynamic(() => import('@/components/TokenLeaderboard').then(m => ({ default: m.TokenLeaderboard })), { ssr: false });
const TokenTimeSeries = dynamic(() => import('@/components/TokenTimeSeries').then(m => ({ default: m.TokenTimeSeries })), { ssr: false });
const MemberSessionChart = dynamic(() => import('@/components/MemberSessionChart').then(m => ({ default: m.MemberSessionChart })), { ssr: false });
const ModelCostChart = dynamic(() => import('@/components/ModelCostChart').then(m => ({ default: m.ModelCostChart })), { ssr: false });
const TokenRatioChart = dynamic(() => import('@/components/TokenRatioChart').then(m => ({ default: m.TokenRatioChart })), { ssr: false });
const CacheAnalyticsChart = dynamic(() => import('@/components/CacheAnalyticsChart').then(m => ({ default: m.CacheAnalyticsChart })), { ssr: false });
const CostPerSessionChart = dynamic(() => import('@/components/CostPerSessionChart').then(m => ({ default: m.CostPerSessionChart })), { ssr: false });
const ModelMemberChart = dynamic(() => import('@/components/ModelMemberChart').then(m => ({ default: m.ModelMemberChart })), { ssr: false });
const InsightsPanel = dynamic(() => import('@/components/InsightsPanel').then(m => ({ default: m.InsightsPanel })), { ssr: false });

function parseHash(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.hash.slice(1));
  const result: Record<string, string> = {};
  params.forEach((v, k) => { result[k] = v; });
  return result;
}

function updateHash(updates: Record<string, string>) {
  const params = new URLSearchParams(window.location.hash.slice(1));
  for (const [k, v] of Object.entries(updates)) {
    if (v) params.set(k, v);
    else params.delete(k);
  }
  window.history.replaceState(null, '', `#${params.toString()}`);
}

export default function HomePage() {
  return (
    <ProtectedPage>
      <Home />
    </ProtectedPage>
  );
}

function Home() {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const initial = parseHash();
  const [days, setDays] = useState(() => {
    const v = parseInt(initial.days || '30', 10);
    return v >= 1 && v <= 365 ? v : 30;
  });
  const [utilMode, setUtilMode] = useState<'5h' | '7d'>(() =>
    (initial.util === '5h') ? '5h' : '7d'
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>(() => {
    const raw = initial.members;
    return raw ? raw.split(',').filter(Boolean) : [];
  });
  const [selectedModels, setSelectedModels] = useState<string[]>(() => {
    const raw = initial.models;
    return raw ? raw.split(',').filter(Boolean) : [];
  });

  // Wrap setDays to also reset filters
  const handleDaysChange = useCallback((nextDays: number) => {
    setDays(nextDays);
    setSelectedMembers([]);
    setSelectedModels([]);
  }, []);

  // SSE-powered stats with automatic polling fallback
  const { stats, connected, error, refresh } = useStatsSSE(days);

  // Sync state changes to URL hash
  useEffect(() => {
    updateHash({
      days: String(days),
      util: utilMode,
      members: selectedMembers.join(','),
      models: selectedModels.join(','),
    });
  }, [days, utilMode, selectedMembers, selectedModels]);

  // --- Filtered data ---
  const { filteredDaily, filteredMembers, filteredModels } = useMemo(() => {
    if (!stats) return { filteredDaily: [], filteredMembers: [], filteredModels: [] };

    const hasMemFilter = selectedMembers.length > 0;
    const hasModelFilter = selectedModels.length > 0;

    const fd = stats.daily.filter(d => {
      if (hasMemFilter && !selectedMembers.includes(d.displayName)) return false;
      if (hasModelFilter && !selectedModels.includes(d.model)) return false;
      return true;
    });

    const memberMap = new Map<string, { totalCost: number; totalTokens: number }>();
    for (const d of fd) {
      const cur = memberMap.get(d.displayName) ?? { totalCost: 0, totalTokens: 0 };
      cur.totalCost += d.costUsd;
      cur.totalTokens += d.inputTokens + d.outputTokens;
      memberMap.set(d.displayName, cur);
    }
    const fm = Array.from(memberMap.entries())
      .map(([displayName, v]) => ({ displayName, ...v }))
      .sort((a, b) => b.totalCost - a.totalCost);

    const modelMap = new Map<string, { count: number; totalCost: number }>();
    for (const d of fd) {
      const cur = modelMap.get(d.model) ?? { count: 0, totalCost: 0 };
      cur.count++;
      cur.totalCost += d.costUsd;
      modelMap.set(d.model, cur);
    }
    const fmod = Array.from(modelMap.entries())
      .map(([model, v]) => ({ model, ...v }))
      .sort((a, b) => b.totalCost - a.totalCost);

    return { filteredDaily: fd, filteredMembers: fm, filteredModels: fmod };
  }, [stats, selectedMembers, selectedModels]);

  // --- Daily chart data ---
  const { dailyChartData, memberNames, totalCost, totalTokens, cacheHitRatio } = useMemo(() => {
    const names = [...new Set(filteredDaily.map(d => d.displayName))];
    const dMap = new Map<string, Record<string, number>>();
    for (const d of filteredDaily) {
      if (!dMap.has(d.date)) dMap.set(d.date, {});
      const row = dMap.get(d.date)!;
      row[d.displayName] = (row[d.displayName] || 0) + d.costUsd;
    }
    const chart = Array.from(dMap.entries())
      .map(([date, row]) => ({ date, ...row }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const cost = filteredMembers.reduce((s, m) => s + m.totalCost, 0);
    const tokens = filteredMembers.reduce((s, m) => s + m.totalTokens, 0);

    let cacheCreation = 0;
    let cacheRead = 0;
    for (const d of filteredDaily) {
      cacheCreation += d.cacheCreationTokens || 0;
      cacheRead += d.cacheReadTokens || 0;
    }
    const cacheTotal = cacheCreation + cacheRead;
    const cacheHit = cacheTotal > 0 ? (cacheRead / cacheTotal) * 100 : undefined;

    return { dailyChartData: chart, memberNames: names, totalCost: cost, totalTokens: tokens, cacheHitRatio: cacheHit };
  }, [filteredDaily, filteredMembers]);

  // --- Available filter options ---
  const availableMembers = useMemo(() =>
    stats ? [...new Set(stats.daily.map(d => d.displayName))].sort() : [],
  [stats]);

  const availableModels = useMemo(() =>
    stats ? [...new Set(stats.daily.map(d => d.model))].sort() : [],
  [stats]);

  // --- Error / Loading ---
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: '#09090b' }}>
        <div className="flex flex-col items-center gap-3">
          <p style={{ color: '#ef4444', fontSize: '14px', fontWeight: 500 }}>{tc('errorLabel')}</p>
          <p style={{ color: '#71717a', fontSize: '13px' }}>{error}</p>
          <button
            onClick={refresh}
            style={{
              marginTop: '8px', padding: '6px 16px', borderRadius: '8px',
              fontSize: '13px', color: '#fafafa',
              background: 'rgba(99,102,241,0.8)', border: '1px solid rgba(99,102,241,0.4)',
              cursor: 'pointer',
            }}
          >
            {tc('retry')}
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: '#09090b' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p style={{ color: '#71717a', fontSize: '13px', letterSpacing: '0.05em' }}>{tc('loadingLabel')}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen" style={{ background: '#09090b' }}>
      {/* Ambient gradient backdrop */}
      <div
        style={{
          position: 'fixed', inset: 0,
          background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99, 102, 241, 0.08) 0%, transparent 60%)',
          pointerEvents: 'none', zIndex: 0,
        }}
      />

      <div className="relative" style={{ zIndex: 1 }}>
        {/* Header */}
        <AppHeader
          maxWidthClassName="max-w-7xl"
          meta={(
            <>
              <HeaderLink href="/" active>Dashboard</HeaderLink>
              <HeaderDivider />
              <HeaderLink href="/report">Report</HeaderLink>
              <HeaderDivider />
              <HeaderLink href="/setup">Setup</HeaderLink>
            </>
          )}
          actions={(
            <button
              onClick={() => setSettingsOpen(true)}
              title={t('budgetSettings')}
              aria-label={t('budgetSettings')}
              className="icon-button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          )}
        />

        {/* Main content */}
        <div className="max-w-7xl mx-auto" style={{ padding: '32px 24px 48px' }}>
          {/* Hero Section */}
          <div className="animate-fade-in-up animate-delay-1" style={{ textAlign: 'center', marginBottom: '28px', paddingTop: '8px' }}>
            {/* SVG Icon */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '56px', height: '56px', borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.15) 100%)',
              border: '1px solid rgba(99,102,241,0.25)',
              marginBottom: '16px',
              boxShadow: '0 0 24px rgba(99,102,241,0.15)',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
              </svg>
            </div>

            {/* Title */}
            <h1
              className="gradient-text"
              style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '6px' }}
            >
              {t('title')}
            </h1>
            <p style={{ fontSize: '13px', color: '#52525b', marginBottom: '14px' }}>
              {t('subtitle', { days })}
            </p>

            {/* Tags */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Live status */}
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                fontSize: '11px', fontWeight: 500, padding: '3px 10px', borderRadius: '9999px',
                background: connected ? 'rgba(34,197,94,0.1)' : 'rgba(113,113,122,0.1)',
                border: `1px solid ${connected ? 'rgba(34,197,94,0.25)' : 'rgba(113,113,122,0.2)'}`,
                color: connected ? '#4ade80' : '#71717a',
              }}>
                <span style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: connected ? '#22c55e' : '#71717a',
                  boxShadow: connected ? '0 0 4px #22c55e' : 'none',
                }} />
                {connected ? 'Live' : 'Polling'}
              </span>

              {/* Period tag */}
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                fontSize: '11px', fontWeight: 500, padding: '3px 10px', borderRadius: '9999px',
                background: 'rgba(99,102,241,0.1)',
                border: '1px solid rgba(99,102,241,0.25)',
                color: '#a5b4fc',
              }}>
                {days}d
              </span>

              {/* Team size tag */}
              {stats && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  fontSize: '11px', fontWeight: 500, padding: '3px 10px', borderRadius: '9999px',
                  background: 'rgba(245,158,11,0.1)',
                  border: '1px solid rgba(245,158,11,0.25)',
                  color: '#fbbf24',
                }}>
                  {stats.teamMembers.length} members
                </span>
              )}

              {/* Sessions tag */}
              {stats && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  fontSize: '11px', fontWeight: 500, padding: '3px 10px', borderRadius: '9999px',
                  background: 'rgba(244,63,94,0.1)',
                  border: '1px solid rgba(244,63,94,0.25)',
                  color: '#fb7185',
                }}>
                  {stats.sessionCount} sessions
                </span>
              )}

              {/* Models tag */}
              {availableModels.length > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  fontSize: '11px', fontWeight: 500, padding: '3px 10px', borderRadius: '9999px',
                  background: 'rgba(16,185,129,0.1)',
                  border: '1px solid rgba(16,185,129,0.25)',
                  color: '#34d399',
                }}>
                  {availableModels.length} models
                </span>
              )}
            </div>
          </div>

          {/* Section 1: Filter Bar — position: relative + z-index keeps dropdown above subsequent glass-card sections */}
          <div className="animate-fade-in-up animate-delay-1" style={{ marginBottom: '20px', position: 'relative', zIndex: 1 }}>
            <FilterBar
              period={days}
              onPeriodChange={handleDaysChange}
              selectedMembers={selectedMembers}
              onMembersChange={setSelectedMembers}
              selectedModels={selectedModels}
              onModelsChange={setSelectedModels}
              availableMembers={availableMembers}
              availableModels={availableModels}
            />
          </div>

          {/* Section 2: Overview Cards */}
          <div className="animate-fade-in-up animate-delay-2" style={{ marginBottom: '20px' }}>
            <StatsCards
              totalCost={totalCost}
              totalTokens={totalTokens}
              memberCount={stats.teamMembers.length}
              sessionCount={stats.sessionCount}
              totalTurns={stats.totalTurns}
              cacheHitRatio={cacheHitRatio}
              days={days}
            />
          </div>

          {/* Section 3: Leaderboard — Token TOP 10 */}
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#a1a1aa', letterSpacing: '0.04em', marginBottom: '12px' }}>
              {t('leaderboardTitle')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in-up animate-delay-3">
              <TokenLeaderboard data={filteredDaily} type="total" />
              <TokenLeaderboard data={filteredDaily} type="input" />
              <TokenLeaderboard data={filteredDaily} type="output" />
            </div>
          </div>

          {/* Section 4: Token Usage Time Series */}
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#a1a1aa', letterSpacing: '0.04em', marginBottom: '12px' }}>
              {t('tokenUsageLog')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up animate-delay-3">
              <TokenTimeSeries data={filteredDaily} />
              <DailyChart data={dailyChartData} members={memberNames} />
            </div>
          </div>

          {/* Section 5: Usage Patterns */}
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#a1a1aa', letterSpacing: '0.04em', marginBottom: '12px' }}>
              {t('usagePatternsLog')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up animate-delay-4">
              <MemberSessionChart data={stats.memberSessionCount ?? []} />
              <ModelCostChart data={filteredModels} />
            </div>
          </div>

          {/* Section 5b: Model-Member Insights */}
          <div className="animate-fade-in-up animate-delay-4" style={{ marginBottom: '20px' }}>
            <ModelMemberChart data={filteredDaily} />
          </div>

          {/* Section 6: Cost Efficiency */}
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#a1a1aa', letterSpacing: '0.04em', marginBottom: '12px' }}>
              {t('cacheEfficiency')}
            </h2>
            <div className="animate-fade-in-up animate-delay-4">
              <CostPerSessionChart
                members={filteredMembers}
                memberSessionCount={stats.memberSessionCount ?? []}
                totalTurns={stats.totalTurns}
                totalCost={totalCost}
              />
            </div>
          </div>

          {/* Weekly Ranking (MemberTable) */}
          <div className="animate-fade-in-up animate-delay-5" style={{ marginBottom: '20px' }}>
            <MemberTable
              data={stats.weeklyRanking ?? filteredMembers}
              memberPlans={stats.memberPlans ?? []}
              previousWeekTop={stats.previousWeekTop ?? []}
            />
          </div>

          {/* Rolling Usage Panel */}
          <div className="animate-fade-in-up animate-delay-5" style={{ marginBottom: '24px' }}>
            <RollingUsagePanel
              utilizationHistory={stats.utilizationHistory}
              mode={utilMode}
              onModeChange={setUtilMode}
              days={days}
            />
          </div>

          {/* Token Ratio */}
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#a1a1aa', letterSpacing: '0.04em', marginBottom: '12px' }}>
              {t('tokenRatio')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up animate-delay-5">
              <TokenRatioChart data={filteredDaily} />
              <CacheAnalyticsChart data={filteredDaily} />
            </div>
          </div>

          {/* Key Insights */}
          <div className="animate-fade-in-up animate-delay-6" style={{ marginBottom: '20px' }}>
            <InsightsPanel
              daily={filteredDaily}
              members={filteredMembers}
              models={filteredModels}
              totalCost={totalCost}
              sessionCount={stats.sessionCount}
              days={days}
              teamMemberCount={stats.teamMembers.length}
            />
          </div>
        </div>
      </div>

      {/* Budget settings modal */}
      <BudgetSettings
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        budgetConfigs={stats.budgetConfigs}
        teamMembers={stats.teamMembers}
        memberPlans={stats.memberPlans ?? []}
        onSaved={refresh}
      />
    </main>
  );
}
