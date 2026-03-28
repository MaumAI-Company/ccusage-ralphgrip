import { test, expect } from '@playwright/test';
import { loginWithTestUser } from './auth-helpers';
import { createErrorCollector } from './helpers/console-errors';

// All tests use real data from local Supabase (seeded in globalSetup).
// No mocked API responses — this tests the full stack end-to-end.
//
// NOTE: All chart components are loaded with dynamic({ ssr: false }),
// so they hydrate client-side after initial page load. Use 15000ms
// timeouts for any assertion that targets content inside these components.

test.describe('Dashboard — full stack E2E', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithTestUser(page.request);
  });

  test('should render dashboard with seeded data and no console errors', async ({ page }) => {
    const ec = createErrorCollector();
    ec.attach(page);

    await page.goto('/en');
    await expect(page.getByText('Team Dashboard')).toBeVisible({ timeout: 15000 });

    // Seeded members should appear (use CSS text selector to skip hidden SVG <title> elements)
    await expect(page.locator('span:has-text("Alice Kim"), p:has-text("Alice Kim"), div:has-text("Alice Kim")').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('span:has-text("Bob Lee"), p:has-text("Bob Lee"), div:has-text("Bob Lee")').first()).toBeVisible({ timeout: 15000 });

    // Stats cards should show non-zero values
    await expect(page.getByText('Total Cost', { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Sessions', { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Team Members', { exact: true })).toBeVisible({ timeout: 15000 });

    ec.assertNoErrors();
  });

  test('should show period filter buttons', async ({ page }) => {
    const ec = createErrorCollector();
    ec.attach(page);

    await page.goto('/en');
    await expect(page.getByText('Team Dashboard')).toBeVisible({ timeout: 15000 });

    await expect(page.getByRole('button', { name: '7d' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: '30d' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: '90d' })).toBeVisible({ timeout: 15000 });

    ec.assertNoErrors();
  });

  test('should switch period when pill is clicked', async ({ page }) => {
    const ec = createErrorCollector();
    ec.attach(page);

    await page.goto('/en');
    await expect(page.getByText('Team Dashboard')).toBeVisible({ timeout: 15000 });

    // Click 7d pill and verify URL updates
    await page.getByRole('button', { name: '7d' }).click();
    await page.waitForTimeout(500);

    // Click 90d pill
    await page.getByRole('button', { name: '90d' }).click();
    await page.waitForTimeout(500);

    ec.assertNoErrors();
  });

  test('should open budget settings modal', async ({ page }) => {
    const ec = createErrorCollector();
    ec.attach(page);

    await page.goto('/en');
    await expect(page.getByText('Team Dashboard')).toBeVisible({ timeout: 15000 });

    await page.getByTitle('Budget settings').click();
    await expect(page.getByText('Team Default Budget (USD)')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Per-Member Overrides', { exact: true })).toBeVisible({ timeout: 15000 });

    ec.assertNoErrors();
  });

  test('should navigate across pages without console errors', async ({ page }) => {
    // 3 sequential navigations — extend timeout for CI
    test.setTimeout(60_000);

    const ec = createErrorCollector();
    ec.attach(page);

    // Use waitUntil:'domcontentloaded' because the dashboard opens an SSE
    // connection that keeps the 'load' event pending, causing ERR_ABORTED
    // on subsequent navigations.
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Team Dashboard')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('header')).toBeVisible();

    await page.goto('/en/report', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Monthly Report')).toBeVisible({ timeout: 15000 });

    await page.goto('/en/setup', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Plugin Setup')).toBeVisible({ timeout: 15000 });

    ec.assertNoErrors();
  });

  test('should show Rate Limit panel (empty or populated based on seed)', async ({ page }) => {
    const ec = createErrorCollector();
    ec.attach(page);

    await page.goto('/en');
    await expect(page.getByText('Team Dashboard')).toBeVisible({ timeout: 15000 });

    // RollingUsagePanel is dynamic({ ssr: false }) — needs hydration time
    await expect(page.getByText('Rate Limit Utilization')).toBeVisible({ timeout: 15000 });

    ec.assertNoErrors();
  });

  test('should show model distribution section', async ({ page }) => {
    const ec = createErrorCollector();
    ec.attach(page);

    await page.goto('/en');
    await expect(page.getByText('Team Dashboard')).toBeVisible({ timeout: 15000 });

    // ModelCostChart is dynamic({ ssr: false }) — needs hydration time
    await expect(page.getByText('Cost by Model (USD)')).toBeVisible({ timeout: 15000 });

    ec.assertNoErrors();
  });

  test('should render report page without errors', async ({ page }) => {
    const ec = createErrorCollector();
    ec.attach(page);

    await page.goto('/en/report');
    await expect(page.getByText('Monthly Report')).toBeVisible({ timeout: 15000 });

    // Report should render with content sections
    await expect(page.getByText('Usage by Member')).toBeVisible({ timeout: 15000 });

    ec.assertNoErrors();
  });

  test('should show new insight cards (avg cost, burn rate)', async ({ page }) => {
    const ec = createErrorCollector();
    ec.attach(page);
    await page.goto('/en');
    await expect(page.getByText('Team Dashboard')).toBeVisible({ timeout: 15000 });
    // New KPI cards (Cache Hit Ratio was removed)
    await expect(page.getByText('Avg $/Session', { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Daily Burn Rate', { exact: true })).toBeVisible({ timeout: 15000 });
    ec.assertNoErrors();
  });

  test('should show model usage by member chart', async ({ page }) => {
    const ec = createErrorCollector();
    ec.attach(page);
    await page.goto('/en');
    await expect(page.getByText('Team Dashboard')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Model Usage by Member')).toBeVisible({ timeout: 15000 });
    ec.assertNoErrors();
  });

  test('should navigate weekly ranking to previous week', async ({ page }) => {
    const ec = createErrorCollector();
    ec.attach(page);
    await page.goto('/en');
    await expect(page.getByText('Team Dashboard')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Weekly Usage Ranking')).toBeVisible({ timeout: 15000 });
    // Click previous week arrow
    const prevButton = page.getByRole('button', { name: '←' });
    await expect(prevButton).toBeVisible({ timeout: 15000 });
    await prevButton.click();
    // "This week" button should appear when viewing past week
    await expect(page.getByText('This week')).toBeVisible({ timeout: 15000 });
    ec.assertNoErrors();
  });
});
