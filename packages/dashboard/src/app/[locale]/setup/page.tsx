'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AppHeader, HeaderDivider, HeaderLink } from '@/components/AppHeader';

const INSTALL_URL = 'https://ccusage.worvgrip.com/api/install';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        try {
          navigator.clipboard.writeText(text);
        } catch {
          // Clipboard API not available; silently ignore
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      style={{
        padding: '4px 10px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: 500,
        color: copied ? '#10b981' : '#a1a1aa',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.08)',
        cursor: 'pointer',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function CodeBlock({ children, copyText }: { children: string; copyText?: string }) {
  return (
    <div
      style={{
        position: 'relative',
        background: 'rgba(0,0,0,0.4)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '10px',
        padding: '16px 20px',
        fontFamily: 'var(--font-geist-mono), monospace',
        fontSize: '13px',
        lineHeight: 1.7,
        color: '#e4e4e7',
        overflowX: 'auto',
      }}
    >
      <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
        <CopyButton text={copyText || children} />
      </div>
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{children}</pre>
    </div>
  );
}

function StepCard({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div
      className="glass-card"
      style={{ borderRadius: '14px', padding: '24px', marginBottom: '16px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(139,92,246,0.2) 100%)',
            border: '1px solid rgba(99,102,241,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            fontWeight: 700,
            color: '#818cf8',
          }}
        >
          {number}
        </div>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#fafafa' }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function SetupPage() {
  const t = useTranslations('setup');
  const installCmd = `curl -sL ${INSTALL_URL} | bash`;

  return (
    <main className="min-h-screen" style={{ background: '#09090b' }}>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,0.08) 0%, transparent 60%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div className="relative" style={{ zIndex: 1 }}>
        {/* Header */}
        <AppHeader
          maxWidthClassName="max-w-3xl"
          meta={(
            <>
              <HeaderLink href="/">Dashboard</HeaderLink>
              <HeaderDivider />
              <HeaderLink href="/report">Report</HeaderLink>
              <HeaderDivider />
              <HeaderLink href="/setup" active>Setup</HeaderLink>
            </>
          )}
        />

        {/* Content */}
        <div className="max-w-3xl mx-auto" style={{ padding: '40px 24px 64px' }}>
          {/* Hero */}
          <div className="animate-fade-in-up animate-delay-1" style={{ marginBottom: '40px', textAlign: 'center' }}>
            <h1
              className="gradient-text"
              style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '8px' }}
            >
              Plugin Setup
            </h1>
            <p style={{ fontSize: '14px', color: '#71717a', maxWidth: '480px', margin: '0 auto', lineHeight: 1.6 }}>
              {t('heroSubtitle').split('\n').map((line, i) => (
                <span key={i}>{line}{i === 0 && <br />}</span>
              ))}
            </p>
          </div>

          {/* Quick install */}
          <div className="animate-fade-in-up animate-delay-2" style={{ marginBottom: '40px' }}>
            <div
              className="glass-card"
              style={{
                borderRadius: '14px',
                padding: '28px',
                borderColor: 'rgba(99,102,241,0.2)',
                background: 'rgba(99,102,241,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{ fontSize: '14px' }}>&#9889;</span>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#fafafa' }}>Quick Install</h2>
              </div>
              <p style={{ fontSize: '13px', color: '#a1a1aa', marginBottom: '16px', lineHeight: 1.6 }}>
                {t('quickInstallDesc').split('\n').map((line, i) => (
                  <span key={i}>{line}{i === 0 && <br />}</span>
                ))}
              </p>
              <CodeBlock copyText={installCmd}>{installCmd}</CodeBlock>
              <div style={{ marginTop: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{
                  padding: '3px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 500,
                  color: '#818cf8',
                  background: 'rgba(99,102,241,0.1)',
                  border: '1px solid rgba(99,102,241,0.15)',
                }}>Claude Code</span>
                <span style={{
                  padding: '3px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 500,
                  color: '#34d399',
                  background: 'rgba(16,185,129,0.1)',
                  border: '1px solid rgba(16,185,129,0.15)',
                }}>OpenCode</span>
                <span style={{
                  padding: '3px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 500,
                  color: '#fbbf24',
                  background: 'rgba(245,158,11,0.1)',
                  border: '1px solid rgba(245,158,11,0.15)',
                }}>Codex CLI</span>
                <span style={{
                  padding: '3px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 500,
                  color: '#60a5fa',
                  background: 'rgba(59,130,246,0.1)',
                  border: '1px solid rgba(59,130,246,0.15)',
                }}>Gemini CLI</span>
              </div>
            </div>
          </div>

          {/* Steps */}
          <div className="animate-fade-in-up animate-delay-3">
            <h2
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#71717a',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '20px',
              }}
            >
              What it does
            </h2>

            <StepCard number={1} title={t('step1Title')}>
              <p style={{ fontSize: '13px', color: '#a1a1aa', lineHeight: 1.7, marginBottom: '12px' }}>
                <code style={{ color: '#c4b5fd', background: 'rgba(99,102,241,0.1)', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>
                  ~/.ccusage-worv.json
                </code>
                {t('step1Desc')}
              </p>
              <CodeBlock>{`{
  "serverUrl": "https://ccusage.worvgrip.com"
}`}</CodeBlock>
            </StepCard>

            <StepCard number={2} title={t('step2Title')}>
              <p style={{ fontSize: '13px', color: '#a1a1aa', lineHeight: 1.7 }}>
                {t('step2Prefix')}{' '}
                <code style={{ color: '#c4b5fd', background: 'rgba(99,102,241,0.1)', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>
                  ~/.claude/settings.json
                </code>
                {t('step2Desc').split('\n').map((line, i) => (
                  <span key={i}>{line}{i === 0 && <br />}</span>
                ))}
              </p>
            </StepCard>

            <StepCard number={3} title={t('step3Title')}>
              <p style={{ fontSize: '13px', color: '#a1a1aa', lineHeight: 1.7 }}>
                {t('step3Desc').split('\n').map((line, i) => (
                  <span key={i}>{line}{i === 0 && <br />}</span>
                ))}
              </p>
            </StepCard>
          </div>

          {/* Update */}
          <div className="animate-fade-in-up animate-delay-3" style={{ marginTop: '40px' }}>
            <h2
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#71717a',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '20px',
              }}
            >
              Updating
            </h2>
            <div className="glass-card" style={{ borderRadius: '14px', padding: '24px' }}>
              <p style={{ fontSize: '13px', color: '#a1a1aa', lineHeight: 1.7, marginBottom: '12px' }}>
                {t('updateDesc').split('\n').map((line, i) => (
                  <span key={i}>{line}{i === 0 && <br />}</span>
                ))}
              </p>
              <CodeBlock copyText={installCmd}>{installCmd}</CodeBlock>
              <p style={{ fontSize: '12px', color: '#71717a', lineHeight: 1.6, marginTop: '12px' }}>
                {t('updateNote')}
              </p>
            </div>
          </div>

          {/* Authentication */}
          <div className="animate-fade-in-up animate-delay-3" style={{ marginTop: '40px' }}>
            <h2
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#71717a',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '20px',
              }}
            >
              Authentication (Recommended)
            </h2>
            <div className="glass-card" style={{ borderRadius: '14px', padding: '24px' }}>
              <p style={{ fontSize: '13px', color: '#a1a1aa', lineHeight: 1.7, marginBottom: '12px' }}>
                {t('authDesc').split('\n').map((line, i) => (
                  <span key={i}>{line}{i === 0 && <br />}</span>
                ))}
              </p>
              <CodeBlock>/ccusage-worv:login</CodeBlock>
              <p style={{ fontSize: '12px', color: '#71717a', lineHeight: 1.6, marginTop: '12px' }}>
                {t('authNote')}
              </p>
            </div>
          </div>

          {/* Slash Commands */}
          <div className="animate-fade-in-up animate-delay-3" style={{ marginTop: '40px' }}>
            <h2
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#71717a',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '20px',
              }}
            >
              Slash Commands
            </h2>
            <div className="glass-card" style={{ borderRadius: '14px', padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { cmd: '/ccusage-worv:login', desc: t('loginDesc') },
                  { cmd: '/ccusage-worv:logout', desc: t('logoutDesc') },
                  { cmd: '/ccusage-worv:sync', desc: t('syncDesc') },
                ].map((item) => (
                  <div
                    key={item.cmd}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '10px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    <code style={{
                      color: '#c4b5fd',
                      background: 'rgba(99,102,241,0.1)',
                      padding: '3px 8px',
                      borderRadius: '5px',
                      fontSize: '12px',
                      whiteSpace: 'nowrap',
                    }}>
                      {item.cmd}
                    </code>
                    <span style={{ fontSize: '13px', color: '#a1a1aa' }}>{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tool install */}
          <div className="animate-fade-in-up animate-delay-4" style={{ marginTop: '40px' }}>
            <h2
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#71717a',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '20px',
              }}
            >
              Install Supported CLIs
            </h2>
            <StepCard number={4} title={t('cliInstallTitle')}>
              <p style={{ fontSize: '13px', color: '#a1a1aa', lineHeight: 1.7, marginBottom: '12px' }}>
                {t('cliInstallDesc').split('\n').map((line, i) => (
                  <span key={i}>{line}{i === 0 && <br />}</span>
                ))}
              </p>
              <CodeBlock>{`# OpenCode
curl -fsSL https://opencode.ai/install | bash
# 또는: npm i -g opencode-ai@latest

# Codex CLI
npm install -g @openai/codex
# 또는: brew install --cask codex

# Gemini CLI
npm install -g @google/gemini-cli
# 또는: brew install gemini-cli`}</CodeBlock>
            </StepCard>
          </div>

          {/* Prerequisites */}
          <div className="animate-fade-in-up animate-delay-5" style={{ marginTop: '40px' }}>
            <h2
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#71717a',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '20px',
              }}
            >
              Prerequisites
            </h2>
            <div className="glass-card" style={{ borderRadius: '14px', padding: '24px' }}>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {[
                  { label: 'Node.js 20+', desc: t('prereqNode') },
                  { label: 'Claude Code / OpenCode / Codex CLI / Gemini CLI', desc: t('prereqCli') },
                  { label: 'curl', desc: t('prereqCurl') },
                ].map((item) => (
                  <li
                    key={item.label}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '10px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    <span style={{ color: '#10b981', fontSize: '14px', marginTop: '1px' }}>&#10003;</span>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#e4e4e7' }}>{item.label}</span>
                      <span style={{ fontSize: '12px', color: '#71717a', marginLeft: '8px' }}>{item.desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Verify */}
          <div className="animate-fade-in-up animate-delay-6" style={{ marginTop: '40px' }}>
            <h2
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#71717a',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '20px',
              }}
            >
              Verify Installation
            </h2>
            <StepCard number={1} title={t('verifyStep1')}>
              <CodeBlock>cat ~/.ccusage-worv.json</CodeBlock>
            </StepCard>
            <StepCard number={2} title={t('verifyStep2')}>
              <CodeBlock>{`cat ~/.claude/settings.json | grep ccusage
cat ~/.gemini/settings.json | grep ccusage`}</CodeBlock>
            </StepCard>
            <StepCard number={3} title={t('verifyStep3')}>
              <p style={{ fontSize: '13px', color: '#a1a1aa', lineHeight: 1.7, marginBottom: '12px' }}>
                {t('verifyStep3Desc')}
              </p>
            </StepCard>
          </div>

          {/* Troubleshooting */}
          <div className="animate-fade-in-up animate-delay-7" style={{ marginTop: '40px' }}>
            <h2
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#71717a',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '20px',
              }}
            >
              Troubleshooting
            </h2>
            <div className="glass-card" style={{ borderRadius: '14px', padding: '24px' }}>
              {[
                {
                  q: t('faqQ1'),
                  a: t('faqA1'),
                },
                {
                  q: t('faqQ2'),
                  a: t('faqA2'),
                },
                {
                  q: t('faqQ3'),
                  a: t('faqA3'),
                },
              ].map((item) => (
                <div
                  key={item.q}
                  style={{
                    padding: '12px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#e4e4e7', marginBottom: '4px' }}>
                    Q. {item.q}
                  </p>
                  <p style={{ fontSize: '13px', color: '#a1a1aa', lineHeight: 1.6 }}>
                    A. {item.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
