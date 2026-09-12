# Task: Build the "Pengaturan Properti" (Property Settings) module for the Kost ERP

You are working in the `noud-agency/Kostan` repo (Next.js App Router frontend in `src/`, Express backend in `backend/`, Supabase/Postgres migrations in `supabase/migrations/`). Build a complete, production-quality "Property Settings" screen end-to-end so the **owner** can customize the property identity that is shown as the ERP title/header. Follow the EXACT existing conventions — `src/components/billing/payment-settings-view.tsx` (the sibling "Rekening Bank" settings screen) is your reference implementation. Do not introduce new patterns.

## Goal

Add an owner-only screen (tab id `property-settings`, label **"Pengaturan Properti"**) where the owner can edit:

1. `name` — property name → becomes the ERP title (`<h1>`) in the top header.
2. `address` — full street address → shown in the header location pill and reused in WhatsApp invoice templates.
3. `city` — city/district.
4. `phone` — property WhatsApp/phone number.
5. `description` — **NEW field**: free-form property description ("keterangan properti", e.g. "Kost putri dekat kampus UI, WiFi + AC, parkir motor").

After save, the header must reflect the new `name` and `address` without a full page reload.

## Architecture facts you MUST respect

- **Single-property multi-tenant shell**: every table is scoped by `property_id UUID REFERENCES properties(id)`. 1 Supabase project = 1 client.
- **Auth**: JWT Bearer. Backend middleware `backend/src/middleware/auth.ts` (`requireAuth`) sets `req.auth = { userId, role, propertyId }`.
- **Backend data path** uses the Supabase **service role** client (`backend/src/services/supabase-service.ts`). RLS is defense-in-depth only. The backend already has a full CRUD route for properties at `backend/src/routes/properties.routes.ts` (`GET/POST/PUT/DELETE /api/properties`).
- **Roles**: `owner`, `admin`, `cleaning_staff`. Menu visibility is driven by `src/lib/permissions.ts` (frontend) AND by `custom_roles.permissions TEXT[]` in the DB (seeded in `008_custom_roles.sql`).
- **Login model**: owner = email; staff = numeric ID (synthetic email).
- **Frontend write path**: components call `KostApiClient.*` (see `src/lib/api-client.ts`), which does a backend REST call with a **localStorage fallback** (`KostStorage` in `src/lib/storage.ts`). Follow this exact pattern.
- Existing migrations are `001` through `008`. `009` is **reserved** by the pending Leads module (`PROMPTS_LEADS_MENU.md`). Your new migration is **`010_property_settings.sql`**.
- The seeded property has a fixed UUID: `a0000000-0000-0000-0000-000000000001`.

---

## Part 1 — Database migration

Create `supabase/migrations/010_property_settings.sql`. Content (a single idempotent `ALTER`):

```sql
-- ==============================================================================
-- SCHEMA MIGRATION: 010_property_settings.sql
-- Add owner-editable property "description" (keterangan properti)
-- ==============================================================================
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS description TEXT;

-- Seed a friendly default for the existing property (idempotent)
UPDATE public.properties
SET description = COALESCE(description, 'Kost Putri Graha Asri — nyaman, aman, dekat kampus.')
WHERE id = 'a0000000-0000-0000-0000-000000000001'
  AND description IS NULL;
```

## Part 2 — Type updates

### 2.1 `src/types/index.ts`

In `export interface Property`, add an optional field:

```ts
export interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  phone?: string;
  description?: string;   // <-- NEW
  created_at: string;
}
```

### 2.2 `src/types/database.types.ts`

Find the `properties` block (`Row`, `Insert`, `Update`). Add `description: string | null` to all three:

```ts
properties: {
  Row: {
    address: string
    city: string | null
    created_at: string | null
    description: string | null   // <-- NEW
    id: string
    name: string
    phone: string | null
    updated_at: string | null
  }
  Insert: {
    address: string
    city?: string | null
    created_at?: string | null
    description?: string | null  // <-- NEW
    id?: string
    name: string
    phone?: string | null
    updated_at?: string | null
  }
  Update: {
    address?: string
    city?: string | null
    created_at?: string | null
    description?: string | null  // <-- NEW
    id?: string
    name?: string
    phone?: string | null
    updated_at?: string | null
  }
  Relationships: []
}
```

