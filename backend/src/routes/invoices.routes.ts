import { Router, Request, Response } from "express";
import { SupabaseService } from "../services/supabase-service";

const router = Router();

// Middleware cek role cleaning_staff
router.use((req: Request, res: Response, next) => {
  if (req.auth?.role === "cleaning_staff") {
    return res.status(403).json({
      success: false,
      error: "Forbidden: Cleaning staff tidak memiliki hak akses ke data tagihan/invoices.",
    });
  }
  next();
});

// GET /api/invoices
router.get("/", async (req: Request, res: Response) => {
  try {
    const propertyId = req.auth?.propertyId || (await SupabaseService.getDefaultPropertyId());
    const data = await SupabaseService.getInvoices(propertyId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/invoices
router.post("/", async (req: Request, res: Response) => {
  try {
    const propertyId = req.auth?.propertyId || (await SupabaseService.getDefaultPropertyId());
    const data = await SupabaseService.createInvoice({
      ...req.body,
      property_id: propertyId,
    });
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT /api/invoices/:id
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = await SupabaseService.updateInvoice(id, req.body);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE /api/invoices/:id
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = await SupabaseService.deleteInvoice(id);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
