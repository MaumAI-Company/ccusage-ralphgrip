-- Merge duplicate team_members rows that share the same email.
-- For each email with multiple members, pick the canonical one (prefer claimed,
-- then most usage records), reassign all FK references, and delete orphans.
-- Finally, add a UNIQUE partial index on email to prevent future duplicates.

-- Step 1: Identify canonical member per email and reassign all FK references.
-- This CTE picks the "best" member per email: prefer claimed_at IS NOT NULL,
-- then highest usage_records count, then earliest created_at as tiebreaker.
DO $$
DECLARE
  dup RECORD;
  canon_id UUID;
BEGIN
  -- For each email that has multiple team_members rows
  FOR dup IN
    SELECT email
    FROM team_members
    WHERE email IS NOT NULL
    GROUP BY email
    HAVING COUNT(*) > 1
  LOOP
    -- Pick canonical member: prefer claimed, then most records, then earliest
    SELECT tm.id INTO canon_id
    FROM team_members tm
    LEFT JOIN (
      SELECT member_id, COUNT(*) AS cnt
      FROM usage_records
      GROUP BY member_id
    ) ur ON ur.member_id = tm.id
    WHERE tm.email = dup.email
    ORDER BY
      (tm.claimed_at IS NOT NULL) DESC,
      COALESCE(ur.cnt, 0) DESC,
      tm.created_at ASC
    LIMIT 1;

    -- Reassign all FK references from orphan members to the canonical one
    UPDATE usage_records
      SET member_id = canon_id
      WHERE member_id IN (SELECT id FROM team_members WHERE email = dup.email AND id != canon_id);

    UPDATE budget_configs
      SET member_id = canon_id
      WHERE member_id IN (SELECT id FROM team_members WHERE email = dup.email AND id != canon_id);

    UPDATE utilization_snapshots
      SET member_id = canon_id
      WHERE member_id IN (SELECT id FROM team_members WHERE email = dup.email AND id != canon_id);

    UPDATE tool_usage_records
      SET member_id = canon_id
      WHERE member_id IN (SELECT id FROM team_members WHERE email = dup.email AND id != canon_id);

    -- member_plans has UNIQUE(member_id) — delete orphan plans before reassigning
    DELETE FROM member_plans
      WHERE member_id IN (SELECT id FROM team_members WHERE email = dup.email AND id != canon_id);

    -- Delete orphan team_members rows
    DELETE FROM team_members
      WHERE email = dup.email AND id != canon_id;
  END LOOP;
END $$;

-- Step 2: Add UNIQUE partial index on email to prevent future duplicates.
-- Only non-NULL emails are constrained (members without email are unaffected).
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_email_unique
  ON team_members (email) WHERE email IS NOT NULL;