### 2.3 `src/lib/mock-data.ts`

In `export const initialProperties: Property[]`, add a `description` to the single seeded object:

```ts
{
  id: "a0000000-0000-0000-0000-000000000001",
  name: "Kost Putri Graha Asri",
  address: "Jl. Margonda Raya No. 45, Beji",
  city: "Depok",
  phone: "+628****7890",
  description: "Kost putri dekat kampus UI, WiFi + AC, parkir motor.",
  created_at: "2026-01-01T08:00:00Z",
}
```

## Part 3 — Storage fallback (`src/lib/storage.ts`)

The `KostStorage` object has a `// PROPERTIES` section with `getProperties`. Add a `updateProperty` method right after `getProperties`:

```ts
  // PROPERTIES
  getProperties: (): Property[] => getItem(STORAGE_KEYS.PROPERTIES, initialProperties),

  updateProperty: (id: string, updates: Partial<Property>): Property => {
    const all = getItem<Property[]>(STORAGE_KEYS.PROPERTIES, initialProperties);
    const updated = all.map((p) => (p.id === id ? { ...p, ...updates } : p));
    setItem(STORAGE_KEYS.PROPERTIES, updated);
    return updated.find((p) => p.id === id) || updated[0];
  },
```

## Part 4 — API client (`src/lib/api-client.ts`)

Fix `updateProperty` (currently around line 103) so it persists to localStorage AND awaits the backend call, returning the updated property. Replace the existing body with:

```ts
  async updateProperty(id: string, property: Partial<Property>): Promise<Property> {
    const local = KostStorage.updateProperty(id, property);
    await fetchWithFallback<Property>(`/properties/${id}`, () => local, {
      method: "PUT",
      body: JSON.stringify(property),
    });
    return local;
  },
```

