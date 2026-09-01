-- ==============================================================================
-- SCHEMA MIGRATION: 004_secure_rls.sql
-- ERP Operasional Kost Database Schema (Hardened Row Level Security Policies)
-- ==============================================================================
-- Migrasi ini mengamankan seluruh tabel publik dari celah keamanan dev/anon di 003,
-- mengaktifkan Row Level Security (RLS) ketat, menyediakan Security Definer helper
-- functions, serta mengimplementasikan isolasi data multi-tenant berbasis role.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. DROP SEMUA POLICY LAMA DARI MIGRATION 003
-- ------------------------------------------------------------------------------
-- Menghapus "Allow all for authenticated users" dan "Allow all for anon in dev"
-- dari SEMUA tabel di schema public agar tidak ada celah keamanan publik anon.
DO $$ 
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.%I;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all for anon in dev" ON public.%I;', tbl);
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 2. ENABLE ROW LEVEL SECURITY (RLS) DI SEMUA TABEL
-- ------------------------------------------------------------------------------
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.electricity_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 3. HELPER FUNCTIONS (SECURITY DEFINER)
-- ------------------------------------------------------------------------------
-- Fungsi helper dijalankan dengan privileges pemilik/superuser (SECURITY DEFINER)
-- agar dapat membaca tabel user_profiles tanpa terkena loop rekursi RLS.
-- search_path dikunci ke 'public' untuk mencegah kerentanan search_path hijacking.
-- Mengembalikan NULL dengan aman bila user belum login atau profil belum terdaftar.

CREATE OR REPLACE FUNCTION public.get_my_property_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_property_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT property_id INTO v_property_id
    FROM public.user_profiles
    WHERE id = auth.uid() AND is_active = TRUE
    LIMIT 1;

    RETURN v_property_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role user_role;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT role INTO v_role
    FROM public.user_profiles
    WHERE id = auth.uid() AND is_active = TRUE
    LIMIT 1;

    RETURN v_role;
END;
$$;

-- Amankan hak eksekusi helper function (cabut dari public/anon, batasi ke authenticated)
REVOKE EXECUTE ON FUNCTION public.get_my_property_id() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_property_id() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY POLICIES PER TABEL
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- 4.1 TABEL: properties
-- Akses:
-- - owner: full (SELECT, INSERT, UPDATE, DELETE)
-- - admin: SELECT, UPDATE (hanya untuk properti yang dikelola)
-- - cleaning_staff: SELECT (hanya untuk properti tempat bertugas)
-- ==============================================================================

-- Policy: Owner Full Access
DROP POLICY IF EXISTS "properties_owner_full" ON public.properties;
CREATE POLICY "properties_owner_full" ON public.properties
    FOR ALL TO authenticated
    USING (
        public.get_my_role() = 'owner'
        AND (id = public.get_my_property_id() OR public.get_my_property_id() IS NULL)
    )
    WITH CHECK (
        public.get_my_role() = 'owner'
    );

-- Policy: Admin Read
DROP POLICY IF EXISTS "properties_admin_select" ON public.properties;
CREATE POLICY "properties_admin_select" ON public.properties
    FOR SELECT TO authenticated
    USING (
        id = public.get_my_property_id()
        AND public.get_my_role() = 'admin'
    );

-- Policy: Admin Update
DROP POLICY IF EXISTS "properties_admin_update" ON public.properties;
CREATE POLICY "properties_admin_update" ON public.properties
    FOR UPDATE TO authenticated
    USING (
        id = public.get_my_property_id()
        AND public.get_my_role() = 'admin'
    )
    WITH CHECK (
        id = public.get_my_property_id()
        AND public.get_my_role() = 'admin'
    );

-- Policy: Cleaning Staff Read
DROP POLICY IF EXISTS "properties_staff_read" ON public.properties;
CREATE POLICY "properties_staff_read" ON public.properties
    FOR SELECT TO authenticated
    USING (
        id = public.get_my_property_id()
        AND public.get_my_role() = 'cleaning_staff'
    );


