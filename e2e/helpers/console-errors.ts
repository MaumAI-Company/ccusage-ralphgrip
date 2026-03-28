/**
 * Playwright helper to detect uncaught JS errors during page rendering.
 * Wire into beforeEach/afterEach to catch TypeError-class bugs in E2E tests.
 */
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export interface PageErrorCollector {
  errors: Error[];
  consoleErrors: string[];
  attach(page: Page): void;
  assertNoErrors(): void;
}

/** Create a collector that captures page crashes and console.error calls. */
export function createErrorCollector(): PageErrorCollector {
  const collector: PageErrorCollector = {
    errors: [],
    consoleErrors: [],

    attach(page: Page) {
      page.on('pageerror', (error) => {
        collector.errors.push(error);
      });
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text();
          // Ignore known benign errors
          if (text.includes('Failed to load resource') && text.includes('favicon')) return;
          if (text.includes('Download the React DevTools')) return;
          collector.consoleErrors.push(text);
        }
      });
    },

    assertNoErrors() {
      const uncaught = collector.errors.map(e => `${e.name}: ${e.message}`);
      expect(uncaught, `Uncaught page errors:\n${uncaught.join('\n')}`).toHaveLength(0);
    },
  };
  return collector;
}

/** Complete mock StatsResponse matching the current API contract. */
export function createMockStats(overrides: Record<string, unknown> = {}) {
  return {
    daily: [],
    members: [],
    models: [],
    teamMembers: [],
    weeklyBudgets: [],
    monthlyBudgets: [],
    velocity: [],
    budgetConfigs: [],
    sessionCount: 0,
    rolling5h: [],
    rolling7d: [],
    utilization: [],
    memberPlans: [],
    weeklyRanking: [],
    previousWeekTop: [],
    toolUsageSummary: [],
    dailyToolUsage: [],
    totalTurns: 0,
    memberSessionCount: [],
    utilizationHistory: [],
    ...overrides,
  };
}
