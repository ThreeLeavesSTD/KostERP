"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Lead, Room } from "@/types";
import { KostApiClient } from "@/lib/api-client";
import { KostStorage } from "@/lib/storage";
import { notify } from "@/lib/notify";
import { formatRupiah } from "@/lib/utils";
import {
  DoorClosed,
  User,
  Calendar,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

interface ConvertToTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSuccess: () => void;
}

export function ConvertToTenantModal({
  isOpen,
  onClose,
  lead,
  onSuccess,
}: ConvertToTenantModalProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [durationMonths, setDurationMonths] = useState(1);
  const [rentAmount, setRentAmount] = useState<string>("1800000");
  const [depositAmount, setDepositAmount] = useState<string>("500000");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      KostApiClient.getRooms()
        .then((allRooms) => {
          setRooms(allRooms);
          const availableRooms = allRooms.filter((r) => r.status === "available");
          const preferredMatch = lead?.preferred_room_type
            ? availableRooms.find(
                (r) =>
                  r.room_type.toLowerCase() ===
                  lead.preferred_room_type?.toLowerCase()
              )
            : null;

          const chosen = preferredMatch || availableRooms[0];
          if (chosen) {
            setSelectedRoomId(chosen.id);
            setRentAmount(String(chosen.base_price));
          } else {
            setSelectedRoomId("");
            setRentAmount(
              lead?.budget_min ? String(lead.budget_min) : "1800000"
            );
          }
        })
        .catch((err) => console.error("Gagal memuat kamar:", err));

      const today = new Date().toISOString().slice(0, 10);
      setStartDate(lead?.preferred_move_in_date || today);
      setDurationMonths(1);
      setDepositAmount("500000");
    }
  }, [isOpen, lead]);

  const handleRoomChange = (roomId: string) => {
    setSelectedRoomId(roomId);
    const room = rooms.find((r) => r.id === roomId);
    if (room) {
      setRentAmount(String(room.base_price));
    }
  };

  const handleNumericInput = (
    val: string,
    setter: (formatted: string) => void
  ) => {
    const raw = val.replace(/\D/g, "");
    if (!raw) {
      setter("");
      return;
    }
    const num = parseInt(raw, 10);
    setter(String(num));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;

    if (!selectedRoomId) {
      notify.warning("Pilih Kamar", "Silakan pilih kamar yang akan ditempati penghuni.");
      return;
    }

    const room = rooms.find((r) => r.id === selectedRoomId);
    if (!room) {
      notify.warning("Kamar Tidak Ditemukan", "Kamar yang dipilih tidak valid.");
      return;
    }

    const parsedRent = parseInt(rentAmount || "0", 10);
    const parsedDeposit = parseInt(depositAmount || "0", 10);

    if (parsedRent <= 0) {
      notify.warning("Harga Sewa", "Harga sewa kamar harus lebih dari 0.");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + durationMonths);
    const endDateStr = end.toISOString().slice(0, 10);

    setIsSubmitting(true);
    try {
      // 1. Tambah Tenant
      const newTenant = KostStorage.addTenant({
        property_id: room.property_id || lead.property_id,
        full_name: lead.name,
        phone_number: lead.phone,
      });

      // 2. Tugaskan Tenant ke Kamar & Buat Kontrak Sewa Relasional
      KostStorage.assignTenantToRoom(room.id, newTenant.id, endDateStr);

      // 3. Update status lead ke "won" dengan catatan konversi
      await KostApiClient.updateLead(lead.id, {
        status: "won",
        notes: `${lead.notes ? lead.notes + " • " : ""}Resmi konversi jadi penghuni Kamar ${room.room_number}`,
      });

      notify.success(
        "Konversi Sukses! 🎉",
        `${lead.name} telah resmi terdaftar sebagai penghuni Kamar ${room.room_number}.`
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      notify.alert({
        title: "Gagal Mengonversi",
        message: err.message || "Terjadi kesalahan sistem saat membuat data sewa.",
        variant: "danger",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!lead) return null;

  const availableRooms = rooms.filter((r) => r.status === "available");
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Konversi Menjadi Penghuni Kost"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Banner Info Calon Penghuni */}
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-50/70 p-3.5 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white font-black text-sm shadow-xs">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-black text-emerald-900 dark:text-emerald-300">
              {lead.name}
            </h4>
            <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 mt-0.5">
              WhatsApp: {lead.phone} • Minat: {lead.preferred_room_type || "Bebas"}
            </p>
          </div>
        </div>

        {/* Pilih Kamar */}
        <div>
          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
            <DoorClosed className="h-3.5 w-3.5 text-neutral-400" />
            <span>Pilih Kamar Tersedia</span>
            <span className="text-rose-500">*</span>
          </label>
          <select
            value={selectedRoomId}
            onChange={(e) => handleRoomChange(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-bold text-neutral-900 focus:bg-white focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
            required
          >
            <option value="" disabled>
              -- Pilih Kamar --
            </option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id} disabled={r.status !== "available"}>
                Kamar {r.room_number} ({r.room_type} Lt.{r.floor}) -{" "}
                {formatRupiah(r.base_price)}{" "}
                {r.status === "available" ? "• [TERSEDIA]" : "• [SUDAH TERISI]"}
              </option>
            ))}
          </select>
          {availableRooms.length === 0 && (
            <p className="text-[11px] text-rose-500 font-semibold mt-1">
              Perhatian: Seluruh kamar saat ini berstatus terisi.
            </p>
          )}
        </div>

        {/* Tanggal Mulai & Durasi */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-neutral-400" />
              <span>Tanggal Masuk</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-bold text-neutral-900 focus:bg-white focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1 flex items-center gap-1.5">
              <span>Durasi Sewa Awal</span>
            </label>
            <select
              value={durationMonths}
              onChange={(e) => setDurationMonths(Number(e.target.value))}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-bold text-neutral-900 focus:bg-white focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
            >
              <option value={1}>1 Bulan</option>
              <option value={3}>3 Bulan</option>
              <option value={6}>6 Bulan</option>
              <option value={12}>12 Bulan (1 Tahun)</option>
            </select>
          </div>
        </div>

        {/* Harga Sewa & Deposit */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1 flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-neutral-400" />
              <span>Tarif Sewa/Bulan</span>
              <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">
                Rp
              </span>
              <input
                type="text"
                value={
                  rentAmount
                    ? parseInt(rentAmount, 10).toLocaleString("id-ID")
                    : ""
                }
                onChange={(e) => handleNumericInput(e.target.value, setRentAmount)}
                placeholder="1.800.000"
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-9 pr-3 py-2 text-xs font-bold text-neutral-900 focus:bg-white focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-neutral-400" />
              <span>Uang Jaminan (Deposit)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">
                Rp
              </span>
              <input
                type="text"
                value={
                  depositAmount
                    ? parseInt(depositAmount, 10).toLocaleString("id-ID")
                    : ""
                }
                onChange={(e) =>
                  handleNumericInput(e.target.value, setDepositAmount)
                }
                placeholder="500.000"
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-9 pr-3 py-2 text-xs font-bold text-neutral-900 focus:bg-white focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Ringkasan Akun */}
        <div className="rounded-xl bg-neutral-50 p-3 border border-neutral-100 dark:bg-neutral-800/60 dark:border-white/5 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-neutral-500 font-medium">Calon Penghuni</span>
            <span className="font-bold text-neutral-800 dark:text-neutral-200">
              {lead.name}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-neutral-500 font-medium">Kamar Dituju</span>
            <span className="font-bold text-neutral-800 dark:text-neutral-200">
              {selectedRoom ? `Kamar ${selectedRoom.room_number}` : "-"}
            </span>
          </div>
          <div className="flex justify-between text-xs pt-1 border-t border-neutral-200 dark:border-neutral-700">
            <span className="text-neutral-900 dark:text-white font-extrabold">
              Total Pembayaran Pertama
            </span>
            <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
              {formatRupiah(
                (parseInt(rentAmount, 10) || 0) +
                  (parseInt(depositAmount, 10) || 0)
              )}
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs font-bold rounded-xl"
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !selectedRoomId}
            className="gap-1.5 text-xs font-black rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-spatial"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{isSubmitting ? "Menyimpan..." : "Konfirmasi Jadi Penghuni"}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
