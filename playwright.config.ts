import { defineConfig } from '@playwright/test';

// Well-known local Supabase service role key (same for all local instances)
const LOCAL_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: 'html',
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    locale: 'en-US',
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 30_000,
    env: {
      // Resolved dynamically by global-setup.ts from `supabase status`,
      // falls back to these defaults if SUPABASE_URL is already set (e.g. CI)
      SUPABASE_URL: process.env.SUPABASE_URL || 'http://127.0.0.1:54351',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || LOCAL_SERVICE_ROLE_KEY,
      SESSION_SECRET: process.env.SESSION_SECRET || 'dGVzdC1zZWNyZXQtZm9yLWUyZS10ZXN0aW5nLTMyYnk=',
      OAUTH_CLIENT_ID: process.env.OAUTH_CLIENT_ID || 'test-client-id',
      OAUTH_CLIENT_SECRET: process.env.OAUTH_CLIENT_SECRET || 'test-client-secret',
      AUTH_TEST_BYPASS: 'true',
      ALLOW_UNAUTHED_USAGE: 'false',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
