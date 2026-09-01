-- ==============================================================================
-- SCHEMA MIGRATION: 003_extended_features_and_rls.sql
-- ERP Operasional Kost Database Schema (Extended Features & RLS Policies)
-- ==============================================================================

-- 1. Complaints Types & Table
DO $$ BEGIN
    CREATE TYPE complaint_status AS ENUM ('pending', 'in_progress', 'resolved');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE complaint_category AS ENUM ('ac_facility', 'plumbing', 'electricity', 'cleanliness', 'security', 'general');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE complaint_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS room_complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    room_number VARCHAR(20) NOT NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    tenant_name VARCHAR(150) NOT NULL,
    tenant_phone VARCHAR(25) NOT NULL,
    source VARCHAR(50) DEFAULT 'whatsapp_cs_ai',
    raw_chat_message TEXT NOT NULL,
    ai_extracted_summary TEXT,
    ai_response_sent TEXT,
    category complaint_category NOT NULL DEFAULT 'general',
    priority complaint_priority NOT NULL DEFAULT 'medium',
    status complaint_status NOT NULL DEFAULT 'pending',
    assigned_staff_name VARCHAR(100),
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- 2. Finance Categories & Wallets & Cash Transactions
CREATE TABLE IF NOT EXISTS finance_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20), -- 'income' | 'expense'
    category_kind VARCHAR(20), -- 'asset' | 'liability' | 'income' | 'expense'
    icon VARCHAR(50),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'cash', -- 'cash' | 'bank' | 'ewallet' | 'other'
    wallet_kind VARCHAR(30) NOT NULL DEFAULT 'asset', -- 'asset' | 'liability'
    category_name VARCHAR(100),
    account_number VARCHAR(50),
    account_holder VARCHAR(100),
    initial_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
    color VARCHAR(30),
    icon VARCHAR(50),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cash_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- 'income' | 'expense'
    category VARCHAR(100) NOT NULL,
    category_name VARCHAR(100),
    category_id UUID REFERENCES finance_categories(id) ON DELETE SET NULL,
    wallet_id UUID REFERENCES finance_wallets(id) ON DELETE SET NULL,
    wallet_name VARCHAR(100),
    title VARCHAR(200) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50) DEFAULT 'Kas Tunai',
    receipt_url TEXT,
    notes TEXT,
    recorded_by VARCHAR(100) DEFAULT 'Owner',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_room_complaints_prop ON room_complaints(property_id);
CREATE INDEX IF NOT EXISTS idx_room_complaints_status ON room_complaints(status);
CREATE INDEX IF NOT EXISTS idx_finance_wallets_prop ON finance_wallets(property_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_prop ON cash_transactions(property_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_date ON cash_transactions(date);

-- 4. Fix search_path on functions to resolve security advisor warning
ALTER FUNCTION IF EXISTS update_room_status_on_lease() SET search_path = public;

-- 5. Enable RLS and add basic full access policies for authenticated & anon
DO $$ 
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.%I;', tbl);
        EXECUTE format('CREATE POLICY "Allow all for authenticated users" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all for anon in dev" ON public.%I;', tbl);
        EXECUTE format('CREATE POLICY "Allow all for anon in dev" ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true);', tbl);
    END LOOP;
END $$;