(Note: `fetchWithFallback` already returns `result.data ?? result`, so the backend's `{ success, data }` envelope resolves to the updated `Property`.)

## Part 5 — Backend type (`backend/src/services/supabase-service.ts`)

Update the `updateProperty` signature (around line 37) to accept `description`. The Supabase `.update(payload)` already forwards any keys in the object, so this is for type cleanliness:

```ts
  async updateProperty(id: string, payload: Partial<{ name: string; address: string; city: string; phone: string; description: string }>) {
    const { data, error } = await supabase.from("properties").update(payload).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
```

Optionally do the same for `createProperty` (add `description?: string`).

## Part 6 — New component `src/components/property/property-settings-view.tsx`

Create the folder `src/components/property/` and the file `property-settings-view.tsx`. Model it on `payment-settings-view.tsx` (same styling: bento cards, `Button` from `@/components/ui/button`, `lucide-react` icons, `Building2`, `Save`, `CheckCircle2`). Requirements:

- `"use client";`
- Props: `{ currentRole: UserRole }` (import from `@/types`).
- **Owner-only guard**: if `currentRole !== "owner"`, render a centered "Akses ditolak — hanya Owner yang dapat mengubah pengaturan properti." message and return early.
- State: a single `property` object (`Property | null`), plus `isLoading`, `isSaved`, and a form field state (or edit the property object directly via controlled inputs).
- `loadData()`: `const props = await KostApiClient.getProperties(); setProperty(props[0] ?? null);`
- Form fields (controlled inputs), each labeled in Indonesian:
  - **Nama Properti** (`name`, required, `type="text"`)
  - **Alamat Lengkap** (`address`, required, `type="text"`)
  - **Kota** (`city`, `type="text"`)
  - **No. WhatsApp / Telepon** (`phone`, `type="tel"`, placeholder `+62...`)
  - **Keterangan Properti** (`description`, `<textarea rows={4}>`, optional) — with helper text: "Deskripsi singkat properti (fasilitas, target penghuni, lokasi)."
- `handleSave()`:
  ```ts
  await KostApiClient.updateProperty(property.id, {
    name, address, city, phone, description,
  });
  setProperty((prev) => ({ ...prev!, name, address, city, phone, description }));
  setIsSaved(true); setTimeout(() => setIsSaved(false), 2500);
  ```
  Wrap in try/catch and `alert()` on error (matching existing screens).
- Show a success banner when `isSaved` (green, with `CheckCircle2`), matching `profile-view.tsx` / `payment-settings-view.tsx`.
- Header block with a `<Badge variant="lime">Owner</Badge>` (import `Badge` from `@/components/ui/badge`) and subtitle: "Identitas properti ini tampil sebagai judul ERP, lokasi header, dan template WhatsApp penagihan."

## Part 7 — Wiring into `src/app/page.tsx`

1. Import the new view:
   ```ts
   import { PropertySettingsView } from "@/components/property/property-settings-view";
   ```
2. Add a render branch (next to the other tab branches):
   ```tsx
   {activeTab === "property-settings" && (
     <PropertySettingsView currentRole={currentRole} />
   )}
   ```

## Part 8 — Permissions (`src/lib/permissions.ts`)

1. Add `"property-settings"` to the `ALL_PERMISSIONS` array.
2. In `getPermissionsForRole`, make it **owner-only** — add it to the `owner` case (which returns `[...ALL_PERMISSIONS]`, so it's already included), and add `"property-settings"` to the `admin` exclusion list alongside `"owner-audit", "staff-management", "billing-settings"`:

   ```ts
   case "admin":
     return ALL_PERMISSIONS.filter(
       (perm) => !["owner-audit", "staff-management", "billing-settings", "property-settings"].includes(perm)
     );
   ```

## Part 9 — Sidebar (`src/components/layout/sidebar.tsx`)

Add a nav item to `allNavItems` (the `Building2` icon is already imported). Place it right before the `"profile"` item:

```ts
{
  id: "property-settings",
  label: "Pengaturan Properti",
  icon: Building2,
},
```

## Part 10 — Mobile nav (`src/components/layout/mobile-nav.tsx`)

Add the same entry to `allMobileItems` so mobile owners can reach it too (use `Building2` — you may need to add it to the `lucide-react` import list):

```ts
{ id: "property-settings", label: "Properti", icon: Building2 },
```

(Place it before `{ id: "profile", ... }`.)

## Part 11 — Header refresh (`src/components/layout/header.tsx`)

The header fetches `propertyName` / `propertyAddress` once on mount. Change the `useEffect` dependency so it re-fetches whenever the user switches tabs (which covers "owner edits then navigates away"):

```ts
useEffect(() => {
  KostApiClient.getProperties()
    .then((props) => {
      if (props.length > 0) {
        setPropertyName(props[0].name);
        if (props[0].address) {
          setPropertyAddress(props[0].address.split(",")[0] || "Depok");
        }
      }
    })
    .catch(() => {});
}, [activeTab]);   // <-- was [], now re-fetches on tab change
```

---

## Verification checklist

1. `npm run dev` (or `npm run build`) compiles with no TypeScript errors.
2. Apply migration `010_property_settings.sql` to Supabase (or confirm the column exists).
3. Login as **owner** → sidebar shows "Pengaturan Properti"; admin/staff do NOT see it.
4. Open the screen → prefilled with the seeded property (name "Kost Putri Graha Asri", address, etc.).
5. Edit name to "Kost Test A" and description, save → success banner appears.
6. Navigate to any other tab → the header `<h1>` now shows "Kost Test A" and the location pill reflects the new address.
7. Reload the page → changes persist (confirm the `properties` row in Supabase has the new `description` and `name`).
8. Owner-only guard: logging in as `admin` and manually visiting the tab shows the access-denied message.

## Files touched (summary)

- `supabase/migrations/010_property_settings.sql` (new)
- `src/components/property/property-settings-view.tsx` (new)
- `src/types/index.ts`
- `src/types/database.types.ts`
- `src/lib/mock-data.ts`
- `src/lib/storage.ts`
- `src/lib/api-client.ts`
- `backend/src/services/supabase-service.ts`
- `src/app/page.tsx`
- `src/lib/permissions.ts`
- `src/components/layout/sidebar.tsx`
- `src/components/layout/mobile-nav.tsx`
- `src/components/layout/header.tsx`
