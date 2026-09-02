import { Router, Request, Response } from "express";
import { SupabaseService } from "../services/supabase-service";

const router = Router();

// GET /api/staff
router.get("/", async (req: Request, res: Response) => {
  try {
    const propertyId = req.auth?.propertyId || (await SupabaseService.getDefaultPropertyId());
    const data = await SupabaseService.getStaff(propertyId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/staff/:id
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const role = req.auth?.role;
    if (role !== "owner") {
      return res.status(403).json({
        success: false,
        error: "Forbidden: Hanya Owner yang berhak memperbarui role dan status keaktifan staf.",
      });
    }

    const id = req.params.id as string;
    const { role: newRole, is_active, full_name, phone_number } = req.body;

    const data = await SupabaseService.updateStaff(id, {
      ...(newRole !== undefined && { role: newRole }),
      ...(is_active !== undefined && { is_active }),
      ...(full_name !== undefined && { full_name }),
      ...(phone_number !== undefined && { phone_number }),
    });

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
