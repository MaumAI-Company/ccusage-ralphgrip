/**
 * Seeds the local Supabase with known test data for E2E tests.
 * Uses the Supabase PostgREST API (no psql needed).
 */
import { execSync } from 'child_process';

const SEED_SQL = `
-- Clear previous E2E test data
DELETE FROM usage_records WHERE session_id LIKE 'e2e-%';
DELETE FROM budget_configs WHERE member_id IN (
  SELECT id FROM team_members WHERE name LIKE 'E2E-%'
);
DELETE FROM utilization_snapshots WHERE member_id IN (
  SELECT id FROM team_members WHERE name LIKE 'E2E-%'
);
DELETE FROM member_plans WHERE member_id IN (
  SELECT id FROM team_members WHERE name LIKE 'E2E-%'
);
DELETE FROM team_members WHERE name LIKE 'E2E-%';

-- Insert test members
INSERT INTO team_members (id, name, display_name, email)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'E2E-Alice', 'Alice Kim', 'alice@e2e.local'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'E2E-Bob', 'Bob Lee', 'bob@e2e.local')
ON CONFLICT (name) DO UPDATE SET display_name = EXCLUDED.display_name, email = EXCLUDED.email;

-- Insert usage records (within 30-day window)
INSERT INTO usage_records (member_id, session_id, model, input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens, cost_usd, project_name, recorded_at, turn_count)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'e2e-seed-1', 'claude-sonnet-4-6', 10000, 5000, 0, 0, 1.50, 'e2e-project', NOW() - INTERVAL '1 day', 5),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'e2e-seed-2', 'claude-sonnet-4-6', 15000, 7000, 0, 0, 2.00, 'e2e-project', NOW() - INTERVAL '2 days', 3),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'e2e-seed-3', 'claude-opus-4-6', 30000, 15000, 0, 0, 12.00, 'e2e-project', NOW() - INTERVAL '1 day', 8)
ON CONFLICT DO NOTHING;
`;

export function seedTestData(projectId: string) {
  const containerName = `supabase_db_${projectId}`;
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const tmpFile = path.join(os.tmpdir(), `e2e-seed-${Date.now()}.sql`);
  try {
    fs.writeFileSync(tmpFile, SEED_SQL);
    execSync(
      `docker exec -i ${containerName} psql -U postgres < ${tmpFile}`,
      { encoding: 'utf-8', timeout: 15_000, stdio: 'pipe' },
    );
  } catch (e) {
    throw new Error(`Failed to seed test data via ${containerName}: ${(e as Error).message}`);
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}
