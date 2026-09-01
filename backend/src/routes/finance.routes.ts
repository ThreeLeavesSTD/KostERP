import { Router, Request, Response } from "express";
import { SupabaseService } from "../services/supabase-service";

const router = Router();

// GET /api/finance/wallets
router.get("/wallets", async (req: Request, res: Response) => {
  try {
    const propertyId = req.query.property_id as string | undefined;
    const data = await SupabaseService.getWallets(propertyId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/finance/wallets
router.post("/wallets", async (req: Request, res: Response) => {
  try {
    const data = await SupabaseService.createWallet(req.body);
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// GET /api/finance/transactions
router.get("/transactions", async (req: Request, res: Response) => {
  try {
    const propertyId = req.query.property_id as string | undefined;
    const data = await SupabaseService.getCashTransactions(propertyId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/finance/transactions
router.post("/transactions", async (req: Request, res: Response) => {
  try {
    const data = await SupabaseService.createCashTransaction(req.body);
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
