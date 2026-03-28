-- 001_initial_schema.sql
-- Core tables, indexes, and RPC functions.
-- Safe to re-run (all CREATE IF NOT EXISTS / CREATE OR REPLACE).

-- ============================================
-- Tables
-- ============================================

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT,
  account_type TEXT NOT NULL DEFAULT 'company',
  email TEXT,
  claimed_at TIMESTAMPTZ,
  authenticated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE team_members ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS authenticated_at TIMESTAMPTZ;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'company';

CREATE TABLE IF NOT EXISTS usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES team_members(id),
  session_id TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cache_creation_tokens INTEGER NOT NULL DEFAULT 0,
  cache_read_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
  project_name TEXT NOT NULL DEFAULT '',
  turn_count INTEGER DEFAULT 0,
  plugin_version TEXT DEFAULT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE usage_records ADD COLUMN IF NOT EXISTS turn_count INTEGER DEFAULT 0;
ALTER TABLE usage_records ADD COLUMN IF NOT EXISTS plugin_version TEXT DEFAULT NULL;

CREATE TABLE IF NOT EXISTS budget_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES team_members(id),
  budget_type TEXT NOT NULL CHECK (budget_type IN ('weekly', 'monthly')),
  budget_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (member_id, budget_type)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_budget_configs_team_default
  ON budget_configs(budget_type) WHERE member_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_budget_configs_member ON budget_configs(member_id);

CREATE TABLE IF NOT EXISTS utilization_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES team_members(id),
  five_hour_pct DOUBLE PRECISION,
  seven_day_pct DOUBLE PRECISION,
  five_hour_resets_at TIMESTAMPTZ,
  seven_day_resets_at TIMESTAMPTZ,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE utilization_snapshots ADD COLUMN IF NOT EXISTS five_hour_resets_at TIMESTAMPTZ;
ALTER TABLE utilization_snapshots ADD COLUMN IF NOT EXISTS seven_day_resets_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS member_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES team_members(id),
  plan_name TEXT NOT NULL,
  billing_start DATE NOT NULL,
  is_personal BOOLEAN NOT NULL DEFAULT false,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (member_id)
);

CREATE TABLE IF NOT EXISTS tool_usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES team_members(id),
  session_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  call_count INTEGER NOT NULL DEFAULT 0,
  accept_count INTEGER NOT NULL DEFAULT 0,
  reject_count INTEGER NOT NULL DEFAULT 0,
  recorded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_usage_member ON usage_records(member_id);
