import { Router, Request, Response } from "express";
import { SupabaseService } from "../services/supabase-service";

const router = Router();

async function hasInvoicePropertyAccess(req: Request, propertyId: string) {
  if (!req.auth) return false;
  if (req.auth.role === "owner") return SupabaseService.ownerCanAccessProperty(req.auth.userId, propertyId);
  return req.auth.propertyId === propertyId;
}

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
    const requestedPropertyId = typeof req.query.property_id === "string" ? req.query.property_id : "";
    const userId = req.auth?.userId;
    if (requestedPropertyId) {
      if (!await hasInvoicePropertyAccess(req, requestedPropertyId)) return res.status(403).json({ success: false, error: "Properti tidak dapat diakses akun ini." });
      const data = await SupabaseService.getInvoices(requestedPropertyId);
      return res.json({ success: true, data });
    }
    if (req.auth?.role === "owner" && userId) {
      const properties = await SupabaseService.getOwnerProperties(userId);
      const grouped = await Promise.all(properties.map(property => SupabaseService.getInvoices(property.id)));
      return res.json({ success: true, data: grouped.flat() });
    }
    const propertyId = req.auth?.propertyId || (await SupabaseService.getDefaultPropertyId());
    if (!await hasInvoicePropertyAccess(req, propertyId)) return res.status(403).json({ success: false, error: "Properti tidak dapat diakses akun ini." });
    const data = await SupabaseService.getInvoices(propertyId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/invoices
router.post("/", async (req: Request, res: Response) => {
  try {
    const requestedPropertyId = typeof req.body.property_id === "string" ? req.body.property_id : "";
    const propertyId = requestedPropertyId || req.auth?.propertyId || (await SupabaseService.getDefaultPropertyId());
    if (!await hasInvoicePropertyAccess(req, propertyId)) return res.status(403).json({ success: false, error: "Properti tidak dapat diakses akun ini." });
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
    const propertyId = await SupabaseService.getInvoicePropertyId(id);
    if (!propertyId) return res.status(404).json({ success: false, error: "Invoice tidak ditemukan." });
    if (!await hasInvoicePropertyAccess(req, propertyId)) return res.status(403).json({ success: false, error: "Invoice berada di luar properti yang dapat diakses akun ini." });
    // Keep invoices attached to their original property; transfers would need
    // matching lease, room, wallet, and ledger updates in one transaction.
    const data = await SupabaseService.updateInvoice(id, { ...req.body, property_id: propertyId });
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE /api/invoices/:id
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const propertyId = await SupabaseService.getInvoicePropertyId(id);
    if (!propertyId) return res.status(404).json({ success: false, error: "Invoice tidak ditemukan." });
    if (!await hasInvoicePropertyAccess(req, propertyId)) return res.status(403).json({ success: false, error: "Invoice berada di luar properti yang dapat diakses akun ini." });
    const data = await SupabaseService.deleteInvoice(id);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
