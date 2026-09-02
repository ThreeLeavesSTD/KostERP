-- ==============================================================================
-- SCHEMA MIGRATION: 005_handle_new_user.sql
-- ERP Operasional Kost Database Schema (Auto-Provisioning User Profile Trigger)
-- ==============================================================================
-- Migrasi ini membuat fungsi trigger SECURITY DEFINER yang otomatis menyisipkan
-- baris profil ke tabel public.user_profiles saat user baru terdaftar di auth.users.
-- Aturan role:
-- 1. Pengguna pertama yang mendaftar di sistem akan otomatis menjadi 'owner'.
-- 2. Pengguna berikutnya akan default menjadi 'admin' (atau sesuai metadata role).
-- 3. property_id secara otomatis dikaitkan dengan properti pertama yang ada.
-- ==============================================================================

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

    -- 5. Insert ke public.user_profiles
    INSERT INTO public.user_profiles (
        id,
        property_id,
        role,
        full_name,
        phone_number,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        v_property_id,
        v_role,
        v_full_name,
        NEW.phone,
        TRUE,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        updated_at = NOW();

    RETURN NEW;
END;
$$;

-- Amankan hak eksekusi function
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Pasang Trigger AFTER INSERT pada tabel auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
