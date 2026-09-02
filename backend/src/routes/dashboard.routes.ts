import { Router, Request, Response } from "express";
import { SupabaseService } from "../services/supabase-service";

const router = Router();

// GET /api/dashboard/summary
router.get("/summary", async (req: Request, res: Response) => {
  try {
    const role = req.auth?.role;
    if (role === "cleaning_staff") {
      return res.status(403).json({
        success: false,
        error: "Forbidden: Cleaning staff tidak memiliki hak akses ke metrik dashboard keuangan.",
      });
    }

    const propertyId = req.auth?.propertyId || (await SupabaseService.getDefaultPropertyId());
    const data = await SupabaseService.getDashboardSummary(propertyId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
