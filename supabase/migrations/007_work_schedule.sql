-- ============================================================
-- 007_work_schedule.sql — Weekly schedule for part-time employees
-- Run order: 7
-- ============================================================

-- កាលវិភាគប្រចាំសប្តាហ៍ (expected hours per weekday)
-- ឧ. {"mon":4,"tue":0,"wed":4,"thu":0,"fri":4,"sat":0,"sun":0}
ALTER TABLE employees ADD COLUMN IF NOT EXISTS work_schedule JSONB;
