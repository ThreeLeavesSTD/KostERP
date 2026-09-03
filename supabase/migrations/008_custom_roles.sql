-- ==============================================================================
-- SCHEMA MIGRATION: 008_custom_roles.sql
-- ERP Operasional Kost Database Schema (Persistent Custom Roles & Dynamic Permissions)
-- ==============================================================================

-- 1. Buat tabel public.custom_roles
CREATE TABLE IF NOT EXISTS public.custom_roles (
    id VARCHAR(50) PRIMARY KEY,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    badge_color VARCHAR(30) DEFAULT 'info',
    is_system BOOLEAN DEFAULT FALSE,
    permissions TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_roles_property ON public.custom_roles(property_id);

-- 2. Tambahkan kolom custom_role_id di user_profiles
ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS custom_role_id VARCHAR(50);

-- Foreign key constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_profiles_custom_role'
    ) THEN
        ALTER TABLE public.user_profiles
            ADD CONSTRAINT fk_user_profiles_custom_role
            FOREIGN KEY (custom_role_id) REFERENCES public.custom_roles(id)
            ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_profiles_custom_role ON public.user_profiles(custom_role_id);

-- 3. Seed 3 Role Bawaan Sistem (Owner, Admin Pengelola, Cleaning Staff)
DO $$
DECLARE
    v_prop_id UUID;
BEGIN
    SELECT id INTO v_prop_id FROM public.properties ORDER BY created_at ASC LIMIT 1;
    IF v_prop_id IS NULL THEN
        v_prop_id := 'a0000000-0000-0000-0000-000000000001'::UUID;
    END IF;

    -- Role Owner (akses penuh seluruh fitur)
    INSERT INTO public.custom_roles (id, property_id, name, description, badge_color, is_system, permissions)
    VALUES (
        'owner',
        v_prop_id,
        'Owner',
        'Pemilik properti dengan akses penuh ke seluruh fitur dan finansial',
        'lime',
        TRUE,
        ARRAY['owner-dashboard', 'ai-assistant', 'cashflow', 'rooms', 'tenants', 'electricity', 'billing', 'owner-audit', 'billing-settings', 'staff-management', 'profile']
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        badge_color = EXCLUDED.badge_color,
        is_system = TRUE,
        permissions = EXCLUDED.permissions;

    -- Role Admin Pengelola
    INSERT INTO public.custom_roles (id, property_id, name, description, badge_color, is_system, permissions)
    VALUES (
        'admin',
        v_prop_id,
        'Admin Pengelola',
        'Operasional kamar, data penghuni, penagihan invoice, dan catat transaksi kas',
        'info',
        TRUE,
        ARRAY['owner-dashboard', 'ai-assistant', 'cashflow', 'rooms', 'tenants', 'electricity', 'billing', 'owner-audit', 'billing-settings', 'profile']
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        badge_color = EXCLUDED.badge_color,
        is_system = TRUE,
        permissions = EXCLUDED.permissions;

    -- Role Cleaning & Maintenance Staff
    INSERT INTO public.custom_roles (id, property_id, name, description, badge_color, is_system, permissions)
    VALUES (
        'cleaning_staff',
        v_prop_id,
        'Cleaning & Maintenance Staff',
        'Monitoring status kebersihan kamar dan respon komplain fasilitas kamar',
        'warning',
        TRUE,
        ARRAY['rooms', 'ai-assistant', 'profile']
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        badge_color = EXCLUDED.badge_color,
        is_system = TRUE,
        permissions = EXCLUDED.permissions;

    -- Sinkronkan user_profiles yang sudah ada agar custom_role_id terisi
    UPDATE public.user_profiles
    SET custom_role_id = role::text
    WHERE custom_role_id IS NULL AND role IS NOT NULL;
END $$;

-- 4. Enable Row Level Security (RLS) pada tabel custom_roles
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read custom_roles for authenticated users" ON public.custom_roles;
CREATE POLICY "Allow read custom_roles for authenticated users"
    ON public.custom_roles FOR SELECT
    TO authenticated
    USING (TRUE);

DROP POLICY IF EXISTS "Allow write custom_roles for owner" ON public.custom_roles;
CREATE POLICY "Allow write custom_roles for owner"
    ON public.custom_roles FOR ALL
    TO authenticated
    USING (public.get_my_role() = 'owner')
    WITH CHECK (public.get_my_role() = 'owner');
