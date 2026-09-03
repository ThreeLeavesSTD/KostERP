import { Router, Request, Response } from "express";
import { SupabaseService } from "../services/supabase-service";
import { supabaseAdmin, STAFF_EMAIL_DOMAIN } from "../config/supabase";

const router = Router();

function generateRandomPassword(length = 10): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let res = "";
  for (let i = 0; i < length; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

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

// POST /api/staff (Owner only: buat akun staff baru dengan login ID numerik)
router.post("/", async (req: Request, res: Response) => {
  try {
    const requesterRole = req.auth?.role;
    if (requesterRole !== "owner") {
      return res.status(403).json({
        success: false,
        error: "Forbidden: Hanya Owner yang berhak membuat akun staf baru.",
      });
    }

    const { full_name, role, email, phone_number, login_id: customLoginId, password: customPassword } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ success: false, error: "Nama lengkap staf wajib diisi." });
    }

    const isSystemRole = role && ["admin", "cleaning_staff", "owner"].includes(role);
    const staffRole = isSystemRole ? role : "admin";
    const customRoleId = role || "admin";
    const loginId = customLoginId?.trim() || (await SupabaseService.generateNextLoginId());
    const password = customPassword?.trim() || generateRandomPassword(10);
    const syntheticEmail = `${loginId}@${STAFF_EMAIL_DOMAIN}`.toLowerCase();
    const contactEmail = email?.trim() || "";

    // Buat akun di Supabase Auth via Admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: syntheticEmail,
      password,
      email_confirm: true, // Lewati verifikasi email untuk email sintetik
      user_metadata: {
        full_name: full_name.trim(),
        role: staffRole,
        login_id: loginId,
        email: contactEmail,
      },
    });

    if (authError || !authData.user) {
      return res.status(400).json({
        success: false,
        error: authError?.message || "Gagal membuat akun staf di auth server.",
      });
    }

    const userId = authData.user.id;

    // Pastikan custom_role_id, nomor telepon dan email kontak di user_profiles terupdate
    await supabaseAdmin
      .from("user_profiles")
      .update({
        custom_role_id: customRoleId,
        ...(phone_number && { phone_number: phone_number.trim() }),
        ...(contactEmail && { email: contactEmail }),
      })
      .eq("id", userId);

    res.status(201).json({
      success: true,
      data: {
        id: userId,
        login_id: loginId,
        full_name: full_name.trim(),
        role: customRoleId,
        custom_role_id: customRoleId,
        email: contactEmail || null,
        phone_number: phone_number?.trim() || null,
        password, // Password dikembalikan hanya sekali ini saat pembuatan
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/staff/:id/reset-password (Owner only: reset password akun staff)
router.post("/:id/reset-password", async (req: Request, res: Response) => {
  try {
    const requesterRole = req.auth?.role;
    if (requesterRole !== "owner") {
      return res.status(403).json({
        success: false,
        error: "Forbidden: Hanya Owner yang berhak mereset password staf.",
      });
    }

    const id = req.params.id as string;
    const { password: customPassword } = req.body;
    const newPassword = customPassword?.trim() || generateRandomPassword(10);

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(id, {
      password: newPassword,
    });

    if (updateError) {
      return res.status(400).json({
        success: false,
        error: updateError.message || "Gagal mereset password staf.",
      });
    }

    res.json({
      success: true,
      data: {
        password: newPassword,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/staff/:id (Owner only: update role, is_active, full_name, phone_number, email)
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const role = req.auth?.role;
    if (role !== "owner") {
      return res.status(403).json({
        success: false,
        error: "Forbidden: Hanya Owner yang berhak memperbarui data staf.",
      });
    }

    const id = req.params.id as string;
    const { role: newRole, is_active, full_name, phone_number, email } = req.body;

    let rolePayload: { role?: string; custom_role_id?: string } = {};
    if (newRole !== undefined) {
      const isSystem = ["admin", "cleaning_staff", "owner"].includes(newRole);
      rolePayload = {
        role: isSystem ? newRole : "admin",
        custom_role_id: newRole,
      };
    }

    const data = await SupabaseService.updateStaff(id, {
      ...rolePayload,
      ...(is_active !== undefined && { is_active }),
      ...(full_name !== undefined && { full_name }),
      ...(phone_number !== undefined && { phone_number }),
      ...(email !== undefined && { email }),
    });

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
