import { test, expect } from '@playwright/test';
import { loginWithTestUser } from './auth-helpers';

// Authenticate each test's request context with a session cookie
test.beforeEach(async ({ request }) => {
  await loginWithTestUser(request);
});

// ============================================================================
// API validation tests — expect 400, never reach DB
// ============================================================================

test.describe('POST /api/usage — validation', () => {
  const validReport = {
    memberName: 'E2E-TestUser',
    sessionId: 'e2e-test-session-001',
    records: [
      {
        model: 'claude-sonnet-4-6',
        inputTokens: 10000,
        outputTokens: 5000,
        cacheCreationTokens: 3000,
        cacheReadTokens: 5000,
        costUsd: 0,
        projectName: 'e2e-test-project',
        recordedAt: '2026-03-01T10:00:00Z',
      },
    ],
    reportedAt: '2026-03-01T10:30:00Z',
  };

  test('should reject request without sessionId', async ({ request }) => {
    const res = await request.post('/api/usage', {
      data: { ...validReport, sessionId: '' },
    });
    expect(res.status()).toBe(400);
  });

  test('should reject request with empty records', async ({ request }) => {
    const res = await request.post('/api/usage', {
      data: { ...validReport, records: [] },
    });
    expect(res.status()).toBe(400);
  });

  test('should reject record with negative token count', async ({ request }) => {
    const res = await request.post('/api/usage', {
      data: {
        ...validReport,
        records: [{ ...validReport.records[0], inputTokens: -100 }],
      },
    });
    expect(res.status()).toBe(400);
  });

  test('should reject record with invalid date', async ({ request }) => {
    const res = await request.post('/api/usage', {
      data: {
        ...validReport,
        records: [{ ...validReport.records[0], recordedAt: 'not-a-date' }],
      },
    });
    expect(res.status()).toBe(400);
  });

  test('should reject record with missing model', async ({ request }) => {
    const res = await request.post('/api/usage', {
      data: {
        ...validReport,
        records: [{ ...validReport.records[0], model: '' }],
      },
    });
    expect(res.status()).toBe(400);
  });

  test('should reject too many records', async ({ request }) => {
    const records = Array.from({ length: 101 }, (_, i) => ({
      ...validReport.records[0],
      recordedAt: `2026-03-01T${String(i % 24).padStart(2, '0')}:00:00Z`,
    }));
    const res = await request.post('/api/usage', {
      data: { ...validReport, records },
    });
    expect(res.status()).toBe(400);
  });

  test('should reject sessionId exceeding max length', async ({ request }) => {
    const res = await request.post('/api/usage', {
      data: { ...validReport, sessionId: 'S'.repeat(513) },
    });
    expect(res.status()).toBe(400);
  });

  test('should reject non-integer token count', async ({ request }) => {
    const res = await request.post('/api/usage', {
      data: {
        ...validReport,
        records: [{ ...validReport.records[0], inputTokens: 10.5 }],
      },
    });
    expect(res.status()).toBe(400);
  });

  test('should reject token count exceeding maximum', async ({ request }) => {
    const res = await request.post('/api/usage', {
      data: {
        ...validReport,
        records: [{ ...validReport.records[0], inputTokens: 100_000_001 }],
      },
    });
    expect(res.status()).toBe(400);
  });

  test('should reject invalid utilization reset timestamp', async ({ request }) => {
    const res = await request.post('/api/usage', {
      data: {
        ...validReport,
        utilization: {
          fiveHour: 45.2,
          sevenDay: 12.8,
          fiveHourResetsAt: 'not-a-date',
        },
      },
    });
    expect(res.status()).toBe(400);
  });
});

// ============================================================================
// API integration tests — hit local Supabase (requires supabase start)
// ============================================================================

