import { Router, Request, Response } from "express";
import { SupabaseService } from "../services/supabase-service";

const router = Router();

// GET /api/complaints
router.get("/", async (req: Request, res: Response) => {
  try {
    const propertyId = req.query.property_id as string | undefined;
    const data = await SupabaseService.getComplaints(propertyId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/complaints
router.post("/", async (req: Request, res: Response) => {
  try {
    const data = await SupabaseService.createComplaint(req.body);
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT /api/complaints/:id
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = await SupabaseService.updateComplaint(id, req.body);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
