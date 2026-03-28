-- Fix totalTokens to include cache_read_tokens and cache_creation_tokens.
-- Previously only summed input_tokens + output_tokens, missing cached tokens
-- which caused dashboard totals to be lower than CLI status bar counts.

-- Recreate get_member_usage to include all token types
DROP FUNCTION IF EXISTS get_member_usage(TIMESTAMPTZ);
CREATE OR REPLACE FUNCTION get_member_usage(since_date TIMESTAMPTZ)
RETURNS TABLE ("displayName" TEXT, "totalCost" DOUBLE PRECISION, "totalTokens" BIGINT) AS $$
  SELECT
    COALESCE(tm.display_name, tm.email, tm.name) AS "displayName",
    SUM(ur.cost_usd) AS "totalCost",
    SUM(ur.input_tokens + ur.output_tokens + ur.cache_read_tokens + ur.cache_creation_tokens)::BIGINT AS "totalTokens"
  FROM usage_records ur JOIN team_members tm ON tm.id = ur.member_id
  WHERE ur.recorded_at >= since_date
  GROUP BY tm.id ORDER BY "totalCost" DESC;
$$ LANGUAGE sql STABLE;

-- Recreate get_member_usage_period to include all token types
DROP FUNCTION IF EXISTS get_member_usage_period(TIMESTAMPTZ, TIMESTAMPTZ);
CREATE OR REPLACE FUNCTION get_member_usage_period(start_date TIMESTAMPTZ, end_date TIMESTAMPTZ)
RETURNS TABLE ("displayName" TEXT, "totalCost" DOUBLE PRECISION, "totalTokens" BIGINT) AS $$
  SELECT
    COALESCE(tm.display_name, tm.email, tm.name) AS "displayName",
    SUM(ur.cost_usd) AS "totalCost",
    SUM(ur.input_tokens + ur.output_tokens + ur.cache_read_tokens + ur.cache_creation_tokens)::BIGINT AS "totalTokens"
  FROM usage_records ur JOIN team_members tm ON tm.id = ur.member_id
  WHERE ur.recorded_at >= start_date AND ur.recorded_at < end_date
  GROUP BY tm.id ORDER BY "totalCost" DESC;
$$ LANGUAGE sql STABLE;
