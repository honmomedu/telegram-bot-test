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
