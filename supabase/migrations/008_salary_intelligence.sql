-- Store detected salary pattern per user
CREATE TABLE IF NOT EXISTS salary_intelligence (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,

  -- Salary detection
  salary_day            INTEGER,           -- day of month salary arrives (1-31)
  salary_day_confidence NUMERIC(4,2),      -- 0-100 confidence in detection
  avg_monthly_salary    NUMERIC(12,2),     -- average salary amount
  last_salary_date      DATE,              -- last detected salary credit date
  last_salary_amount    NUMERIC(12,2),     -- last salary amount

  -- Current month snapshot (recalculated on each upload)
  current_month_income  NUMERIC(12,2),     -- total credits this month
  current_month_spent   NUMERIC(12,2),     -- total debits this month
  current_balance       NUMERIC(12,2),     -- income minus spent
  days_remaining        INTEGER,           -- days until next salary
  daily_budget          NUMERIC(12,2),     -- safe spend per day
  daily_avg_spent       NUMERIC(12,2),     -- actual avg spend per day so far

  -- Overspend streak tracking
  consecutive_overspend_days  INTEGER DEFAULT 0,
  last_overspend_check        DATE,

  -- Daily spending history (last 30 days as JSON array)
  daily_history         JSONB DEFAULT '[]'::jsonb,

  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE salary_intelligence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own salary data"
  ON salary_intelligence FOR ALL USING (auth.uid() = user_id);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_salary_user ON salary_intelligence(user_id);
