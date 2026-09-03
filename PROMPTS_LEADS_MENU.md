# Task: Build the "Leads & Survey" module for the Kost ERP

You are working in the `noud-agency/Kostan` repo (Next.js App Router frontend in `src/`, Express backend in `backend/`, Supabase/Postgres migrations in `supabase/migrations/`). Build a complete, production-quality "Leads Generation" menu/module end-to-end. Follow the EXACT existing conventions — the `rooms`, `tenants`, and `complaints` modules are your reference implementation. Do not introduce new patterns.

## Architecture facts you MUST respect

- **Single-property multi-tenant shell**: every table is scoped by `property_id UUID REFERENCES properties(id)`. 1 Supabase project = 1 client.
- **Auth**: JWT Bearer token. Backend middleware `backend/src/middleware/auth.ts` (`requireAuth`) sets `req.auth = { userId, role, propertyId }`.
- **Backend data path** uses the Supabase **service role** client (`import { supabase } from "../config/supabase"` in `backend/src/services/supabase-service.ts`). RLS is defense-in-depth only.
- **Roles**: `owner`, `admin`, `cleaning_staff` (enum `user_role`). Menu visibility is driven by `custom_roles.permissions TEXT[]` in the DB (seeded in migration `008_custom_roles.sql`) AND by `src/lib/permissions.ts` on the frontend.
- **Login model**: owner = email; staff = numeric ID (synthetic email). Staff live in `public.user_profiles` (id = auth.users.id).
- Existing migrations are `001` through `008`. Your new migration is **`009_leads_and_survey.sql`**.
- Existing helper functions in RLS (from `004_secure_rls.sql`): `public.get_my_property_id()`, `public.get_my_role()`.

## Scope

Build ONE new menu "Leads & Survey" (tab id `leads`) that lets owner/admin:
1. See and manage a list of **leads** (calon penghuni) with a status pipeline + warm-lead flag.
2. See and manage **survey schedules** (jadwal kunjungan/lihat kamar) linked to a lead, with staff assignment and a confirm flow.

This module will later be written-to by an external WhatsApp AI agent, so the schema must be AI-writable (simple, `property_id`-scoped, dedup by phone).

---

## Part 1 — Database migration

Create `supabase/migrations/009_leads_and_survey.sql`. Content:

### 1.1 Enums

```sql
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'follow_up', 'survey_scheduled', 'survey_done', 'negotiation', 'won', 'lost');
CREATE TYPE lead_channel AS ENUM ('whatsapp', 'landing_page', 'instagram', 'tiktok', 'facebook', 'referral', 'marketplace', 'walk_in', 'other');
CREATE TYPE survey_status AS ENUM ('scheduled', 'confirmed', 'completed', 'no_show', 'cancelled');
```

Wrap each `CREATE TYPE` in a guard so re-running is safe, e.g.:

```sql
DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM (...);
EXCEPTION WHEN duplicate_object THEN null; END $$;
```

### 1.2 Tables

```sql
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
    assigned_staff_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    follow_up_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT leads_property_phone_unique UNIQUE (property_id, phone)
);

CREATE TABLE IF NOT EXISTS public.survey_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,  -- kamar spesifik (opsional)
    scheduled_at TIMESTAMPTZ NOT NULL,
    status survey_status NOT NULL DEFAULT 'scheduled',
    assigned_staff_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    result_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_property ON public.leads(property_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_follow_up ON public.leads(follow_up_at);
CREATE INDEX IF NOT EXISTS idx_leads_warm ON public.leads(is_warm);
CREATE INDEX IF NOT EXISTS idx_surveys_property ON public.survey_schedules(property_id);
CREATE INDEX IF NOT EXISTS idx_surveys_scheduled ON public.survey_schedules(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_surveys_status ON public.survey_schedules(status);
CREATE INDEX IF NOT EXISTS idx_surveys_lead ON public.survey_schedules(lead_id);
```

### 1.3 RLS (mirror the `004_secure_rls.sql` style)

