-- ============================================================
-- 003_face_and_qr.sql — Face enrollments & office QR codes
-- Run order: 3
-- Used by: /api/face-enroll, /api/qr-config, /api/attendance/identify
-- ============================================================

-- ទិន្នន័យចុះឈ្មោះមុខ (Face Enrollments)
-- descriptor = 128-dimension face embedding (face-api.js)
-- user_id = Employee code (អត្តសញ្ញាណគោល)
CREATE TABLE IF NOT EXISTS face_enrollments (
  user_id TEXT PRIMARY KEY,
  name TEXT,
  descriptor JSONB NOT NULL,
  photo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- QR Code ការិយាល័យ ដែល Admin បង្កើត (Office QR Codes)
CREATE TABLE IF NOT EXISTS qr_codes (
  id TEXT PRIMARY KEY,            -- ឧ. 'office'
  secret TEXT NOT NULL,
  label TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
