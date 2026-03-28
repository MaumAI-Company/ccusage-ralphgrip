-- Report RPC functions — server-side aggregation replacing paginated client-side processing.
-- Each function accepts since_date and until_date for flexible date ranges.
-- Matches the return shapes expected by the report frontend.

-- 1. Report members — aggregate cost, sessions, active days per member
CREATE OR REPLACE FUNCTION get_report_members(since_date TIMESTAMPTZ, until_date TIMESTAMPTZ DEFAULT NULL)
RETURNS TABLE (
  "memberId" UUID,
  "displayName" TEXT,
  "name" TEXT,
  cost DOUBLE PRECISION,
  sessions BIGINT,
  "activeDays" BIGINT
) AS $$
  SELECT
    tm.id AS "memberId",
    COALESCE(tm.display_name, tm.email, tm.name) AS "displayName",
    tm.name AS "name",
    ROUND(SUM(ur.cost_usd)::NUMERIC, 2)::DOUBLE PRECISION AS cost,
    COUNT(DISTINCT ur.session_id)::BIGINT AS sessions,
    COUNT(DISTINCT to_char(ur.recorded_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD'))::BIGINT AS "activeDays"
  FROM usage_records ur
  JOIN team_members tm ON tm.id = ur.member_id AND tm.account_type = 'company'
  WHERE ur.recorded_at >= since_date
    AND (until_date IS NULL OR ur.recorded_at < until_date)
  GROUP BY tm.id
  ORDER BY cost DESC;
$$ LANGUAGE sql STABLE;

-- 2. Report daily — aggregate cost, sessions, distinct members per date
CREATE OR REPLACE FUNCTION get_report_daily(since_date TIMESTAMPTZ, until_date TIMESTAMPTZ DEFAULT NULL)
RETURNS TABLE (
  date TEXT,
  cost DOUBLE PRECISION,
  sessions BIGINT,
  members BIGINT
) AS $$
  SELECT
    to_char(ur.recorded_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD') AS date,
    ROUND(SUM(ur.cost_usd)::NUMERIC, 2)::DOUBLE PRECISION AS cost,
    COUNT(DISTINCT ur.session_id)::BIGINT AS sessions,
    COUNT(DISTINCT ur.member_id)::BIGINT AS members
  FROM usage_records ur
  JOIN team_members tm ON tm.id = ur.member_id AND tm.account_type = 'company'
  WHERE ur.recorded_at >= since_date
    AND (until_date IS NULL OR ur.recorded_at < until_date)
  GROUP BY date
  ORDER BY date ASC;
$$ LANGUAGE sql STABLE;

-- 3. Report weekly — aggregate by KST Monday week start
CREATE OR REPLACE FUNCTION get_report_weekly(since_date TIMESTAMPTZ, until_date TIMESTAMPTZ DEFAULT NULL)
RETURNS TABLE (
  "weekStart" TEXT,
  cost DOUBLE PRECISION,
  sessions BIGINT,
  members BIGINT
) AS $$
  SELECT
    to_char(date_trunc('week', ur.recorded_at AT TIME ZONE 'Asia/Seoul')::DATE, 'YYYY-MM-DD') AS "weekStart",
    ROUND(SUM(ur.cost_usd)::NUMERIC, 2)::DOUBLE PRECISION AS cost,
    COUNT(DISTINCT ur.session_id)::BIGINT AS sessions,
    COUNT(DISTINCT ur.member_id)::BIGINT AS members
  FROM usage_records ur
  JOIN team_members tm ON tm.id = ur.member_id AND tm.account_type = 'company'
  WHERE ur.recorded_at >= since_date
    AND (until_date IS NULL OR ur.recorded_at < until_date)
  GROUP BY "weekStart"
  ORDER BY "weekStart" ASC;
$$ LANGUAGE sql STABLE;

-- 4. Report models — aggregate cost and sessions per model
CREATE OR REPLACE FUNCTION get_report_models(since_date TIMESTAMPTZ, until_date TIMESTAMPTZ DEFAULT NULL)
RETURNS TABLE (
  model TEXT,
  cost DOUBLE PRECISION,
  sessions BIGINT
) AS $$
  SELECT
    ur.model,
    ROUND(SUM(ur.cost_usd)::NUMERIC, 2)::DOUBLE PRECISION AS cost,
    COUNT(DISTINCT ur.session_id)::BIGINT AS sessions
  FROM usage_records ur
  JOIN team_members tm ON tm.id = ur.member_id AND tm.account_type = 'company'
  WHERE ur.recorded_at >= since_date
    AND (until_date IS NULL OR ur.recorded_at < until_date)
  GROUP BY ur.model
  ORDER BY cost DESC;
$$ LANGUAGE sql STABLE;

-- 5. Report projects — aggregate cost, sessions, members per project (top 15)
CREATE OR REPLACE FUNCTION get_report_projects(since_date TIMESTAMPTZ, until_date TIMESTAMPTZ DEFAULT NULL)
RETURNS TABLE (
  project TEXT,
  cost DOUBLE PRECISION,
  sessions BIGINT,
  members BIGINT
) AS $$
  SELECT
    COALESCE(NULLIF(ur.project_name, ''), '(unknown)') AS project,
    ROUND(SUM(ur.cost_usd)::NUMERIC, 2)::DOUBLE PRECISION AS cost,
    COUNT(DISTINCT ur.session_id)::BIGINT AS sessions,
    COUNT(DISTINCT ur.member_id)::BIGINT AS members
  FROM usage_records ur
  JOIN team_members tm ON tm.id = ur.member_id AND tm.account_type = 'company'
  WHERE ur.recorded_at >= since_date
    AND (until_date IS NULL OR ur.recorded_at < until_date)
  GROUP BY project
  ORDER BY cost DESC
  LIMIT 15;
$$ LANGUAGE sql STABLE;

-- 6. Report summary — total cost, total sessions, total members, period range
CREATE OR REPLACE FUNCTION get_report_summary(since_date TIMESTAMPTZ, until_date TIMESTAMPTZ DEFAULT NULL)
RETURNS TABLE (
  "totalCost" DOUBLE PRECISION,
  "totalSessions" BIGINT,
  "totalMembers" BIGINT,
  "periodStart" TEXT,
  "periodEnd" TEXT
) AS $$
  SELECT
    ROUND(COALESCE(SUM(ur.cost_usd), 0)::NUMERIC, 2)::DOUBLE PRECISION AS "totalCost",
    COUNT(DISTINCT ur.session_id)::BIGINT AS "totalSessions",
    COUNT(DISTINCT ur.member_id)::BIGINT AS "totalMembers",
    COALESCE(MIN(to_char(ur.recorded_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD')), '') AS "periodStart",
    COALESCE(MAX(to_char(ur.recorded_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD')), '') AS "periodEnd"
  FROM usage_records ur
  JOIN team_members tm ON tm.id = ur.member_id AND tm.account_type = 'company'
  WHERE ur.recorded_at >= since_date
    AND (until_date IS NULL OR ur.recorded_at < until_date);
$$ LANGUAGE sql STABLE;
