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
