-- ============================================================
-- 009_employee_cards.sql — NFC card id for employees
-- Run order: 9
-- (QR cards need no schema — they encode the employee code + signed token.)
-- ============================================================

ALTER TABLE employees ADD COLUMN IF NOT EXISTS nfc_id TEXT;
CREATE INDEX IF NOT EXISTS idx_employees_nfc ON employees(nfc_id);
