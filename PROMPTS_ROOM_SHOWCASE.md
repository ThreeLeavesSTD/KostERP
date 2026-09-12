# Task: Room Showcase — custom room type, public "keterangan kamar", photo gallery, and public read for the landing page

You are working in the `noud-agency/Kostan` repo (Next.js App Router frontend in `src/`, Express backend in `backend/`, Supabase/Postgres migrations in `supabase/migrations/`). Extend the **rooms** module so the owner/admin can fully customize how a room appears on the public landing page: free-form **room type**, a public **"keterangan kamar" (description)**, and a **photo gallery** per room. The landing page (a SEPARATE repo) reads this data straight from Supabase via the anon key, so any edit in the ERP auto-updates the landing page.

Follow the EXACT existing conventions — `src/components/rooms/room-modal.tsx` and `src/components/rooms/rooms-view.tsx` are your reference. Do not introduce new patterns.

## Goal

1. `room_type` becomes **free-form / customizable** (not a hardcoded `<select>`).
2. New public field `description` ("Keterangan Kamar") — distinct from the existing internal `notes` ("Catatan Kamar").
3. New field `photos TEXT[]` — owner uploads a photo gallery per room to Supabase Storage.
4. New field `cover_image TEXT` on `properties` (hero image for the landing page).
5. **Public read**: the `anon` role can `SELECT` from `properties` and `rooms` (so the landing page can read without a login).

## Architecture facts you MUST respect

- **Single-property multi-tenant shell**: 1 Supabase project = 1 client. Every table scoped by `property_id`.
- **Write path for rooms** goes through THREE layers, each with an explicit field allow-list you MUST update:
  1. `src/lib/storage.ts` — `KostStorage.addRoom` / `updateRoom` (spread-based, no change needed).
  2. `src/lib/supabase-service.ts` — `FrontendSupabaseService.createRoom` / `updateRoom` (explicit `insertObj`/`updateData` — MUST add fields).
  3. `backend/src/services/supabase-service.ts` — `SupabaseService.createRoom` / `updateRoom` (explicit — MUST add fields).
- **Read path for rooms** maps rows to a `Room` object in TWO places — `backend/src/services/supabase-service.ts` `getRooms` AND `src/lib/supabase-service.ts` `getRooms`. Both MUST pass through `description` and `photos`.
- **Auth**: JWT bearer; backend uses service-role Supabase client. RLS is defense-in-depth.
- **Supabase Storage**: the frontend already has a browser client (`createClient` from `@/lib/supabase/client`) used for auth. Room photos go through `supabase.storage`.
- Existing migrations are `001`–`008`; `009` = Leads (reserved), `010` = Property Settings (reserved). Your migration is **`011_room_showcase.sql`**.
- Seeded property UUID: `a0000000-0000-0000-0000-000000000001`.

---

## Part 1 — Migration `supabase/migrations/011_room_showcase.sql`

```sql
-- ==============================================================================
-- SCHEMA MIGRATION: 011_room_showcase.sql
-- Public room showcase: description, photo gallery, property cover, anon read
-- ==============================================================================

-- 1. Public room description (keterangan kamar) + photo gallery
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS photos TEXT[] NOT NULL DEFAULT '{}';

-- 2. Property cover image (hero for landing page)
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS cover_image TEXT;

-- 3. Public (anon) READ access for the landing page.
--    The 003 migration added a broad "Allow all for anon in dev" policy on every
--    table. In production the landing page must be READ-ONLY, so replace the
--    dev anon policy on these two tables with a SELECT-only policy.
DROP POLICY IF EXISTS "Allow all for anon in dev" ON public.properties;
DROP POLICY IF EXISTS "Allow all for anon in dev" ON public.rooms;

DROP POLICY IF EXISTS "properties_anon_select" ON public.properties;
CREATE POLICY "properties_anon_select" ON public.properties
    FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "rooms_anon_select" ON public.rooms;
CREATE POLICY "rooms_anon_select" ON public.rooms
    FOR SELECT TO anon USING (true);

-- 4. Storage bucket for room photos (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('room-photos', 'room-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage object policies: anyone can read, only authenticated can upload
DROP POLICY IF EXISTS "room_photos_public_read" ON storage.objects;
CREATE POLICY "room_photos_public_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'room-photos');

DROP POLICY IF EXISTS "room_photos_auth_insert" ON storage.objects;
CREATE POLICY "room_photos_auth_insert" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'room-photos');

DROP POLICY IF EXISTS "room_photos_auth_delete" ON storage.objects;
CREATE POLICY "room_photos_auth_delete" ON storage.objects
    FOR DELETE TO authenticated USING (bucket_id = 'room-photos');
```

## Part 2 — Type updates

### 2.1 `src/types/index.ts`

In `Room`, add two optional fields; in `Property`, add one:

```ts
export interface Room {
  // ... existing fields ...
  notes?: string;
  description?: string;   // <-- NEW: public "keterangan kamar"
  photos?: string[];     // <-- NEW: public photo URLs
  created_at: string;
}

export interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  phone?: string;
  description?: string;
  cover_image?: string;  // <-- NEW
  created_at: string;
}
```

### 2.2 `src/types/database.types.ts`

In the `rooms` block add `description: string | null` and `photos: string[] | null` to `Row`/`Insert`/`Update`. In the `properties` block add `cover_image: string | null` to all three.

### 2.3 `src/lib/mock-data.ts`

Add `description` and `photos: []` to a couple of `initialRooms` entries, and `cover_image: ""` to `initialProperties[0]`, so the types line up.

## Part 3 — Read path: pass `description` + `photos` through

### 3.1 `backend/src/services/supabase-service.ts` — `getRooms`