Owner & admin get full access; `cleaning_staff` gets NO access (default deny).

```sql
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
```

### 1.4 Add the `leads` permission to the seeded system roles

Migration `008` seeded `custom_roles` with `permissions TEXT[]` for `owner`, `admin`, `cleaning_staff` but WITHOUT `leads`. Add it idempotently:

```sql
UPDATE public.custom_roles
SET permissions = array_append(permissions, 'leads'), updated_at = NOW()
WHERE id IN ('owner','admin')
  AND NOT ('leads' = ANY(permissions));
```

Do NOT add `leads` to `cleaning_staff`.

---

## Part 2 — Backend

### 2.1 `backend/src/services/supabase-service.ts`

Add methods to the existing `SupabaseService` object, following the `getRooms`/`getTenants` style (select with nested joins, map rows to typed shape).

- `async getLeads(propertyId?: string)` — `supabase.from("leads").select("*")`, order by `created_at` desc, filter by `property_id` if valid UUID. Then enrich each lead with:
  - `assigned_staff_name` — join `user_profiles` via the `leads_assigned_staff_id_fkey` FK (nested select `user_profiles!leads_assigned_staff_id_fkey(full_name)`), fallback to empty.
  - `surveys` — array of this lead's `survey_schedules` (nested select `survey_schedules(id, scheduled_at, status, room_id, rooms(room_number))`), fallback `[]`.
- `async createLead(payload)` — **upsert by phone**. Because `(property_id, phone)` is UNIQUE:
  - Normalize `phone` (trim; strip spaces/dashes; ensure starts with `+` or `62`).
  - `supabase.from("leads").upsert({ ...payload, property_id, ... }, { onConflict: "property_id,phone" }).select().single()`. Preserve any incoming `id` only if it's a valid UUID. Defaults: `channel` → `whatsapp`, `status` → `new`, `is_warm` → `false`.
  - Return the upserted row (this gives dedup: repeat lead with same phone updates instead of duplicating).
- `async updateLead(id, payload)` — whitelist updatable fields: `name, phone, channel, landing_page_campaign, preferred_room_type, budget_min, budget_max, preferred_move_in_date, is_warm, status, assigned_staff_id, follow_up_at, notes`. `updated_at` → NOW().
- `async deleteLead(id)` — delete; rely on `ON DELETE CASCADE` for its surveys.
- `async getSurveys(propertyId?)` — `supabase.from("survey_schedules").select("*")` order by `scheduled_at` asc, filter by property. Enrich with:
  - `lead_name`, `lead_phone` — nested join to `leads` (`leads!survey_schedules_lead_id_fkey(name, phone)`).
  - `room_number` — nested join `rooms(room_number)`.
  - `assigned_staff_name` — nested join to `user_profiles` via `survey_schedules_assigned_staff_id_fkey(full_name)`.
- `async createSurvey(payload)` — insert with `property_id`, `lead_id` required, `room_id` optional, `status` default `scheduled`. Also (important) set the parent lead's `status` to `survey_scheduled` and `follow_up_at` to `scheduled_at` if the lead exists and its status is earlier in the pipeline.
- `async updateSurvey(id, payload)` — whitelist: `room_id, scheduled_at, status, assigned_staff_id, result_notes`. When `status` becomes `confirmed`, `completed`, `no_show`, or `cancelled`, also update the linked lead's `status` accordingly (`survey_scheduled` on schedule, `survey_done` on completion, `follow_up` on no_show/cancelled).
- `async deleteSurvey(id)`.

Keep every method defensive (throw on Supabase `error`; return `[]` on benign read errors) consistent with the rest of the file.

### 2.2 Routes

- `backend/src/routes/leads.routes.ts` — `GET /`, `POST /`, `PUT /:id`, `DELETE /:id`. Use `req.auth?.propertyId || await SupabaseService.getDefaultPropertyId()` and pass `property_id` into create/update payloads (never trust a client-sent `property_id`). Block `cleaning_staff` from writes (return 403), matching `rooms.routes.ts`.
- `backend/src/routes/surveys.routes.ts` — `GET /`, `POST /`, `PUT /:id`, `DELETE /:id`. Same auth/property scoping and cleaning_staff block.

