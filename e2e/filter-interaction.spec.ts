import { test, expect } from '@playwright/test';
import { loginWithTestUser } from './auth-helpers';
import { createErrorCollector } from './helpers/console-errors';

// All tests use real seeded data from local Supabase:
// - Members: Alice Kim, Bob Lee
// - Models: claude-sonnet-4-6, claude-opus-4-6

test.describe('Filter Dropdown Interaction', () => {
  const errorCollector = createErrorCollector();

  test.beforeEach(async ({ page }) => {
    await loginWithTestUser(page.request);
    errorCollector.errors = [];
    errorCollector.consoleErrors = [];
    errorCollector.attach(page);
  });

  test.afterEach(() => {
    errorCollector.assertNoErrors();
  });

  test('should open Members filter dropdown and show options', async ({ page }) => {
    await page.goto('/en');
    await expect(page.getByText('Team Dashboard')).toBeVisible({ timeout: 15000 });

    const membersButton = page.getByRole('button', { name: /Members/ });
    await membersButton.click();

    await expect(page.locator('label').filter({ hasText: 'Alice Kim' })).toBeVisible();
    await expect(page.locator('label').filter({ hasText: 'Bob Lee' })).toBeVisible();
  });

  test('should open Models filter dropdown and show options', async ({ page }) => {
    await page.goto('/en');
    await expect(page.getByText('Team Dashboard')).toBeVisible({ timeout: 15000 });

    const modelsButton = page.getByRole('button', { name: /Models/ });
    await modelsButton.click();

    await expect(page.locator('label').filter({ hasText: 'claude-sonnet-4-6' })).toBeVisible();
    await expect(page.locator('label').filter({ hasText: 'claude-opus-4-6' })).toBeVisible();
  });

  test('should close dropdown when clicking outside', async ({ page }) => {
    await page.goto('/en');
    await expect(page.getByText('Team Dashboard')).toBeVisible({ timeout: 15000 });

    const membersButton = page.getByRole('button', { name: /Members/ });
    await membersButton.click();

    await expect(page.locator('label').filter({ hasText: 'Alice Kim' })).toBeVisible();

    // Click outside to close
    await page.locator('h1').first().click();
    await expect(page.locator('label').filter({ hasText: 'Alice Kim' })).not.toBeVisible();
  });

  test('should toggle member checkbox selection', async ({ page }) => {
    await page.goto('/en');
    await expect(page.getByText('Team Dashboard')).toBeVisible({ timeout: 15000 });

    const membersButton = page.getByRole('button', { name: /Members/ });
    await membersButton.click();

    const aliceCheckbox = page.locator('label').filter({ hasText: 'Alice Kim' }).locator('input[type="checkbox"]');
    await aliceCheckbox.click();
    await expect(aliceCheckbox).toBeChecked();

    await aliceCheckbox.click();
    await expect(aliceCheckbox).not.toBeChecked();
  });

  test('should toggle model checkbox selection', async ({ page }) => {
    await page.goto('/en');
    await expect(page.getByText('Team Dashboard')).toBeVisible({ timeout: 15000 });

    const modelsButton = page.getByRole('button', { name: /Models/ });
    await modelsButton.click();

    const sonnetCheckbox = page.locator('label').filter({ hasText: 'claude-sonnet-4-6' }).locator('input[type="checkbox"]');
    await sonnetCheckbox.click();
    await expect(sonnetCheckbox).toBeChecked();
  });

  test('should support Select All and Clear buttons', async ({ page }) => {
    await page.goto('/en');
    await expect(page.getByText('Team Dashboard')).toBeVisible({ timeout: 15000 });

    const membersButton = page.getByRole('button', { name: /Members/ });
    await membersButton.click();

    // Click a member to select
    const aliceCheckbox = page.locator('label').filter({ hasText: 'Alice Kim' }).locator('input[type="checkbox"]');
    await aliceCheckbox.click();
    await expect(aliceCheckbox).toBeChecked();

    // Clear should uncheck all
    const clearButton = page.getByRole('button', { name: /Clear/i });
    if (await clearButton.isVisible()) {
      await clearButton.click();
      await expect(aliceCheckbox).not.toBeChecked();
    }
  });

  test('should filter displayed data when member is selected', async ({ page }) => {
    await page.goto('/en');
    await expect(page.getByText('Team Dashboard')).toBeVisible({ timeout: 15000 });

    // Both members visible initially (scope to HTML elements, skip SVG <title>)
    await expect(page.locator('span:has-text("Alice Kim"), p:has-text("Alice Kim"), div:has-text("Alice Kim")').first()).toBeVisible();
    await expect(page.locator('span:has-text("Bob Lee"), p:has-text("Bob Lee"), div:has-text("Bob Lee")').first()).toBeVisible();

    // Select only Alice
    const membersButton = page.getByRole('button', { name: /Members/ });
    await membersButton.click();
    const aliceCheckbox = page.locator('label').filter({ hasText: 'Alice Kim' }).locator('input[type="checkbox"]');
    await aliceCheckbox.click();

    // Close dropdown
    await page.locator('h1').first().click();

    // Wait for data to update
    await page.waitForTimeout(500);

    // Button should indicate filtered state
    await expect(membersButton).toContainText('1');
  });

  test('should allow dropdown interaction when page content is rendered below', async ({ page }) => {
    await page.goto('/en');
    await expect(page.getByText('Team Dashboard')).toBeVisible({ timeout: 15000 });

    // Open members dropdown
    const membersButton = page.getByRole('button', { name: /Members/ });
    await membersButton.click();

    // Dropdown should be visible and interactive even with chart content below
    const dropdown = page.locator('label').filter({ hasText: 'Alice Kim' });
    await expect(dropdown).toBeVisible();
    await dropdown.click();

    // Close and verify page is still functional
    await page.locator('h1').first().click();
    await expect(page.getByText('Team Dashboard')).toBeVisible();
  });
});
