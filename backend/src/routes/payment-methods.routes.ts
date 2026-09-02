import { Router, Request, Response } from "express";
import { SupabaseService } from "../services/supabase-service";

const router = Router();

// GET /api/payment-methods
router.get("/", async (req: Request, res: Response) => {
  try {
    const propertyId = req.auth?.propertyId || (await SupabaseService.getDefaultPropertyId());
    const data = await SupabaseService.getPaymentMethods(propertyId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/payment-methods
router.post("/", async (req: Request, res: Response) => {
  try {
    const role = req.auth?.role;
    if (role === "cleaning_staff") {
      return res.status(403).json({ success: false, error: "Forbidden: Cleaning staff tidak memiliki hak modifikasi metode pembayaran." });
    }
    const propertyId = req.auth?.propertyId || (await SupabaseService.getDefaultPropertyId());
    const data = await SupabaseService.createPaymentMethod({
      ...req.body,
      property_id: propertyId,
    });
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT /api/payment-methods/:id
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const role = req.auth?.role;
    if (role === "cleaning_staff") {
      return res.status(403).json({ success: false, error: "Forbidden: Cleaning staff tidak memiliki hak modifikasi metode pembayaran." });
    }
    const id = req.params.id as string;
    const data = await SupabaseService.updatePaymentMethod(id, req.body);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE /api/payment-methods/:id
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const role = req.auth?.role;
    if (role === "cleaning_staff") {
      return res.status(403).json({ success: false, error: "Forbidden: Cleaning staff tidak memiliki hak modifikasi metode pembayaran." });
    }
    const id = req.params.id as string;
    const data = await SupabaseService.deletePaymentMethod(id);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
