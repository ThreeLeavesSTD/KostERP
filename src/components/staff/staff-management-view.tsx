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

  // UI helpers
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [formShowPassword, setFormShowPassword] = useState(false);

  const loadData = async () => {
    try {
      const list = await KostApiClient.getStaff();
      const mapped: StaffAccount[] = (list || []).map((u) => ({
        id: u.id,
        property_id: u.property_id || "",
        full_name: u.full_name,
        username: u.full_name.toLowerCase().replace(/\s+/g, "."),
        password: "••••••••",
        role: u.role,
        phone_number: u.phone_number || "-",
        is_active: u.is_active ?? true,
        created_at: u.created_at || new Date().toISOString(),
      }));
      setStaffList(mapped);
    } catch (err) {
      console.error("Gagal memuat staff:", err);
    }

    setRolesList([
      {
        id: "owner",
        name: "Owner",
        description: "Pemilik properti dengan akses penuh ke seluruh fitur dan finansial",
        badge_color: "lime",
        is_system: true,
        permissions: ["owner-dashboard", "ai-assistant", "rooms", "tenants", "electricity", "billing", "owner-audit", "billing-settings", "staff-management"],
      },
      {
        id: "admin",
        name: "Admin Pengelola",
        description: "Operasional kamar, data penghuni, penagihan invoice, dan catat transaksi kas",
        badge_color: "info",
        is_system: true,
        permissions: ["owner-dashboard", "ai-assistant", "rooms", "tenants", "electricity", "billing", "owner-audit", "billing-settings"],
      },
      {
        id: "cleaning_staff",
        name: "Cleaning & Maintenance Staff",
        description: "Monitoring status kebersihan kamar dan respon komplain fasilitas kamar",
        badge_color: "warning",
        is_system: true,
        permissions: ["rooms", "ai-assistant"],
      },
    ]);
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
    setPassword(staff.password);
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
    if (!editingStaffId && name.trim()) {
      const clean = name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 10);
      setUsername(clean ? `${selectedRole}_${clean}` : "");
    }
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim() || !password.trim()) {
      notify.warning("Data Belum Lengkap", "Mohon lengkapi Nama, Username, dan Password karyawan.");
      return;
    }

    if (editingStaffId) {
      try {
        await KostApiClient.updateStaff(editingStaffId, {
          full_name: fullName,
          role: selectedRole,
          phone_number: phoneNumber,
          is_active: isActive,
        });
        notify.success("Akun Diperbarui", `Akun karyawan "${fullName}" berhasil disimpan.`);
      } catch (err: any) {
        notify.alert({ title: "Gagal Menyimpan Akun", message: err.message, variant: "danger" });
      }
    } else {
      notify.info("Pendaftaran Akun Baru", "Staf baru dapat mendaftar langsung via form Sign Up di halaman login aplikasi.");
    }

    setIsStaffModalOpen(false);
    await loadData();
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

    const message = `Halo Kak *${staff.full_name}*,

Berikut adalah informasi akun kredensial login sistem ERP Kost Graha Asri:

🔑 *INFORMASI LOGIN ERP KOST:*
• *Role Akses:* ${roleTitle}
• *Username:* \`${staff.username}\`
• *Password:* \`${staff.password}\`
• *Link Akses:* http://localhost:3000

Mohon simpan username dan password ini dengan baik. Terima kasih! 🙏`;

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
    setRoleColor(roleItem.badge_color || "info");
    setRolePermissions(roleItem.permissions || []);
    setIsRoleModalOpen(true);
  };

  const handleTogglePermission = (permId: string) => {
    setRolePermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      notify.warning("Nama Role Diperlukan", "Nama role jabatan wajib diisi.");
      return;
    }

    if (editingRoleId) {
      setRolesList((prev) =>
        prev.map((r) =>
          r.id === editingRoleId
            ? { ...r, name: roleName, description: roleDesc, badge_color: roleColor, permissions: rolePermissions }
            : r
        )
      );
      notify.success("Role Diperbarui", `Role "${roleName}" berhasil diperbarui.`);
    } else {
      const newRoleObj: RolePermissionConfig = {
        id: `role-${Date.now()}`,
        name: roleName,
        description: roleDesc,
        badge_color: roleColor,
        is_system: false,
        permissions: rolePermissions,
      };
      setRolesList((prev) => [...prev, newRoleObj]);
      notify.success("Role Ditambahkan", `Role "${roleName}" berhasil dibuat.`);
    }

    setIsRoleModalOpen(false);
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
      setRolesList((prev) => prev.filter((r) => r.id !== roleItem.id));
      notify.deleted(roleItem.name, "Custom Role");
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
                            <Badge variant={roleInfo?.badge_color || "info"}>
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
                          Username / ID:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <code className="rounded-lg bg-neutral-200/80 px-2 py-0.5 font-mono text-[11px] font-black text-neutral-900 dark:bg-neutral-700 dark:text-white">
                            {staff.username}
                          </code>
                          <button
                            onClick={() => handleCopyCredential(staff.username, `user-${staff.id}`)}
                            className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                            title="Salin Username"
                          >
                            {copiedKey === `user-${staff.id}` ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-neutral-500 dark:text-neutral-400">
                          Password:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <code className="rounded-lg bg-neutral-200/80 px-2 py-0.5 font-mono text-[11px] font-black text-neutral-900 dark:bg-neutral-700 dark:text-white">
                            {isShowPass ? staff.password : "••••••••"}
                          </code>
                          <button
                            onClick={() => togglePasswordVisibility(staff.id)}
                            className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                            title={isShowPass ? "Sembunyikan" : "Tampilkan"}
                          >
                            {isShowPass ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleCopyCredential(staff.password, `pass-${staff.id}`)}
                            className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                            title="Salin Password"
                          >
                            {copiedKey === `pass-${staff.id}` ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
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
                  <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-white/5 flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      variant="lime"
                      onClick={() => handleSendWhatsAppCredentials(staff)}
                      className="h-8 gap-1.5 text-[11px] font-black shadow-lime-glow"
                    >
                      <Send className="h-3 w-3" />
                      <span>Kirim Akun ke WA</span>
                    </Button>

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
                          <Badge variant={roleItem.badge_color || "info"}>
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
        title={editingStaffId ? "Edit Akun Karyawan" : "Buat ID & Password Karyawan Baru"}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveStaff} className="space-y-4">
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

            {/* Role / Jabatan (Dynamically Loaded from Roles List) */}
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
                Nomor WhatsApp *
              </label>
              <input
                type="tel"
                required
                placeholder="+6281234567890"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-semibold text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A0A0A] dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
              />
            </div>

            {/* Username Login */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                Username / User ID Login *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: admin_siti"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-mono font-bold text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A0A0A] dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
              />
            </div>

            {/* Password Login */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Password Login *
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
                  required
                  placeholder="Masukkan atau generate password"
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
            </div>

            {/* Shift Kerja */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                Jadwal Shift Kerja
              </label>
              <input
                type="text"
                placeholder="Contoh: Shift Pagi (07:00 - 15:00)"
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-semibold text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A0A0A] dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                Alamat Email (Opsional)
              </label>
              <input
                type="email"
                placeholder="staff@grahakost.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-semibold text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A0A0A] dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
              />
            </div>

            {/* Catatan Penugasan */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                Catatan Penugasan
              </label>
              <input
                type="text"
                placeholder="Contoh: Tanggung jawab lantai 1 & monitoring kran air"
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
              <span>{editingStaffId ? "Simpan Perubahan" : "Simpan & Buat Akun"}</span>
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
              onClick={() => setIsRoleModalOpen(false)}
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
              <span>Simpan Konfigurasi Role</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
