"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  KeyRound,
  Shield,
  Phone,
  Mail,
  Clock,
  Eye,
  EyeOff,
  Copy,
  Check,
  Trash2,
  Edit2,
  Send,
  Sparkles,
  Lock,
  Search,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sliders,
  PlusCircle,
  LayoutDashboard,
  DoorClosed,
  Receipt,
  Zap,
  FileSpreadsheet,
  CreditCard,
  Layers,
  Settings2,
} from "lucide-react";
import { KostApiClient } from "@/lib/api-client";
import { StaffAccount, UserRole, RolePermissionConfig } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { notify } from "@/lib/notify";

interface StaffManagementViewProps {
  currentRole: UserRole;
  onNavigateTab?: (tab: string) => void;
}

const AVAILABLE_PERMISSIONS = [
  {
    id: "owner-dashboard",
    name: "Dashboard & Analitik Finansial",
    desc: "Akses grafik arus kas, ringkasan okupansi, dan metrik revenue",
    icon: LayoutDashboard,
  },
  {
    id: "ai-assistant",
    name: "Kost Concierge AI Assistant",
    desc: "Akses chatbot cerdas operasional & prompt otomatisasi",
    icon: Sparkles,
  },
  {
    id: "rooms",
    name: "Manajemen Kamar & Inventaris",
    desc: "Cek kamar kosong, ubah status unit, dan inventaris fasilitas",
    icon: DoorClosed,
  },
  {
    id: "tenants",
    name: "Penghuni & Dokumen KTP",
    desc: "Data penyewa, masa sewa aktif, dan pratinjau KTP",
    icon: Users,
  },
  {
    id: "electricity",
    name: "Token Listrik PLN & Kalkulator",
    desc: "Input kode 20 digit token dan kalkulasi margin laba bersih",
    icon: Zap,
  },
  {
    id: "billing",
    name: "Penagihan Sewa & Invoice WA",
    desc: "Terbitkan tagihan sewa bulanan dan verifikasi bukti transfer",
    icon: Receipt,
  },
  {
    id: "owner-audit",
    name: "Laporan Arus Kas & Ekspor Excel",
    desc: "Audit mutasi finansial dan unduh rekapan file spreadsheet .XLSX",
    icon: FileSpreadsheet,
  },
  {
    id: "billing-settings",
    name: "Pengaturan Rekening Bank",
    desc: "Kelola daftar nomor rekening pembayaran sewa & QRIS",
    icon: CreditCard,
  },
  {
    id: "staff-management",
    name: "Manajemen Karyawan & Role",
    desc: "Buat ID/password staf dan atur izin fitur custom role",
    icon: KeyRound,
  },
];

