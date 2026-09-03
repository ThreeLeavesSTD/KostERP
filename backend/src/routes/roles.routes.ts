import { Router, Request, Response } from "express";
import { SupabaseService } from "../services/supabase-service";

const router = Router();

// GET /api/roles (Mendapatkan daftar role dan izin fitur)
router.get("/", async (req: Request, res: Response) => {
  try {
    const propertyId = req.auth?.propertyId || (await SupabaseService.getDefaultPropertyId());
    const data = await SupabaseService.getRoles(propertyId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/roles (Owner only: Tambah custom role baru)
router.post("/", async (req: Request, res: Response) => {
  try {
    const role = req.auth?.role;
    if (role !== "owner") {
      return res.status(403).json({
        success: false,
        error: "Forbidden: Hanya Owner yang berhak membuat custom role baru.",
      });
    }

    const { id, name, description, badge_color, permissions } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: "Nama role wajib diisi." });
    }

    const propertyId = req.auth?.propertyId || (await SupabaseService.getDefaultPropertyId());
    const data = await SupabaseService.createRole({
      id,
      property_id: propertyId,
      name,
      description,
      badge_color,
      permissions: Array.isArray(permissions) ? permissions : [],
    });

    res.status(201).json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT /api/roles/:id (Owner only: Update konfigurasi role & izin fitur)
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const role = req.auth?.role;
    if (role !== "owner") {
      return res.status(403).json({
        success: false,
        error: "Forbidden: Hanya Owner yang berhak memperbarui izin dan konfigurasi role.",
      });
    }

    const id = req.params.id as string;
    const { name, description, badge_color, permissions } = req.body;

    const data = await SupabaseService.updateRole(id, {
      name,
      description,
      badge_color,
      permissions,
    });

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE /api/roles/:id (Owner only: Hapus custom role)
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const role = req.auth?.role;
    if (role !== "owner") {
      return res.status(403).json({
        success: false,
        error: "Forbidden: Hanya Owner yang berhak menghapus role.",
      });
    }

    const id = req.params.id as string;
    await SupabaseService.deleteRole(id);
    res.json({ success: true, message: "Custom role berhasil dihapus." });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