test.describe('POST /api/usage — integration', () => {
  const validReport = {
    memberName: 'E2E-TestUser',
    sessionId: `e2e-integration-${Date.now()}`,
    records: [
      {
        model: 'claude-sonnet-4-6',
        inputTokens: 1000,
        outputTokens: 500,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        costUsd: 0,
        projectName: 'e2e-test-project',
        recordedAt: '2026-03-01T10:00:00Z',
      },
    ],
    reportedAt: '2026-03-01T10:30:00Z',
  };

  test('should accept valid usage report', async ({ request }) => {
    const res = await request.post('/api/usage', {
      data: { ...validReport, sessionId: `e2e-valid-${Date.now()}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('should filter out synthetic model records', async ({ request }) => {
    const res = await request.post('/api/usage', {
      data: {
        ...validReport,
        sessionId: `e2e-synthetic-${Date.now()}`,
        records: [{ ...validReport.records[0], model: '<synthetic>' }],
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('should accept report with utilization data', async ({ request }) => {
    const res = await request.post('/api/usage', {
      data: {
        ...validReport,
        sessionId: `e2e-util-${Date.now()}`,
        utilization: {
          fiveHour: 45.2,
          sevenDay: 12.8,
          fiveHourResetsAt: '2026-03-01T15:30:00Z',
          sevenDayResetsAt: '2026-03-07T00:00:00Z',
        },
      },
    });
    expect(res.status()).toBe(200);
  });

  test('should reject projectName exceeding max length', async ({ request }) => {
    const res = await request.post('/api/usage', {
      data: {
        ...validReport,
        sessionId: `e2e-longproj-${Date.now()}`,
        records: [{ ...validReport.records[0], projectName: 'P'.repeat(500) }],
      },
    });
    expect(res.status()).toBe(400);
  });
});

test.describe('GET /api/stats — integration', () => {
  test('should return stats JSON with expected shape', async ({ request }) => {
    const res = await request.get('/api/stats?days=7');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('daily');
    expect(body).toHaveProperty('members');
    expect(body).toHaveProperty('models');
    expect(body).toHaveProperty('teamMembers');
    expect(body).toHaveProperty('sessionCount');
    expect(body).toHaveProperty('memberPlans');
    expect(Array.isArray(body.daily)).toBe(true);
  });

  test('should reject invalid days parameter', async ({ request }) => {
    const res = await request.get('/api/stats?days=abc');
    expect(res.status()).toBe(400);
  });

  test('should reject days=0', async ({ request }) => {
    const res = await request.get('/api/stats?days=0');
    expect(res.status()).toBe(400);
  });

  test('should reject days exceeding 365', async ({ request }) => {
    const res = await request.get('/api/stats?days=366');
    expect(res.status()).toBe(400);
  });
});

test.describe('GET /api/install', () => {
  function extractInstalledFile(script: string, relativePath: string): string {
    const quotedPath = relativePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = script.match(new RegExp(`write_plugin_file '${quotedPath}' '([^']+)'`));
    if (!match) {
      throw new Error(`Could not find installed file payload for ${relativePath}`);
    }
    return Buffer.from(match[1], 'base64').toString('utf-8');
  }

  test('should return bash install script', async ({ request }) => {
    const res = await request.get('/api/install');
    expect(res.status()).toBe(200);
    const contentType = res.headers()['content-type'];
    expect(contentType).toContain('text/plain');

    const body = await res.text();
    expect(body).toContain('#!/bin/bash');
    expect(body).toContain('ccusage-worv');

    const transcriptsModule = extractInstalledFile(body, 'scripts/lib/transcripts.mjs');
    expect(transcriptsModule).toContain('<synthetic>');
    expect(transcriptsModule).toContain('aggregateByModel');
  });

  test('should include fetchUtilization in install script', async ({ request }) => {
    const res = await request.get('/api/install');
    expect(res.status()).toBe(200);
    const body = await res.text();
    const utilizationModule = extractInstalledFile(body, 'scripts/lib/utilization.mjs');
    expect(utilizationModule).toContain('fetchUtilization');
    expect(utilizationModule).toContain('fiveHourResetsAt');
  });
});

test.describe('POST /api/budgets — validation', () => {
  test('should reject invalid budgetType', async ({ request }) => {
    const res = await request.post('/api/budgets', {
      data: { memberId: null, budgetType: 'yearly', budgetUsd: 100 },
    });
    expect(res.status()).toBe(400);
  });

  test('should reject negative budgetUsd', async ({ request }) => {
    const res = await request.post('/api/budgets', {
      data: { memberId: null, budgetType: 'weekly', budgetUsd: -10 },
    });
    expect(res.status()).toBe(400);
  });

  test('should reject budgetUsd exceeding 1M', async ({ request }) => {
    const res = await request.post('/api/budgets', {
      data: { memberId: null, budgetType: 'weekly', budgetUsd: 1_000_001 },
    });
    expect(res.status()).toBe(400);
  });

  test('should reject NaN budgetUsd', async ({ request }) => {
    const res = await request.post('/api/budgets', {
      data: { memberId: null, budgetType: 'weekly', budgetUsd: 'abc' },
    });
    expect(res.status()).toBe(400);
  });

  test('should reject invalid memberId format', async ({ request }) => {
    const res = await request.post('/api/budgets', {
      data: { memberId: 'not-a-uuid', budgetType: 'weekly', budgetUsd: 100 },
    });
    expect(res.status()).toBe(400);
  });
});

test.describe('POST /api/budgets — integration', () => {
  test('should accept valid budget with null memberId (team default)', async ({ request }) => {
    // Use a unique budgetUsd value to avoid collisions if tests run in parallel
    const uniqueAmount = 100 + (Date.now() % 900);
    const res = await request.post('/api/budgets', {
      data: { memberId: null, budgetType: 'weekly', budgetUsd: uniqueAmount },
    });
    expect(res.status()).toBe(200);
  });
});