### 2.3 `backend/src/server.ts`

Import and register:

```ts
app.use("/api/leads", requireAuth, leadsRoutes);
app.use("/api/surveys", requireAuth, surveysRoutes);
```

---

## Part 3 — Frontend types

In `src/types/index.ts`:

- Add enums as string unions:
  - `export type LeadStatus = 'new' | 'contacted' | 'follow_up' | 'survey_scheduled' | 'survey_done' | 'negotiation' | 'won' | 'lost';`
  - `export type LeadChannel = 'whatsapp' | 'landing_page' | 'instagram' | 'tiktok' | 'facebook' | 'referral' | 'marketplace' | 'walk_in' | 'other';`
  - `export type SurveyStatus = 'scheduled' | 'confirmed' | 'completed' | 'no_show' | 'cancelled';`
- Add interfaces:
  - `Lead` — `id, property_id, name, phone, channel, landing_page_campaign?, preferred_room_type?, budget_min?, budget_max?, preferred_move_in_date?, is_warm, status, assigned_staff_id?, assigned_staff_name?, follow_up_at?, notes?, surveys?: SurveySchedule[], created_at, updated_at?`
  - `SurveySchedule` — `id, property_id, lead_id, lead_name?, lead_phone?, room_id?, room_number?, scheduled_at, status, assigned_staff_id?, assigned_staff_name?, result_notes?, created_at, updated_at?`
- Add `"leads"` to the `FeaturePermission` union.

---

## Part 4 — Frontend API client

In `src/lib/api-client.ts`, add to `KostApiClient`:

- `getLeads(propertyId?)` → `fetchWithFallback<Lead[]>(`/leads${query}`, () => [])`
- `createLead(payload)` → `fetchWithFallback("/leads", () => payload as Lead, { method: "POST", body })`
- `updateLead(id, payload)`, `deleteLead(id)`
- `getSurveys(propertyId?)` → `fetchWithFallback<SurveySchedule[]>(`/surveys${query}`, () => [])`
- `createSurvey(payload)`, `updateSurvey(id, payload)`, `deleteSurvey(id)`

Use empty-array/noop fallbacks (do NOT add KostStorage mock data for leads in this iteration). Mirror the existing method shapes exactly.

---

## Part 5 — Frontend UI

### 5.1 `src/components/leads/leads-view.tsx` (new, `"use client"`)

Main view. Header row: title "Leads & Survey" + a primary "Tambah Lead" button. Below it a segmented control with two sub-tabs: **"Leads"** and **"Jadwal Survey"**.

**Leads sub-tab**
- Filter chips (status): `Semua`, `Baru`, `Warm` (is_warm=true), `Perlu Follow-up` (follow_up_at <= now OR status in `follow_up`), `Terjadwal Survey`, `Deal` (won), `Gagal` (lost). Selecting a chip filters the client-side list.
- Search box (name or phone).
- Responsive list/table. Each row shows: name, phone (as a clickable `https://wa.me/<digits>` link), channel badge, status badge, warm indicator (🔥 if is_warm), follow_up_at, assigned staff name, and actions: **Jadwalkan Survey**, edit, delete.
- Empty state when no leads.

**Jadwal Survey sub-tab**
- Group into **"Mendatang"** (status `scheduled`/`confirmed`, ordered by `scheduled_at` ascending) and **"Riwayat"** (`completed`/`no_show`/`cancelled`).
- Each row: lead name + phone, room number (or "—"), scheduled_at, status badge, assigned staff, and actions depending on status:
  - `scheduled` → "Konfirmasi" (→ confirmed), "No-show", "Batal", edit
  - `confirmed` → "Selesai" (→ completed), "No-show", "Batal"
  - else → edit/delete only.
- "Tambah Jadwal" button.

