'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { AppHeader, HeaderDivider, HeaderLink } from '@/components/AppHeader';
import { ProtectedPage } from '@/components/ProtectedPage';
import { PLAN_MONTHLY_USD } from '@/lib/types';
import { api, type ReportData } from '@/lib/api-client';
import { formatProjectName } from '@/lib/formatters';

import { MEMBER_COLORS as COLORS } from '@/lib/colors';

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

function cleanProjectName(p: string) { return formatProjectName(p); }
function formatDate(s: string) { const d = new Date(s); return `${d.getMonth() + 1}/${d.getDate()}`; }
function formatWeek(s: string) { const d = new Date(s); return `${d.getMonth() + 1}/${d.getDate()}`; }
function fmt$(n: number) { return n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n.toFixed(0)}`; }

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px 14px', boxShadow: '0 16px 40px rgba(0,0,0,0.6)' }}>
      <p style={{ fontSize: '11px', color: '#71717a', fontWeight: 500, letterSpacing: '0.04em', marginBottom: '6px' }}>{label}</p>
      {payload.map(e => (
        <div key={e.name} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '3px' }}>
          <span style={{ fontSize: '12px', color: '#a1a1aa' }}>{e.name}</span>
          <span style={{ fontSize: '12px', color: '#fafafa', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>${(e.value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
      ))}
    </div>
  );
}

export default function ReportPage() {
  return <ProtectedPage><ReportContent /></ProtectedPage>;
}

function ReportContent() {
  const t = useTranslations('report');
  const initial = parseHash();
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(() => {
    const v = parseInt(initial.days || '30', 10);
    return v === 30 || v === 90 ? v : 30;
  });

  // Sync days to URL hash
  useEffect(() => { updateHash({ days: String(days) }); }, [days]);

  const fetchReport = useCallback(async (signal?: AbortSignal) => {
    setError(null);
    try {
      setData(await api.getReport(days, signal));
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : 'Failed to load');
    }
  }, [days]);

  useEffect(() => {
    const c = new AbortController();
    api.getReport(days, c.signal)
      .then(setData)
      .catch((err) => {
        if (!c.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Failed to load');
        }
      });
    return () => c.abort();
  }, [days]);

  if (error) return (
    <div className="flex items-center justify-center h-screen" style={{ background: '#09090b' }}>
      <div className="flex flex-col items-center gap-3">
        <p style={{ color: '#ef4444', fontSize: '14px' }}>Error: {error}</p>
        <button onClick={() => fetchReport()} style={{ padding: '6px 16px', borderRadius: '8px', fontSize: '13px', color: '#fafafa', background: 'rgba(99,102,241,0.8)', border: '1px solid rgba(99,102,241,0.4)', cursor: 'pointer' }}>Retry</button>
      </div>
    </div>
  );

  if (!data) return (
    <div className="flex items-center justify-center h-screen" style={{ background: '#09090b' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p style={{ color: '#71717a', fontSize: '13px', letterSpacing: '0.05em' }}>LOADING REPORT</p>
      </div>
    </div>
  );

  const { summary, members, daily, weekly, models, plans, projects } = data;
  const totalSub = plans.reduce((s, p) => s + (PLAN_MONTHLY_USD[p.planName] || 0), 0);
  const roi = totalSub > 0 ? summary.totalCost / totalSub : 0;
  const avgDaily = daily.length > 0 ? summary.totalCost / daily.length : 0;

  // Plan lookup
  const planMap = new Map(plans.map(p => [p.memberId, p]));

  return (
    <main className="min-h-screen" style={{ background: '#09090b' }}>
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,0.08) 0%, transparent 60%)', pointerEvents: 'none', zIndex: 0 }} />
      <div className="relative" style={{ zIndex: 1 }}>

        {/* Header */}
        <AppHeader
          maxWidthClassName="max-w-7xl"
          meta={(
            <>
              <HeaderLink href="/">Dashboard</HeaderLink>
              <HeaderDivider />
              <HeaderLink href="/report" active>Report</HeaderLink>
              <HeaderDivider />
              <HeaderLink href="/setup">Setup</HeaderLink>
            </>
          )}
          actions={(
            <div className="header-chip-group">
              {[{ label: t('days30'), value: 30 }, { label: t('days90'), value: 90 }].map(opt => (
                <button key={opt.value} onClick={() => setDays(opt.value)} className={`period-pill${days === opt.value ? ' active' : ''}`}>{opt.label}</button>
              ))}
            </div>
          )}
        />

        <div className="max-w-7xl mx-auto" style={{ padding: '32px 24px 48px' }}>

          {/* Title */}
          <div className="animate-fade-in-up animate-delay-1" style={{ marginBottom: '28px' }}>
            <h1 className="gradient-text" style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '4px' }}>Monthly Report</h1>
            <p style={{ fontSize: '13px', color: '#52525b' }}>
              {summary.periodStart} ~ {summary.periodEnd} &middot; Company accounts only
            </p>
          </div>

          {/* KPI Cards */}
          <div className="animate-fade-in-up animate-delay-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            <KpiCard label={t('apiCost')} value={`$${summary.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} sub={t('dailyAvg', { amount: avgDaily.toFixed(0) })} accent="#f43f5e" />
            <KpiCard label={t('subscription')} value={`$${totalSub.toLocaleString()}`} sub={t('planSummary', { max20: plans.filter(p => p.planName === 'max20').length, max5: plans.filter(p => p.planName === 'max5').length })} accent="#10b981" />
            <KpiCard label={t('roi')} value={`${roi.toFixed(1)}x`} sub={t('roiSub')} accent="#06b6d4" />
            <KpiCard label={t('sessionCount')} value={summary.totalSessions.toLocaleString()} sub={t('perSession', { amount: summary.totalSessions > 0 ? (summary.totalCost / summary.totalSessions).toFixed(1) : '0' })} accent="#6366f1" />
            <KpiCard label={t('members')} value={String(summary.totalMembers)} sub={t('plansConfigured', { count: plans.length })} accent="#f59e0b" />
          </div>

          {/* Daily Cost Chart */}
          <div className="animate-fade-in-up animate-delay-3 glass-card" style={{ borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#fafafa', marginBottom: '2px' }}>{t('dailyCostTrend')}</h2>
            <p style={{ fontSize: '12px', color: '#52525b', marginBottom: '20px' }}>Daily cost trend (company accounts)</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={daily} barSize={Math.max(4, Math.min(16, 600 / daily.length))}>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tickFormatter={formatDate} axisLine={false} tickLine={false} tick={{ fill: '#52525b', fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tickFormatter={v => fmt$(v)} axisLine={false} tickLine={false} tick={{ fill: '#52525b', fontSize: 11 }} width={50} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="cost" name="Cost" fill="#6366f1" radius={[3, 3, 0, 0]} fillOpacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Weekly + Sessions Row */}
          <div className="animate-fade-in-up animate-delay-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="glass-card" style={{ borderRadius: '16px', padding: '24px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#fafafa', marginBottom: '2px' }}>{t('weeklyCost')}</h2>
              <p style={{ fontSize: '12px', color: '#52525b', marginBottom: '16px' }}>Weekly breakdown</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weekly} barSize={32}>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="weekStart" tickFormatter={formatWeek} axisLine={false} tickLine={false} tick={{ fill: '#52525b', fontSize: 11 }} />
                  <YAxis tickFormatter={v => fmt$(v)} axisLine={false} tickLine={false} tick={{ fill: '#52525b', fontSize: 11 }} width={50} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="cost" name="Cost" fill="#8b5cf6" radius={[4, 4, 0, 0]} fillOpacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="glass-card" style={{ borderRadius: '16px', padding: '24px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#fafafa', marginBottom: '2px' }}>{t('dailySessionMembers')}</h2>
              <p style={{ fontSize: '12px', color: '#52525b', marginBottom: '16px' }}>Sessions & active members</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={daily}>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tickFormatter={formatDate} axisLine={false} tickLine={false} tick={{ fill: '#52525b', fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#52525b', fontSize: 11 }} width={30} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#52525b', fontSize: 11 }} width={20} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line yAxisId="left" type="monotone" dataKey="sessions" name="Sessions" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="members" name="Members" stroke="#22c55e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Members Table + Model Chart */}
          <div className="animate-fade-in-up animate-delay-5" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {/* Member Table */}
            <div className="glass-card" style={{ borderRadius: '16px', padding: '24px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#fafafa', marginBottom: '2px' }}>{t('memberUsage')}</h2>
              <p style={{ fontSize: '12px', color: '#52525b', marginBottom: '16px' }}>Member usage breakdown</p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <th style={thStyle}>#</th>
                      <th style={thStyle}>Member</th>
                      <th style={thStyle}>Email</th>
                      <th style={thStyle}>Plan</th>
                      <th style={thStyle}>Card</th>
                      <th style={thStyle}>Support</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Cost</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Share</th>
                      <th style={thStyle}>Bar</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>$/Day</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Sessions</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Days</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const topCost = members[0]?.cost ?? 1;
                      return members.map((m, i) => {
                        const plan = planMap.get(m.memberId);
                        const subCost = plan ? (PLAN_MONTHLY_USD[plan.planName] || 0) : 0;
                        const memberRoi = subCost > 0 ? m.cost / subCost : 0;
                        const share = summary.totalCost > 0 ? (m.cost / summary.totalCost) * 100 : 0;
                        const barPct = (m.cost / topCost) * 100;
                        const barColor = i === 0 ? 'linear-gradient(90deg,#ef4444,#f87171)' : i === 1 ? 'linear-gradient(90deg,#f97316,#fb923c)' : i === 2 ? 'linear-gradient(90deg,#eab308,#facc15)' : '#6366f1';
                        const costPerDay = m.activeDays > 0 ? m.cost / m.activeDays : 0;
                        return (
                          <tr key={m.memberId} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <td style={tdStyle}>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                width: '22px', height: '22px', borderRadius: '50%', fontSize: '11px', fontWeight: 700,
                                background: i === 0 ? '#fbbf24' : i === 1 ? '#9ca3af' : i === 2 ? '#d97706' : 'rgba(255,255,255,0.06)',
                                color: i < 3 ? '#18181b' : '#71717a',
                              }}>{i + 1}</span>
                            </td>
                            <td style={tdStyle}>
                              <div style={{ fontWeight: 600, color: '#fafafa' }}>{m.displayName}</div>
                              <div style={{ fontSize: '11px', color: '#52525b' }}>{m.name}</div>
                            </td>
                            <td style={{ ...tdStyle, fontSize: '11px', color: '#71717a', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {plan?.email || <span style={{ color: '#3f3f46' }}>-</span>}
                            </td>
                            <td style={tdStyle}>
                              {plan ? (
                                <span style={{
                                  padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                                  background: plan.planName === 'max20' ? 'rgba(168,85,247,0.2)' : 'rgba(59,130,246,0.2)',
                                  color: plan.planName === 'max20' ? '#c084fc' : '#93c5fd',
                                }}>{plan.planName.toUpperCase()}</span>
                              ) : <span style={{ fontSize: '11px', color: '#52525b' }}>-</span>}
                            </td>
                            <td style={tdStyle}>
                              {plan ? (
                                <span style={{
                                  padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                                  background: plan.cardType === 'corporate' ? 'rgba(16,185,129,0.15)' : 'rgba(251,191,36,0.15)',
                                  color: plan.cardType === 'corporate' ? '#34d399' : '#fbbf24',
                                }}>{plan.cardType === 'corporate' ? 'Corp' : 'Personal'}</span>
                              ) : <span style={{ fontSize: '11px', color: '#52525b' }}>-</span>}
                            </td>
                            <td style={tdStyle}>
                              {plan ? (
                                <span style={{
                                  padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                                  background: plan.companySupported ? 'rgba(59,130,246,0.15)' : 'rgba(239,68,68,0.15)',
                                  color: plan.companySupported ? '#93c5fd' : '#fca5a5',
                                }}>{plan.companySupported ? 'Yes' : 'No'}</span>
                              ) : <span style={{ fontSize: '11px', color: '#52525b' }}>-</span>}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#fafafa', fontVariantNumeric: 'tabular-nums' }}>
                              ${m.cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'right', color: '#71717a', fontVariantNumeric: 'tabular-nums', fontSize: '12px' }}>
                              {share.toFixed(1)}%
                            </td>
                            <td style={{ ...tdStyle, minWidth: '80px' }}>
                              <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden', minWidth: '60px' }}>
                                <div style={{ height: '100%', width: `${barPct}%`, background: barColor, borderRadius: '3px', transition: 'width 0.8s ease' }} />
                              </div>
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'right', color: '#a1a1aa', fontVariantNumeric: 'tabular-nums', fontSize: '12px' }}>
                              ${costPerDay.toFixed(0)}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'right', color: '#a1a1aa', fontVariantNumeric: 'tabular-nums' }}>{m.sessions.toLocaleString()}</td>
                            <td style={{ ...tdStyle, textAlign: 'right', color: '#a1a1aa' }}>{m.activeDays}</td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: memberRoi >= 2 ? '#22c55e' : memberRoi >= 1 ? '#f59e0b' : '#71717a' }}>
                              {memberRoi > 0 ? `${memberRoi.toFixed(1)}x` : '-'}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Model Pie */}
            <div className="glass-card" style={{ borderRadius: '16px', padding: '24px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#fafafa', marginBottom: '2px' }}>{t('modelDistribution')}</h2>
              <p style={{ fontSize: '12px', color: '#52525b', marginBottom: '16px' }}>Cost by model</p>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={models.slice(0, 6)} dataKey="cost" nameKey="model" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} strokeWidth={0}>
                    {models.slice(0, 6).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ marginTop: '8px' }}>
                {models.slice(0, 6).map((m, i) => (
                  <div key={m.model} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
                      <span style={{ fontSize: '12px', color: '#a1a1aa', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.model}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                      <span style={{ color: '#71717a' }}>{((m.cost / summary.totalCost) * 100).toFixed(1)}%</span>
                      <span style={{ color: '#fafafa', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>${m.cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Subscription Summary */}
          <div className="animate-fade-in-up animate-delay-5 glass-card" style={{ borderRadius: '16px', padding: '24px', marginBottom: '24px', borderTop: '1px solid rgba(16,185,129,0.3)' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#fafafa', marginBottom: '16px' }}>{t('subscriptionAnalysis')}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>MAX20</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#c084fc', marginTop: '4px' }}>${plans.filter(p => p.planName === 'max20').length * 200}</div>
                <div style={{ fontSize: '12px', color: '#52525b' }}>{t('max20Count', { count: plans.filter(p => p.planName === 'max20').length })}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>MAX5</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#93c5fd', marginTop: '4px' }}>${plans.filter(p => p.planName === 'max5').length * 100}</div>
                <div style={{ fontSize: '12px', color: '#52525b' }}>{t('max5Count', { count: plans.filter(p => p.planName === 'max5').length })}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Total Sub</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>${totalSub.toLocaleString()}</div>
                <div style={{ fontSize: '12px', color: '#52525b' }}>{t('monthlySubscription')}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>ROI</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#06b6d4', marginTop: '4px' }}>{roi.toFixed(1)}x</div>
                <div style={{ fontSize: '12px', color: '#52525b' }}>{t('apiConversionRatio')}</div>
              </div>
            </div>
          </div>

          {/* Project Breakdown */}
          {projects && projects.length > 0 && (
            <div className="animate-fade-in-up animate-delay-5 glass-card" style={{ borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#fafafa', marginBottom: '2px' }}>{t('projectUsage')}</h2>
              <p style={{ fontSize: '12px', color: '#52525b', marginBottom: '16px' }}>Project breakdown (Top 15)</p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <th style={thStyle}>#</th>
                      <th style={thStyle}>Project</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Cost ($)</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Sessions</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Members</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p, i) => (
                      <tr key={p.project} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={tdStyle}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: '22px', height: '22px', borderRadius: '50%', fontSize: '11px', fontWeight: 700,
                            background: i === 0 ? '#fbbf24' : i === 1 ? '#9ca3af' : i === 2 ? '#d97706' : 'rgba(255,255,255,0.06)',
                            color: i < 3 ? '#18181b' : '#71717a',
                          }}>{i + 1}</span>
                        </td>
                        <td style={tdStyle}>
                          <span style={{ fontWeight: i < 3 ? 700 : 400, color: '#fafafa' }}>{cleanProjectName(p.project)}</span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: i < 3 ? 700 : 400, color: '#fafafa', fontVariantNumeric: 'tabular-nums' }}>
                          ${p.cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', color: '#a1a1aa', fontVariantNumeric: 'tabular-nums' }}>{p.sessions.toLocaleString()}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', color: '#a1a1aa' }}>{p.members}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Key Insights */}
          <div className="animate-fade-in-up animate-delay-5 glass-card" style={{ borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#fafafa', marginBottom: '16px' }}>Key Insights</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              {/* 1. ROI / Success */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderLeft: '4px solid #22c55e', borderRadius: '12px', padding: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#fafafa', marginBottom: '6px' }}>
                  {t('subscriptionValue', { sub: totalSub.toLocaleString(), cost: summary.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 }) })}
                </h3>
                <p style={{ fontSize: '12px', color: '#71717a', lineHeight: 1.7 }}>
                  {t.rich('subscriptionEfficiency', {
                    sub: totalSub.toLocaleString(),
                    cost: summary.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 }),
                    roi: roi.toFixed(1),
                    b: (chunks) => <span style={{ fontWeight: 700, color: '#fafafa' }}>{chunks}</span>,
                  })}
                </p>
              </div>
              {/* 2. Usage concentration / Danger */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderLeft: '4px solid #ef4444', borderRadius: '12px', padding: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#fafafa', marginBottom: '6px' }}>
                  {t('topMembersShare', { pct: members.length >= 3 ? ((members.slice(0, 3).reduce((s, m) => s + m.cost, 0) / summary.totalCost * 100).toFixed(1)) : '—' })}
                </h3>
                <p style={{ fontSize: '12px', color: '#71717a', lineHeight: 1.7 }}>
                  {members.slice(0, 3).map((m, i) => (
                    <span key={m.memberId}>{m.displayName}(<span style={{ fontWeight: 700, color: '#fafafa' }}>${m.cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>, {(m.cost / summary.totalCost * 100).toFixed(1)}%){i < 2 ? ', ' : ' '}</span>
                  ))}
                  {t.rich('topMembersDetail', {
                    pct: members.length >= 3 ? ((members.slice(0, 3).reduce((s, m) => s + m.cost, 0) / summary.totalCost * 100).toFixed(1)) : '—',
                    b: (chunks) => <span style={{ fontWeight: 700, color: '#fafafa' }}>{chunks}</span>,
                  })}
                </p>
              </div>
              {/* 3. Opus dependency / Warning */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderLeft: '4px solid #f59e0b', borderRadius: '12px', padding: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#fafafa', marginBottom: '6px' }}>
                  {t('opusConcentration')}
                </h3>
                <p style={{ fontSize: '12px', color: '#71717a', lineHeight: 1.7 }}>
                  {(() => {
                    const opusCost = models.filter(m => m.model.toLowerCase().includes('opus')).reduce((s, m) => s + m.cost, 0);
                    const opusPct = summary.totalCost > 0 ? (opusCost / summary.totalCost * 100).toFixed(1) : '0';
                    return (<>{t.rich('opusDetail', {
                      pct: opusPct,
                      b: (chunks) => <span style={{ fontWeight: 700, color: '#fafafa' }}>{chunks}</span>,
                    })}</>);
                  })()}
                </p>
              </div>
              {/* 4. Weekly growth / Info */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderLeft: '4px solid #3b82f6', borderRadius: '12px', padding: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#fafafa', marginBottom: '6px' }}>
                  {t('weeklyTrend')}
                </h3>
                <p style={{ fontSize: '12px', color: '#71717a', lineHeight: 1.7 }}>
                  {weekly.length >= 2 ? (
                    t.rich('weeklyTrendDetail', {
                      first: weekly[0].cost.toLocaleString(undefined, { maximumFractionDigits: 0 }),
                      last: weekly[weekly.length - 1].cost.toLocaleString(undefined, { maximumFractionDigits: 0 }),
                      avg: avgDaily.toFixed(0),
                      b: (chunks) => <span style={{ fontWeight: 700, color: '#fafafa' }}>{chunks}</span>,
                    })
                  ) : (
                    t.rich('dailyAvgOnly', {
                      avg: avgDaily.toFixed(0),
                      b: (chunks) => <span style={{ fontWeight: 700, color: '#fafafa' }}>{chunks}</span>,
                    })
                  )}
                </p>
              </div>
              {/* 5. Project distribution / Info */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderLeft: '4px solid #3b82f6', borderRadius: '12px', padding: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#fafafa', marginBottom: '6px' }}>
                  {t('projectDistribution')}
                </h3>
                <p style={{ fontSize: '12px', color: '#71717a', lineHeight: 1.7 }}>
                  {projects && projects.length > 0 ? (
                    t.rich('topProjectDetail', {
                      name: cleanProjectName(projects[0].project),
                      cost: projects[0].cost.toLocaleString(undefined, { maximumFractionDigits: 0 }),
                      pct: (projects[0].cost / summary.totalCost * 100).toFixed(1),
                      count: projects.length,
                      b: (chunks) => <span style={{ fontWeight: 700, color: '#fafafa' }}>{chunks}</span>,
                    })
                  ) : t('noProjectData')}
                </p>
              </div>
              {/* 6. Session efficiency / Warning */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderLeft: '4px solid #f59e0b', borderRadius: '12px', padding: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#fafafa', marginBottom: '6px' }}>
                  {t('sessionEfficiency')}
                </h3>
                <p style={{ fontSize: '12px', color: '#71717a', lineHeight: 1.7 }}>
                  {(() => {
                    const withSessions = members.filter(m => m.sessions > 0);
                    if (withSessions.length < 2) return t('insufficientData');
                    const efficiencies = withSessions.map(m => ({ name: m.displayName, eff: m.cost / m.sessions }));
                    const maxEff = efficiencies.reduce((a, b) => a.eff > b.eff ? a : b);
                    const minEff = efficiencies.reduce((a, b) => a.eff < b.eff ? a : b);
                    return (
                      <>{t.rich('sessionEfficiencyDetail', {
                        minName: minEff.name,
                        minEff: minEff.eff.toFixed(2),
                        maxName: maxEff.name,
                        maxEff: maxEff.eff.toFixed(2),
                        b: (chunks) => <span style={{ fontWeight: 700, color: '#fafafa' }}>{chunks}</span>,
                      })}</>
                    );
                  })()}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div className="glass-card" style={{ borderRadius: '12px', padding: '20px', borderTop: `1px solid ${accent}50`, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: `${accent}15`, filter: 'blur(20px)', pointerEvents: 'none' }} />
      <p style={{ fontSize: '11px', fontWeight: 500, color: '#71717a', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</p>
      <p style={{ fontSize: '26px', fontWeight: 700, color: '#fafafa', letterSpacing: '-0.03em', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
      <p style={{ fontSize: '11px', color: '#52525b', marginTop: '4px' }}>{sub}</p>
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '8px 10px', fontSize: '11px', fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'left' };
const tdStyle: React.CSSProperties = { padding: '10px 10px', verticalAlign: 'middle' };
