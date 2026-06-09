-- ============================================================
-- 005_payroll.sql — Payroll fields, settings & adjustments
-- Run order: 5
-- Used by: /api/payroll/*, /api/employees
-- ============================================================

-- បន្ថែម field ប្រាក់ខែ ទៅតារាង employees
ALTER TABLE employees ADD COLUMN IF NOT EXISTS pay_type TEXT DEFAULT 'monthly';   -- 'monthly' | 'hourly'
ALTER TABLE employees ADD COLUMN IF NOT EXISTS base_salary NUMERIC DEFAULT 0;     -- ប្រាក់ខែថេរ (monthly)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC DEFAULT 0;     -- តម្លៃ/ម៉ោង (hourly)

-- ការកំណត់ Payroll (single row, id = 1)
CREATE TABLE IF NOT EXISTS payroll_settings (
  id INTEGER PRIMARY KEY,
  work_start_time TEXT DEFAULT '08:00',     -- ម៉ោងចូលធ្វើការ
  work_end_time TEXT DEFAULT '17:00',       -- ម៉ោងចេញ
  late_threshold_min INTEGER DEFAULT 15,    -- យឺតលើសប៉ុន្មាននាទីទើបរាប់
  standard_days INTEGER DEFAULT 26,         -- ថ្ងៃធ្វើការ/ខែ (សម្រាប់គិតកាត់)
  late_deduction NUMERIC DEFAULT 0,         -- កាត់/លើកយឺត
  absent_deduction NUMERIC DEFAULT 0,       -- កាត់/ថ្ងៃអវត្តមាន (0 = auto pro-rata)
  currency TEXT DEFAULT 'USD',              -- រូបិយប័ណ្ណ
  payday INTEGER DEFAULT 28                 -- ថ្ងៃផ្ញើ Payslip ស្វ័យប្រវត្តិ
);

INSERT INTO payroll_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ការកែតម្រូវប្រាក់ខែ ប្រចាំខែ (bonus / deduction)
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