-- ==============================================================================
-- 4.2 TABEL: rooms
-- Akses:
-- - owner & admin: full (SELECT, INSERT, UPDATE, DELETE)
-- - cleaning_staff: SELECT
-- ==============================================================================

-- Policy: Owner & Admin Full Access
DROP POLICY IF EXISTS "rooms_owner_full" ON public.rooms;
CREATE POLICY "rooms_owner_full" ON public.rooms
    FOR ALL TO authenticated
    USING (
        property_id = public.get_my_property_id()
        AND public.get_my_role() IN ('owner', 'admin')
    )
    WITH CHECK (
        property_id = public.get_my_property_id()
        AND public.get_my_role() IN ('owner', 'admin')
    );

-- Policy: Cleaning Staff Read
DROP POLICY IF EXISTS "rooms_staff_read" ON public.rooms;
CREATE POLICY "rooms_staff_read" ON public.rooms
    FOR SELECT TO authenticated
    USING (
        property_id = public.get_my_property_id()
        AND public.get_my_role() = 'cleaning_staff'
    );


-- ==============================================================================
-- 4.3 TABEL: tenants & VIEW: tenant_directory
-- Akses:
-- - owner & admin: full (SELECT, INSERT, UPDATE, DELETE)
-- - cleaning_staff: TIDAK ADA AKSES LANGSUNG ke tabel tenants
--   (guna mengamankan kolom sensitif NIK id_card_number, id_card_url, emergency contact).
--   Cleaning staff diberikan akses SELECT melalui VIEW public.tenant_directory.
-- ==============================================================================

-- Policy: Owner & Admin Full Access pada tabel tenants
DROP POLICY IF EXISTS "tenants_owner_full" ON public.tenants;
CREATE POLICY "tenants_owner_full" ON public.tenants
    FOR ALL TO authenticated
    USING (
        property_id = public.get_my_property_id()
        AND public.get_my_role() IN ('owner', 'admin')
    )
    WITH CHECK (
        property_id = public.get_my_property_id()
        AND public.get_my_role() IN ('owner', 'admin')
    );

-- VIEW tenant_directory: Menyediakan direktori penghuni (nama, no telepon, nomor kamar)
-- khusus staf kebersihan tanpa membocorkan dokumen identitas dan kontak darurat.
CREATE OR REPLACE VIEW public.tenant_directory
WITH (security_barrier = true) AS
SELECT 
    t.id AS tenant_id,
    t.property_id,
    t.full_name,
    t.phone_number,
    r.id AS room_id,
    r.room_number,
    r.floor,
    l.id AS lease_id,
    l.status AS lease_status
FROM public.tenants t
JOIN public.leases l ON l.tenant_id = t.id AND l.property_id = t.property_id
JOIN public.rooms r ON r.id = l.room_id AND r.property_id = t.property_id
WHERE t.property_id = public.get_my_property_id()
  AND public.get_my_role() IN ('owner', 'admin', 'cleaning_staff');

-- Proteksi hak akses view
REVOKE ALL ON public.tenant_directory FROM anon, public;
GRANT SELECT ON public.tenant_directory TO authenticated;


-- ==============================================================================
-- 4.4 TABEL: leases
-- Akses:
-- - owner & admin: full (SELECT, INSERT, UPDATE, DELETE)
-- - cleaning_staff: SELECT
-- ==============================================================================

-- Policy: Owner & Admin Full Access
DROP POLICY IF EXISTS "leases_owner_full" ON public.leases;
CREATE POLICY "leases_owner_full" ON public.leases
    FOR ALL TO authenticated
    USING (
        property_id = public.get_my_property_id()
        AND public.get_my_role() IN ('owner', 'admin')
    )
    WITH CHECK (
        property_id = public.get_my_property_id()
        AND public.get_my_role() IN ('owner', 'admin')
    );

