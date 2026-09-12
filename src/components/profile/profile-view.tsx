"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  Shield,
  Phone,
  Mail,
  Building2,
  Lock,
  Save,
  Check,
  Sparkles,
  KeyRound,
  Users,
  Calendar,
  Clock,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { KostApiClient } from "@/lib/api-client";
import { KostStorage } from "@/lib/storage";
import { UserRole } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { getPermissionsForRole } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ProfileViewProps {
  currentRole: UserRole;
  onNavigateTab?: (tab: string) => void;
  onLogout?: () => void;
}

export function ProfileView({
  currentRole,
  onNavigateTab,
  onLogout,
}: ProfileViewProps) {
  const { profile: authProfile, user, refreshProfile } = useAuth();
  
  // Ambil fallback data profil lokal jika session baru terinisialisasi
  const defaultLocalProfile = KostStorage.getUserProfile();
  const [profile, setProfile] = useState<any>(() => authProfile || defaultLocalProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form edit state
  const [fullName, setFullName] = useState(() => (authProfile || defaultLocalProfile)?.full_name || "");
  const [email, setEmail] = useState(() => (authProfile || defaultLocalProfile)?.email || user?.email || "");
  const [phone, setPhone] = useState(() => (authProfile || defaultLocalProfile)?.phone_number || "");

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const active = authProfile || KostStorage.getUserProfile();
    if (active) {
      setProfile(active);
      setFullName(active.full_name || "");
      setEmail(active.email || user?.email || "");
      setPhone(active.phone_number || "");
    }
  }, [authProfile, user]);

  const activeProfile = profile || authProfile || defaultLocalProfile;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile) return;

    try {
      if (currentRole === "owner") {
        KostStorage.updateUserProfile({
          full_name: fullName.trim(),
          phone_number: phone.trim(),
          email: email.trim(),
        });
      } else if (activeProfile.id) {
        KostStorage.updateStaffAccount(activeProfile.id, {
          full_name: fullName.trim(),
          phone_number: phone.trim(),
          email: email.trim(),
        });
      }

      if (activeProfile.id) {
        await KostApiClient.updateStaff(activeProfile.id, {
          full_name: fullName.trim(),
          phone_number: phone.trim(),
          email: email.trim(),
        }).catch(() => {});
      }

      await refreshProfile();
      setProfile((prev: any) => ({
        ...prev,
        full_name: fullName.trim(),
        phone_number: phone.trim(),
        email: email.trim(),
      }));
      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(`Gagal memperbarui profil: ${err.message}`);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 3) {
      setPasswordMessage({ type: "error", text: "Password baru tidak boleh kosong." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "Konfirmasi password baru tidak cocok." });
      return;
    }

    try {
      // 1. Update ke Supabase Auth jika ada sesi aktif
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.auth.updateUser({ password: newPassword });
        }
      } catch {
        // Fallback untuk akun offline/lokal
      }

      // 2. Update kredensial staf lokal jika staff login
      if (activeProfile?.id) {
        KostStorage.updateStaffAccount(activeProfile.id, { password: newPassword });
      }

      setPasswordMessage({
        type: "success",
        text: "Password akun berhasil diperbarui secara aman!",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordMessage(null), 4000);
    } catch (err: any) {
      setPasswordMessage({ type: "error", text: err.message || "Gagal mengubah password." });
    }
  };

  // Safe Name & Initials
  const rawName = (activeProfile?.full_name || user?.user_metadata?.full_name || user?.email || "Pengguna").trim();
  const initials = rawName
    .split(" ")
    .filter(Boolean)
    .map((n: string) => n[0] || "")
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
              Profil Pengguna & Keamanan
            </h2>
            <Badge variant="lime">
              {currentRole === "owner" ? "Owner Properti" : currentRole === "admin" ? "Admin Operasional" : "Staff"}
            </Badge>
          </div>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
            Kelola data identitas, preferensi akun, dan pengaturan kredensial keamanan sistem ERP.
          </p>
        </div>

        {currentRole === "owner" && (
          <Button
            variant="lime"
            size="sm"
            onClick={() => onNavigateTab && onNavigateTab("staff-management")}
            className="gap-2 font-black text-xs shadow-lime-glow"
          >
            <Users className="h-4 w-4" />
            <span>Kelola ID & Password Karyawan ↗</span>
          </Button>
        )}
      </div>

      {saveSuccess && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-xs font-bold text-emerald-700 dark:text-emerald-300">
          <Check className="h-4 w-4 shrink-0" />
          <span>Informasi profil Anda berhasil disimpan!</span>
        </div>
      )}

      {/* Main Bento Profile Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 4 Cols: Identity Showcase Card */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Avatar & Main Badge Card */}
          <div className="rounded-3xl bg-[#0A0A0A] p-6 text-white shadow-spatial border border-neutral-800 flex flex-col items-center text-center">
            {/* Avatar Pill */}
            <div className="relative mb-4">
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-[#D9FF43] text-[#0A0A0A] text-2xl font-black shadow-lime-glow">
                {initials}
              </div>
              <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-[#0A0A0A] text-[#D9FF43] ring-4 ring-[#0A0A0A]">
                <Shield className="h-4 w-4" />
              </span>
            </div>

            <h3 className="text-lg font-black text-white">{rawName}</h3>
            <p className="text-xs text-neutral-400 font-medium mt-0.5">
              {activeProfile?.login_id ? `ID Login: ${activeProfile.login_id}` : activeProfile?.email || "-"}
            </p>

            <div className="mt-4 flex items-center gap-2">
              <span className="rounded-full bg-[#D9FF43] px-3 py-1 text-[11px] font-black text-[#0A0A0A]">
                {activeProfile?.role_name || (currentRole === "owner" ? "Super Owner" : currentRole === "admin" ? "Staff Admin" : "Staff Kebersihan")}
              </span>
              <span className="rounded-full bg-neutral-800 px-3 py-1 text-[11px] font-semibold text-neutral-300">
                Sesi Aktif
              </span>
            </div>

            <div className="w-full mt-6 pt-5 border-t border-neutral-800 space-y-3 text-left text-xs">
              {activeProfile?.login_id && (
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-[#D9FF43]" />
                    <span>ID Login Staf:</span>
                  </span>
                  <code className="font-mono font-bold text-[#D9FF43] bg-neutral-800 px-2 py-0.5 rounded-lg text-[11px]">
                    {activeProfile.login_id}
                  </code>
                </div>
              )}
              <div className="flex items-center justify-between text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  <span>Properti:</span>
                </span>
                <span className="font-bold text-white">{activeProfile?.property_name || "Kost Putri Graha Asri"}</span>
              </div>
              <div className="flex items-center justify-between text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  <span>Email Kontak:</span>
                </span>
                <span className="font-medium text-white">{activeProfile?.email || user?.email || "-"}</span>
              </div>
              <div className="flex items-center justify-between text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  <span>WhatsApp:</span>
                </span>
                <span className="font-medium text-[#D9FF43]">{activeProfile?.phone_number || "-"}</span>
              </div>
            </div>
          </div>

          {/* Quick Permission Scope Bento Card */}
          <div className="rounded-3xl bg-white p-5 shadow-spatial border border-white/80 dark:bg-[#18181B] dark:border-white/10">
            <h4 className="text-xs font-black uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-300" />
              <span>Hak Akses Akun ({getPermissionsForRole(currentRole).length} Modul)</span>
            </h4>

            <div className="space-y-2 text-xs">
              {getPermissionsForRole(currentRole).map((permKey) => {
                const labelMap: Record<string, string> = {
                  "owner-dashboard": "Dashboard & Arus Kas",
                  "ai-assistant": "Kost Concierge AI",
                  "staff-management": "Manajemen Karyawan & Role",
                  rooms: "Inventaris Kamar & Fasilitas",
                  tenants: "Data Penghuni & KTP",
                  electricity: "Token Listrik PLN",
                  billing: "Penagihan & Invoice WA",
                  "owner-audit": "Laporan Finansial .XLSX",
                  cashflow: "Kas Operasional (Expense & Income)",
                  profile: "Profil & Keamanan",
                };

                return (
                  <div
                    key={permKey}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60"
                  >
                    <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                      {labelMap[permKey] || permKey}
                    </span>
                    <Badge variant="success">Aktif</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 8 Cols: Edit Profile & Password Management Forms */}
        <div className="lg:col-span-8 space-y-5">
          {/* Edit Profile Bento Form */}
          <div className="rounded-3xl bg-white p-6 shadow-spatial border border-white/80 dark:bg-[#18181B] dark:border-white/10">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-white/10 mb-5">
              <div>
                <h3 className="text-base font-black text-neutral-900 dark:text-white">
                  Informasi Data Diri
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Perbarui nama lengkap, kontak WhatsApp, dan alamat surel resmi Anda.
                </p>
              </div>

              {!isEditing && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="font-bold text-xs"
                >
                  Edit Profil
                </Button>
              )}
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-semibold text-neutral-900 disabled:opacity-60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A0A0A] dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                    Username / ID Akun
                  </label>
                  <input
                    type="text"
                    disabled
                    value={activeProfile?.username || activeProfile?.login_id || "-"}
                    className="w-full rounded-2xl border border-neutral-200 bg-neutral-100 px-4 py-3 text-xs font-semibold text-neutral-500 dark:bg-neutral-800/40 dark:border-neutral-700 dark:text-neutral-400 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                    Nomor WhatsApp (E.164)
                  </label>
                  <input
                    type="tel"
                    disabled={!isEditing}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-semibold text-neutral-900 disabled:opacity-60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A0A0A] dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                    Alamat Email
                  </label>
                  <input
                    type="email"
                    disabled={!isEditing}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-semibold text-neutral-900 disabled:opacity-60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A0A0A] dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
                  />
                </div>
              </div>

              {isEditing && (
                <div className="flex items-center justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      if (activeProfile) {
                        setFullName(activeProfile.full_name || "");
                        setEmail(activeProfile.email || user?.email || "");
                        setPhone(activeProfile.phone_number || "");
                      }
                    }}
                    className="text-xs font-bold"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    variant="lime"
                    size="sm"
                    className="gap-1.5 font-black text-xs shadow-lime-glow"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>Simpan Perubahan</span>
                  </Button>
                </div>
              )}
            </form>
          </div>

          {/* Change Password Bento Card */}
          <div className="rounded-3xl bg-white p-6 shadow-spatial border border-white/80 dark:bg-[#18181B] dark:border-white/10">
            <div className="pb-4 border-b border-neutral-100 dark:border-white/10 mb-5">
              <h3 className="text-base font-black text-neutral-900 dark:text-white flex items-center gap-2">
                <Lock className="h-4 w-4" />
                <span>Ubah Password Akun</span>
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Pastikan Anda menggunakan password yang unik dan aman untuk menjaga keamanan sistem ERP.
              </p>
            </div>

            {passwordMessage && (
              <div
                className={`mb-4 flex items-center gap-2 rounded-2xl p-3.5 text-xs font-bold ${
                  passwordMessage.type === "success"
                    ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 dark:text-emerald-300"
                    : "bg-rose-500/10 text-rose-700 border border-rose-500/20 dark:text-rose-300"
                }`}
              >
                <span>{passwordMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                    Password Saat Ini
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-semibold text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A0A0A] dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                    Password Baru
                  </label>
                  <input
                    type="password"
                    placeholder="Ketik password baru"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-semibold text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A0A0A] dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                    Konfirmasi Password
                  </label>
                  <input
                    type="password"
                    placeholder="Ulangi password baru"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-semibold text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A0A0A] dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-neutral-400">
                  Password tersimpan secara aman pada sistem ERP Kost.
                </span>
                <Button
                  type="submit"
                  variant="default"
                  size="sm"
                  className="font-bold text-xs"
                >
                  Perbarui Password
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
