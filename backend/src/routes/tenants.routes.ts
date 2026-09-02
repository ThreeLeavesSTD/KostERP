import { Router, Request, Response } from "express";
import { SupabaseService } from "../services/supabase-service";

const router = Router();

// GET /api/tenants
router.get("/", async (req: Request, res: Response) => {
  try {
    const role = req.auth?.role;
    const propertyId = req.auth?.propertyId || (await SupabaseService.getDefaultPropertyId());
    const data = await SupabaseService.getTenants(propertyId);

    // Sanitasi data privasi (NIK, URL KTP, kontak darurat) jika cleaning_staff
    if (role === "cleaning_staff") {
      const sanitized = (data || []).map((t: any) => ({
        id: t.id,
        property_id: t.property_id,
        full_name: t.full_name,
        phone_number: t.phone_number,
        room_number: t.room_number || "-",
        floor: t.floor || 1,
        status: t.status || "active",
      }));
      return res.json({ success: true, data: sanitized });
    }

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/tenants
router.post("/", async (req: Request, res: Response) => {
  try {
    const role = req.auth?.role;
    if (role === "cleaning_staff") {
      return res.status(403).json({ success: false, error: "Forbidden: Cleaning staff tidak memiliki hak menambah data penghuni." });
    }
    const propertyId = req.auth?.propertyId || (await SupabaseService.getDefaultPropertyId());
    const data = await SupabaseService.createTenant({
      ...req.body,
      property_id: propertyId,
    });
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT /api/tenants/:id
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const role = req.auth?.role;
    if (role === "cleaning_staff") {
      return res.status(403).json({ success: false, error: "Forbidden: Cleaning staff tidak memiliki hak mengubah data penghuni." });
    }
    const id = req.params.id as string;
    const data = await SupabaseService.updateTenant(id, req.body);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE /api/tenants/:id
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const role = req.auth?.role;
    if (role === "cleaning_staff") {
      return res.status(403).json({ success: false, error: "Forbidden: Cleaning staff tidak memiliki hak menghapus data penghuni." });
    }
    const id = req.params.id as string;
    const data = await SupabaseService.deleteTenant(id);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
