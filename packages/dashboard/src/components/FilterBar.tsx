'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface Props {
  period: number;
  onPeriodChange: (period: number) => void;
  selectedMembers: string[];
  onMembersChange: (members: string[]) => void;
  selectedModels: string[];
  onModelsChange: (models: string[]) => void;
  availableMembers: string[];
  availableModels: string[];
}

const PERIOD_OPTIONS = [
  { label: '7d', value: 7 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
];

interface MultiSelectProps {
  label: string;
  selected: string[];
  onChange: (values: string[]) => void;
  options: string[];
}

function MultiSelect({ label, selected, onChange, options }: MultiSelectProps) {
  const tc = useTranslations('common');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  function selectAll() {
    onChange([...options]);
  }

  function clearAll() {
    onChange([]);
  }

  const allSelected = selected.length === options.length;
  const noneSelected = selected.length === 0;
  const displayLabel =
    noneSelected
      ? `${label}: ${tc('all')}`
      : allSelected
        ? `${label}: ${tc('all')}`
        : `${label}: ${tc('selected', { count: selected.length })}`;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          background: open ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px',
          color: '#a1a1aa',
          cursor: 'pointer',
          padding: '6px 12px',
          fontSize: '12px',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          whiteSpace: 'nowrap',
          transition: 'background 0.15s ease',
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
      >
        {displayLabel}
        <span style={{ fontSize: '10px', opacity: 0.6 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && options.length > 0 && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 60,
            background: '#18181b',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            padding: '8px',
            minWidth: '180px',
            maxHeight: '280px',
            overflowY: 'auto',
            boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
          }}
        >
          {/* Select all / Clear row */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              marginBottom: '6px',
              paddingBottom: '6px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <button
              onClick={selectAll}
              style={{
                background: 'none',
                border: 'none',
                color: '#818cf8',
                cursor: 'pointer',
                fontSize: '11px',
                padding: '0',
              }}
            >
              {tc('selectAll')}
            </button>
            <span style={{ color: '#3f3f46', fontSize: '11px' }}>·</span>
            <button
              onClick={clearAll}
              style={{
                background: 'none',
                border: 'none',
                color: '#71717a',
                cursor: 'pointer',
                fontSize: '11px',
                padding: '0',
              }}
            >
              {tc('deselectAll')}
            </button>
          </div>

          {options.map((opt) => {
            const checked = selected.includes(opt) || noneSelected;
            const actuallyChecked = selected.includes(opt);
            return (
              <label
                key={opt}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '5px 6px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'background 0.1s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <input
                  type="checkbox"
                  checked={actuallyChecked}
                  onChange={() => toggle(opt)}
                  style={{ accentColor: '#6366f1', cursor: 'pointer' }}
                />
                <span
                  style={{
                    fontSize: '12px',
                    color: checked ? '#e4e4e7' : '#71717a',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '140px',
                  }}
                >
                  {opt}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function FilterBar({
  period,
  onPeriodChange,
  selectedMembers,
  onMembersChange,
  selectedModels,
  onModelsChange,
  availableMembers,
  availableModels,
}: Props) {
  const t = useTranslations('filter');
  return (
    <div
      className="glass-card"
      style={{
        borderRadius: '12px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
      }}
    >
      {/* Period pills */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onPeriodChange(opt.value)}
            style={{
              background: period === opt.value ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${period === opt.value ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '6px',
              color: period === opt.value ? '#818cf8' : '#71717a',
              cursor: 'pointer',
              padding: '5px 12px',
              fontSize: '12px',
              fontWeight: period === opt.value ? 600 : 400,
              transition: 'all 0.15s ease',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div
        style={{
          width: '1px',
          height: '20px',
          background: 'rgba(255,255,255,0.08)',
          flexShrink: 0,
        }}
      />

      {/* Multi-select filters */}
      <MultiSelect
        label={t('members')}
        selected={selectedMembers}
        onChange={onMembersChange}
        options={availableMembers}
      />
      <MultiSelect
        label={t('models')}
        selected={selectedModels}
        onChange={onModelsChange}
        options={availableModels}
      />
    </div>
  );
}