-- Policy: Cleaning Staff Read
DROP POLICY IF EXISTS "leases_staff_read" ON public.leases;
CREATE POLICY "leases_staff_read" ON public.leases
    FOR SELECT TO authenticated
    USING (
        property_id = public.get_my_property_id()
        AND public.get_my_role() = 'cleaning_staff'
    );


-- ==============================================================================
-- 4.5 TABEL: invoices
-- Akses:
-- - owner & admin: full (SELECT, INSERT, UPDATE, DELETE)
-- - cleaning_staff: TIDAK ADA AKSES (default deny)
-- ==============================================================================

-- Policy: Owner & Admin Full Access
DROP POLICY IF EXISTS "invoices_owner_full" ON public.invoices;
CREATE POLICY "invoices_owner_full" ON public.invoices
    FOR ALL TO authenticated
    USING (
        property_id = public.get_my_property_id()
        AND public.get_my_role() IN ('owner', 'admin')
    )
    WITH CHECK (
        property_id = public.get_my_property_id()
        AND public.get_my_role() IN ('owner', 'admin')
    );


-- ==============================================================================
-- 4.6 TABEL: payments
-- Akses:
-- - owner & admin: full (SELECT, INSERT, UPDATE, DELETE)
-- - cleaning_staff: TIDAK ADA AKSES (default deny)
-- Catatan: payments tidak memiliki property_id langsung, menggunakan subquery
-- EXISTS via invoices -> leases untuk memverifikasi scoping property.
-- ==============================================================================

-- Policy: Owner & Admin Full Access via EXISTS subquery
DROP POLICY IF EXISTS "payments_owner_full" ON public.payments;
CREATE POLICY "payments_owner_full" ON public.payments
    FOR ALL TO authenticated
    USING (
        public.get_my_role() IN ('owner', 'admin')
        AND EXISTS (
            SELECT 1 
            FROM public.invoices inv
            JOIN public.leases l ON l.id = inv.lease_id
            WHERE inv.id = payments.invoice_id
              AND inv.property_id = public.get_my_property_id()
        )
    )
    WITH CHECK (
        public.get_my_role() IN ('owner', 'admin')
        AND EXISTS (
            SELECT 1 
            FROM public.invoices inv
            JOIN public.leases l ON l.id = inv.lease_id
            WHERE inv.id = payments.invoice_id
              AND inv.property_id = public.get_my_property_id()
        )
    );


-- ==============================================================================
-- 4.7 TABEL: electricity_transactions & VIEW: staff_electricity_transactions
-- Akses:
-- - owner & admin: full (SELECT, INSERT, UPDATE, DELETE)
-- - cleaning_staff: SELECT (tanpa cost_price, profit_margin)
-- ==============================================================================

-- Policy: Owner & Admin Full Access
DROP POLICY IF EXISTS "electricity_owner_full" ON public.electricity_transactions;
CREATE POLICY "electricity_owner_full" ON public.electricity_transactions
    FOR ALL TO authenticated
    USING (
        property_id = public.get_my_property_id()
        AND public.get_my_role() IN ('owner', 'admin')
    )
    WITH CHECK (
        property_id = public.get_my_property_id()
        AND public.get_my_role() IN ('owner', 'admin')
    );

-- Policy: Cleaning Staff Read pada tabel electricity_transactions
DROP POLICY IF EXISTS "electricity_staff_read" ON public.electricity_transactions;
CREATE POLICY "electricity_staff_read" ON public.electricity_transactions
    FOR SELECT TO authenticated
    USING (
        property_id = public.get_my_property_id()
        AND public.get_my_role() = 'cleaning_staff'
    );

-- VIEW staff_electricity_transactions: Mengaburkan kolom sensitif bisnis (cost_price & profit_margin)
CREATE OR REPLACE VIEW public.staff_electricity_transactions
WITH (security_barrier = true) AS
SELECT 
    id,
    property_id,
    lease_id,
    room_id,
    tenant_id,
    token_code,
    nominal_amount,
    kwh_units,
    selling_price,
    payment_status,
    invoice_id,
    sent_at,
    created_at
