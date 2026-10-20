import { Router, Request, Response } from "express";
import { SupabaseService } from "../services/supabase-service";

const router = Router();

async function hasPropertyAccess(req: Request, propertyId: string) {
  if (!req.auth?.userId) return false;
  if (req.auth.role === "owner") {
    return SupabaseService.ownerCanAccessProperty(req.auth.userId, propertyId);
  }
  return req.auth.propertyId === propertyId;
}

// GET /api/properties
router.get("/", async (req: Request, res: Response) => {
  try {
    const role = req.auth?.role;
    const propertyId = req.auth?.propertyId;

    if (role === "owner" && req.auth?.userId) {
      const data = await SupabaseService.getOwnerProperties(req.auth.userId);
      return res.json({ success: true, data });
    }

    if (!propertyId) return res.status(403).json({ success: false, error: "Akun ini belum ditautkan ke properti." });
    const propId = propertyId;
    const single = await SupabaseService.getPropertyById(propId);
    res.json({ success: true, data: single ? [single] : [] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/properties/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!await hasPropertyAccess(req, id)) return res.status(403).json({ success: false, error: "Properti tidak dapat diakses akun ini." });
    const data = await SupabaseService.getPropertyById(id);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
});

// POST /api/properties
router.post("/", async (req: Request, res: Response) => {
  try {
    const role = req.auth?.role;
    if (role !== "owner") {
      return res.status(403).json({ success: false, error: "Forbidden: Hanya Owner yang berhak menambah properti baru." });
    }
    const payload = {
      name: String(req.body?.name || "").trim(),
      address: String(req.body?.address || "").trim(),
      city: typeof req.body?.city === "string" ? req.body.city : undefined,
      phone: typeof req.body?.phone === "string" ? req.body.phone : undefined,
      description: typeof req.body?.description === "string" ? req.body.description : undefined,
    };
    if (!payload.name || !payload.address) return res.status(400).json({ success: false, error: "Nama dan alamat properti wajib diisi." });
    const data = await SupabaseService.createPropertyForOwner(payload, req.auth?.userId || "");
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT /api/properties/:id
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const role = req.auth?.role;
    if (!req.auth?.userId || !["owner", "admin"].includes(role || "")) {
      return res.status(403).json({ success: false, error: "Akun ini tidak memiliki hak edit properti." });
    }
    const id = req.params.id as string;
    if (!await hasPropertyAccess(req, id)) return res.status(403).json({ success: false, error: "Properti tidak dapat diakses akun ini." });
    const payload: Partial<{ name: string; address: string; city: string; phone: string; description: string; cover_image: string }> = {};
    for (const field of ["name", "address", "city", "phone", "description", "cover_image"] as const) {
      if (typeof req.body?.[field] === "string") payload[field] = req.body[field].trim();
    }
    if (!Object.keys(payload).length) return res.status(400).json({ success: false, error: "Tidak ada perubahan properti yang valid." });
    const data = await SupabaseService.updateProperty(id, payload);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE /api/properties/:id
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const role = req.auth?.role;
    if (role !== "owner") {
      return res.status(403).json({ success: false, error: "Forbidden: Hanya Owner yang berhak menghapus properti." });
    }
    const id = req.params.id as string;
    if (!await hasPropertyAccess(req, id)) return res.status(403).json({ success: false, error: "Properti tidak dapat diakses akun ini." });
    const data = await SupabaseService.deleteProperty(id);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