In the `.map()` (around line 82), add two lines to the returned object:

```ts
        notes: room.notes,
        description: room.description || null,   // <-- NEW
        photos: room.photos || [],               // <-- NEW
        created_at: room.created_at,
```

### 3.2 `src/lib/supabase-service.ts` — `FrontendSupabaseService.getRooms`

In the `.map()` (around line 70), add the same two lines to the returned object.

## Part 4 — Write path: allow-list `description` + `photos`

### 4.1 `backend/src/services/supabase-service.ts` — `createRoom` & `updateRoom`

In `createRoom`'s `insertObj` add:

```ts
      notes: payload.notes || null,
      description: payload.description || null,   // <-- NEW
      photos: payload.photos || [],               // <-- NEW
```

In `updateRoom`'s `updateData` add:

```ts
    if (payload.notes !== undefined) updateData.notes = payload.notes;
    if (payload.description !== undefined) updateData.description = payload.description;   // <-- NEW
    if (payload.photos !== undefined) updateData.photos = payload.photos;                  // <-- NEW
```

### 4.2 `src/lib/supabase-service.ts` — `FrontendSupabaseService.createRoom` & `updateRoom`

Mirror the exact same additions in the frontend `insertObj` (createRoom) and `updateData` (updateRoom).

## Part 5 — Room modal UI (`src/components/rooms/room-modal.tsx`)

### 5.1 Customizable room type

Replace the hardcoded `<select>` for "Tipe Kamar" with a free-text input + `<datalist>` (keeps suggestions but allows any custom type):

```tsx
<input
  type="text"
  list="room-type-suggestions"
  value={roomType}
  onChange={(e) => setRoomType(e.target.value)}
  className="...same styling as the existing select..."
/>
<datalist id="room-type-suggestions">
  <option value="Deluxe AC" />
  <option value="Standard AC" />
  <option value="Standard Non-AC" />
  <option value="VIP Balcony AC" />
  <option value="Kamar Mandi Dalam" />
  <option value="Kamar Mandi Luar" />
</datalist>
```

Add a `roomType` state (it already exists) and make sure `createRoom`/`updateRoom` submits `room_type: roomType`.

### 5.2 Public "Keterangan Kamar" (description)

Add a new `<textarea>` labeled **"Keterangan Kamar (tampil di landing page)"** bound to a new `description` state. Place it right above the existing "Catatan Kamar" (`notes`). Helper text: "Deskripsi publik untuk calon penghuni (fasilitas, keunggulan, luas kamar)."

- Add `const [description, setDescription] = useState("")`.
- Initialize it in the `useEffect` from `roomToEdit.description`.
- Include `description` in both `updateRoom` and `createRoom` payloads.

### 5.3 Photo gallery upload

Add a new `photos` state (`string[]`), initialized from `roomToEdit.photos || []`.

Photo upload section (render a grid of existing photos with a remove button, plus an "Add" file input):

```tsx
const supabase = createClient(); // import { createClient } from "@/lib/supabase/client"

const handleUploadPhotos = async (files: FileList | null) => {
  if (!files) return;
  const newUrls: string[] = [...photos];
  for (const file of Array.from(files)) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${roomNumber || "room"}/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from("room-photos").upload(path, file);
    if (error) { notify.alert({ title: "Upload foto gagal", message: error.message, variant: "danger" }); continue; }
    const { data } = supabase.storage.from("room-photos").getPublicUrl(path);
    newUrls.push(data.publicUrl);
  }
  setPhotos(newUrls);
};
```

- Render thumbnails (`<img src={url} />`) with a small ✕ remove button (`setPhotos(photos.filter(u => u !== url))`).
- File input: `<input type="file" accept="image/*" multiple onChange={(e) => handleUploadPhotos(e.target.files)} />`.
- Include `photos` in both `updateRoom` and `createRoom` payloads.

## Part 6 — Rooms view polish (`src/components/rooms/rooms-view.tsx`) — optional

If `room.photos?.length`, show the first photo as a small thumbnail at the top of the room card, and show the first ~120 chars of `room.description` under the price. (Keep it lightweight — this is just so the owner sees the landing data at a glance.)

## Part 7 — Property cover image (optional, depends on 010)

`properties.cover_image` is edited via the **Property Settings** screen (from `PROMPTS_PROPERTY_SETTINGS.md`). If that screen is already built, add a "Foto Sampul Properti" upload field there (same storage pattern, bucket `room-photos`). If not built yet, skip this part — the landing page will fall back to the first room photo.

---

## Verification checklist

1. `npm run build` compiles with no TypeScript errors.
2. Apply `011_room_showcase.sql`; confirm columns `rooms.description`, `rooms.photos`, `properties.cover_image` exist.
3. In the ERP, edit a room → "Tipe Kamar" is now free-text (can type a custom type).
4. Type a "Keterangan Kamar", upload 2 photos, save → success notification.
5. Reload → the room card shows the photo thumbnail + description snippet; re-opening the modal shows the same photos/description.
6. Direct Supabase check: `select description, photos from rooms;` returns the saved values.
7. Anon read test: using only the anon key (no login), `select * from rooms` and `select * from properties` succeed; an anon `insert`/`update` on `rooms` is rejected.

## Files touched (summary)

- `supabase/migrations/011_room_showcase.sql` (new)
- `src/types/index.ts`
- `src/types/database.types.ts`
- `src/lib/mock-data.ts`
- `src/lib/supabase-service.ts` (getRooms + createRoom + updateRoom)
- `backend/src/services/supabase-service.ts` (getRooms + createRoom + updateRoom)
- `src/components/rooms/room-modal.tsx`
- `src/components/rooms/rooms-view.tsx` (optional polish)
