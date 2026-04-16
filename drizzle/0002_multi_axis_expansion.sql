-- Multi-axis political model expansion (April 2026).
-- Decomposes the old single "progressive" axis into two orthogonal axes
-- (causation-analysis and equality-model) and adds three new axes that
-- cut across the traditional left/right spectrum: populism, nationalism,
-- and authority. The old axis_progressive column is kept (nullable) for
-- historical rows — new writes should use the new columns.

ALTER TABLE "story_coverages"
  ADD COLUMN IF NOT EXISTS "axis_causation_analysis" real,
  ADD COLUMN IF NOT EXISTS "axis_equality_model" real,
  ADD COLUMN IF NOT EXISTS "axis_populism" real,
  ADD COLUMN IF NOT EXISTS "axis_nationalism" real,
  ADD COLUMN IF NOT EXISTS "axis_authority" real;
