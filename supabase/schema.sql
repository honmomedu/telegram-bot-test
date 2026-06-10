-- ============================================================
-- SecureAttend — FULL SCHEMA (consolidated, idempotent)
-- ============================================================
-- Run this single file in Supabase SQL Editor to create everything,
-- OR run the ordered files in ./migrations/ one by one.
-- Safe to re-run (uses IF NOT EXISTS).
-- ============================================================

-- 001 — Telegram users & broadcast history -------------------
CREATE TABLE IF NOT EXISTS telegram_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  username TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS broadcast_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL,
  target_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 002 — Office geofence configuration ------------------------
CREATE TABLE IF NOT EXISTS system_settings (
  id INTEGER PRIMARY KEY,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius INTEGER
);
INSERT INTO system_settings (id, lat, lng, radius)
VALUES (1, 11.5564, 104.9282, 100)
ON CONFLICT (id) DO NOTHING;

-- 003 — Face enrollments & office QR codes -------------------
CREATE TABLE IF NOT EXISTS face_enrollments (
  user_id TEXT PRIMARY KEY,           -- = Employee code
  name TEXT,
  descriptor JSONB NOT NULL,          -- 128-dim face embedding
  photo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS qr_codes (
  id TEXT PRIMARY KEY,                 -- ឧ. 'office'
  secret TEXT NOT NULL,
  label TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 004 — Employees & attendance -------------------------------
CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,           -- Employee ID = stable identity
  name TEXT NOT NULL,
  department TEXT,
  telegram_id BIGINT,                  -- optional, for private DM
  active BOOLEAN DEFAULT TRUE,
  enrolled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_code TEXT NOT NULL,
  employee_name TEXT,
  type TEXT NOT NULL,                  -- 'IN' | 'OUT'
  method TEXT,                         -- 'face' | 'qr'
  distance NUMERIC,
  confidence INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attendance_code ON attendance(employee_code);
CREATE INDEX IF NOT EXISTS idx_attendance_created ON attendance(created_at DESC);

-- 005 — Payroll (fields, settings, adjustments) --------------
ALTER TABLE employees ADD COLUMN IF NOT EXISTS pay_type TEXT DEFAULT 'monthly';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS base_salary NUMERIC DEFAULT 0;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC DEFAULT 0;

CREATE TABLE IF NOT EXISTS payroll_settings (
  id INTEGER PRIMARY KEY,
  work_start_time TEXT DEFAULT '08:00',
  work_end_time TEXT DEFAULT '17:00',
  late_threshold_min INTEGER DEFAULT 15,
  standard_days INTEGER DEFAULT 26,
  late_deduction NUMERIC DEFAULT 0,
  absent_deduction NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  payday INTEGER DEFAULT 28
);
INSERT INTO payroll_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS payroll_adjustments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_code TEXT NOT NULL,
  month TEXT NOT NULL,                       -- 'YYYY-MM'
  type TEXT NOT NULL,                        -- 'add' | 'deduct'
  amount NUMERIC NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_adjustments_emp_month ON payroll_adjustments(employee_code, month);

-- 006 — Substitution + manual timesheet ---------------------
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS substitute_for TEXT;

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

-- 007 — Weekly schedule (part-time) -------------------------
ALTER TABLE employees ADD COLUMN IF NOT EXISTS work_schedule JSONB;

-- 008 — Multi-tenancy (organizations + org_id) --------------
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  admin_password TEXT,
  active BOOLEAN DEFAULT TRUE,
  geofence JSONB,
  payroll JSONB,
  qr_secret TEXT,
  attendance_methods JSONB DEFAULT '{"face":true,"office_qr":true,"qr_card":false,"nfc":false,"manual":false}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
INSERT INTO organizations (slug, name) VALUES ('default', 'ស្ថាប័នដើម (Default)') ON CONFLICT (slug) DO NOTHING;

ALTER TABLE employees           ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE attendance          ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE face_enrollments    ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE payroll_adjustments ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE manual_hours        ADD COLUMN IF NOT EXISTS org_id UUID;

UPDATE employees           SET org_id = (SELECT id FROM organizations WHERE slug='default') WHERE org_id IS NULL;
UPDATE attendance          SET org_id = (SELECT id FROM organizations WHERE slug='default') WHERE org_id IS NULL;
UPDATE face_enrollments    SET org_id = (SELECT id FROM organizations WHERE slug='default') WHERE org_id IS NULL;
UPDATE payroll_adjustments SET org_id = (SELECT id FROM organizations WHERE slug='default') WHERE org_id IS NULL;
UPDATE manual_hours        SET org_id = (SELECT id FROM organizations WHERE slug='default') WHERE org_id IS NULL;

ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS employees_org_code_key ON employees(org_id, code);
ALTER TABLE face_enrollments DROP CONSTRAINT IF EXISTS face_enrollments_pkey;
CREATE UNIQUE INDEX IF NOT EXISTS face_enroll_org_user_key ON face_enrollments(org_id, user_id);
ALTER TABLE manual_hours DROP CONSTRAINT IF EXISTS manual_hours_employee_code_work_date_key;
CREATE UNIQUE INDEX IF NOT EXISTS manual_hours_org_code_date_key ON manual_hours(org_id, employee_code, work_date);
CREATE INDEX IF NOT EXISTS idx_employees_org ON employees(org_id);
CREATE INDEX IF NOT EXISTS idx_attendance_org ON attendance(org_id);
