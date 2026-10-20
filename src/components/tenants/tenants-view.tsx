"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Search,
  Phone,
  FileText,
  Key,
  Trash2,
  Edit2,
  Calendar,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  DoorClosed,
} from "lucide-react";
import { Tenant, Lease, Room } from "@/types";
import { KostApiClient } from "@/lib/api-client";
import { KostStorage } from "@/lib/storage";
import { formatRupiah, formatDateIndo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TenantFormModal } from "./tenant-form-modal";
import { LeaseModal } from "./lease-modal";
import { Modal } from "@/components/ui/modal";
import { notify } from "@/lib/notify";
import { TenantMobileList } from "./tenant-mobile-list";

export function TenantsView() {
  const [tenants, setTenants] = useState<Tenant[]>(() => KostStorage.getTenants());
  const [leases, setLeases] = useState<Lease[]>(() => KostStorage.getLeases());
  const [rooms, setRooms] = useState<Room[]>(() => KostStorage.getRooms());
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"tenants" | "leases">("tenants");

  // Modals
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [tenantToEdit, setTenantToEdit] = useState<Tenant | null>(null);
  const [isLeaseModalOpen, setIsLeaseModalOpen] = useState(false);
  const [previewKtpUrl, setPreviewKtpUrl] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(() => KostStorage.getTenants().length === 0);

  const loadData = async () => {
    try {
      const [t, l, r] = await Promise.all([
        KostApiClient.getTenants(),
        KostApiClient.getLeases(),
        KostApiClient.getRooms(),
      ]);
      setTenants(t);
      setLeases(l);
      setRooms(r);
    } catch (err) {
      console.error("Gagal memuat tenant/lease:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleStorageChange = () => {
      setTenants(KostStorage.getTenants());
      setLeases(KostStorage.getLeases());
      setRooms(KostStorage.getRooms());
    };
    window.addEventListener("kost_storage_change", handleStorageChange);
    return () => window.removeEventListener("kost_storage_change", handleStorageChange);
  }, []);

  const filteredTenants = tenants.filter((t) => {
    const query = searchQuery.toLowerCase();
    const matchesName = t.full_name.toLowerCase().includes(query);
    const matchesPhone = t.phone_number.includes(query);
    const matchesNik = t.id_card_number?.includes(query);
    return matchesName || matchesPhone || matchesNik;
  });

  const activeLeases = leases.filter((l) => l.status === "active");

  const handleDeleteTenant = async (tenant: Tenant) => {
    const hasActiveLease = leases.some(
      (l) => l.tenant_id === tenant.id && l.status === "active"
    );
    if (hasActiveLease) {
      notify.alert({
        title: "Kontrak Sewa Masih Aktif",
        message: `Penghuni ${tenant.full_name} masih memiliki kontrak sewa aktif. Selesaikan atau putus kontrak sewa terlebih dahulu sebelum menghapus profil.`,
        variant: "warning",
      });
      return;
    }

    const ok = await notify.confirmDelete({
      title: `Hapus Profil Penghuni?`,
      itemName: tenant.full_name,
      itemType: "Profil Penghuni",
      itemDetails: `WhatsApp: ${tenant.phone_number}${tenant.id_card_number ? ` • NIK: ${tenant.id_card_number}` : ""}`,
      message: `Apakah Anda yakin ingin menghapus data profil penghuni ${tenant.full_name}? Tindakan ini akan menghapus data dari Supabase.`,
      warningNote: "Riwayat kontak darurat dan dokumen KTP terkait penghuni ini akan dihapus permanen.",
      confirmText: "Hapus Penghuni Permanen",
      cancelText: "Batalkan",
    });

    if (ok) {
      try {
        await KostApiClient.deleteTenant(tenant.id);
        await loadData();
        notify.deleted(tenant.full_name, "Penghuni");
      } catch (err: any) {
        notify.alert({ title: "Gagal Menghapus Penghuni", message: err.message, variant: "danger" });
      }
    }
  };

  const handleTerminateLease = async (lease: Lease) => {
    const ok = await notify.confirm({
      title: `Check-out Kamar ${lease.room_number}?`,
      message: `Kontrak sewa untuk ${lease.tenant_name} akan diselesaikan dan status Kamar ${lease.room_number} otomatis menjadi Siap Huni kembali.`,
      variant: "warning",
      confirmText: "Ya, Check-out",
      cancelText: "Batal",
    });

    if (ok) {
      try {
        await KostApiClient.updateLease(lease.id, {
          status: "terminated",
          end_date: new Date().toISOString().split("T")[0],
        });
        if (lease.room_id) {
          await KostApiClient.updateRoom(lease.room_id, { status: "available" });
        }
        await loadData();
        notify.success("Check-out Berhasil", `Kontrak sewa Kamar ${lease.room_number} telah diselesaikan.`);
      } catch (err: any) {
        notify.alert({ title: "Gagal Check-out", message: err.message, variant: "danger" });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
              Penghuni & Kontrak Sewa
            </h2>
            <span className="rounded-full bg-[#D9FF43] px-2.5 py-0.5 text-xs font-bold text-[#0A0A0A]">
              {tenants.length} Profil
            </span>
          </div>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
            Database identitas penyewa, pratinjau dokumen KTP, nomor WhatsApp n8n, dan durasi kontrak.
          </p>
        </div>

        <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
          <Button
            variant="outline"
            onClick={() => setIsLeaseModalOpen(true)}
            className="gap-2 shadow-spatial text-xs font-bold"
          >
            <Key className="h-4 w-4" />
            <span>Buat Kontrak Sewa</span>
          </Button>
          <Button
            onClick={() => {
              setTenantToEdit(null);
              setIsTenantModalOpen(true);
            }}
            variant="default"
            className="gap-2 shadow-spatial text-xs font-bold"
          >
            <UserPlus className="h-4 w-4" />
            <span>Tambah Penghuni</span>
          </Button>
        </div>
      </div>

      {/* View Switcher & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between rounded-3xl bg-white p-3 shadow-spatial border border-white/80 dark:bg-[#18181B] dark:border-white/10">
        <div className="flex w-full min-w-0 items-center gap-1.5 overflow-x-auto rounded-full bg-neutral-100 p-1 dark:bg-neutral-800 sm:w-auto sm:shrink-0">
          <button
            onClick={() => setActiveTab("tenants")}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "tenants"
                ? "bg-[#0A0A0A] text-white shadow-xs dark:bg-white dark:text-[#0A0A0A]"
                : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400"
            }`}
          >
            Daftar Penghuni ({tenants.length})
          </button>
          <button
            onClick={() => setActiveTab("leases")}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "leases"
                ? "bg-[#0A0A0A] text-white shadow-xs dark:bg-white dark:text-[#0A0A0A]"
                : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400"
            }`}
          >
            Kontrak Aktif ({activeLeases.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            aria-label="Cari penghuni"
            placeholder="Cari nama, NIK, atau no WA..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-full border border-neutral-200/80 bg-neutral-50 py-2 pl-10 pr-4 text-xs font-medium focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
          />
        </div>
      </div>

      {/* Tab 1: Tenants List */}
      {activeTab === "tenants" && (
        <>
        <TenantMobileList tenants={filteredTenants} leases={leases} rooms={rooms} loading={isLoading} onEdit={tenant => { setTenantToEdit(tenant); setIsTenantModalOpen(true); }} onDelete={handleDeleteTenant} onPreviewId={setPreviewKtpUrl} />
        <div className="hidden overflow-hidden rounded-3xl border border-white/80 bg-white shadow-spatial dark:bg-[#18181B] dark:border-white/10 sm:block">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-100 bg-neutral-50/80 text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:bg-neutral-800/60 dark:border-white/10">
                <tr>
                  <th className="px-5 py-4">Nama & NIK</th>
                  <th className="px-5 py-4">WhatsApp (E.164)</th>
                  <th className="px-5 py-4">Kontak Darurat</th>
                  <th className="px-5 py-4">Dokumen KTP</th>
                  <th className="px-5 py-4">Status Sewa</th>
                  <th className="px-5 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-white/5">
                {filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-neutral-400">
                      Tidak ada data penghuni ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((t) => {
                    const activeLease = leases.find(
                      (l) => l.tenant_id === t.id && l.status === "active"
                    );
                    return (
                      <tr
                        key={t.id}
                        className="transition-colors hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40"
                      >
                        {/* Name & NIK */}
                        <td className="px-5 py-4">
                          <p className="font-extrabold text-neutral-900 dark:text-white text-sm">
                            {t.full_name}
                          </p>
                          <p className="text-[11px] font-medium text-neutral-400">
                            NIK: {t.id_card_number || "-"}
                          </p>
                        </td>

                        {/* WhatsApp */}
                        <td className="px-5 py-4">
                          <a
                            href={`https://wa.me/${t.phone_number.replace("+", "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 font-bold text-neutral-900 hover:text-neutral-600 dark:text-white dark:hover:text-neutral-300"
                          >
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#D9FF43] text-[10px] text-neutral-900">
                              <Phone className="h-3 w-3" />
                            </span>
                            <span>{t.phone_number}</span>
                          </a>
                        </td>

                        {/* Emergency Contact */}
                        <td className="px-5 py-4">
                          {t.emergency_contact_name ? (
                            <div>
                              <p className="font-bold text-neutral-800 dark:text-neutral-200">
                                {t.emergency_contact_name}
                              </p>
                              <p className="text-[11px] text-neutral-400">
                                {t.emergency_contact_relation} • {t.emergency_contact_phone || "-"}
                              </p>
                            </div>
                          ) : (
                            <span className="text-neutral-400">-</span>
                          )}
                        </td>

                        {/* KTP Document */}
                        <td className="px-5 py-4">
                          {t.id_card_url ? (
                            <button
                              onClick={() => setPreviewKtpUrl(t.id_card_url || null)}
                              className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-800 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              <span>Lihat KTP</span>
                            </button>
                          ) : (
                            <span className="text-neutral-400 text-xs">Belum diunggah</span>
                          )}
                        </td>

                        {/* Active Lease / Room Assignment Status */}
                        <td className="px-5 py-4">
                          {(() => {
                            const assignedRoom = rooms.find(
                              (r) => r.tenant_id === t.id || r.current_tenant?.id === t.id
                            );
                            const roomNumber = activeLease?.room_number || assignedRoom?.room_number;
                            if (roomNumber) {
                              return (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0A0A0A] text-white px-3.5 py-1 text-xs font-bold dark:bg-white dark:text-[#0A0A0A] shadow-xs">
                                  <DoorClosed className="h-3.5 w-3.5" />
                                  Kamar {roomNumber}
                                </span>
                              );
                            }
                            return (
                              <span className="text-xs text-neutral-400 font-medium">Tidak ada sewa aktif</span>
                            );
                          })()}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setTenantToEdit(t);
                                setIsTenantModalOpen(true);
                              }}
                              title="Edit Data"
                              className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 transition-colors"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTenant(t)}
                              title="Hapus Penghuni"
                              className="rounded-full p-2 text-neutral-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {/* Tab 2: Active Leases Bento Grid */}
      {activeTab === "leases" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeLeases.length === 0 ? (
            <div className="col-span-full rounded-3xl border border-dashed border-neutral-300 p-12 text-center bg-white/50 dark:bg-neutral-900/50">
              <Key className="mx-auto h-12 w-12 text-neutral-400" />
              <h3 className="mt-2 text-sm font-bold text-neutral-900 dark:text-white">
                Tidak ada kontrak sewa aktif
              </h3>
              <p className="mt-1 text-xs text-neutral-500">
                Klik tombol "Buat Kontrak Sewa" untuk mendaftarkan sewa penghuni ke kamar.
              </p>
            </div>
          ) : (
            activeLeases.map((lease) => (
              <div
                key={lease.id}
                className="flex flex-col justify-between rounded-3xl border border-white/80 bg-white p-5 shadow-spatial transition-all duration-300 hover:shadow-spatial-lg dark:bg-[#18181B] dark:border-white/10"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-3 dark:border-white/10">
                    <span className="text-lg font-black text-neutral-900 dark:text-white">
                      Kamar {lease.room_number}
                    </span>
                    <span className="rounded-full bg-[#D9FF43] px-2.5 py-0.5 text-[10px] font-extrabold text-[#0A0A0A]">
                      Kontrak Aktif
                    </span>
                  </div>

                  <div className="mt-4 space-y-2.5 text-xs">
                    <div>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Penghuni</p>
                      <p className="text-base font-extrabold text-neutral-900 dark:text-white mt-0.5">
                        {lease.tenant_name}
                      </p>
                      <p className="text-[11px] font-medium text-neutral-500">{lease.tenant_phone}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="rounded-2xl bg-neutral-50 p-2.5 dark:bg-neutral-800">
                        <p className="text-[10px] font-semibold text-neutral-400">Tarif Sewa</p>
                        <p className="font-bold text-neutral-900 dark:text-white mt-0.5">
                          {formatRupiah(lease.rent_amount)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-neutral-50 p-2.5 dark:bg-neutral-800">
                        <p className="text-[10px] font-semibold text-neutral-400">Deposit Jaminan</p>
                        <p className="font-bold text-neutral-900 dark:text-white mt-0.5">
                          {formatRupiah(lease.deposit_amount)}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <p className="text-[10px] font-semibold text-neutral-400">Periode Kontrak</p>
                      <p className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mt-0.5">
                        {formatDateIndo(lease.start_date)} s/d{" "}
                        {lease.end_date ? formatDateIndo(lease.end_date) : "Seterusnya"}
                      </p>
                      <p className="text-[11px] font-semibold text-neutral-500 mt-0.5">
                        Jatuh tempo: tiap tanggal {lease.billing_cycle_day}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 border-t border-neutral-100 pt-4 dark:border-white/10">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleTerminateLease(lease)}
                    className="w-full text-xs font-bold"
                  >
                    Check-out & Selesaikan Sewa
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modals */}
      <TenantFormModal
        isOpen={isTenantModalOpen}
        onClose={() => setIsTenantModalOpen(false)}
        tenantToEdit={tenantToEdit}
        onSuccess={loadData}
      />

      <LeaseModal
        isOpen={isLeaseModalOpen}
        onClose={() => setIsLeaseModalOpen(false)}
        onSuccess={loadData}
      />

      {/* Modal Preview KTP */}
      <Modal
        isOpen={!!previewKtpUrl}
        onClose={() => setPreviewKtpUrl(null)}
        title="Pratinjau Dokumen KTP"
        maxWidth="md"
      >
        {previewKtpUrl && (
          <div className="overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewKtpUrl}
              alt="Foto KTP"
              onError={(e) => {
                e.currentTarget.src =
                  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='250' viewBox='0 0 400 250'%3E%3Crect width='400' height='250' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%2364748b'%3EDokumen KTP Terlampir%3C/text%3E%3C/svg%3E";
              }}
              className="w-full object-cover rounded-2xl max-h-96"
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