CREATE INDEX IF NOT EXISTS idx_usage_recorded ON usage_records(recorded_at);
CREATE INDEX IF NOT EXISTS idx_usage_session ON usage_records(session_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_unique_session_model
  ON usage_records(session_id, member_id, model);

CREATE INDEX IF NOT EXISTS idx_utilization_member ON utilization_snapshots(member_id);
CREATE INDEX IF NOT EXISTS idx_utilization_recorded ON utilization_snapshots(recorded_at);

CREATE INDEX IF NOT EXISTS idx_member_plans_member ON member_plans(member_id);

CREATE INDEX IF NOT EXISTS idx_tool_usage_member ON tool_usage_records(member_id);
CREATE INDEX IF NOT EXISTS idx_tool_usage_recorded ON tool_usage_records(recorded_at);
CREATE INDEX IF NOT EXISTS idx_tool_usage_session ON tool_usage_records(session_id);
CREATE INDEX IF NOT EXISTS idx_tool_usage_recorded_tool ON tool_usage_records(recorded_at, tool_name);

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE utilization_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_plans ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RPC Functions
-- ============================================

CREATE OR REPLACE FUNCTION get_daily_usage(since_date TIMESTAMPTZ)
RETURNS TABLE (
  date TEXT, "memberName" TEXT, model TEXT,
  "inputTokens" BIGINT, "outputTokens" BIGINT,
  "cacheCreationTokens" BIGINT, "cacheReadTokens" BIGINT,
  "costUsd" DOUBLE PRECISION
) AS $$
  SELECT
    to_char(ur.recorded_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
    tm.name AS "memberName", ur.model,
    SUM(ur.input_tokens)::BIGINT, SUM(ur.output_tokens)::BIGINT,
    SUM(ur.cache_creation_tokens)::BIGINT, SUM(ur.cache_read_tokens)::BIGINT,
    SUM(ur.cost_usd)
  FROM usage_records ur JOIN team_members tm ON tm.id = ur.member_id
  WHERE ur.recorded_at >= since_date
  GROUP BY date, tm.name, ur.model ORDER BY date DESC;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_member_usage(since_date TIMESTAMPTZ)
RETURNS TABLE ("memberName" TEXT, "totalCost" DOUBLE PRECISION, "totalTokens" BIGINT) AS $$
  SELECT tm.name, SUM(ur.cost_usd), SUM(ur.input_tokens + ur.output_tokens)::BIGINT
  FROM usage_records ur JOIN team_members tm ON tm.id = ur.member_id
  WHERE ur.recorded_at >= since_date
  GROUP BY tm.name ORDER BY "totalCost" DESC;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_model_distribution(since_date TIMESTAMPTZ)
RETURNS TABLE (model TEXT, count BIGINT, "totalCost" DOUBLE PRECISION) AS $$
  SELECT ur.model, COUNT(*)::BIGINT, SUM(ur.cost_usd)
  FROM usage_records ur WHERE ur.recorded_at >= since_date
  GROUP BY ur.model ORDER BY "totalCost" DESC;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_member_budget_usage(period_type TEXT, period_start TIMESTAMPTZ)
RETURNS TABLE ("memberId" UUID, "memberName" TEXT, "budgetUsd" DOUBLE PRECISION, "usedUsd" DOUBLE PRECISION, "usagePercent" DOUBLE PRECISION) AS $$
  SELECT tm.id, tm.name,
    COALESCE(bc.budget_usd, team_bc.budget_usd, 0),
    COALESCE(usage.total_cost, 0),
    CASE WHEN COALESCE(bc.budget_usd, team_bc.budget_usd, 0) > 0
      THEN (COALESCE(usage.total_cost, 0) / COALESCE(bc.budget_usd, team_bc.budget_usd, 0)) * 100 ELSE 0 END
  FROM team_members tm
  LEFT JOIN budget_configs bc ON bc.member_id = tm.id AND bc.budget_type = period_type
  LEFT JOIN budget_configs team_bc ON team_bc.member_id IS NULL AND team_bc.budget_type = period_type
  LEFT JOIN (SELECT member_id, SUM(cost_usd) AS total_cost FROM usage_records WHERE recorded_at >= period_start GROUP BY member_id) usage ON usage.member_id = tm.id
  ORDER BY "usedUsd" DESC;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_usage_velocity(since_date TIMESTAMPTZ)
RETURNS TABLE ("memberId" UUID, "memberName" TEXT, "dailyAvgUsd" DOUBLE PRECISION, "activeDays" INTEGER) AS $$
  SELECT tm.id, tm.name,
    CASE WHEN COUNT(DISTINCT to_char(ur.recorded_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')) > 0
      THEN SUM(ur.cost_usd) / COUNT(DISTINCT to_char(ur.recorded_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')) ELSE 0 END,
    COUNT(DISTINCT to_char(ur.recorded_at AT TIME ZONE 'UTC', 'YYYY-MM-DD'))::INTEGER
  FROM team_members tm LEFT JOIN usage_records ur ON ur.member_id = tm.id AND ur.recorded_at >= since_date
  GROUP BY tm.id, tm.name;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION upsert_budget(p_member_id UUID, p_budget_type TEXT, p_budget_usd DOUBLE PRECISION)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_member_id IS NULL THEN
    INSERT INTO budget_configs (member_id, budget_type, budget_usd, updated_at)
    VALUES (NULL, p_budget_type, p_budget_usd, now())
    ON CONFLICT (budget_type) WHERE member_id IS NULL DO UPDATE SET budget_usd = p_budget_usd, updated_at = now();
  ELSE
    INSERT INTO budget_configs (member_id, budget_type, budget_usd, updated_at)
    VALUES (p_member_id, p_budget_type, p_budget_usd, now())
    ON CONFLICT (member_id, budget_type) DO UPDATE SET budget_usd = p_budget_usd, updated_at = now();
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION get_session_count(since_date TIMESTAMPTZ)
RETURNS INTEGER LANGUAGE sql STABLE AS $$
  SELECT COUNT(DISTINCT session_id)::INTEGER FROM usage_records WHERE recorded_at >= since_date;
$$;

CREATE OR REPLACE FUNCTION get_rolling_usage_5h()
RETURNS TABLE ("memberId" UUID, "memberName" TEXT, "totalCostUsd" DOUBLE PRECISION, "totalInputTokens" BIGINT, "totalOutputTokens" BIGINT, "sessionCount" INTEGER) LANGUAGE sql STABLE AS $$
  SELECT tm.id, tm.name, COALESCE(SUM(ur.cost_usd), 0), COALESCE(SUM(ur.input_tokens), 0)::BIGINT, COALESCE(SUM(ur.output_tokens), 0)::BIGINT, COUNT(DISTINCT ur.session_id)::INTEGER
  FROM team_members tm LEFT JOIN usage_records ur ON ur.member_id = tm.id AND ur.recorded_at >= (now() - INTERVAL '5 hours')
  GROUP BY tm.id, tm.name ORDER BY "totalCostUsd" DESC;
$$;

CREATE OR REPLACE FUNCTION get_rolling_usage_7d()
RETURNS TABLE ("memberId" UUID, "memberName" TEXT, "totalCostUsd" DOUBLE PRECISION, "totalInputTokens" BIGINT, "totalOutputTokens" BIGINT, "sessionCount" INTEGER) LANGUAGE sql STABLE AS $$
  SELECT tm.id, tm.name, COALESCE(SUM(ur.cost_usd), 0), COALESCE(SUM(ur.input_tokens), 0)::BIGINT, COALESCE(SUM(ur.output_tokens), 0)::BIGINT, COUNT(DISTINCT ur.session_id)::INTEGER
  FROM team_members tm LEFT JOIN usage_records ur ON ur.member_id = tm.id AND ur.recorded_at >= (now() - INTERVAL '7 days')
  GROUP BY tm.id, tm.name ORDER BY "totalCostUsd" DESC;
$$;

CREATE OR REPLACE FUNCTION get_latest_utilization()
RETURNS TABLE ("memberId" UUID, "memberName" TEXT, "fiveHourPct" DOUBLE PRECISION, "sevenDayPct" DOUBLE PRECISION, "fiveHourResetsAt" TIMESTAMPTZ, "sevenDayResetsAt" TIMESTAMPTZ, "recordedAt" TIMESTAMPTZ) LANGUAGE sql STABLE AS $$
  SELECT DISTINCT ON (us.member_id) us.member_id, tm.name, us.five_hour_pct, us.seven_day_pct, us.five_hour_resets_at, us.seven_day_resets_at, us.recorded_at
  FROM utilization_snapshots us JOIN team_members tm ON tm.id = us.member_id
  ORDER BY us.member_id, us.recorded_at DESC;
$$;

CREATE OR REPLACE FUNCTION get_tool_usage_summary(since_date TIMESTAMPTZ)
RETURNS TABLE ("toolName" TEXT, "totalCalls" BIGINT, "totalAccepts" BIGINT, "totalRejects" BIGINT) AS $$
  SELECT tool_name, SUM(call_count)::BIGINT, SUM(accept_count)::BIGINT, SUM(reject_count)::BIGINT
  FROM tool_usage_records WHERE recorded_at >= since_date GROUP BY tool_name ORDER BY "totalCalls" DESC;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_daily_tool_usage(since_date TIMESTAMPTZ)
RETURNS TABLE (date TEXT, "toolName" TEXT, "totalCalls" BIGINT, "totalAccepts" BIGINT, "totalRejects" BIGINT) AS $$
  SELECT to_char(recorded_at AT TIME ZONE 'UTC', 'YYYY-MM-DD'), tool_name, SUM(call_count)::BIGINT, SUM(accept_count)::BIGINT, SUM(reject_count)::BIGINT
  FROM tool_usage_records WHERE recorded_at >= since_date GROUP BY date, tool_name ORDER BY date DESC;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_total_turns(since_date TIMESTAMPTZ)
RETURNS BIGINT AS $$
  SELECT COALESCE(SUM(session_turns), 0)::BIGINT FROM (
    SELECT MAX(turn_count) AS session_turns FROM usage_records WHERE recorded_at >= since_date GROUP BY session_id
  ) sub;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_member_session_count(since_date TIMESTAMPTZ)
RETURNS TABLE ("memberName" TEXT, "sessionCount" BIGINT) AS $$
  SELECT tm.name, COUNT(DISTINCT ur.session_id)::BIGINT
  FROM usage_records ur JOIN team_members tm ON ur.member_id = tm.id
  WHERE ur.recorded_at >= since_date GROUP BY tm.name ORDER BY "sessionCount" DESC;
$$ LANGUAGE sql STABLE;
