'use client';

import { useTranslations } from 'next-intl';

interface ToolEntry {
  toolName: string;
  totalCalls: number;
  totalAccepts: number;
  totalRejects: number;
}

interface Props {
  data?: ToolEntry[];
}

export function ToolUsageTable({ data }: Props) {
  const t = useTranslations('tools');
  const tc = useTranslations('common');
  const isEmpty = !data || data.length === 0;

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
          {t('toolUsageStats')}
        </h2>
        <p style={{ fontSize: '12px', color: '#52525b' }}>{t('toolUsageStatsSub')}</p>
      </div>

      {isEmpty ? (
        <div
          style={{
            height: '120px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <p style={{ color: '#52525b', fontSize: '13px' }}>{tc('collectingData')}</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
            }}
          >
            <thead>
              <tr>
                {[t('toolName'), t('calls'), t('accepts'), t('rejects'), t('approvalRate')].map((col, idx) => (
                  <th
                    key={col}
                    style={{
                      textAlign: idx === 0 ? 'left' : 'right',
                      padding: '8px 10px',
                      fontSize: '10px',
                      fontWeight: 600,
                      color: '#52525b',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...data]
                .sort((a, b) => b.totalCalls - a.totalCalls)
                .map((row, idx) => {
                  const rate =
                    row.totalCalls > 0
                      ? ((row.totalAccepts / row.totalCalls) * 100).toFixed(1) + '%'
                      : '—';
                  const rateNum =
                    row.totalCalls > 0 ? (row.totalAccepts / row.totalCalls) * 100 : null;
                  const rateColor =
                    rateNum === null
                      ? '#52525b'
                      : rateNum >= 80
                        ? '#10b981'
                        : rateNum >= 50
                          ? '#f59e0b'
                          : '#ef4444';

                  return (
                    <tr
                      key={row.toolName}
                      style={{
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                        transition: 'background 0.1s ease',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.background =
                          'rgba(255,255,255,0.04)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.background =
                          idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)';
                      }}
                    >
                      <td
                        style={{
                          padding: '9px 10px',
                          fontSize: '12px',
                          fontWeight: 500,
                          color: '#e4e4e7',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                        }}
                      >
                        {row.toolName}
                      </td>
                      <td
                        style={{
                          padding: '9px 10px',
                          fontSize: '12px',
                          color: '#a1a1aa',
                          textAlign: 'right',
                          fontVariantNumeric: 'tabular-nums',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                        }}
                      >
                        {row.totalCalls.toLocaleString()}
                      </td>
                      <td
                        style={{
                          padding: '9px 10px',
                          fontSize: '12px',
                          color: '#10b981',
                          textAlign: 'right',
                          fontVariantNumeric: 'tabular-nums',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                        }}
                      >
                        {row.totalAccepts.toLocaleString()}
                      </td>
                      <td
                        style={{
                          padding: '9px 10px',
                          fontSize: '12px',
                          color: '#ef4444',
                          textAlign: 'right',
                          fontVariantNumeric: 'tabular-nums',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                        }}
                      >
                        {row.totalRejects.toLocaleString()}
                      </td>
                      <td
                        style={{
                          padding: '9px 10px',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: rateColor,
                          textAlign: 'right',
                          fontVariantNumeric: 'tabular-nums',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                        }}
                      >
                        {rate}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
