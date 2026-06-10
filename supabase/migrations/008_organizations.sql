-- ============================================================
-- 008_organizations.sql — Multi-tenancy (shared DB + org_id)
-- Run order: 8
-- Existing data is assigned to a "default" organization so nothing breaks.
-- ============================================================

-- ស្ថាប័ន (Organizations / tenants)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  admin_password TEXT,                       -- per-org admin login password
  active BOOLEAN DEFAULT TRUE,
  geofence JSONB,                            -- {lat,lng,radius}
  payroll JSONB,                             -- payroll settings
  qr_secret TEXT,                            -- office QR secret
  attendance_methods JSONB DEFAULT '{"face":true,"office_qr":true,"qr_card":false,"nfc":false,"manual":false}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ស្ថាប័នដើម (default) សម្រាប់ទិន្នន័យដែលមានស្រាប់
INSERT INTO organizations (slug, name)
VALUES ('default', 'ស្ថាប័នដើម (Default)')
ON CONFLICT (slug) DO NOTHING;

-- Backfill default org config from the existing single-row tables (best effort)
UPDATE organizations o SET geofence = jsonb_build_object('lat', s.lat, 'lng', s.lng, 'radius', s.radius)
  FROM system_settings s WHERE o.slug = 'default' AND s.id = 1 AND o.geofence IS NULL;
UPDATE organizations o SET payroll = to_jsonb(p) - 'id'
  FROM payroll_settings p WHERE o.slug = 'default' AND p.id = 1 AND o.payroll IS NULL;
UPDATE organizations o SET qr_secret = q.secret
  FROM qr_codes q WHERE o.slug = 'default' AND q.id = 'office' AND o.qr_secret IS NULL;

-- Add org_id to every tenant table, default existing rows -> default org
DO $$
DECLARE def UUID;
BEGIN
  SELECT id INTO def FROM organizations WHERE slug = 'default';

  ALTER TABLE employees           ADD COLUMN IF NOT EXISTS org_id UUID;
  ALTER TABLE attendance          ADD COLUMN IF NOT EXISTS org_id UUID;
  ALTER TABLE face_enrollments    ADD COLUMN IF NOT EXISTS org_id UUID;
  ALTER TABLE payroll_adjustments ADD COLUMN IF NOT EXISTS org_id UUID;
  ALTER TABLE manual_hours        ADD COLUMN IF NOT EXISTS org_id UUID;

  UPDATE employees           SET org_id = def WHERE org_id IS NULL;
  UPDATE attendance          SET org_id = def WHERE org_id IS NULL;
  UPDATE face_enrollments    SET org_id = def WHERE org_id IS NULL;
  UPDATE payroll_adjustments SET org_id = def WHERE org_id IS NULL;
  UPDATE manual_hours        SET org_id = def WHERE org_id IS NULL;
END $$;

-- Employee code must be unique PER organization (not globally)
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS employees_org_code_key ON employees(org_id, code);

-- face_enrollments user_id (= employee code) also per org
ALTER TABLE face_enrollments DROP CONSTRAINT IF EXISTS face_enrollments_pkey;
CREATE UNIQUE INDEX IF NOT EXISTS face_enroll_org_user_key ON face_enrollments(org_id, user_id);

-- manual_hours unique must include org_id (codes are only unique per org)
ALTER TABLE manual_hours DROP CONSTRAINT IF EXISTS manual_hours_employee_code_work_date_key;
CREATE UNIQUE INDEX IF NOT EXISTS manual_hours_org_code_date_key ON manual_hours(org_id, employee_code, work_date);

CREATE INDEX IF NOT EXISTS idx_employees_org ON employees(org_id);
CREATE INDEX IF NOT EXISTS idx_attendance_org ON attendance(org_id);
