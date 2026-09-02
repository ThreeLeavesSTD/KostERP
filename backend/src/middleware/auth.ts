import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/supabase";
import { User } from "@supabase/supabase-js";

export interface AuthContext {
  userId: string;
  role: string;
  propertyId: string | null;
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
      user?: User;
    }
  }
}

/**
 * Middleware untuk memvalidasi JWT Bearer token Supabase dan memuat profil user
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Missing or invalid Authorization header",
      });
    }

    const token = authHeader.split(" ")[1]?.trim();
    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Empty token provided",
      });
    }

    // Validasi token via Supabase Auth Admin API
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !userData?.user) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Invalid or expired token",
      });
    }

    const user = userData.user;

    // Load profil user dari public.user_profiles
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("id, role, property_id, full_name, is_active")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: User profile not found in database",
      });
    }

    if (!profile.is_active) {
      return res.status(403).json({
        success: false,
        error: "Forbidden: Account is inactive or deactivated by Owner",
      });
    }

    // Lampirkan context auth ke object request
    req.auth = {
      userId: user.id,
      role: profile.role,
      propertyId: profile.property_id,
    };
    req.user = user;

    next();
  } catch (err: any) {
    console.error("requireAuth middleware error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error in authentication verification",
    });
  }
}
