-- One-time migration: recalculate cost_usd for existing usage_records
-- using the current multi-provider pricing table.
--
-- Covers:
--   - Claude 4.5 / 4.6 aliases (`claude-opus-4.5`, `claude-opus-4-5`, etc.)
--   - OpenAI provider-prefixed IDs (`openai/gpt-5.3-codex`)
--   - Gemini provider-prefixed IDs (`models/gemini-2.5-flash`)
--   - OpenCode Antigravity Gemini aliases (`antigravity-gemini-3-flash`, `antigravity-gemini-3-pro-high`)
--
-- Run this once after deploying the updated pricing code.

WITH normalized AS (
  SELECT
    id,
    lower(model) AS raw_model,
    regexp_replace(
      regexp_replace(
        lower(model),
        '^(models[./]|openai[./]|anthropic[./]|google[./])+',
        ''
      ),
      '^claude-(opus|sonnet|haiku)-([0-9])\.([0-9])',
      'claude-\1-\2-\3'
    ) AS normalized_model
  FROM usage_records
)
UPDATE usage_records AS ur
SET cost_usd = (
  CASE
    WHEN n.normalized_model = 'claude-opus-4-6' OR n.normalized_model LIKE 'claude-opus-4-6-%' THEN
      (ur.input_tokens * 5.0 + ur.output_tokens * 25.0 + ur.cache_creation_tokens * 6.25 + ur.cache_read_tokens * 0.50) / 1000000.0
    WHEN n.normalized_model = 'claude-opus-4-5' OR n.normalized_model LIKE 'claude-opus-4-5-%' THEN
      (ur.input_tokens * 5.0 + ur.output_tokens * 25.0 + ur.cache_creation_tokens * 6.25 + ur.cache_read_tokens * 0.50) / 1000000.0
    WHEN n.normalized_model = 'claude-sonnet-4-6' OR n.normalized_model LIKE 'claude-sonnet-4-6-%' THEN
      (ur.input_tokens * 3.0 + ur.output_tokens * 15.0 + ur.cache_creation_tokens * 3.75 + ur.cache_read_tokens * 0.30) / 1000000.0
    WHEN n.normalized_model = 'claude-sonnet-4-5' OR n.normalized_model LIKE 'claude-sonnet-4-5-%' THEN
      (ur.input_tokens * 3.0 + ur.output_tokens * 15.0 + ur.cache_creation_tokens * 3.75 + ur.cache_read_tokens * 0.30) / 1000000.0
    WHEN n.normalized_model = 'claude-haiku-4-5' OR n.normalized_model LIKE 'claude-haiku-4-5-%' THEN
      (ur.input_tokens * 1.0 + ur.output_tokens * 5.0 + ur.cache_creation_tokens * 1.25 + ur.cache_read_tokens * 0.10) / 1000000.0

    WHEN n.normalized_model = 'gpt-5.4-pro' OR n.normalized_model LIKE 'gpt-5.4-pro-%' THEN
      (ur.input_tokens * 30.0 + ur.output_tokens * 180.0) / 1000000.0
    WHEN n.normalized_model = 'gpt-5.4' OR n.normalized_model LIKE 'gpt-5.4-%' THEN
      (ur.input_tokens * 2.5 + ur.output_tokens * 15.0 + ur.cache_read_tokens * 0.25) / 1000000.0
    WHEN n.normalized_model = 'gpt-5.3-codex' OR n.normalized_model LIKE 'gpt-5.3-codex-%' THEN
      (ur.input_tokens * 1.75 + ur.output_tokens * 14.0 + ur.cache_read_tokens * 0.175) / 1000000.0
    WHEN n.normalized_model IN ('gpt-5.2-pro', 'gpt-5-pro') OR n.normalized_model LIKE 'gpt-5.2-pro-%' OR n.normalized_model LIKE 'gpt-5-pro-%' THEN
      (ur.input_tokens * 15.0 + ur.output_tokens * 120.0) / 1000000.0
    WHEN n.normalized_model = 'gpt-5.2' OR n.normalized_model LIKE 'gpt-5.2-%' THEN
      (ur.input_tokens * 1.75 + ur.output_tokens * 14.0 + ur.cache_read_tokens * 0.175) / 1000000.0
    WHEN n.normalized_model = 'gpt-5.2-codex' OR n.normalized_model LIKE 'gpt-5.2-codex-%' THEN
      (ur.input_tokens * 1.75 + ur.output_tokens * 14.0 + ur.cache_read_tokens * 0.175) / 1000000.0
    WHEN n.normalized_model = 'gpt-5.1-codex-max' OR n.normalized_model LIKE 'gpt-5.1-codex-max-%' THEN
      (ur.input_tokens * 1.25 + ur.output_tokens * 10.0 + ur.cache_read_tokens * 0.125) / 1000000.0
    WHEN n.normalized_model = 'gpt-5.1-codex' OR n.normalized_model LIKE 'gpt-5.1-codex-%' OR n.normalized_model = 'gpt-5-codex' OR n.normalized_model LIKE 'gpt-5-codex-%' THEN
      (ur.input_tokens * 1.25 + ur.output_tokens * 10.0 + ur.cache_read_tokens * 0.125) / 1000000.0
    WHEN n.normalized_model = 'gpt-5.1-codex-mini' OR n.normalized_model LIKE 'gpt-5.1-codex-mini-%' OR n.normalized_model = 'gpt-5-mini' OR n.normalized_model LIKE 'gpt-5-mini-%' THEN
      (ur.input_tokens * 0.25 + ur.output_tokens * 2.0 + ur.cache_read_tokens * 0.025) / 1000000.0
    WHEN n.normalized_model = 'gpt-5.1' OR n.normalized_model LIKE 'gpt-5.1-%' OR n.normalized_model = 'gpt-5' OR n.normalized_model LIKE 'gpt-5-%' THEN
      (ur.input_tokens * 1.25 + ur.output_tokens * 10.0 + ur.cache_read_tokens * 0.125) / 1000000.0
    WHEN n.normalized_model = 'gpt-5-nano' OR n.normalized_model LIKE 'gpt-5-nano-%' THEN
      (ur.input_tokens * 0.05 + ur.output_tokens * 0.4 + ur.cache_read_tokens * 0.005) / 1000000.0
    WHEN n.normalized_model = 'gpt-4o' OR n.normalized_model LIKE 'gpt-4o-%' THEN
      (ur.input_tokens * 2.5 + ur.output_tokens * 10.0 + ur.cache_read_tokens * 1.25) / 1000000.0

    WHEN n.normalized_model = 'gemini-3.1-pro-preview' OR n.normalized_model LIKE 'gemini-3.1-pro-preview-%' OR n.normalized_model IN ('gemini-3.1-pro', 'gemini-3.1-pro-high', 'gemini-3.1-pro-medium', 'gemini-3.1-pro-low') OR n.normalized_model LIKE 'antigravity-gemini-3.1-pro%' THEN
      (ur.input_tokens * 2.0 + ur.output_tokens * 12.0 + ur.cache_read_tokens * 0.20) / 1000000.0
    WHEN n.normalized_model = 'gemini-3-pro-preview' OR n.normalized_model LIKE 'gemini-3-pro-preview-%' OR n.normalized_model IN ('gemini-3-pro', 'gemini-3-pro-high', 'gemini-3-pro-medium', 'gemini-3-pro-low') OR n.normalized_model LIKE 'antigravity-gemini-3-pro%' THEN
      (ur.input_tokens * 2.0 + ur.output_tokens * 12.0 + ur.cache_read_tokens * 0.20) / 1000000.0
    WHEN n.normalized_model = 'gemini-3.1-flash-lite-preview' OR n.normalized_model LIKE 'gemini-3.1-flash-lite-preview-%' OR n.normalized_model = 'gemini-3.1-flash-lite' THEN
      (ur.input_tokens * 0.25 + ur.output_tokens * 1.5 + ur.cache_read_tokens * 0.025) / 1000000.0
    WHEN n.normalized_model = 'gemini-3-flash-preview' OR n.normalized_model LIKE 'gemini-3-flash-preview-%' OR n.normalized_model = 'antigravity-gemini-3-flash' THEN
      (ur.input_tokens * 0.5 + ur.output_tokens * 3.0 + ur.cache_read_tokens * 0.05) / 1000000.0
    WHEN n.normalized_model = 'gemini-2.5-pro' OR n.normalized_model LIKE 'gemini-2.5-pro-%' THEN
      (ur.input_tokens * 1.25 + ur.output_tokens * 10.0 + ur.cache_read_tokens * 0.125) / 1000000.0
    WHEN n.normalized_model = 'gemini-2.5-flash' OR n.normalized_model LIKE 'gemini-2.5-flash-%' THEN
      (ur.input_tokens * 0.3 + ur.output_tokens * 2.5 + ur.cache_read_tokens * 0.03) / 1000000.0
    WHEN n.normalized_model = 'gemini-2.5-flash-lite' OR n.normalized_model LIKE 'gemini-2.5-flash-lite-%' THEN
      (ur.input_tokens * 0.1 + ur.output_tokens * 0.4 + ur.cache_read_tokens * 0.01) / 1000000.0
    WHEN n.normalized_model = 'gemini-2.0-flash' OR n.normalized_model LIKE 'gemini-2.0-flash-%' THEN
      (ur.input_tokens * 0.1 + ur.output_tokens * 0.4 + ur.cache_read_tokens * 0.025) / 1000000.0
    WHEN n.normalized_model = 'gemini-2.0-flash-lite' OR n.normalized_model LIKE 'gemini-2.0-flash-lite-%' THEN
      (ur.input_tokens * 0.075 + ur.output_tokens * 0.3) / 1000000.0

    ELSE ur.cost_usd
  END
)
FROM normalized AS n
WHERE ur.id = n.id
  AND ur.model <> '<synthetic>';

DELETE FROM usage_records WHERE model = '<synthetic>';

SELECT
  model,
  COUNT(*) AS record_count,
  ROUND(SUM(cost_usd)::numeric, 2) AS total_cost_usd
FROM usage_records
GROUP BY model
ORDER BY total_cost_usd DESC;