Status → label + color map (use the existing `badge.tsx` variants):
- lead: `new` (Baru, blue), `contacted` (Dihubungi, slate), `follow_up` (Follow-up, amber), `survey_scheduled` (Terjadwal, indigo), `survey_done` (Survey Selesai, teal), `negotiation` (Negosiasi, purple), `won` (Deal, green), `lost` (Gagal, red).
- survey: `scheduled` (Dijadwalkan, amber), `confirmed` (Terkonfirmasi, green), `completed` (Selesai, blue), `no_show` (No-show, red), `cancelled` (Dibatalkan, slate).

Labels are Indonesian (the app is Bahasa Indonesia).

### 5.2 `src/components/leads/lead-modal.tsx` (new)

Modal (reuse `src/components/ui/modal.tsx` + `button.tsx`) with fields: `name` (required), `phone` (required, E.164), `channel` (select), `landing_page_campaign`, `preferred_room_type` (text with datalist of existing room types), `budget_min`, `budget_max`, `preferred_move_in_date` (date), `is_warm` (toggle), `status` (select), `assigned_staff_id` (select populated from `GET /api/staff`, optional), `follow_up_at` (datetime-local), `notes` (textarea). Validate name + phone before submit.

### 5.3 `src/components/leads/survey-modal.tsx` (new)

Modal with fields: `lead_id` (select of leads, required; when opened via "Jadwalkan Survey" from a lead row, pre-select that lead), `room_id` (optional select populated from `GET /api/rooms`, show `room_number`), `scheduled_at` (datetime-local, required), `assigned_staff_id` (optional), `status` (select, default `scheduled`), `result_notes` (textarea).

### 5.4 Wire the view into the app

In `src/app/page.tsx`:
- import `LeadsView`, add `{activeTab === "leads" && <LeadsView currentRole={currentRole} />}` (place it near the `tenants`/`billing` blocks).

---

## Part 6 — Navigation + permissions

1. `src/lib/permissions.ts` — add `"leads"` to `ALL_PERMISSIONS`. (Owner gets it automatically; admin gets it automatically because admin's exclusion list is only `['owner-audit','staff-management','billing-settings']`; `cleaning_staff` does NOT get it.)
2. `src/components/layout/sidebar.tsx` — add to `allNavItems`: `{ id: "leads", label: "Leads & Survey", icon: Target }` (import `Target` from `lucide-react`). Place it right after `tenants`.
3. `src/components/layout/mobile-nav.tsx` — add `{ id: "leads", label: "Leads", icon: Target }` to `allMobileItems`.
4. Check `src/components/layout/header.tsx` — if it also renders a nav item list/tabs, add the `leads` entry there too with the same permission filter.

---

## Acceptance criteria (verify before finishing)

- `cd backend && npm run build` (or `npx tsc --noEmit`) passes; `npm run build` at the repo root passes with no new TS errors.
- Migration applies cleanly via `supabase db push` (or `psql`): enums, 2 tables, indexes, RLS policies, and the `leads` permission added to owner+admin `custom_roles`.
- New menu "Leads & Survey" appears for owner and admin, hidden for cleaning_staff, in both desktop sidebar and mobile nav.
- Create a lead → appears in list. Create a second lead with the SAME phone → the existing lead is updated (no duplicate row).
- Schedule a survey for a lead → the lead's status becomes `survey_scheduled`; the survey shows under "Mendatang".
- Confirm → `confirmed`; mark "Selesai" → `completed` and lead status → `survey_done`.
- Staff-assignment dropdown shows staff from `/api/staff`.

## Pitfalls / do NOT

- Do NOT trust client-sent `property_id`; always override with `req.auth.propertyId`.
- Do NOT create RLS policies granting `cleaning_staff` any access to leads/surveys.
- Do NOT add a migration file other than `009_leads_and_survey.sql`.
- Do NOT put demo/seed rows in the migration (it must auto-apply identically to every client DB).
- Keep the phone UNIQUE constraint `(property_id, phone)` and the upsert-on-conflict — this is the dedup requirement.
- Do NOT refactor or "improve" existing modules. Changes are additive only.
