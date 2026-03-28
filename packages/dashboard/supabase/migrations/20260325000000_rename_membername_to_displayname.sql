-- Rename "memberName" column to "displayName" in all RPC return types.
-- The underlying resolution logic (COALESCE(display_name, email, name)) is unchanged.
-- This aligns the API contract with the product requirement that memberName is internal-only.

-- Drop existing functions first — Postgres requires DROP when changing return types.
DROP FUNCTION IF EXISTS get_daily_usage(TIMESTAMPTZ);
DROP FUNCTION IF EXISTS get_member_usage(TIMESTAMPTZ);
DROP FUNCTION IF EXISTS get_member_budget_usage(TEXT, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS get_usage_velocity(TIMESTAMPTZ);
DROP FUNCTION IF EXISTS get_rolling_usage_5h();
DROP FUNCTION IF EXISTS get_rolling_usage_7d();
DROP FUNCTION IF EXISTS get_latest_utilization();
DROP FUNCTION IF EXISTS get_utilization_history(TIMESTAMPTZ);
DROP FUNCTION IF EXISTS get_member_session_count(TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION get_daily_usage(since_date TIMESTAMPTZ)
RETURNS TABLE (
  date TEXT, "displayName" TEXT, model TEXT,
  "inputTokens" BIGINT, "outputTokens" BIGINT,
  "cacheCreationTokens" BIGINT, "cacheReadTokens" BIGINT,
  "costUsd" DOUBLE PRECISION
) AS $$
  SELECT
    to_char(ur.recorded_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD') AS date,
    COALESCE(tm.display_name, tm.email, tm.name) AS "displayName", ur.model,
    SUM(ur.input_tokens)::BIGINT AS "inputTokens",
    SUM(ur.output_tokens)::BIGINT AS "outputTokens",
    SUM(ur.cache_creation_tokens)::BIGINT AS "cacheCreationTokens",
    SUM(ur.cache_read_tokens)::BIGINT AS "cacheReadTokens",
    SUM(ur.cost_usd) AS "costUsd"
  FROM usage_records ur JOIN team_members tm ON tm.id = ur.member_id
  WHERE ur.recorded_at >= since_date
  GROUP BY date, tm.id, ur.model ORDER BY date DESC;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_member_usage(since_date TIMESTAMPTZ)
RETURNS TABLE ("displayName" TEXT, "totalCost" DOUBLE PRECISION, "totalTokens" BIGINT) AS $$
  SELECT
    COALESCE(tm.display_name, tm.email, tm.name) AS "displayName",
    SUM(ur.cost_usd) AS "totalCost",
    SUM(ur.input_tokens + ur.output_tokens)::BIGINT AS "totalTokens"
  FROM usage_records ur JOIN team_members tm ON tm.id = ur.member_id
  WHERE ur.recorded_at >= since_date
  GROUP BY tm.id ORDER BY "totalCost" DESC;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_member_budget_usage(period_type TEXT, period_start TIMESTAMPTZ)
RETURNS TABLE ("memberId" UUID, "displayName" TEXT, "budgetUsd" DOUBLE PRECISION, "usedUsd" DOUBLE PRECISION, "usagePercent" DOUBLE PRECISION) AS $$
  SELECT
    tm.id AS "memberId",
    COALESCE(tm.display_name, tm.email, tm.name) AS "displayName",
    COALESCE(bc.budget_usd, team_bc.budget_usd, 0) AS "budgetUsd",
    COALESCE(usage.total_cost, 0) AS "usedUsd",
    CASE WHEN COALESCE(bc.budget_usd, team_bc.budget_usd, 0) > 0
      THEN (COALESCE(usage.total_cost, 0) / COALESCE(bc.budget_usd, team_bc.budget_usd, 0)) * 100 ELSE 0 END AS "usagePercent"
  FROM team_members tm
  LEFT JOIN budget_configs bc ON bc.member_id = tm.id AND bc.budget_type = period_type
  LEFT JOIN budget_configs team_bc ON team_bc.member_id IS NULL AND team_bc.budget_type = period_type
  LEFT JOIN (SELECT member_id, SUM(cost_usd) AS total_cost FROM usage_records WHERE recorded_at >= period_start GROUP BY member_id) usage ON usage.member_id = tm.id
  ORDER BY "usedUsd" DESC;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_usage_velocity(since_date TIMESTAMPTZ)
RETURNS TABLE ("memberId" UUID, "displayName" TEXT, "dailyAvgUsd" DOUBLE PRECISION, "activeDays" INTEGER) AS $$
  SELECT
    tm.id AS "memberId",
    COALESCE(tm.display_name, tm.email, tm.name) AS "displayName",
    CASE WHEN COUNT(DISTINCT to_char(ur.recorded_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')) > 0
      THEN SUM(ur.cost_usd) / COUNT(DISTINCT to_char(ur.recorded_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')) ELSE 0 END AS "dailyAvgUsd",
    COUNT(DISTINCT to_char(ur.recorded_at AT TIME ZONE 'UTC', 'YYYY-MM-DD'))::INTEGER AS "activeDays"
  FROM team_members tm LEFT JOIN usage_records ur ON ur.member_id = tm.id AND ur.recorded_at >= since_date
  GROUP BY tm.id;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_rolling_usage_5h()
RETURNS TABLE ("memberId" UUID, "displayName" TEXT, "totalCostUsd" DOUBLE PRECISION, "totalInputTokens" BIGINT, "totalOutputTokens" BIGINT, "sessionCount" INTEGER) LANGUAGE sql STABLE AS $$
  SELECT
    tm.id AS "memberId",
    COALESCE(tm.display_name, tm.email, tm.name) AS "displayName",
    COALESCE(SUM(ur.cost_usd), 0) AS "totalCostUsd",
    COALESCE(SUM(ur.input_tokens), 0)::BIGINT AS "totalInputTokens",
    COALESCE(SUM(ur.output_tokens), 0)::BIGINT AS "totalOutputTokens",
    COUNT(DISTINCT ur.session_id)::INTEGER AS "sessionCount"
  FROM team_members tm LEFT JOIN usage_records ur ON ur.member_id = tm.id AND ur.recorded_at >= (now() - INTERVAL '5 hours')
  GROUP BY tm.id ORDER BY "totalCostUsd" DESC;
$$;

CREATE OR REPLACE FUNCTION get_rolling_usage_7d()
RETURNS TABLE ("memberId" UUID, "displayName" TEXT, "totalCostUsd" DOUBLE PRECISION, "totalInputTokens" BIGINT, "totalOutputTokens" BIGINT, "sessionCount" INTEGER) LANGUAGE sql STABLE AS $$
  SELECT
    tm.id AS "memberId",
    COALESCE(tm.display_name, tm.email, tm.name) AS "displayName",
    COALESCE(SUM(ur.cost_usd), 0) AS "totalCostUsd",
    COALESCE(SUM(ur.input_tokens), 0)::BIGINT AS "totalInputTokens",
    COALESCE(SUM(ur.output_tokens), 0)::BIGINT AS "totalOutputTokens",
    COUNT(DISTINCT ur.session_id)::INTEGER AS "sessionCount"
  FROM team_members tm LEFT JOIN usage_records ur ON ur.member_id = tm.id AND ur.recorded_at >= (now() - INTERVAL '7 days')
  GROUP BY tm.id ORDER BY "totalCostUsd" DESC;
$$;

CREATE OR REPLACE FUNCTION get_latest_utilization()
RETURNS TABLE ("memberId" UUID, "displayName" TEXT, "fiveHourPct" DOUBLE PRECISION, "sevenDayPct" DOUBLE PRECISION, "recordedAt" TIMESTAMPTZ) LANGUAGE sql STABLE AS $$
  SELECT DISTINCT ON (us.member_id)
    us.member_id AS "memberId",
    COALESCE(tm.display_name, tm.email, tm.name) AS "displayName",
    us.five_hour_pct AS "fiveHourPct",
    us.seven_day_pct AS "sevenDayPct",
    us.recorded_at AS "recordedAt"
  FROM utilization_snapshots us JOIN team_members tm ON tm.id = us.member_id
  WHERE us.recorded_at >= (now() - INTERVAL '6 hours')
  ORDER BY us.member_id, us.recorded_at DESC;
$$;

CREATE OR REPLACE FUNCTION get_utilization_history(since_date TIMESTAMPTZ)
RETURNS TABLE ("displayName" TEXT, "fiveHourPct" DOUBLE PRECISION, "sevenDayPct" DOUBLE PRECISION, "recordedAt" TIMESTAMPTZ) LANGUAGE sql STABLE AS $$
  SELECT
    COALESCE(tm.display_name, tm.email, tm.name) AS "displayName",
    us.five_hour_pct AS "fiveHourPct",
    us.seven_day_pct AS "sevenDayPct",
    us.recorded_at AS "recordedAt"
  FROM utilization_snapshots us JOIN team_members tm ON tm.id = us.member_id
  WHERE us.recorded_at >= since_date
  ORDER BY us.recorded_at ASC;
$$;

CREATE OR REPLACE FUNCTION get_member_session_count(since_date TIMESTAMPTZ)
RETURNS TABLE ("displayName" TEXT, "sessionCount" BIGINT) AS $$
  SELECT
    COALESCE(tm.display_name, tm.email, tm.name) AS "displayName",
    COUNT(DISTINCT ur.session_id)::BIGINT AS "sessionCount"
  FROM usage_records ur JOIN team_members tm ON ur.member_id = tm.id
  WHERE ur.recorded_at >= since_date
  GROUP BY tm.id ORDER BY "sessionCount" DESC;
$$ LANGUAGE sql STABLE;
