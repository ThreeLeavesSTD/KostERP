-- ==============================================================================
-- SCHEMA MIGRATION: 007_login_id.sql
-- ERP Operasional Kost Database Schema (Staff Login ID & Contact Email Support)
-- ==============================================================================
-- 1. Tambahkan kolom login_id dan email ke public.user_profiles
-- 2. Buat partial unique index agar login_id unik untuk staff (NULL untuk owner)
-- 3. Replace handle_new_user() agar menangkap login_id & email dari metadata
-- 4. Buat function get_next_staff_login_id() untuk auto-increment login_id numerik
-- ==============================================================================

-- 1. Tambahkan kolom
ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS login_id VARCHAR(20),
    ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- 2. Partial unique index (owner boleh NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_login_id
    ON public.user_profiles(login_id) WHERE login_id IS NOT NULL;

-- 3. Replace function handle_new_user()
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role user_role;
    v_property_id UUID;
    v_user_count INT;
    v_full_name TEXT;
    v_meta_role TEXT;
    v_login_id VARCHAR(20);
    v_email VARCHAR(255);
BEGIN
    -- 1. Cek jumlah user_profiles yang sudah ada untuk menentukan owner pertama
    SELECT COUNT(*) INTO v_user_count FROM public.user_profiles;

    -- Ambil role dari raw_user_meta_data jika ada
    v_meta_role := NEW.raw_user_meta_data->>'role';

    -- 2. Tentukan Role
    IF v_user_count = 0 THEN
        -- User pertama mutlak menjadi owner
        v_role := 'owner'::user_role;
    ELSIF v_meta_role IS NOT NULL AND v_meta_role IN ('owner', 'admin', 'cleaning_staff') THEN
        v_role := v_meta_role::user_role;
    ELSE
        -- Default pendaftar berikutnya menjadi admin
        v_role := 'admin'::user_role;
    END IF;

    -- 3. Ambil ID properti pertama (berdasarkan created_at)
    SELECT id INTO v_property_id
    FROM public.properties
    ORDER BY created_at ASC
    LIMIT 1;

    -- 4. Ambil Full Name dari metadata atau email
    v_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        NEW.email,
        'Pengguna Kost'
    );

    -- 5. Tangkap login_id dan email kontak dari metadata atau auth.users
    v_login_id := NULLIF(NEW.raw_user_meta_data->>'login_id', '');
    v_email    := COALESCE(NULLIF(NEW.raw_user_meta_data->>'email', ''), NEW.email);

    -- 6. Insert ke public.user_profiles
    INSERT INTO public.user_profiles (
        id,
        property_id,
        role,
        full_name,
        phone_number,
        is_active,
        login_id,
        email,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        v_property_id,
        v_role,
        v_full_name,
        NEW.phone,
        TRUE,
        v_login_id,
        v_email,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        login_id = COALESCE(EXCLUDED.login_id, user_profiles.login_id),
        email = COALESCE(EXCLUDED.email, user_profiles.email),
        updated_at = NOW();

    RETURN NEW;
END;
$$;

-- Amankan hak eksekusi function
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Pastikan trigger on_auth_user_created terpasang
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 4. Helper function untuk auto-generate login_id numerik staf berikutnya (mulai dari 1300000)
CREATE OR REPLACE FUNCTION public.get_next_staff_login_id()
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_next_id BIGINT;
BEGIN
    SELECT COALESCE(MAX(login_id::BIGINT), 1299999) + 1
    INTO v_next_id
    FROM public.user_profiles
    WHERE login_id ~ '^[0-9]+$';

    RETURN v_next_id::VARCHAR;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_next_staff_login_id() TO service_role, authenticated;
