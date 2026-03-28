-- Hackathon teams for Ralphthon @Seoul
CREATE TABLE IF NOT EXISTS hackathon_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES hackathon_teams(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_team_memberships_team ON team_memberships(team_id);
CREATE INDEX IF NOT EXISTS idx_team_memberships_member ON team_memberships(member_id);

ALTER TABLE hackathon_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_hackathon_teams" ON hackathon_teams FOR ALL USING (true);
CREATE POLICY "allow_all_team_memberships" ON team_memberships FOR ALL USING (true);

-- Team leaderboard RPC
CREATE OR REPLACE FUNCTION get_team_leaderboard(since_date TIMESTAMPTZ)
RETURNS TABLE (
  "teamId" UUID,
  "teamName" TEXT,
  "teamDisplayName" TEXT,
  "teamColor" TEXT,
  "totalCost" DOUBLE PRECISION,
  "totalTokens" BIGINT,
  "sessionCount" BIGINT,
  "memberCount" BIGINT
) AS $$
  SELECT
    ht.id AS "teamId",
    ht.name AS "teamName",
    COALESCE(ht.display_name, ht.name) AS "teamDisplayName",
    ht.color AS "teamColor",
    COALESCE(SUM(ur.cost_usd), 0) AS "totalCost",
    COALESCE(SUM(ur.input_tokens + ur.output_tokens), 0)::BIGINT AS "totalTokens",
    COUNT(DISTINCT ur.session_id)::BIGINT AS "sessionCount",
    COUNT(DISTINCT tm2.member_id)::BIGINT AS "memberCount"
  FROM hackathon_teams ht
  JOIN team_memberships tm2 ON tm2.team_id = ht.id
  LEFT JOIN usage_records ur ON ur.member_id = tm2.member_id AND ur.recorded_at >= since_date
  GROUP BY ht.id
  ORDER BY "totalCost" DESC;
$$ LANGUAGE sql STABLE;

-- Team member usage RPC
CREATE OR REPLACE FUNCTION get_team_member_usage(p_team_id UUID, since_date TIMESTAMPTZ)
RETURNS TABLE (
  "memberId" UUID,
  "memberName" TEXT,
  "totalCost" DOUBLE PRECISION,
  "totalTokens" BIGINT,
  "sessionCount" BIGINT
) AS $$
  SELECT
    tm.id AS "memberId",
    COALESCE(tm.display_name, tm.email, tm.name) AS "memberName",
    COALESCE(SUM(ur.cost_usd), 0) AS "totalCost",
    COALESCE(SUM(ur.input_tokens + ur.output_tokens), 0)::BIGINT AS "totalTokens",
    COUNT(DISTINCT ur.session_id)::BIGINT AS "sessionCount"
  FROM team_memberships tms
  JOIN team_members tm ON tm.id = tms.member_id
  LEFT JOIN usage_records ur ON ur.member_id = tm.id AND ur.recorded_at >= since_date
  WHERE tms.team_id = p_team_id
  GROUP BY tm.id
  ORDER BY "totalCost" DESC;
$$ LANGUAGE sql STABLE;

-- All teams with members RPC
CREATE OR REPLACE FUNCTION get_all_teams_with_members()
RETURNS TABLE (
  "teamId" UUID,
  "teamName" TEXT,
  "teamDisplayName" TEXT,
  "teamColor" TEXT,
  "memberId" UUID,
  "memberName" TEXT
) AS $$
  SELECT
    ht.id AS "teamId",
    ht.name AS "teamName",
    COALESCE(ht.display_name, ht.name) AS "teamDisplayName",
    ht.color AS "teamColor",
    tm.id AS "memberId",
    COALESCE(tm.display_name, tm.email, tm.name) AS "memberName"
  FROM hackathon_teams ht
  LEFT JOIN team_memberships tms ON tms.team_id = ht.id
  LEFT JOIN team_members tm ON tm.id = tms.member_id
  ORDER BY ht.name, tm.name;
$$ LANGUAGE sql STABLE;
