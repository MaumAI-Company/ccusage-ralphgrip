-- Bounded version of get_member_usage for querying a specific date range.
-- Avoids the fragile cumulative-subtraction approach for past week isolation.

CREATE OR REPLACE FUNCTION get_member_usage_period(start_date TIMESTAMPTZ, end_date TIMESTAMPTZ)
RETURNS TABLE ("displayName" TEXT, "totalCost" DOUBLE PRECISION, "totalTokens" BIGINT) AS $$
  SELECT
    COALESCE(tm.display_name, tm.email, tm.name) AS "displayName",
    SUM(ur.cost_usd) AS "totalCost",
    SUM(ur.input_tokens + ur.output_tokens)::BIGINT AS "totalTokens"
  FROM usage_records ur JOIN team_members tm ON tm.id = ur.member_id
  WHERE ur.recorded_at >= start_date AND ur.recorded_at < end_date
  GROUP BY tm.id ORDER BY "totalCost" DESC;
$$ LANGUAGE sql STABLE;
