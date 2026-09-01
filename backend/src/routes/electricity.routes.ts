import { Router, Request, Response } from "express";
import { SupabaseService } from "../services/supabase-service";

const router = Router();

// GET /api/electricity
router.get("/", async (req: Request, res: Response) => {
  try {
    const propertyId = req.query.property_id as string | undefined;
    const data = await SupabaseService.getElectricityTransactions(propertyId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/electricity
router.post("/", async (req: Request, res: Response) => {
  try {
    const data = await SupabaseService.createElectricityTransaction(req.body);
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT /api/electricity/:id
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = await SupabaseService.updateElectricityTransaction(id, req.body);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
