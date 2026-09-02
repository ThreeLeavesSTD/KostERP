import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "https://uvdjgajjcmznwuhvgzjp.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const anonKey = process.env.SUPABASE_ANON_KEY || "";

if (!serviceRoleKey && !anonKey) {
  console.warn("⚠️ Warning: Supabase keys are missing in backend environment variables.");
}

// Client admin dengan Service Role Key (akses penuh bypass RLS, manajemen auth & webhooks)
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey || anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Alias default untuk kompatibilitas data access
export const supabase = supabaseAdmin;
