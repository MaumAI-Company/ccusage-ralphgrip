'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import type { BudgetConfig, TeamMemberSummary, MemberPlan } from '@/lib/types';
import { api } from '@/lib/api-client';

const PLAN_OPTION_KEYS = [
  { value: '', labelKey: 'noPlan' },
  { value: 'max5', labelKey: 'max5Label' },
  { value: 'max20', labelKey: 'max20Label' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  budgetConfigs: BudgetConfig[];
  teamMembers: TeamMemberSummary[];
  memberPlans?: MemberPlan[];
  onSaved: () => void;
}

export function BudgetSettings({ isOpen, onClose, budgetConfigs, teamMembers, memberPlans = [], onSaved }: Props) {
  const t = useTranslations('budget');
  const tc = useTranslations('common');
  const planOptions = PLAN_OPTION_KEYS.map(o => ({ value: o.value, label: t(o.labelKey) }));
  const [activeTab, setActiveTab] = useState<'budget' | 'plan'>('budget');
  const [teamWeekly, setTeamWeekly] = useState('');
  const [teamMonthly, setTeamMonthly] = useState('');
  const [memberOverrides, setMemberOverrides] = useState<Record<string, { weekly: string; monthly: string }>>({});
  const [planEdits, setPlanEdits] = useState<Record<string, { planName: string; billingStart: string; isPersonal: boolean; note: string }>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Escape key dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Auto-focus close button when modal opens
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const teamW = budgetConfigs.find(b => b.memberId === null && b.budgetType === 'weekly');
    const teamM = budgetConfigs.find(b => b.memberId === null && b.budgetType === 'monthly');
    setTeamWeekly(teamW ? String(teamW.budgetUsd) : '');
    setTeamMonthly(teamM ? String(teamM.budgetUsd) : '');

    const overrides: Record<string, { weekly: string; monthly: string }> = {};
    for (const m of teamMembers) {
      const w = budgetConfigs.find(b => b.memberId === m.id && b.budgetType === 'weekly');
      const mo = budgetConfigs.find(b => b.memberId === m.id && b.budgetType === 'monthly');
      if (w || mo) {
        overrides[m.id] = {
          weekly: w ? String(w.budgetUsd) : '',
          monthly: mo ? String(mo.budgetUsd) : '',
        };
      }
    }
    setMemberOverrides(overrides);

    const plans: Record<string, { planName: string; billingStart: string; isPersonal: boolean; note: string }> = {};
    for (const m of teamMembers) {
      const existing = memberPlans.find(p => p.memberId === m.id);
      if (existing) {
        plans[m.id] = {
          planName: existing.planName,
          billingStart: existing.billingStart,
          isPersonal: existing.isPersonal,
          note: existing.note || '',
        };
      }
    }
    setPlanEdits(plans);
  }, [isOpen, budgetConfigs, teamMembers, memberPlans]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const requests: Promise<{ error?: unknown }>[] = [];

      // 팀 전체 기본값
      if (teamWeekly) {
        const val = parseFloat(teamWeekly);
        if (isNaN(val) || val < 0) { setError(t('weeklyBudgetError')); setSaving(false); return; }
        requests.push(api.postBudget({ memberId: null, budgetType: 'weekly', budgetUsd: val }));
      }
      if (teamMonthly) {
        const val = parseFloat(teamMonthly);
        if (isNaN(val) || val < 0) { setError(t('monthlyBudgetError')); setSaving(false); return; }
        requests.push(api.postBudget({ memberId: null, budgetType: 'monthly', budgetUsd: val }));
      }

      // 플랜 저장
      for (const [memberId, plan] of Object.entries(planEdits)) {
        if (plan.planName) {
          requests.push(api.postPlan({
            memberId,
            planName: plan.planName,
            billingStart: plan.billingStart || new Date().toISOString().split('T')[0],
            isPersonal: plan.isPersonal,
            note: plan.note || null,
          }));
        }
      }

      // 개별 오버라이드
      for (const [memberId, vals] of Object.entries(memberOverrides)) {
        if (vals.weekly) {
          const val = parseFloat(vals.weekly);
          if (isNaN(val) || val < 0) { setError(t('memberWeeklyError')); setSaving(false); return; }
          requests.push(api.postBudget({ memberId, budgetType: 'weekly', budgetUsd: val }));
        }
        if (vals.monthly) {
          const val = parseFloat(vals.monthly);
          if (isNaN(val) || val < 0) { setError(t('memberMonthlyError')); setSaving(false); return; }
          requests.push(api.postBudget({ memberId, budgetType: 'monthly', budgetUsd: val }));
        }
      }

      const responses = await Promise.all(requests);
      const failed = responses.filter(r => r.error);
      if (failed.length > 0) {
        setError(t('saveFailed'));
        return;
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }, [memberOverrides, onClose, onSaved, planEdits, teamMonthly, teamWeekly, t]);

  const toggleMemberOverride = (memberId: string) => {
    setMemberOverrides(prev => {
      if (prev[memberId]) {
        const next = { ...prev };
        delete next[memberId];
        return next;
      }
      return { ...prev, [memberId]: { weekly: '', monthly: '' } };
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        role="button"
        tabIndex={-1}
        aria-label="Close dialog"
        onClick={onClose}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClose(); } }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 100,
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="budget-settings-title"
        onKeyDown={e => {
          if (e.key !== 'Tab') return;
          const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
            'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (!focusable || focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey) {
            if (document.activeElement === first) { e.preventDefault(); last.focus(); }
          } else {
            if (document.activeElement === last) { e.preventDefault(); first.focus(); }
          }
        }}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 101,
          width: 'calc(100% - 32px)',
          maxWidth: '440px',
          maxHeight: '80vh',
          margin: '16px',
          overflow: 'auto',
          borderRadius: '16px',
          background: '#18181b',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
          animation: 'fadeInUp 0.3s ease',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 id="budget-settings-title" style={{ fontSize: '15px', fontWeight: 600, color: '#fafafa' }}>
              {t('budgetSettings')}
            </h3>
            <button
              ref={closeButtonRef}
              aria-label="Close dialog"
              onClick={onClose}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#71717a',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#a1a1aa'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#71717a'; }}
            >
              x
            </button>
          </div>
          <p style={{ fontSize: '12px', color: '#52525b', marginTop: '4px' }}>
            {t('budgetAndPlan')}
          </p>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0', marginTop: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {([['budget', t('budgetTab')], ['plan', t('planTab')]] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: activeTab === key ? 600 : 400,
                  color: activeTab === key ? '#fafafa' : '#71717a',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === key ? '2px solid #6366f1' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  marginBottom: '-1px',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>
          {error && (
            <div style={{
              padding: '8px 12px',
              marginBottom: '16px',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#fca5a5',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
            }}>
              {error}
            </div>
          )}
          {activeTab === 'budget' && (
            <>
              {/* Team defaults */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                  {t('teamBudget')}
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <InputField label={tc('weekly')} value={teamWeekly} onChange={setTeamWeekly} placeholder="50" />
                  <InputField label={tc('monthly')} value={teamMonthly} onChange={setTeamMonthly} placeholder="200" />
                </div>
              </div>

              {/* Member overrides */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                  {t('memberOverrides')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {teamMembers.map(m => {
                    const hasOverride = memberOverrides[m.id] !== undefined;
                    return (
                      <div key={m.id}>
                        <button
                          onClick={() => toggleMemberOverride(m.id)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            background: hasOverride ? 'rgba(99,102,241,0.08)' : 'transparent',
                            border: hasOverride ? '1px solid rgba(99,102,241,0.2)' : '1px solid rgba(255,255,255,0.06)',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            textAlign: 'left',
                          }}
                        >
                          <span style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '4px',
                            border: hasOverride ? '1px solid #6366f1' : '1px solid #52525b',
                            background: hasOverride ? '#6366f1' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '9px',
                            color: '#fff',
                            flexShrink: 0,
                          }}>
                            {hasOverride ? 'v' : ''}
                          </span>
                          <span style={{ fontSize: '13px', color: '#e4e4e7', flex: 1 }}>{m.name}</span>
                        </button>
                        {hasOverride && (
                          <div style={{ display: 'flex', gap: '12px', padding: '8px 0 0 22px' }}>
                            <InputField
                              label={tc('weekly')}
                              value={memberOverrides[m.id].weekly}
                              onChange={(v) => setMemberOverrides(prev => ({ ...prev, [m.id]: { ...prev[m.id], weekly: v } }))}
                              placeholder={teamWeekly || '-'}
                            />
                            <InputField
                              label={tc('monthly')}
                              value={memberOverrides[m.id].monthly}
                              onChange={(v) => setMemberOverrides(prev => ({ ...prev, [m.id]: { ...prev[m.id], monthly: v } }))}
                              placeholder={teamMonthly || '-'}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {activeTab === 'plan' && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                {t('memberPlans')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {teamMembers.map(m => {
                  const plan = planEdits[m.id] || { planName: '', billingStart: '', isPersonal: false, note: '' };
                  return (
                    <div
                      key={m.id}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.06)',
                        background: plan.planName ? 'rgba(99,102,241,0.04)' : 'transparent',
                      }}
                    >
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#e4e4e7', marginBottom: '8px' }}>
                        {m.name}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {/* Plan select */}
                        <div style={{ flex: '1 1 120px' }}>
                          <label style={{ fontSize: '11px', color: '#71717a', display: 'block', marginBottom: '4px' }}>{t('plan')}</label>
                          <select
                            value={plan.planName}
                            onChange={e => setPlanEdits(prev => ({
                              ...prev,
                              [m.id]: { ...plan, planName: e.target.value },
                            }))}
                            style={{
                              width: '100%',
                              padding: '7px 10px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              color: '#fafafa',
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              outline: 'none',
                            }}
                          >
                            {planOptions.map(o => (
                              <option key={o.value} value={o.value} style={{ background: '#18181b' }}>{o.label}</option>
                            ))}
                          </select>
                        </div>
                        {/* Billing start */}
                        <div style={{ flex: '1 1 120px' }}>
                          <label style={{ fontSize: '11px', color: '#71717a', display: 'block', marginBottom: '4px' }}>{t('billingStart')}</label>
                          <input
                            type="date"
                            value={plan.billingStart}
                            onChange={e => setPlanEdits(prev => ({
                              ...prev,
                              [m.id]: { ...plan, billingStart: e.target.value },
                            }))}
                            style={{
                              width: '100%',
                              padding: '7px 10px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              color: '#fafafa',
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              outline: 'none',
                              colorScheme: 'dark',
                            }}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px' }}>
                        {/* Personal checkbox */}
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', color: '#a1a1aa' }}>
                          <input
                            type="checkbox"
                            checked={plan.isPersonal}
                            onChange={e => setPlanEdits(prev => ({
                              ...prev,
                              [m.id]: { ...plan, isPersonal: e.target.checked },
                            }))}
                            style={{ accentColor: '#6366f1' }}
                          />
                          {t('personalPayment')}
                        </label>
                        {/* Note */}
                        <div style={{ flex: 1 }}>
                          <input
                            type="text"
                            placeholder={t('note')}
                            value={plan.note}
                            onChange={e => setPlanEdits(prev => ({
                              ...prev,
                              [m.id]: { ...plan, note: e.target.value },
                            }))}
                            style={{
                              width: '100%',
                              padding: '5px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              color: '#fafafa',
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              outline: 'none',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px 20px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#a1a1aa',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
          >
            {tc('cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#fafafa',
              background: saving ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.8)',
              border: '1px solid rgba(99,102,241,0.4)',
              cursor: saving ? 'default' : 'pointer',
              transition: 'all 0.15s',
              boxShadow: saving ? 'none' : '0 0 12px rgba(99,102,241,0.2)',
            }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.background = 'rgba(99,102,241,1)'; }}
            onMouseLeave={e => { if (!saving) e.currentTarget.style.background = 'rgba(99,102,241,0.8)'; }}
          >
            {saving ? tc('saving') : tc('save')}
          </button>
        </div>
      </div>
    </>
  );
}

function InputField({ label, value, onChange, placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div style={{ flex: 1 }}>
      <label style={{ fontSize: '11px', color: '#71717a', display: 'block', marginBottom: '4px' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute',
          left: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '12px',
          color: '#52525b',
        }}>$</span>
        <input
          type="number"
          min="0"
          step="1"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '7px 10px 7px 22px',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#fafafa',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            outline: 'none',
            fontVariantNumeric: 'tabular-nums',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
        />
      </div>
    </div>
  );
}
