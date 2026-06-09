-- ============================================================
-- 002_system_settings.sql — Office geofence configuration
-- Run order: 2
-- Used by: /api/office-config  (single row, id = 1)
-- ============================================================

CREATE TABLE IF NOT EXISTS system_settings (
  id INTEGER PRIMARY KEY,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius INTEGER
);

-- ជួរលំនាំដើម (Phnom Penh center, radius 100m) — បើមិនទាន់មាន
INSERT INTO system_settings (id, lat, lng, radius)
VALUES (1, 11.5564, 104.9282, 100)
ON CONFLICT (id) DO NOTHING;
