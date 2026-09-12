-- ==============================================================================
-- SCHEMA MIGRATION: 010_property_settings.sql
-- Add owner-editable property "description" (keterangan properti)
-- ==============================================================================
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS description TEXT;

-- Seed a friendly default for the existing property (idempotent)
UPDATE public.properties
SET description = COALESCE(description, 'Kost Putri Graha Asri — nyaman, aman, dekat kampus.')
WHERE id = 'a0000000-0000-0000-0000-000000000001'
  AND description IS NULL;
