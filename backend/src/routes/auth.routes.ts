import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { supabaseAdmin } from "../config/supabase";

const router = Router();

/**
 * GET /api/auth/me
 * Mengembalikan data profil user yang sedang login
 */
router.get("/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const auth = req.auth!;
    const user = req.user!;

    const { data: profile, error } = await supabaseAdmin
      .from("user_profiles")
      .select("id, full_name, role, custom_role_id, property_id, phone_number, is_active, login_id, email")
      .eq("id", auth.userId)
      .single();

    if (error || !profile) {
      return res.status(404).json({
        success: false,
        error: "Profil pengguna tidak ditemukan",
      });
    }

    const roleKey = profile.custom_role_id || profile.role;
    let permissions: string[] = [];
    let roleDetails: any = null;

    if (roleKey) {
      const { data: roleData } = await supabaseAdmin
        .from("custom_roles")
        .select("*")
        .eq("id", roleKey)
        .maybeSingle();

      if (roleData) {
        permissions = roleData.permissions || [];
        roleDetails = roleData;
      }
    }

    res.json({
      success: true,
      data: {
        id: profile.id,
        full_name: profile.full_name,
        role: profile.role,
        custom_role_id: profile.custom_role_id || profile.role,
        permissions,
        role_name: roleDetails?.name || profile.role,
        property_id: profile.property_id,
        login_id: profile.login_id || null,
        email: profile.email || user.email || null,
        phone_number: profile.phone_number || user.phone || null,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || "Gagal mengambil data profil",
    });
  }
});

export default router;
