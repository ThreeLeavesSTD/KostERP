import { Router, Request, Response } from "express";
import { SupabaseService } from "../services/supabase-service";

const router = Router();

// GET /api/electricity
router.get("/", async (req: Request, res: Response) => {
  try {
    const role = req.auth?.role;
    const propertyId = req.auth?.propertyId || (await SupabaseService.getDefaultPropertyId());
    const data = await SupabaseService.getElectricityTransactions(propertyId);

    // Sembunyikan margin profit dan harga beli jika role cleaning_staff
    if (role === "cleaning_staff") {
      const sanitized = (data || []).map((e: any) => {
        const { cost_price, profit_margin, ...rest } = e;
        return rest;
      });
      return res.json({ success: true, data: sanitized });
    }

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/electricity
router.post("/", async (req: Request, res: Response) => {
  try {
    const role = req.auth?.role;
    if (role === "cleaning_staff") {
      return res.status(403).json({
        success: false,
        error: "Forbidden: Cleaning staff tidak memiliki hak mencatat transaksi token listrik.",
      });
    }
    const propertyId = req.auth?.propertyId || (await SupabaseService.getDefaultPropertyId());
    const data = await SupabaseService.createElectricityTransaction({
      ...req.body,
      property_id: propertyId,
    });
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT /api/electricity/:id
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const role = req.auth?.role;
    if (role === "cleaning_staff") {
      return res.status(403).json({
        success: false,
        error: "Forbidden: Cleaning staff tidak memiliki hak mengubah data transaksi listrik.",
      });
    }
    const id = req.params.id as string;
    const data = await SupabaseService.updateElectricityTransaction(id, req.body);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
