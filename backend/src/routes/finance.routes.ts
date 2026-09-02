import { Router, Request, Response } from "express";
import { SupabaseService } from "../services/supabase-service";

const router = Router();

// Middleware proteksi cleaning_staff
router.use((req: Request, res: Response, next) => {
  if (req.auth?.role === "cleaning_staff") {
    return res.status(403).json({
      success: false,
      error: "Forbidden: Cleaning staff tidak memiliki hak akses ke data finansial kost.",
    });
  }
  next();
});

// =================== WALLETS ===================

// GET /api/finance/wallets
router.get("/wallets", async (req: Request, res: Response) => {
  try {
    const propertyId = req.auth?.propertyId || (await SupabaseService.getDefaultPropertyId());
    const data = await SupabaseService.getWallets(propertyId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/finance/wallets
router.post("/wallets", async (req: Request, res: Response) => {
  try {
    const propertyId = req.auth?.propertyId || (await SupabaseService.getDefaultPropertyId());
    const data = await SupabaseService.createWallet({
      ...req.body,
      property_id: propertyId,
    });
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT /api/finance/wallets/:id
router.put("/wallets/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = await SupabaseService.updateWallet(id, req.body);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE /api/finance/wallets/:id
router.delete("/wallets/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = await SupabaseService.deleteWallet(id);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// =================== CATEGORIES ===================

// GET /api/finance/categories
router.get("/categories", async (req: Request, res: Response) => {
  try {
    const data = await SupabaseService.getFinanceCategories();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/finance/categories
router.post("/categories", async (req: Request, res: Response) => {
  try {
    const data = await SupabaseService.createFinanceCategory(req.body);
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT /api/finance/categories/:id
router.put("/categories/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = await SupabaseService.updateFinanceCategory(id, req.body);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE /api/finance/categories/:id
router.delete("/categories/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = await SupabaseService.deleteFinanceCategory(id);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// =================== TRANSACTIONS ===================

// GET /api/finance/transactions
router.get("/transactions", async (req: Request, res: Response) => {
  try {
    const propertyId = req.auth?.propertyId || (await SupabaseService.getDefaultPropertyId());
    const data = await SupabaseService.getCashTransactions(propertyId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/finance/transactions
router.post("/transactions", async (req: Request, res: Response) => {
  try {
    const propertyId = req.auth?.propertyId || (await SupabaseService.getDefaultPropertyId());
    const data = await SupabaseService.createCashTransaction({
      ...req.body,
      property_id: propertyId,
    });
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT /api/finance/transactions/:id
router.put("/transactions/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = await SupabaseService.updateCashTransaction(id, req.body);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE /api/finance/transactions/:id
router.delete("/transactions/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = await SupabaseService.deleteCashTransaction(id);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
