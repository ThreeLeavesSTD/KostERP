import { Router, Request, Response } from "express";
import { SupabaseService } from "../services/supabase-service";

const router = Router();

// GET /api/properties
router.get("/", async (req: Request, res: Response) => {
  try {
    const data = await SupabaseService.getProperties();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/properties/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = await SupabaseService.getPropertyById(id);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
});

// POST /api/properties
router.post("/", async (req: Request, res: Response) => {
  try {
    const data = await SupabaseService.createProperty(req.body);
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT /api/properties/:id
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = await SupabaseService.updateProperty(id, req.body);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
