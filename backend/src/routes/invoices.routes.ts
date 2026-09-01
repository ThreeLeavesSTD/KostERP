import { Router, Request, Response } from "express";
import { SupabaseService } from "../services/supabase-service";

const router = Router();

// GET /api/invoices
router.get("/", async (req: Request, res: Response) => {
  try {
    const propertyId = req.query.property_id as string | undefined;
    const data = await SupabaseService.getInvoices(propertyId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/invoices
router.post("/", async (req: Request, res: Response) => {
  try {
    const data = await SupabaseService.createInvoice(req.body);
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

export default router;
