/**
 * Playwright global setup — requires local Supabase, seeds test data.
 * In CI: env vars are pre-set by the workflow. Locally: resolves from `supabase status`.
 */
import { execSync } from 'child_process';
import path from 'path';
import { seedTestData } from './seed-test-data';

const DASHBOARD_DIR = path.resolve(__dirname, '../packages/dashboard');

function getSupabaseEnvFromCli(): Record<string, string> {
  try {
    const output = execSync('supabase status -o env', {
      cwd: DASHBOARD_DIR,
      encoding: 'utf-8',
      timeout: 10_000,
      stdio: 'pipe',
    });
    const env: Record<string, string> = {};
    for (const line of output.split('\n')) {
      const match = line.match(/^(\w+)="?([^"]*)"?$/);
      if (match) env[match[1]] = match[2];
    }
    return env;
  } catch {
    return {};
  }
}

function getProjectId(): string {
  try {
    const configPath = path.join(DASHBOARD_DIR, 'supabase', 'config.toml');
    const config = require('fs').readFileSync(configPath, 'utf-8');
    const match = config.match(/project_id\s*=\s*"([^"]+)"/);
    return match ? match[1] : 'ccusage-ralphgrip-local';
  } catch {
    return 'ccusage-ralphgrip-local';
  }
}

export default function globalSetup() {
  // In CI, SUPABASE_URL is already set by the workflow via $GITHUB_ENV.
  // Locally, resolve from `supabase status`.
  let apiUrl = process.env.SUPABASE_URL;
  let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiUrl || apiUrl.includes('placeholder')) {
    const sbEnv = getSupabaseEnvFromCli();
    apiUrl = sbEnv.API_URL;
    serviceRoleKey = sbEnv.SERVICE_ROLE_KEY;
  }

  if (!apiUrl) {
    throw new Error(
      'Local Supabase is not running. Start it before running E2E tests:\n\n' +
      '  cd packages/dashboard && pnpm db:start\n',
    );
  }

  process.env.SUPABASE_URL = apiUrl;
  if (serviceRoleKey) process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRoleKey;

  // Seed deterministic test data via Docker exec
  const projectId = getProjectId();
  seedTestData(projectId);

  console.log(`✓ Local Supabase at ${apiUrl} (project: ${projectId})`);
}
