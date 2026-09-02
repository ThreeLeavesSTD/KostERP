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
import { UserRole, UserProfile } from "@/types";
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
  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form edit state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (authProfile) {
      setProfile(authProfile);
      setFullName(authProfile.full_name || "");
      setEmail(authProfile.email || user?.email || "");
      setPhone(authProfile.phone_number || "");
    }
  }, [authProfile, user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      await KostApiClient.updateStaff(profile.id, {
        full_name: fullName,
        phone_number: phone,
      });

      await refreshProfile();
      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(`Gagal memperbarui profil: ${err.message}`);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPasswordMessage({ type: "error", text: "Password baru minimal 6 karakter." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "Konfirmasi password baru tidak cocok." });
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

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

  if (!profile && !authProfile) return null;

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
                {profile.full_name
                  .split(" ")
                  .map((n: string) => n[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-[#0A0A0A] text-[#D9FF43] ring-4 ring-[#0A0A0A]">
                <Shield className="h-4 w-4" />
              </span>
            </div>

            <h3 className="text-lg font-black text-white">{profile.full_name}</h3>
            <p className="text-xs text-neutral-400 font-medium mt-0.5">@{profile.username}</p>

            <div className="mt-4 flex items-center gap-2">
              <span className="rounded-full bg-[#D9FF43] px-3 py-1 text-[11px] font-black text-[#0A0A0A]">
                {currentRole === "owner" ? "Super Owner" : currentRole === "admin" ? "Staff Admin" : "Staff Kebersihan"}
              </span>
              <span className="rounded-full bg-neutral-800 px-3 py-1 text-[11px] font-semibold text-neutral-300">
                Sesi Aktif
              </span>
            </div>

            <div className="w-full mt-6 pt-5 border-t border-neutral-800 space-y-3 text-left text-xs">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  <span>Properti:</span>
                </span>
                <span className="font-bold text-white">{profile.property_name}</span>
              </div>
              <div className="flex items-center justify-between text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  <span>Email:</span>
                </span>
                <span className="font-medium text-white">{profile.email}</span>
              </div>
              <div className="flex items-center justify-between text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  <span>WhatsApp:</span>
                </span>
                <span className="font-medium text-[#D9FF43]">{profile.phone_number}</span>
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
                  "billing-settings": "Pengaturan Rekening Bank",
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
                    Username Akun
                  </label>
                  <input
                    type="text"
                    disabled
                    value={profile.username}
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
                    required
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
                    required
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
                      if (authProfile) {
                        setFullName(authProfile.full_name || "");
                        setEmail(authProfile.email || user?.email || "");
                        setPhone(authProfile.phone_number || "");
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
                Pastikan Anda menggunakan password yang unik dan kuat untuk menjaga keamanan data kost.
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
                    required
                    className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-semibold text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A0A0A] dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                    Password Baru
                  </label>
                  <input
                    type="password"
                    placeholder="Minimal 6 karakter"
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
                  Password terenkripsi secara lokal di peramban Anda.
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
