-- ============================================================
-- 004_employees_attendance.sql — Employees & attendance records
-- Run order: 4
-- Used by: /api/employees, /api/employees/activate, /api/attendance
-- ============================================================

-- បុគ្គលិក (Employees) — អត្តសញ្ញាណគោលគឺ code (Employee ID)
-- telegram_id ជាការតភ្ជាប់បន្ថែម (nullable) សម្រាប់ផ្ញើ DM ផ្ទាល់
CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  department TEXT,
  telegram_id BIGINT,
  active BOOLEAN DEFAULT TRUE,
  enrolled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- កំណត់ត្រាវត្តមាន (Attendance) — server-side timestamp ការពារការបន្លំម៉ោង
CREATE TABLE IF NOT EXISTS attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_code TEXT NOT NULL,
  employee_name TEXT,
  type TEXT NOT NULL,            -- 'IN' ឬ 'OUT'
  method TEXT,                   -- 'face' ឬ 'qr'
  distance NUMERIC,
  confidence INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attendance_code ON attendance(employee_code);
CREATE INDEX IF NOT EXISTS idx_attendance_created ON attendance(created_at DESC);