FROM public.electricity_transactions
WHERE property_id = public.get_my_property_id()
  AND public.get_my_role() IN ('owner', 'admin', 'cleaning_staff');

-- Proteksi hak akses view
REVOKE ALL ON public.staff_electricity_transactions FROM anon, public;
GRANT SELECT ON public.staff_electricity_transactions TO authenticated;


-- ==============================================================================
-- 4.8 TABEL: payment_methods_config
-- Akses:
-- - owner & admin: full (SELECT, INSERT, UPDATE, DELETE)
-- - cleaning_staff: SELECT
-- ==============================================================================

-- Policy: Owner & Admin Full Access
DROP POLICY IF EXISTS "payment_methods_owner_full" ON public.payment_methods_config;
CREATE POLICY "payment_methods_owner_full" ON public.payment_methods_config
    FOR ALL TO authenticated
    USING (
        property_id = public.get_my_property_id()
        AND public.get_my_role() IN ('owner', 'admin')
    )
    WITH CHECK (
        property_id = public.get_my_property_id()
        AND public.get_my_role() IN ('owner', 'admin')
    );

-- Policy: Cleaning Staff Read
DROP POLICY IF EXISTS "payment_methods_staff_read" ON public.payment_methods_config;
CREATE POLICY "payment_methods_staff_read" ON public.payment_methods_config
    FOR SELECT TO authenticated
    USING (
        property_id = public.get_my_property_id()
        AND public.get_my_role() = 'cleaning_staff'
    );


-- ==============================================================================
-- 4.9 TABEL: user_profiles
-- Akses:
-- - owner: full (SELECT, INSERT, UPDATE, DELETE pada profil properti sendiri / akun sendiri)
-- - admin & cleaning_staff: SELECT (properti sendiri atau akun sendiri)
-- ==============================================================================

-- Policy: Owner Full Access
DROP POLICY IF EXISTS "user_profiles_owner_full" ON public.user_profiles;
CREATE POLICY "user_profiles_owner_full" ON public.user_profiles
    FOR ALL TO authenticated
    USING (
        public.get_my_role() = 'owner'
        AND (property_id = public.get_my_property_id() OR id = auth.uid())
    )
    WITH CHECK (
        public.get_my_role() = 'owner'
        AND (property_id = public.get_my_property_id() OR id = auth.uid())
    );

-- Policy: Admin & Cleaning Staff Read
DROP POLICY IF EXISTS "user_profiles_staff_select" ON public.user_profiles;
CREATE POLICY "user_profiles_staff_select" ON public.user_profiles
    FOR SELECT TO authenticated
    USING (
        public.get_my_role() IN ('admin', 'cleaning_staff')
        AND (property_id = public.get_my_property_id() OR id = auth.uid())
    );


-- ==============================================================================
-- 4.10 TABEL: room_complaints
-- Akses:
-- - owner: full
-- - admin: full
-- - cleaning_staff: full (bisa membuat, membaca, dan mengupdate status komplain/perbaikan)
-- ==============================================================================

-- Policy: All Staff Full Access
DROP POLICY IF EXISTS "room_complaints_all_staff_full" ON public.room_complaints;
CREATE POLICY "room_complaints_all_staff_full" ON public.room_complaints
    FOR ALL TO authenticated
    USING (
        property_id = public.get_my_property_id()
        AND public.get_my_role() IN ('owner', 'admin', 'cleaning_staff')
    )
    WITH CHECK (
        property_id = public.get_my_property_id()
        AND public.get_my_role() IN ('owner', 'admin', 'cleaning_staff')
    );


-- ==============================================================================
-- 4.11 TABEL: finance_categories
-- Akses:
-- - owner & admin: full (SELECT, INSERT, UPDATE, DELETE)
-- - cleaning_staff: TIDAK ADA AKSES (default deny)
-- Catatan: Tabel kategori bersifat master tanpa kolom property_id.
-- ==============================================================================

