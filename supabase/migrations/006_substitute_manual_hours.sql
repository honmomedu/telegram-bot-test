-- ============================================================
-- 006_substitute_manual_hours.sql — Substitution + manual timesheet
-- Run order: 6
-- ============================================================

-- ការជំនួស៖ កត់ថា attendance នេះ បុគ្គលិកនេះមកជំនួសឱ្យអ្នកណា (employee code)
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS substitute_for TEXT;

-- Timesheet បញ្ចូលម៉ោងតាមថ្ងៃ ដោយដៃ (សម្រាប់ part-time / កែតម្រូវ)
CREATE TABLE IF NOT EXISTS manual_hours (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_code TEXT NOT NULL,
  work_date TEXT NOT NULL,                  -- 'YYYY-MM-DD'
  hours NUMERIC NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (employee_code, work_date)
);

CREATE INDEX IF NOT EXISTS idx_manual_hours_code ON manual_hours(employee_code);
