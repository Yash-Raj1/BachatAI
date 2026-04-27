-- Adaptive Budget Ratio Engine — Database Migration
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- 1. Add ratio columns to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS budget_ratio_mode  TEXT    DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS custom_needs_pct   INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS custom_savings_pct INTEGER DEFAULT 40,
  ADD COLUMN IF NOT EXISTS ai_needs_pct       INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS ai_savings_pct     INTEGER DEFAULT 40,
  ADD COLUMN IF NOT EXISTS ratio_explanation  TEXT,
  ADD COLUMN IF NOT EXISTS fixed_burden_pct   NUMERIC(5,2) DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS city_tier          INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS dependents         INTEGER DEFAULT 0;

-- 2. Create ratio_history table for tracking changes over time
CREATE TABLE IF NOT EXISTS ratio_history (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  needs_pct       INTEGER NOT NULL,
  savings_pct     INTEGER NOT NULL,
  mode            TEXT NOT NULL,
  reason          TEXT,
  monthly_savings NUMERIC(12,2),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS on ratio_history
ALTER TABLE ratio_history ENABLE ROW LEVEL SECURITY;

-- 4. RLS policy — users can only access their own history
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ratio_history' AND policyname = 'Users access own ratio history'
  ) THEN
    CREATE POLICY "Users access own ratio history"
      ON ratio_history FOR ALL USING (auth.uid() = user_id);
  END IF;
END$$;
