-- ==============================================================================
-- SCHEMA MIGRATION: 012_room_types_showcase.sql
-- Room Categories / Types: Showcase, Landing Page Synchronization, & Units Link
-- ==============================================================================

-- 1. Create room_types table
CREATE TABLE IF NOT EXISTS public.room_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100),
    base_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    facilities TEXT[] NOT NULL DEFAULT '{}',
    room_size VARCHAR(50),
    description TEXT,
    photos TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT room_types_property_name_unique UNIQUE(property_id, name)
);

-- 2. Add optional room_type_id FK to rooms table
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS room_type_id UUID REFERENCES public.room_types(id) ON DELETE SET NULL;

-- 3. Enable RLS on room_types
ALTER TABLE public.room_types ENABLE ROW LEVEL SECURITY;

-- 4. Public (anon) READ access for the landing page
DROP POLICY IF EXISTS "room_types_anon_select" ON public.room_types;
CREATE POLICY "room_types_anon_select" ON public.room_types
    FOR SELECT TO anon USING (true);

-- 5. Authenticated access
DROP POLICY IF EXISTS "room_types_auth_select" ON public.room_types;
CREATE POLICY "room_types_auth_select" ON public.room_types
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "room_types_auth_manage" ON public.room_types;
CREATE POLICY "room_types_auth_manage" ON public.room_types
    FOR ALL TO authenticated
    USING (
        get_my_role() IN ('owner'::user_role, 'admin'::user_role)
    )
    WITH CHECK (
        get_my_role() IN ('owner'::user_role, 'admin'::user_role)
    );

-- 6. Seed initial room types for property a0000000-0000-0000-0000-000000000001
INSERT INTO public.room_types (id, property_id, name, slug, base_price, facilities, room_size, description, photos, is_active, display_order)
VALUES
  (
    'e0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Deluxe AC',
    'deluxe-ac',
    1800000,
    ARRAY['AC', 'Kamar Mandi Dalam', 'Kasur Springbed', 'Lemari 2 Pintu', 'Meja Belajar', 'WiFi'],
    '3 x 4 m',
    'Kamar Deluxe luas dan nyaman dilengkapi AC dingin, kasur springbed empuk, meja kerja ergonomis, dan kamar mandi dalam dengan shower.',
    ARRAY[
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80'
    ],
    true,
    1
  ),
  (
    'e0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'VIP Balcony AC',
    'vip-balcony-ac',
    2200000,
    ARRAY['AC', 'Kamar Mandi Dalam', 'Balkon', 'Water Heater', 'Smart TV', 'Kasur Springbed', 'Lemari', 'Meja Belajar', 'WiFi'],
    '4 x 4.5 m',
    'Tipe VIP eksklusif dengan balkon pribadi berpemandangan asri, pemanas air (water heater), Smart TV, dan interior premium untuk kenyamanan maksimal.',
    ARRAY[
      'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80'
    ],
    true,
    2
  ),
  (
    'e0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'Standard AC',
    'standard-ac',
    1500000,
    ARRAY['AC', 'Kamar Mandi Luar', 'Kasur Springbed', 'Lemari', 'Meja Belajar', 'WiFi'],
    '3 x 3.5 m',
    'Kamar nyaman ber-AC dengan ventilasi segar, ideal untuk mahasiswi atau profesional muda yang mengutamakan ketenangan dan efisiensi.',
    ARRAY[
      'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80'
    ],
    true,
    3
  ),
  (
    'e0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000001',
    'Standard Non-AC',
    'standard-non-ac',
    1200000,
    ARRAY['Kamar Mandi Luar', 'Kasur Springbed', 'Lemari', 'Meja Belajar', 'WiFi'],
    '3 x 3 m',
    'Kamar hemat dengan sirkulasi udara alami yang sejuk, akses dekat ke dapur bersama, dan area parkir motor yang aman.',
    ARRAY[
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80'
    ],
    true,
    4
  )
ON CONFLICT (property_id, name) DO NOTHING;

-- 7. Sync existing rooms to matching room_types
UPDATE public.rooms r
SET room_type_id = rt.id
FROM public.room_types rt
WHERE r.property_id = rt.property_id
  AND (r.room_type = rt.name OR (r.room_type = 'VIP Balcony' AND rt.name = 'VIP Balcony AC'))
  AND r.room_type_id IS NULL;
