import { Router, Request, Response } from "express";
import { SupabaseService } from "../services/supabase-service";

const router = Router();

// GET /api/rooms
router.get("/", async (req: Request, res: Response) => {
  try {
    const propertyId = req.auth?.propertyId || (await SupabaseService.getDefaultPropertyId());
    const data = await SupabaseService.getRooms(propertyId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/rooms
router.post("/", async (req: Request, res: Response) => {
  try {
    const role = req.auth?.role;
    if (role === "cleaning_staff") {
      return res.status(403).json({ success: false, error: "Forbidden: Cleaning staff tidak memiliki hak menambah kamar." });
    }
    const propertyId = req.auth?.propertyId || (await SupabaseService.getDefaultPropertyId());
    const data = await SupabaseService.createRoom({
      ...req.body,
      property_id: propertyId,
    });
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT /api/rooms/:id
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const role = req.auth?.role;
    if (role === "cleaning_staff") {
      return res.status(403).json({ success: false, error: "Forbidden: Cleaning staff tidak memiliki hak mengubah data kamar." });
    }
    const id = req.params.id as string;
    const data = await SupabaseService.updateRoom(id, req.body);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE /api/rooms/:id
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const role = req.auth?.role;
    if (role === "cleaning_staff") {
      return res.status(403).json({ success: false, error: "Forbidden: Cleaning staff tidak memiliki hak menghapus kamar." });
    }
    const id = req.params.id as string;
    const data = await SupabaseService.deleteRoom(id);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
