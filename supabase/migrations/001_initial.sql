-- ============================================================
-- 001_initial.sql — Telegram users & broadcast history
-- Run order: 1
-- ============================================================

-- អ្នកប្រើប្រាស់ Telegram (Telegram Users)
CREATE TABLE IF NOT EXISTS telegram_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  username TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ប្រវត្តិអត្ថបទផ្សព្វផ្សាយ (Broadcast History)
CREATE TABLE IF NOT EXISTS broadcast_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL,
  target_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
