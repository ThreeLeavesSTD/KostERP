-- ==============================================================================
-- SCHEMA MIGRATION: 001_initial_schema.sql
-- ERP Operasional Kost Database Schema (Supabase / PostgreSQL)
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
CREATE TYPE room_status AS ENUM ('available', 'occupied', 'maintenance');
CREATE TYPE lease_status AS ENUM ('active', 'completed', 'cancelled');
CREATE TYPE invoice_status AS ENUM ('unpaid', 'paid', 'overdue');
CREATE TYPE token_payment_status AS ENUM ('paid_cash', 'paid_transfer', 'invoiced', 'unpaid');

-- 3. TABLE: properties
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) DEFAULT 'Jakarta',
    phone VARCHAR(30),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLE: rooms
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    room_number VARCHAR(20) NOT NULL,
    floor INT NOT NULL DEFAULT 1,
    room_type VARCHAR(50) DEFAULT 'Standard',
    base_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    facilities TEXT[] DEFAULT ARRAY['Kasur', 'Lemari', 'Kamar Mandi Dalam'],
    status room_status NOT NULL DEFAULT 'available',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (property_id, room_number)
);

-- 5. TABLE: tenants
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(25) NOT NULL, -- Format E.164 (+628...)
    id_card_number VARCHAR(30), -- NIK
    id_card_url TEXT, -- Supabase Storage URL
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(25),
    emergency_contact_relation VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLE: leases (Kontrak Sewa)
CREATE TABLE IF NOT EXISTS leases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE,
    billing_cycle_day INT NOT NULL DEFAULT 1 CHECK (billing_cycle_day BETWEEN 1 AND 31),
    rent_amount NUMERIC(12, 2) NOT NULL,
    deposit_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status lease_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABLE: invoices
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    billing_period VARCHAR(30) NOT NULL, -- Contoh: '2026-08'
    subtotal_rent NUMERIC(12, 2) NOT NULL,
    additional_fees NUMERIC(12, 2) DEFAULT 0,
    notes TEXT,
    total_amount NUMERIC(12, 2) NOT NULL,
    due_date DATE NOT NULL,
    status invoice_status NOT NULL DEFAULT 'unpaid',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABLE: payments
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount_paid NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- 'cash', 'bca_transfer', 'mandiri_transfer', 'qris'
    proof_url TEXT,
    verified_by VARCHAR(100) DEFAULT 'Admin',
    paid_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TABLE: electricity_transactions (Token Listrik PLN)
CREATE TABLE IF NOT EXISTS electricity_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    lease_id UUID REFERENCES leases(id) ON DELETE SET NULL,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    token_code VARCHAR(30) NOT NULL, -- 20 Digit Kode Token
    nominal_amount NUMERIC(12, 2) NOT NULL, -- Misal Rp 50.000, 100.000
    kwh_units NUMERIC(8, 2),
    cost_price NUMERIC(12, 2) NOT NULL, -- Harga Beli / Kulakan
    selling_price NUMERIC(12, 2) NOT NULL, -- Harga Jual ke Penghuni
    profit_margin NUMERIC(12, 2) GENERATED ALWAYS AS (selling_price - cost_price) STORED,
    payment_status token_payment_status NOT NULL DEFAULT 'paid_cash',
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. TABLE: payment_methods_config (Pengaturan Rekening Kost)
CREATE TABLE IF NOT EXISTS payment_methods_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    bank_name VARCHAR(50) NOT NULL, -- 'BCA', 'Mandiri', 'BRI', 'QRIS', 'Tunai'
    account_number VARCHAR(50),
    account_holder VARCHAR(100),
    qris_image_url TEXT,
    instructions TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. INDEXES for Performance
CREATE INDEX IF NOT EXISTS idx_rooms_property ON rooms(property_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_tenants_phone ON tenants(phone_number);
CREATE INDEX IF NOT EXISTS idx_leases_status ON leases(status);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_electricity_property ON electricity_transactions(property_id);

-- 12. TRIGGER: Auto-update status kamar saat kontrak sewa aktif dibuat
CREATE OR REPLACE FUNCTION update_room_status_on_lease()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status = 'active') THEN
        UPDATE rooms SET status = 'occupied', updated_at = NOW() WHERE id = NEW.room_id;
    ELSIF (NEW.status IN ('completed', 'cancelled')) THEN
        UPDATE rooms SET status = 'available', updated_at = NOW() WHERE id = NEW.room_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_lease_room_status ON leases;
CREATE TRIGGER trigger_lease_room_status
AFTER INSERT OR UPDATE OF status ON leases
FOR EACH ROW
EXECUTE FUNCTION update_room_status_on_lease();
