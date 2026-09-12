-- ==============================================================================
-- SCHEMA MIGRATION: 011_room_showcase.sql
-- Public room showcase: description, photo gallery, property cover, anon read
-- ==============================================================================

-- 1. Public room description (keterangan kamar) + photo gallery
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS photos TEXT[] NOT NULL DEFAULT '{}';

-- 2. Property cover image (hero for landing page)
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS cover_image TEXT;

-- 3. Public (anon) READ access for the landing page.
--    The 003 migration added a broad "Allow all for anon in dev" policy on every
--    table. In production the landing page must be READ-ONLY, so replace the
--    dev anon policy on these two tables with a SELECT-only policy.
DROP POLICY IF EXISTS "Allow all for anon in dev" ON public.properties;
DROP POLICY IF EXISTS "Allow all for anon in dev" ON public.rooms;

DROP POLICY IF EXISTS "properties_anon_select" ON public.properties;
CREATE POLICY "properties_anon_select" ON public.properties
    FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "rooms_anon_select" ON public.rooms;
CREATE POLICY "rooms_anon_select" ON public.rooms
    FOR SELECT TO anon USING (true);

-- 4. Storage bucket for room photos (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('room-photos', 'room-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage object policies: anyone can read, only authenticated can upload
DROP POLICY IF EXISTS "room_photos_public_read" ON storage.objects;
CREATE POLICY "room_photos_public_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'room-photos');

DROP POLICY IF EXISTS "room_photos_auth_insert" ON storage.objects;
CREATE POLICY "room_photos_auth_insert" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'room-photos');

DROP POLICY IF EXISTS "room_photos_auth_delete" ON storage.objects;
CREATE POLICY "room_photos_auth_delete" ON storage.objects
    FOR DELETE TO authenticated USING (bucket_id = 'room-photos');
