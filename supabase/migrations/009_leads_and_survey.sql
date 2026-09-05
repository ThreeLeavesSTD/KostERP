-- ==============================================================================
-- SCHEMA MIGRATION: 009_leads_and_survey.sql
-- ERP Operasional Kost Database Schema (Leads Generation & Survey Management)
-- ==============================================================================

-- 1.1 Enums (Guarded creation)
DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'follow_up', 'survey_scheduled', 'survey_done', 'negotiation', 'won', 'lost');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE lead_channel AS ENUM ('whatsapp', 'landing_page', 'instagram', 'tiktok', 'facebook', 'referral', 'marketplace', 'walk_in', 'other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE survey_status AS ENUM ('scheduled', 'confirmed', 'completed', 'no_show', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 1.2 Tables
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(25) NOT NULL,                 -- E.164 (+628...) — dedup key
    channel lead_channel NOT NULL DEFAULT 'whatsapp',
    landing_page_campaign TEXT,                 -- utm/campaign tag dari landing page
    preferred_room_type VARCHAR(50),
    budget_min NUMERIC(12,2),
    budget_max NUMERIC(12,2),
    preferred_move_in_date DATE,
    is_warm BOOLEAN NOT NULL DEFAULT FALSE,     -- explicit "warm lead" flag
    status lead_status NOT NULL DEFAULT 'new',
    assigned_staff_id UUID CONSTRAINT leads_assigned_staff_id_fkey REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    follow_up_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT leads_property_phone_unique UNIQUE (property_id, phone)
);

CREATE TABLE IF NOT EXISTS public.survey_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL CONSTRAINT survey_schedules_lead_id_fkey REFERENCES public.leads(id) ON DELETE CASCADE,
    room_id UUID CONSTRAINT survey_schedules_room_id_fkey REFERENCES public.rooms(id) ON DELETE SET NULL,  -- kamar spesifik (opsional)
    scheduled_at TIMESTAMPTZ NOT NULL,
    status survey_status NOT NULL DEFAULT 'scheduled',
    assigned_staff_id UUID CONSTRAINT survey_schedules_assigned_staff_id_fkey REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    result_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leads_property ON public.leads(property_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_follow_up ON public.leads(follow_up_at);
CREATE INDEX IF NOT EXISTS idx_leads_warm ON public.leads(is_warm);
CREATE INDEX IF NOT EXISTS idx_surveys_property ON public.survey_schedules(property_id);
CREATE INDEX IF NOT EXISTS idx_surveys_scheduled ON public.survey_schedules(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_surveys_status ON public.survey_schedules(status);
CREATE INDEX IF NOT EXISTS idx_surveys_lead ON public.survey_schedules(lead_id);

-- 1.3 Row Level Security (RLS)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leads_owner_admin_full" ON public.leads;
CREATE POLICY "leads_owner_admin_full" ON public.leads
    FOR ALL TO authenticated
    USING (property_id = public.get_my_property_id() AND public.get_my_role() IN ('owner','admin'))
    WITH CHECK (property_id = public.get_my_property_id() AND public.get_my_role() IN ('owner','admin'));

DROP POLICY IF EXISTS "survey_schedules_owner_admin_full" ON public.survey_schedules;
CREATE POLICY "survey_schedules_owner_admin_full" ON public.survey_schedules
    FOR ALL TO authenticated
    USING (property_id = public.get_my_property_id() AND public.get_my_role() IN ('owner','admin'))
    WITH CHECK (property_id = public.get_my_property_id() AND public.get_my_role() IN ('owner','admin'));

-- 1.4 Add the leads permission to the seeded system roles
UPDATE public.custom_roles
SET permissions = array_append(permissions, 'leads'), updated_at = NOW()
WHERE id IN ('owner','admin')
  AND NOT ('leads' = ANY(permissions));