export function StaffManagementView({
  currentRole,
  onNavigateTab,
}: StaffManagementViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<"staff" | "roles">("staff");
  const [staffList, setStaffList] = useState<StaffAccount[]>([]);
  const [rolesList, setRolesList] = useState<RolePermissionConfig[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Staff modal state
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);

  // Staff Form inputs
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("admin");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [shift, setShift] = useState("Full-Time (08:00 - 17:00)");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Role modal state
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);

  // Role Form inputs
  const [roleName, setRoleName] = useState("");
  const [roleDesc, setRoleDesc] = useState("");
  const [roleColor, setRoleColor] = useState<"lime" | "info" | "warning" | "destructive" | "success" | "secondary">("info");
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [isSavingRole, setIsSavingRole] = useState(false);

  // UI helpers
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [formShowPassword, setFormShowPassword] = useState(false);

  // Credential Reveal Modal State (after create)
  const [isCredentialModalOpen, setIsCredentialModalOpen] = useState(false);
  const [createdCredential, setCreatedCredential] = useState<{
    id: string;
    login_id: string;
    full_name: string;
    role: string;
    email?: string | null;
    phone_number?: string | null;
    password: string;
  } | null>(null);

  // Reset Password Modal State
  const [isResetResultModalOpen, setIsResetResultModalOpen] = useState(false);
  const [resetResult, setResetResult] = useState<{
    staffName: string;
    loginId: string;
    phone?: string;
    password: string;
  } | null>(null);

  const loadData = async () => {
    try {
      const [list, roles] = await Promise.all([
        KostApiClient.getStaff(),
        KostApiClient.getRoles(),
      ]);

      if (roles && Array.isArray(roles) && roles.length > 0) {
        setRolesList(roles);
      }

      const mapped: StaffAccount[] = (list || []).map((u) => ({
        id: u.id,
        property_id: u.property_id || "",
        full_name: u.full_name,
        username: u.login_id || u.username || u.full_name.toLowerCase().replace(/\s+/g, "."),
        password: "••••••••",
        role: u.custom_role_id || u.role,
        custom_role_id: u.custom_role_id,
        phone_number: u.phone_number || "-",
        email: u.email || undefined,
        login_id: u.login_id,
        is_active: u.is_active ?? true,
        created_at: u.created_at || new Date().toISOString(),
      }));
      setStaffList(mapped);
    } catch (err) {
      console.error("Gagal memuat data staff & role:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Access restriction: strictly owner
  if (currentRole !== "owner") {
    return (
      <div className="rounded-3xl bg-white p-12 text-center shadow-spatial dark:bg-[#18181B] max-w-lg mx-auto mt-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
          <Shield className="h-8 w-8" />
        </div>
        <h3 className="mt-4 text-xl font-black text-neutral-900 dark:text-white">
          Akses Khusus Owner
        </h3>
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
          Menu pembuatan ID karyawan dan konfigurasi custom role hanya dapat dikelola oleh pemilik properti (*Super Owner*).
        </p>
        <Button
          onClick={() => onNavigateTab && onNavigateTab("owner-dashboard")}
          variant="default"
          className="mt-6 font-bold text-xs"
        >
          Kembali ke Dashboard
        </Button>
      </div>
    );
  }

  // --- STAFF HANDLERS ---
  const handleOpenAddStaffModal = () => {
    setEditingStaffId(null);
    setFullName("");
    setUsername("");
    setPassword("");
    setSelectedRole(rolesList[0]?.id || "admin");
    setPhoneNumber("+628");
    setEmail("");
    setShift("Full-Time (08:00 - 17:00)");
    setNotes("");
    setIsActive(true);
    setFormShowPassword(true);
    setIsStaffModalOpen(true);
  };

  const handleOpenEditStaffModal = (staff: StaffAccount) => {
    setEditingStaffId(staff.id);
    setFullName(staff.full_name);
    setUsername(staff.username);
    setPassword(staff.password || "");
    setSelectedRole(staff.role);
    setPhoneNumber(staff.phone_number);
    setEmail(staff.email || "");
    setShift(staff.shift || "Full-Time (08:00 - 17:00)");
    setNotes(staff.notes || "");
    setIsActive(staff.is_active);
    setFormShowPassword(false);
    setIsStaffModalOpen(true);
  };

  const handleGeneratePassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyz23456789!@#$";
    let gen = "";
    for (let i = 0; i < 8; i++) {
      gen += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(gen);
  };

  const handleFullNameChange = (name: string) => {
    setFullName(name);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      notify.warning("Data Belum Lengkap", "Mohon isi Nama Lengkap karyawan.");
      return;
    }

    if (editingStaffId) {
      try {
        await KostApiClient.updateStaff(editingStaffId, {
          full_name: fullName.trim(),
          role: selectedRole,
          phone_number: phoneNumber.trim() || undefined,
          email: email.trim() || undefined,
          is_active: isActive,
        });
        notify.success("Akun Diperbarui", `Data staf "${fullName}" berhasil disimpan.`);
        setIsStaffModalOpen(false);
        await loadData();
      } catch (err: any) {
        notify.alert({ title: "Gagal Menyimpan Akun", message: err.message, variant: "danger" });
      }
    } else {
      try {
        const created = await KostApiClient.createStaff({
          full_name: fullName.trim(),
          role: selectedRole,
          email: email.trim() || undefined,
          phone_number: phoneNumber.trim() || undefined,
          login_id: username.trim() || undefined,
          password: password.trim() || undefined,
        });

        setIsStaffModalOpen(false);
        await loadData();

        setCreatedCredential(created);
        setIsCredentialModalOpen(true);
        notify.success("Akun Berhasil Dibuat", `Staf "${created.full_name}" berhasil didaftarkan dengan ID: ${created.login_id}`);
      } catch (err: any) {
        notify.alert({ title: "Gagal Membuat Akun Staf", message: err.message, variant: "danger" });
      }
    }
  };

  const handleResetPassword = async (staff: StaffAccount) => {
    const ok = await notify.confirm({
      title: `Reset Password Karyawan?`,
      message: `Password akun untuk "${staff.full_name}" (ID: ${staff.login_id || staff.username}) akan digenerate ulang. Password lama tidak akan dapat digunakan lagi.`,
      variant: "warning",
      confirmText: "Reset Password",
      cancelText: "Batal",
    });

    if (ok) {
      try {
        const res = await KostApiClient.resetStaffPassword(staff.id);
        setResetResult({
          staffName: staff.full_name,
          loginId: staff.login_id || staff.username,
          phone: staff.phone_number,
          password: res.password,
        });
        setIsResetResultModalOpen(true);
      } catch (err: any) {
        notify.alert({ title: "Gagal Mereset Password", message: err.message, variant: "danger" });
      }
    }
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    const staff = staffList.find((s) => s.id === id);
    const ok = await notify.confirm({
      title: `Nonaktifkan Akun Karyawan?`,
      message: `Akun staf "${name}" akan dinonaktifkan sehingga tidak dapat mengakses sistem.`,
      variant: "warning",
      confirmText: "Nonaktifkan Akun",
      cancelText: "Batalkan",
    });
    if (ok) {
      try {
        await KostApiClient.updateStaff(id, { is_active: false });
        await loadData();
        notify.info("Akun Dinonaktifkan", `Akun ${name} telah dinonaktifkan.`);
      } catch (err: any) {
        notify.alert({ title: "Gagal Mengubah Status", message: err.message, variant: "danger" });
      }
    }
  };

  const handleToggleActive = async (staff: StaffAccount) => {
    try {
      await KostApiClient.updateStaff(staff.id, { is_active: !staff.is_active });
      await loadData();
      notify.info(
        "Status Akun Diubah",
        `Akun ${staff.full_name} kini ${!staff.is_active ? "Aktif" : "Dinonaktifkan"}.`
      );
    } catch (err: any) {
      notify.alert({ title: "Gagal Mengubah Status", message: err.message, variant: "danger" });
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyCredential = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    notify.info("Tersalin", `${key.toUpperCase()} berhasil disalin ke clipboard.`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSendWhatsAppCredentials = (staff: StaffAccount) => {
    const roleObj = rolesList.find((r) => r.id === staff.role);
    const roleTitle = roleObj ? roleObj.name : staff.role;
    const loginIdentifier = staff.login_id || staff.username;
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

    const message = `Halo Kak *${staff.full_name}*,

Berikut adalah informasi akun login staf di sistem ERP Kost:

🔑 *INFORMASI LOGIN ERP KOST:*
• *Role Akses:* ${roleTitle}
• *ID Login:* \`${loginIdentifier}\`
• *Link Akses:* ${origin}

*Petunjuk Masuk:*
Masukkan ID Login di atas pada kolom "Email atau ID" di halaman login. Silakan hubungi Owner jika membutuhkan reset password. Terima kasih! 🙏`;

    const cleanPhone = staff.phone_number.replace(/\D/g, "");
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  // --- ROLE HANDLERS ---
  const handleOpenAddRoleModal = () => {
    setEditingRoleId(null);
    setRoleName("");
    setRoleDesc("");
    setRoleColor("info");
    setRolePermissions(["rooms", "profile"]);
    setIsRoleModalOpen(true);
  };

  const handleOpenEditRoleModal = (roleItem: RolePermissionConfig) => {
    setEditingRoleId(roleItem.id);
    setRoleName(roleItem.name);
    setRoleDesc(roleItem.description);
    setRoleColor((roleItem.badge_color as any) || "info");
    setRolePermissions(roleItem.permissions || []);
    setIsRoleModalOpen(true);
  };

  const handleTogglePermission = (permId: string) => {
    setRolePermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      notify.warning("Nama Role Diperlukan", "Nama role jabatan wajib diisi.");
      return;
    }

    setIsSavingRole(true);
    try {
      if (editingRoleId) {
        await KostApiClient.updateRole(editingRoleId, {
          name: roleName.trim(),
          description: roleDesc,
          badge_color: roleColor,
          permissions: rolePermissions,
        });
        notify.success("Role Diperbarui", `Konfigurasi izin role "${roleName}" berhasil disimpan ke database.`);
      } else {
        await KostApiClient.createRole({
          name: roleName.trim(),
          description: roleDesc,
          badge_color: roleColor,
          permissions: rolePermissions,
        });
        notify.success("Role Ditambahkan", `Custom role "${roleName}" berhasil dibuat dan disimpan ke database.`);
      }
      await loadData();
      setIsRoleModalOpen(false);
    } catch (err: any) {
      notify.alert({
        title: "Gagal Menyimpan Role",
        message: err.message || "Terjadi kesalahan saat menyimpan role ke database.",
        variant: "danger",
      });
    } finally {
      setIsSavingRole(false);
    }
  };

  const handleDeleteRole = async (roleItem: RolePermissionConfig) => {
    if (roleItem.is_system) {
      notify.alert({
        title: "Role Sistem Terkunci",
        message: "Role bawaan sistem tidak dapat dihapus.",
        variant: "warning",
      });
      return;
    }
    const ok = await notify.confirmDelete({
      title: `Hapus Custom Role "${roleItem.name}"?`,
      itemName: roleItem.name,
      itemType: "Custom Role Akses",
      itemDetails: `${roleItem.permissions?.length || 0} Hak Akses Menu Aktif`,
      message: "Staf yang menggunakan role ini mungkin akan kehilangan hak akses ke beberapa menu aplikasi.",
      warningNote: "Pastikan untuk memindahkan staf ke role lain sebelum menghapus role ini.",
      confirmText: "Hapus Role",
      cancelText: "Batalkan",
    });
    if (ok) {
      try {
        await KostApiClient.deleteRole(roleItem.id);
        await loadData();
        notify.deleted(roleItem.name, "Custom Role");
      } catch (err: any) {
        notify.alert({
          title: "Gagal Menghapus Role",
          message: err.message || "Terjadi kesalahan saat menghapus role dari database.",
          variant: "danger",
        });
      }
    }
  };

  const filteredStaff = staffList.filter((s) => {
    const matchesSearch =
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone_number.includes(searchQuery);
    const matchesRole = roleFilter === "all" || s.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalStaff = staffList.length;
  const totalRoles = rolesList.length;

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
              Manajemen Karyawan & Custom Role
            </h2>
            <Badge variant="lime">Super Owner</Badge>
          </div>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
            Buat ID login karyawan, definisikan custom role baru, dan konfigurasi izin fitur secara presisi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeSubTab === "staff" ? (
            <Button
              onClick={handleOpenAddStaffModal}
              variant="lime"
              className="gap-2 font-black text-xs shadow-lime-glow shrink-0"
            >
              <UserPlus className="h-4 w-4" />
              <span>+ Buat ID Karyawan Baru</span>
            </Button>
          ) : (
            <Button
              onClick={handleOpenAddRoleModal}
              variant="lime"
              className="gap-2 font-black text-xs shadow-lime-glow shrink-0"
            >
              <PlusCircle className="h-4 w-4" />
              <span>+ Buat Custom Role Baru</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Tab Capsule Switcher */}
      <div className="flex items-center gap-2 border-b border-neutral-200/80 dark:border-white/10 pb-4">
        <button
          onClick={() => setActiveSubTab("staff")}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-black transition-all ${
            activeSubTab === "staff"
              ? "bg-[#0A0A0A] text-white shadow-spatial dark:bg-white dark:text-[#0A0A0A]"
              : "bg-white text-neutral-600 hover:bg-neutral-100 dark:bg-[#18181B] dark:text-neutral-300"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Daftar Karyawan & Kredensial ({totalStaff})</span>
        </button>

        <button
          onClick={() => setActiveSubTab("roles")}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-black transition-all ${
            activeSubTab === "roles"
              ? "bg-[#0A0A0A] text-white shadow-spatial dark:bg-white dark:text-[#0A0A0A]"
              : "bg-white text-neutral-600 hover:bg-neutral-100 dark:bg-[#18181B] dark:text-neutral-300"
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>Kelola Custom Role & Izin Fitur ({totalRoles})</span>
        </button>
      </div>

      {/* ================= TAB 1: STAFF MANAGEMENT ================= */}
      {activeSubTab === "staff" && (
        <div className="space-y-5">
          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-3xl bg-white p-4 shadow-spatial border border-white/80 dark:bg-[#18181B] dark:border-white/10">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Cari nama, username, atau no HP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 py-2.5 pl-10 pr-4 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A0A0A] dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
              />
            </div>

            {/* Role Filter Pills */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto w-full sm:w-auto">
              <button
                onClick={() => setRoleFilter("all")}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  roleFilter === "all"
                    ? "bg-[#0A0A0A] text-white dark:bg-white dark:text-[#0A0A0A]"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
                }`}
              >
                Semua
              </button>
              {rolesList.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRoleFilter(r.id)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap ${
                    roleFilter === r.id
                      ? "bg-[#0A0A0A] text-white dark:bg-white dark:text-[#0A0A0A]"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
                  }`}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>

          {/* Staff Accounts Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredStaff.map((staff) => {
              const isShowPass = showPasswords[staff.id];
              const roleInfo = rolesList.find((r) => r.id === staff.role);

              return (
                <div
                  key={staff.id}
                  className={`rounded-3xl p-5 shadow-spatial border transition-all flex flex-col justify-between ${
                    staff.is_active
                      ? "bg-white border-white/80 dark:bg-[#18181B] dark:border-white/10"
                      : "bg-neutral-50/80 border-neutral-200 opacity-75 dark:bg-neutral-900/60 dark:border-neutral-800"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0A0A0A] text-[#D9FF43] text-base font-black shadow-xs dark:bg-white dark:text-[#0A0A0A]">
                          {staff.full_name
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-black text-neutral-900 dark:text-white">
                              {staff.full_name}
                            </h3>
                            <Badge variant={(roleInfo?.badge_color as any) || "info"}>
                              {roleInfo?.name || staff.role}
                            </Badge>
                          </div>
                          <p className="text-[11px] font-semibold text-neutral-400 mt-0.5">
                            Shift: {staff.shift || "Full-Time"}
                          </p>
                        </div>
                      </div>

                      {/* Active Toggle Switch */}
                      <button
                        onClick={() => handleToggleActive(staff)}
                        title={staff.is_active ? "Klik untuk Nonaktifkan Akun" : "Klik untuk Aktifkan Akun"}
                        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black transition-all ${
                          staff.is_active
                            ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 dark:text-emerald-300"
                            : "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            staff.is_active ? "bg-emerald-500 animate-pulse" : "bg-neutral-400"
                          }`}
                        />
                        <span>{staff.is_active ? "Aktif" : "Nonaktif"}</span>
                      </button>
                    </div>

                    {/* Credentials Bento Box (ID & Password) */}
                    <div className="mt-4 rounded-2xl bg-neutral-50 p-3.5 border border-neutral-100 dark:bg-neutral-800/70 dark:border-white/5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-neutral-500 dark:text-neutral-400">
                          ID Login Staff:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <code className="rounded-lg bg-neutral-200/80 px-2 py-0.5 font-mono text-[11px] font-black text-neutral-900 dark:bg-neutral-700 dark:text-white">
                            {staff.login_id || staff.username}
                          </code>
                          <button
                            onClick={() => handleCopyCredential(staff.login_id || staff.username, `user-${staff.id}`)}
                            className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                            title="Salin ID Login"
                          >
                            {copiedKey === `user-${staff.id}` ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {staff.email && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-neutral-500 dark:text-neutral-400">
                            Email Kontak:
                          </span>
                          <span className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
                            {staff.email}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Additional Info */}
                    <div className="mt-3 space-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                        <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                          {staff.phone_number}
                        </span>
                      </div>
                      {staff.notes && (
                        <p className="text-[11px] italic text-neutral-400 pl-5">
                          "{staff.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-white/5 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="lime"
                        onClick={() => handleSendWhatsAppCredentials(staff)}
                        className="h-8 gap-1.5 text-[11px] font-black shadow-lime-glow"
                      >
                        <Send className="h-3 w-3" />
                        <span>Kirim WA</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResetPassword(staff)}
                        className="h-8 gap-1 text-[11px] font-bold"
                        title="Reset Password Karyawan"
                      >
                        <KeyRound className="h-3 w-3 text-amber-500" />
                        <span>Reset Sandi</span>
                      </Button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditStaffModal(staff)}
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
                        title="Edit Data Karyawan"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteStaff(staff.id, staff.full_name)}
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400"
                        title="Hapus Akun Karyawan"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredStaff.length === 0 && (
              <div className="col-span-full rounded-3xl bg-white p-8 text-center shadow-spatial dark:bg-[#18181B]">
                <p className="text-xs font-bold text-neutral-500">
                  Tidak ada data karyawan yang cocok dengan pencarian Anda.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 2: CUSTOM ROLE & PERMISSIONS ================= */}
      {activeSubTab === "roles" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rolesList.map((roleItem) => {
              const staffCount = staffList.filter((s) => s.role === roleItem.id).length;

              return (
                <div
                  key={roleItem.id}
                  className="rounded-3xl bg-white p-6 shadow-spatial border border-white/80 dark:bg-[#18181B] dark:border-white/10 flex flex-col justify-between"
                >
                  <div>
                    {/* Role Header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black text-neutral-900 dark:text-white">
                            {roleItem.name}
                          </h3>
                          <Badge variant={(roleItem.badge_color as any) || "info"}>
                            {roleItem.is_system ? "System Default" : "Custom Role"}
                          </Badge>
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                          {roleItem.description}
                        </p>
                      </div>

                      <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-3 py-1 text-[11px] font-bold text-neutral-600 dark:text-neutral-300 shrink-0">
                        {staffCount} Karyawan
                      </span>
                    </div>

                    {/* Granted Permissions List */}
                    <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-white/5">
                      <h4 className="text-[11px] font-black uppercase tracking-wider text-neutral-400 mb-2.5 flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5" />
                        <span>Izin Fitur yang Diberikan ({roleItem.permissions.length}):</span>
                      </h4>

                      <div className="flex flex-wrap gap-1.5">
                        {AVAILABLE_PERMISSIONS.map((perm) => {
                          const isAllowed = roleItem.permissions.includes(perm.id);
                          return (
                            <span
                              key={perm.id}
                              className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[10px] font-bold transition-all ${
                                isAllowed
                                  ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 dark:text-emerald-300"
                                  : "bg-neutral-100 text-neutral-400 opacity-40 dark:bg-neutral-800 dark:text-neutral-500"
                              }`}
                            >
                              {isAllowed ? (
                                <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                              ) : (
                                <XCircle className="h-3 w-3 text-neutral-400 shrink-0" />
                              )}
                              <span>{perm.name}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Role Actions Footer */}
                  <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-white/5 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-neutral-400">
                      ID Role: <code className="font-mono">{roleItem.id}</code>
                    </span>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEditRoleModal(roleItem)}
                        className="gap-1 text-xs font-bold"
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                        <span>Konfigurasi Izin ⚙️</span>
                      </Button>

                      {!roleItem.is_system && (
                        <button
                          onClick={() => handleDeleteRole(roleItem)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400"
                          title="Hapus Custom Role"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= MODAL: CREATE / EDIT STAFF ACCOUNT ================= */}
      <Modal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        title={editingStaffId ? "Edit Data Karyawan" : "Buat Akun Staf Baru (Login via ID)"}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveStaff} className="space-y-4">
          {!editingStaffId && (
            <div className="rounded-2xl bg-amber-50/80 border border-amber-200/80 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:border-amber-900/50 dark:text-amber-200">
              <p className="font-bold flex items-center gap-1.5 mb-1">
                <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Format Login Staf: Menggunakan ID Numerik</span>
              </p>
              <p className="text-[11px] leading-relaxed">
                Staf akan masuk dengan <strong>ID Numerik</strong> (misal: 1300000). Email asli tetap disimpan untuk data kontak/arsip. Password akan ditampilkan sekali setelah akun dibuat.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nama Lengkap */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                Nama Lengkap Karyawan *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Siti Aminah"
                value={fullName}
                onChange={(e) => handleFullNameChange(e.target.value)}
                className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-semibold text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A0A0A] dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
              />
            </div>

            {/* Role / Jabatan */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                Pilih Role Akses *
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-semibold text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A0A0A] dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
              >
                {rolesList.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.permissions.length} Modul)
                  </option>
                ))}
              </select>
            </div>

            {/* Nomor WhatsApp */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                Nomor WhatsApp
              </label>
              <input
                type="tel"
                placeholder="+6281234567890"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-semibold text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A0A0A] dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
              />
            </div>

            {/* Email Kontak Asli */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                Email Kontak Asli (Opsional)
              </label>
              <input
                type="email"
                placeholder="siti.aminah@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-semibold text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A0A0A] dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
              />
            </div>

            {/* Shift Kerja */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                Jadwal Shift Kerja
              </label>
              <input
                type="text"
                placeholder="Contoh: Full-Time (08:00 - 17:00)"
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-semibold text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A0A0A] dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
              />
            </div>

            {!editingStaffId && (
              <>
                {/* ID Login Kustom (Opsional) */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                    ID Login Staf (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Kosongkan untuk otomatis (1300000)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.trim())}
                    className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-mono font-bold text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A0A0A] dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">
                    *Kosongkan untuk ID otomatis berurutan dari sistem.
                  </p>
                </div>

                {/* Password Login (Opsional) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                      Password Akun (Opsional)
                    </label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="flex items-center gap-1 text-[11px] font-bold text-[#0A0A0A] hover:underline dark:text-[#D9FF43]"
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span>Generate Acak</span>
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type={formShowPassword ? "text" : "password"}
                      placeholder="Kosongkan untuk acak 10 char"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 pr-10 text-xs font-mono font-bold text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A0A0A] dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setFormShowPassword(!formShowPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                    >
                      {formShowPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1">
                    *Kosongkan bila ingin password digenerate otomatis.
                  </p>
                </div>
              </>
            )}

            {/* Catatan Penugasan */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                Catatan Penugasan
              </label>
              <input
                type="text"
                placeholder="Contoh: Penanggung jawab kamar lantai 1"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-semibold text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A0A0A] dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsStaffModalOpen(false)}
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
              <CheckCircle2 className="h-4 w-4" />
              <span>{editingStaffId ? "Simpan Perubahan" : "Buat Akun Staf"}</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL: CREATE / EDIT ROLE & PERMISSIONS ================= */}
      <Modal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        title={editingRoleId ? "Konfigurasi Izin Fitur Custom Role" : "Buat Custom Role Baru"}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveRole} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nama Role */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                Nama Role *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Supervisor Keuangan"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-semibold text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A0A0A] dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
              />
            </div>

            {/* Warna Badge */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                Warna Badge Identitas
              </label>
              <select
                value={roleColor}
                onChange={(e) => setRoleColor(e.target.value as any)}
                className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-semibold text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A0A0A] dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
              >
                <option value="lime">Lime (Owner / Highlight)</option>
                <option value="info">Blue (Admin / Management)</option>
                <option value="warning">Amber (Staff / Support)</option>
                <option value="success">Emerald (Verified / Finance)</option>
                <option value="secondary">Slate (Teknisi / General)</option>
              </select>
            </div>

            {/* Deskripsi Role */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                Deskripsi Tanggung Jawab Role
              </label>
              <input
                type="text"
                placeholder="Contoh: Bertanggung jawab atas verifikasi pembayaran sewa dan audit token"
                value={roleDesc}
                onChange={(e) => setRoleDesc(e.target.value)}
                className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-semibold text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A0A0A] dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
              />
            </div>
          </div>

          {/* Granular Permission Checklist */}
          <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <h4 className="text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-white mb-1 flex items-center gap-1.5">
              <KeyRound className="h-4 w-4 text-[#D9FF43]" />
              <span>Pilih Hak Akses & Izin Fitur (Permissions):</span>
            </h4>
            <p className="text-[11px] text-neutral-500 mb-3">
              Fitur yang dicentang akan dapat dilihat dan diakses oleh pengguna dengan role ini.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto p-1">
              {AVAILABLE_PERMISSIONS.map((perm) => {
                const Icon = perm.icon;
                const isChecked = rolePermissions.includes(perm.id);

                return (
                  <label
                    key={perm.id}
                    onClick={() => handleTogglePermission(perm.id)}
                    className={`flex items-start gap-3 rounded-2xl p-3 border transition-all cursor-pointer select-none ${
                      isChecked
                        ? "bg-emerald-500/10 border-emerald-500/30 text-neutral-900 dark:text-white"
                        : "bg-neutral-50 border-neutral-200 text-neutral-600 dark:bg-neutral-800/40 dark:border-neutral-700 dark:text-neutral-400 opacity-60"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="mt-0.5 h-4 w-4 rounded accent-[#0A0A0A] dark:accent-[#D9FF43]"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-xs font-bold leading-tight">{perm.name}</span>
                      </div>
                      <p className="text-[10px] text-neutral-500 mt-0.5 leading-tight">
                        {perm.desc}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isSavingRole}
              onClick={() => setIsRoleModalOpen(false)}
              className="text-xs font-bold"
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="lime"
              size="sm"
              disabled={isSavingRole}
              className="gap-1.5 font-black text-xs shadow-lime-glow disabled:opacity-50"
            >
              {isSavingRole ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Menyimpan ke Database...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Simpan Konfigurasi Role</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL: CREDENTIALS REVEAL (NEWLY CREATED STAFF) ================= */}
      <Modal
        isOpen={isCredentialModalOpen}
        onClose={() => setIsCredentialModalOpen(false)}
        title="Akun Staf Berhasil Dibuat"
        maxWidth="md"
      >
        {createdCredential && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-900/50 dark:text-emerald-200">
              <p className="font-bold flex items-center gap-1.5 mb-1 text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Simpan Kredensial Ini Sekarang!</span>
              </p>
              <p className="text-[11px] leading-relaxed">
                Password akun ini hanya ditampilkan <strong>sekali ini saja</strong>. Salin atau kirimkan kredensial ke WhatsApp staf sebelum menutup jendela ini.
              </p>
            </div>

            <div className="rounded-2xl bg-neutral-50 p-4 border border-neutral-200 space-y-3 dark:bg-neutral-800/60 dark:border-neutral-700">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500 font-semibold">Nama Staf:</span>
                <span className="font-bold text-neutral-900 dark:text-white">{createdCredential.full_name}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500 font-semibold">Role Akses:</span>
                <Badge variant="info">{createdCredential.role}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-neutral-200/60 dark:border-neutral-700">
                <span className="text-neutral-500 font-semibold">ID Login:</span>
                <div className="flex items-center gap-1.5">
                  <code className="rounded-lg bg-neutral-200 px-2.5 py-1 font-mono text-sm font-black text-neutral-900 dark:bg-neutral-700 dark:text-white">
                    {createdCredential.login_id}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopyCredential(createdCredential.login_id, "cred-id")}
                    className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                    title="Salin ID Login"
                  >
                    {copiedKey === "cred-id" ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500 font-semibold">Password:</span>
                <div className="flex items-center gap-1.5">
                  <code className="rounded-lg bg-lime-100 text-lime-900 border border-lime-300 px-2.5 py-1 font-mono text-sm font-black dark:bg-lime-950/60 dark:text-lime-300 dark:border-lime-800">
                    {createdCredential.password}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopyCredential(createdCredential.password, "cred-pass")}
                    className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                    title="Salin Password"
                  >
                    {copiedKey === "cred-pass" ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              {createdCredential.email && (
                <div className="flex items-center justify-between text-xs pt-2 border-t border-neutral-200/60 dark:border-neutral-700">
                  <span className="text-neutral-500 font-semibold">Email Kontak:</span>
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">{createdCredential.email}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              {createdCredential.phone_number ? (
                <Button
                  type="button"
                  variant="lime"
                  size="sm"
                  className="w-full sm:w-auto gap-1.5 font-black text-xs shadow-lime-glow"
                  onClick={() => {
                    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
                    const message = `Halo Kak *${createdCredential.full_name}*,

Akun staf Anda untuk sistem ERP Kost telah dibuat:

🔑 *KREDENSIAL LOGIN:*
• *Role Akses:* ${createdCredential.role}
• *ID Login:* \`${createdCredential.login_id}\`
• *Password:* \`${createdCredential.password}\`
• *Link Akses:* ${origin}

*Petunjuk:* Masuk ke sistem menggunakan ID Login di atas pada kolom "Email atau ID". Terima kasih! 🙏`;
                    const cleanPhone = createdCredential.phone_number!.replace(/\D/g, "");
                    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
                    window.open(url, "_blank");
                  }}
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Kirim ke WhatsApp</span>
                </Button>
              ) : <div />}

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs font-bold"
                  onClick={() => {
                    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
                    const fullText = `Akun Staf ERP Kost:\nNama: ${createdCredential.full_name}\nRole: ${createdCredential.role}\nID Login: ${createdCredential.login_id}\nPassword: ${createdCredential.password}\nLink: ${origin}`;
                    handleCopyCredential(fullText, "cred-all");
                  }}
                >
                  {copiedKey === "cred-all" ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>Salin Kredensial</span>
                </Button>

                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="text-xs font-bold"
                  onClick={() => setIsCredentialModalOpen(false)}
                >
                  Selesai
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ================= MODAL: RESET PASSWORD RESULT ================= */}
      <Modal
        isOpen={isResetResultModalOpen}
        onClose={() => setIsResetResultModalOpen(false)}
        title="Password Baru Karyawan"
        maxWidth="md"
      >
        {resetResult && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900 dark:bg-amber-950/40 dark:border-amber-900/50 dark:text-amber-200">
              <p className="font-bold flex items-center gap-1.5 mb-1 text-amber-800 dark:text-amber-300">
                <KeyRound className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Password Berhasil Direset!</span>
              </p>
              <p className="text-[11px] leading-relaxed">
                Password baru telah aktif secara instan. Segera beritahukan password baru ini kepada staf yang bersangkutan.
              </p>
            </div>

            <div className="rounded-2xl bg-neutral-50 p-4 border border-neutral-200 space-y-3 dark:bg-neutral-800/60 dark:border-neutral-700">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500 font-semibold">Nama Staf:</span>
                <span className="font-bold text-neutral-900 dark:text-white">{resetResult.staffName}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500 font-semibold">ID Login:</span>
                <code className="rounded-lg bg-neutral-200 px-2.5 py-1 font-mono text-xs font-black text-neutral-900 dark:bg-neutral-700 dark:text-white">
                  {resetResult.loginId}
                </code>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-neutral-200/60 dark:border-neutral-700">
                <span className="text-neutral-500 font-semibold">Password Baru:</span>
                <div className="flex items-center gap-1.5">
                  <code className="rounded-lg bg-lime-100 text-lime-900 border border-lime-300 px-2.5 py-1 font-mono text-sm font-black dark:bg-lime-950/60 dark:text-lime-300 dark:border-lime-800">
                    {resetResult.password}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopyCredential(resetResult.password, "reset-pass")}
                    className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                    title="Salin Password Baru"
                  >
                    {copiedKey === "reset-pass" ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              {resetResult.phone && (
                <Button
                  type="button"
                  variant="lime"
                  size="sm"
                  className="w-full sm:w-auto gap-1.5 font-black text-xs shadow-lime-glow"
                  onClick={() => {
                    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
                    const message = `Halo Kak *${resetResult.staffName}*,

Password akun ERP Kost Anda telah direset oleh Owner:

🔑 *INFORMASI LOGIN BARU:*
• *ID Login:* \`${resetResult.loginId}\`
• *Password Baru:* \`${resetResult.password}\`
• *Link Akses:* ${origin}

Silakan masuk menggunakan kredensial baru ini. Terima kasih! 🙏`;
                    const cleanPhone = resetResult.phone!.replace(/\D/g, "");
                    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
                    window.open(url, "_blank");
                  }}
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Kirim ke WhatsApp</span>
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full sm:w-auto text-xs font-bold"
                onClick={() => setIsResetResultModalOpen(false)}
              >
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
