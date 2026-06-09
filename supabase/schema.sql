-- បង្កើតតារាងសម្រាប់រក្សាទុកព័ត៌មានអ្នកប្រើប្រាស់ (Telegram Users)
CREATE TABLE telegram_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  username TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- បង្កើតតារាងសម្រាប់កត់ត្រាប្រវត្តិអត្ថបទផ្សព្វផ្សាយ (Broadcast History)
CREATE TABLE broadcast_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL,
  target_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- បង្កើតតារាងសម្រាប់រក្សាទុកទិន្នន័យចុះឈ្មោះមុខ (Face Enrollments)
-- descriptor = 128-dimension face embedding ដែលគណនាដោយ face-api.js
CREATE TABLE face_enrollments (
  user_id TEXT PRIMARY KEY,
  name TEXT,
  descriptor JSONB NOT NULL,
  photo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- បង្កើតតារាងសម្រាប់ QR Code ការិយាល័យ ដែល Admin បង្កើត (Office QR Codes)
CREATE TABLE qr_codes (
  id TEXT PRIMARY KEY,            -- ឧ. 'office'
  secret TEXT NOT NULL,
  label TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- បង្កើតតារាងបុគ្គលិក (Employees) — អត្តសញ្ញាណគោលគឺ code (Employee ID)
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

-- បង្កើតតារាងកំណត់ត្រាវត្តមាន (Attendance) — server-side timestamp ការពារការបន្លំម៉ោង
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
