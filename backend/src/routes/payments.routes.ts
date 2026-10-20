import { Router, Request, Response } from "express";
import { SupabaseService } from "../services/supabase-service";

const router = Router();

// POST /api/payments
router.post("/", async (req: Request, res: Response) => {
  try {
    const role = req.auth?.role;
    const userId = req.auth?.userId;
    if (!userId || !["owner", "admin"].includes(role || "")) {
      return res.status(403).json({ success: false, error: "Akun ini tidak memiliki hak untuk mencatat pembayaran invoice." });
    }

    const propertyId = await SupabaseService.getInvoicePropertyId(String(req.body.invoice_id || ""));
    if (!propertyId) return res.status(404).json({ success: false, error: "Invoice tidak ditemukan." });
    const canAccess = role === "owner"
      ? await SupabaseService.ownerCanAccessProperty(userId, propertyId)
      : req.auth?.propertyId === propertyId;
    if (!canAccess) return res.status(403).json({ success: false, error: "Invoice berada di luar properti yang dapat diakses akun ini." });

    const data = await SupabaseService.recordPayment({
      invoice_id: String(req.body.invoice_id || ""),
      amount_paid: Number(req.body.amount_paid),
      wallet_id: String(req.body.wallet_id || ""),
      proof_url: req.body.proof_url,
      verified_by: req.body.verified_by,
      notes: req.body.notes,
    });
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
