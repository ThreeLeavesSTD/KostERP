import { Router, Request, Response } from "express";
import { SupabaseService } from "../services/supabase-service";

const router = Router();

// POST /api/payments
router.post("/", async (req: Request, res: Response) => {
  try {
    const role = req.auth?.role;
    if (role === "cleaning_staff") {
      return res.status(403).json({
        success: false,
        error: "Forbidden: Cleaning staff tidak memiliki hak akses untuk memverifikasi pembayaran.",
      });
    }

    const data = await SupabaseService.recordPayment(req.body);
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