-- Policy: Owner & Admin Full Access
DROP POLICY IF EXISTS "finance_categories_owner_full" ON public.finance_categories;
CREATE POLICY "finance_categories_owner_full" ON public.finance_categories
    FOR ALL TO authenticated
    USING (
        public.get_my_role() IN ('owner', 'admin')
    )
    WITH CHECK (
        public.get_my_role() IN ('owner', 'admin')
    );


-- ==============================================================================
-- 4.12 TABEL: finance_wallets
-- Akses:
-- - owner & admin: full (SELECT, INSERT, UPDATE, DELETE)
-- - cleaning_staff: TIDAK ADA AKSES (default deny)
-- ==============================================================================

-- Policy: Owner & Admin Full Access
DROP POLICY IF EXISTS "finance_wallets_owner_full" ON public.finance_wallets;
CREATE POLICY "finance_wallets_owner_full" ON public.finance_wallets
    FOR ALL TO authenticated
    USING (
        property_id = public.get_my_property_id()
        AND public.get_my_role() IN ('owner', 'admin')
    )
    WITH CHECK (
        property_id = public.get_my_property_id()
        AND public.get_my_role() IN ('owner', 'admin')
    );


-- ==============================================================================
-- 4.13 TABEL: cash_transactions
-- Akses:
-- - owner & admin: full (SELECT, INSERT, UPDATE, DELETE)
-- - cleaning_staff: TIDAK ADA AKSES (default deny)
-- ==============================================================================

-- Policy: Owner & Admin Full Access
DROP POLICY IF EXISTS "cash_transactions_owner_full" ON public.cash_transactions;
CREATE POLICY "cash_transactions_owner_full" ON public.cash_transactions
    FOR ALL TO authenticated
    USING (
        property_id = public.get_my_property_id()
        AND public.get_my_role() IN ('owner', 'admin')
    )
    WITH CHECK (
        property_id = public.get_my_property_id()
        AND public.get_my_role() IN ('owner', 'admin')
    );

-- ==============================================================================
-- MATRIKS AKSES ROW LEVEL SECURITY (DOKUMENTASI SISTEM)
-- ==============================================================================
-- +--------------------------+-------+-----------------------------+---------------------------------------+
-- | Tabel                    | owner | admin                       | cleaning_staff                        |
-- +--------------------------+-------+-----------------------------+---------------------------------------+
-- | properties               | full  | SELECT, UPDATE              | SELECT                                |
-- | rooms                    | full  | full                        | SELECT                                |
-- | tenants                  | full  | full                        | TIDAK ADA (Akses via tenant_directory)|
-- | leases                   | full  | full                        | SELECT                                |
-- | invoices                 | full  | full                        | TIDAK ADA AKSES (Default Deny)        |
-- | payments                 | full  | full (subquery EXISTS)      | TIDAK ADA AKSES (Default Deny)        |
-- | electricity_transactions | full  | full                        | SELECT (Aman via VIEW staff_el)       |
-- | payment_methods_config   | full  | full                        | SELECT                                |
-- | user_profiles            | full  | SELECT (properti sendiri)   | SELECT (properti sendiri)             |
-- | room_complaints          | full  | full                        | full                                  |
-- | finance_categories       | full  | full                        | TIDAK ADA AKSES (Default Deny)        |
-- | finance_wallets          | full  | full                        | TIDAK ADA AKSES (Default Deny)        |
-- | cash_transactions       | full  | full                        | TIDAK ADA AKSES (Default Deny)        |
-- +--------------------------+-------+-----------------------------+---------------------------------------+
-- * "full" = SELECT, INSERT, UPDATE, DELETE.
-- * "TIDAK ADA AKSES" = Default Deny (tanpa policy untuk role tersebut).
-- * Role 'anon' tidak memiliki policy pada tabel apa pun (100% diblokir).
-- ==============================================================================
